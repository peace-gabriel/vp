import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getAllNotes } from '../../utils/keyMap';

export interface PlayedNote {
    id: string;
    note: string;
    startTime: number;
    endTime: number | null;
}

interface NoteColumnsProps {
    playedNotes: PlayedNote[];
    speed?: number;
}

const getNoteLayoutMap = () => {
    const notes = getAllNotes();
    let whiteX = 0;
    const layout = new Map<string, { isBlack: boolean, x: number }>();

    notes.forEach((note) => {
        const isBlack = note.includes('#');
        if (isBlack) {
            layout.set(note, { isBlack: true, x: whiteX - 0.5 });
        } else {
            layout.set(note, { isBlack: false, x: whiteX });
            whiteX += 1;
        }
    });

    const offsetX = -whiteX / 2;
    layout.forEach((val, key) => {
        layout.set(key, { ...val, x: val.x + offsetX });
    });

    return layout;
};

const NOTE_MAP = getNoteLayoutMap();
const NOTE_LAYOUT = Array.from(NOTE_MAP.values());
const MAX_NOTES = 48;
const MIN_HEIGHT = 0.28;
const MAX_VISIBLE_Y = 20;
const HIT_LINE_Y = 0.48;
const LANE_HEIGHT = 22;
const NOTE_PLANE_Z = -0.28;

const NOTE_HUES: Record<string, number> = {
    C: 0.54,
    'C#': 0.6,
    D: 0.66,
    'D#': 0.73,
    E: 0.8,
    F: 0.9,
    'F#': 0.98,
    G: 0.08,
    'G#': 0.16,
    A: 0.29,
    'A#': 0.39,
    B: 0.48
};

const noteVertexShader = `
attribute vec3 color;
varying vec3 vColor;
varying vec2 vUv;

void main() {
    vUv = uv;
    vColor = color;
    vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
}
`;

const noteFragmentShader = `
precision highp float;

uniform float opacity;
varying vec3 vColor;
varying vec2 vUv;

float roundedRect(vec2 uv, float radius) {
    vec2 p = uv * 2.0 - 1.0;
    vec2 q = abs(p) - vec2(0.93, 0.97) + radius;
    float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - radius;
    return 1.0 - smoothstep(0.0, 0.035, d);
}

void main() {
    float shape = roundedRect(vUv, 0.16);
    if (shape < 0.01) discard;

    float verticalLight = smoothstep(0.05, 1.0, vUv.y);
    float centerLight = 1.0 - smoothstep(0.0, 0.78, abs(vUv.x - 0.5));
    float sideRim = 1.0 - smoothstep(0.0, 0.18, min(vUv.x, 1.0 - vUv.x));
    float endRim = 1.0 - smoothstep(0.0, 0.12, min(vUv.y, 1.0 - vUv.y));

    vec3 lit = vColor * (0.74 + verticalLight * 0.28 + centerLight * 0.16);
    lit += vColor * (sideRim * 0.2 + endRim * 0.34);

    gl_FragColor = vec4(lit, shape * opacity);
}
`;

const noteDummy = new THREE.Object3D();
const laneDummy = new THREE.Object3D();
const colorObj = new THREE.Color();
const hiddenMatrix = new THREE.Matrix4().makeScale(0, 0, 0);

const setNoteColor = (note: string, brightness: number, target: Float32Array, index: number) => {
    const noteName = note.slice(0, -1);
    const octave = parseInt(note.slice(-1));
    const hue = ((NOTE_HUES[noteName] ?? 0.5) + octave * 0.012) % 1;

    colorObj.setHSL(hue, 0.9, 0.5).multiplyScalar(brightness);
    target[index * 3] = colorObj.r;
    target[index * 3 + 1] = colorObj.g;
    target[index * 3 + 2] = colorObj.b;
};

const NoteColumns: React.FC<NoteColumnsProps> = ({ playedNotes, speed = 1.35 }) => {
    const lanesRef = useRef<THREE.InstancedMesh>(null);
    const notesRef = useRef<THREE.InstancedMesh>(null);

    const laneColors = useMemo(() => new Float32Array(NOTE_LAYOUT.length * 3), []);
    const noteColors = useMemo(() => new Float32Array(MAX_NOTES * 3), []);
    const noteMaterial = useMemo(() => {
        const material = new THREE.ShaderMaterial({
            uniforms: {
                opacity: { value: 0.92 }
            },
            vertexShader: noteVertexShader,
            fragmentShader: noteFragmentShader,
            transparent: true,
            depthWrite: false,
            depthTest: true,
            blending: THREE.NormalBlending
        });
        material.toneMapped = false;
        return material;
    }, []);

    useEffect(() => () => noteMaterial.dispose(), [noteMaterial]);

    useEffect(() => {
        if (!lanesRef.current) return;

        NOTE_LAYOUT.forEach((layoutInfo, index) => {
            const width = layoutInfo.isBlack ? 0.48 : 0.78;
            laneDummy.position.set(layoutInfo.x, HIT_LINE_Y + LANE_HEIGHT / 2, NOTE_PLANE_Z - 0.025);
            laneDummy.scale.set(width, LANE_HEIGHT, 1);
            laneDummy.updateMatrix();
            lanesRef.current!.setMatrixAt(index, laneDummy.matrix);

            colorObj.set(layoutInfo.isBlack ? '#152334' : '#0d2337');
            laneColors[index * 3] = colorObj.r;
            laneColors[index * 3 + 1] = colorObj.g;
            laneColors[index * 3 + 2] = colorObj.b;
        });

        lanesRef.current.instanceMatrix.needsUpdate = true;
        if (lanesRef.current.geometry.attributes.color) {
            (lanesRef.current.geometry.attributes.color.array as Float32Array).set(laneColors);
            lanesRef.current.geometry.attributes.color.needsUpdate = true;
        }
    }, [laneColors]);

    useFrame(() => {
        if (!notesRef.current) return;

        const currentTime = performance.now();
        let instanceIndex = 0;

        playedNotes.slice(-MAX_NOTES).forEach((playedNote) => {
            const layoutInfo = NOTE_MAP.get(playedNote.note);
            if (!layoutInfo || instanceIndex >= MAX_NOTES) return;

            const heldMs = playedNote.endTime ? playedNote.endTime - playedNote.startTime : currentTime - playedNote.startTime;
            const heldSecs = Math.max(0, heldMs / 1000);
            const releaseSecs = playedNote.endTime ? Math.max(0, (currentTime - playedNote.endTime) / 1000) : 0;
            const height = Math.min(MAX_VISIBLE_Y, Math.max(MIN_HEIGHT, heldSecs * speed));
            const bottomY = HIT_LINE_Y + (playedNote.endTime ? releaseSecs * speed : 0);
            const centerY = bottomY + height / 2;

            if (bottomY > MAX_VISIBLE_Y + 1) return;

            const fade = playedNote.endTime ? Math.max(0, 1 - releaseSecs / 5) : 1;
            const width = layoutInfo.isBlack ? 0.42 : 0.68;
            const z = NOTE_PLANE_Z + (layoutInfo.isBlack ? 0.016 : 0);

            noteDummy.position.set(layoutInfo.x, centerY, z);
            noteDummy.scale.set(width, height, 1);
            noteDummy.updateMatrix();
            notesRef.current!.setMatrixAt(instanceIndex, noteDummy.matrix);
            setNoteColor(playedNote.note, 1.18 * fade, noteColors, instanceIndex);

            instanceIndex++;
        });

        for (let i = instanceIndex; i < MAX_NOTES; i++) {
            notesRef.current.setMatrixAt(i, hiddenMatrix);
        }

        notesRef.current.instanceMatrix.needsUpdate = true;

        if (notesRef.current.geometry.attributes.color) {
            (notesRef.current.geometry.attributes.color.array as Float32Array).set(noteColors);
            notesRef.current.geometry.attributes.color.needsUpdate = true;
        }
    });

    return (
        <group>
            <mesh position={[0, HIT_LINE_Y + LANE_HEIGHT / 2, NOTE_PLANE_Z - 0.04]}>
                <planeGeometry args={[37.5, LANE_HEIGHT]} />
                <meshBasicMaterial
                    color="#061320"
                    transparent
                    opacity={0.32}
                    depthWrite={false}
                    toneMapped={false}
                />
            </mesh>

            <instancedMesh ref={lanesRef} args={[undefined, undefined, NOTE_LAYOUT.length]} frustumCulled={false}>
                <planeGeometry args={[1, 1]}>
                    <instancedBufferAttribute attach="attributes-color" args={[laneColors, 3]} />
                </planeGeometry>
                <meshBasicMaterial
                    vertexColors
                    transparent
                    opacity={0.3}
                    depthWrite={false}
                    toneMapped={false}
                />
            </instancedMesh>

            <mesh position={[0, HIT_LINE_Y - 0.028, NOTE_PLANE_Z + 0.01]}>
                <planeGeometry args={[37.2, 0.065]} />
                <meshBasicMaterial
                    color="#54e8ff"
                    transparent
                    opacity={0.38}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                    toneMapped={false}
                />
            </mesh>

            <instancedMesh ref={notesRef} args={[undefined, undefined, MAX_NOTES]} frustumCulled={false}>
                <planeGeometry args={[1, 1]}>
                    <instancedBufferAttribute attach="attributes-color" args={[noteColors, 3]} />
                </planeGeometry>
                <primitive object={noteMaterial} attach="material" />
            </instancedMesh>
        </group>
    );
};

export default NoteColumns;

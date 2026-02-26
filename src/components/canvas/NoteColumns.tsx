import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getAllNotes } from '../../utils/keyMap';

export interface PlayedNote {
    id: string; // unique
    note: string;
    startTime: number;
    endTime: number | null; // null if still pressed
}

interface NoteColumnsProps {
    playedNotes: PlayedNote[];
    speed?: number; // units per second
}

// Pre-calculate positions
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

    // Apply center offset
    const totalWidth = whiteX;
    const offsetX = -totalWidth / 2;
    layout.forEach((val, key) => {
        layout.set(key, { ...val, x: val.x + offsetX });
    });
    return layout;
}

const NOTE_MAP = getNoteLayoutMap();

// Helper to determine color based on note
const getNoteColor = (note: string) => {
    // A simple rainbow gradient based on octave
    const colors = ['#ff0000', '#ff7f00', '#ffff00', '#00ff00', '#0000ff', '#4b0082', '#9400d3'];
    const octave = parseInt(note.slice(-1));
    return colors[(octave - 1) % colors.length] || '#00ffff';
};

const dummy = new THREE.Object3D();
const colorObj = new THREE.Color();

const NoteColumns: React.FC<NoteColumnsProps> = ({ playedNotes, speed = 8 }) => {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const maxNotes = 100; // Hard max for InstancedMesh size. App.tsx should keep it below this.

    // Calculate colors just once per note change to avoid new Color() every frame
    const noteColors = useMemo(() => {
        const colors = new Float32Array(maxNotes * 3);
        playedNotes.forEach((pn, i) => {
            if (i >= maxNotes) return;
            const colorHex = getNoteColor(pn.note);
            colorObj.set(colorHex);
            if (pn.endTime) {
                // Dimmer if released
                colorObj.multiplyScalar(0.7);
            }
            colors[i * 3] = colorObj.r;
            colors[i * 3 + 1] = colorObj.g;
            colors[i * 3 + 2] = colorObj.b;
        });
        return colors;
    }, [playedNotes]);

    useFrame(() => {
        if (!meshRef.current) return;

        const currentTime = performance.now();

        // Reset all matrices to scale 0 to hide unused instances
        for (let i = playedNotes.length; i < maxNotes; i++) {
            dummy.position.set(0, 0, 0);
            dummy.scale.set(0, 0, 0);
            dummy.updateMatrix();
            meshRef.current.setMatrixAt(i, dummy.matrix);
        }

        playedNotes.forEach((playedNote, i) => {
            if (i >= maxNotes) return;

            const layoutInfo = NOTE_MAP.get(playedNote.note);
            if (!layoutInfo) return;

            const noteDuration = playedNote.endTime ? (playedNote.endTime - playedNote.startTime) : (currentTime - playedNote.startTime);
            const durationSecs = Math.max(0, noteDuration / 1000);
            const height = Math.max(0.1, durationSecs * speed);

            const width = layoutInfo.isBlack ? 0.35 : 0.7;

            // Scale
            dummy.scale.set(width, height, 0.5);

            // Position
            let yPos = height / 2;
            if (playedNote.endTime) {
                const timeSinceEndSecs = Math.max(0, (currentTime - playedNote.endTime) / 1000);
                const bottomY = timeSinceEndSecs * speed;
                yPos = bottomY + (height / 2);
            }

            dummy.position.set(layoutInfo.x, yPos, 0);
            dummy.updateMatrix();

            meshRef.current!.setMatrixAt(i, dummy.matrix);
        });

        meshRef.current.instanceMatrix.needsUpdate = true;

        // Update colors
        if (meshRef.current.geometry.attributes.color) {
            meshRef.current.geometry.attributes.color.needsUpdate = true;
            (meshRef.current.geometry.attributes.color.array as Float32Array).set(noteColors);
        }
    });

    return (
        <group position={[0, 0, -5]}>
            <instancedMesh ref={meshRef} args={[undefined, undefined, maxNotes]}>
                <boxGeometry args={[1, 1, 1]}>
                    <instancedBufferAttribute
                        attach="attributes-color"
                        args={[noteColors, 3]}
                    />
                </boxGeometry>
                <meshStandardMaterial
                    vertexColors
                    transparent
                    opacity={0.8}
                />
            </instancedMesh>
        </group>
    );
};

export default NoteColumns;

import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import type { PieceConfig } from './config';

interface FloatingCompleteGroupProps {
    pieces: PieceConfig[];
    audioData: React.MutableRefObject<{ bass: number; mid: number; treble: number; average: number }>;
}

const vertexShader = `
  uniform float uTime;
  uniform float uEnergy;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec3 pos = position;
    // Breathing effect
    pos += normal * sin(uTime * 3.0 + position.x) * uEnergy * 0.15;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const fragmentShader = `
  uniform vec3 uColor;
  uniform float uEnergy;
  varying vec2 vUv;
  void main() {
    vec3 color = uColor + (uColor * uEnergy * 0.5);
    gl_FragColor = vec4(color, 1.0);
  }
`;

const FloatingCompleteGroup: React.FC<FloatingCompleteGroupProps> = ({ pieces, audioData }) => {
    const groupRef = useRef<THREE.Group>(null);
    const materialRef = useRef<THREE.ShaderMaterial>(null);

    const uniforms = useMemo(() => ({
        uTime: { value: 0 },
        uEnergy: { value: 0 },
        uColor: { value: new THREE.Color(0x3388ff) }
    }), []);

    const material = useMemo(() => new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms,
        lights: false
    }), [uniforms]);

    const geometry = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);

    useFrame((state) => {
        if (!groupRef.current || !materialRef.current) return;

        const { average, mid } = audioData.current;
        const time = state.clock.getElapsedTime();

        materialRef.current.uniforms.uTime.value = time;
        materialRef.current.uniforms.uEnergy.value = average;

        groupRef.current.rotation.y += 0.003 + (mid * 0.01);
        groupRef.current.rotation.z = Math.sin(time * 0.5) * 0.05;
    });

    return (
        <group ref={groupRef}>
            <mesh visible={false}>
                <primitive object={material} ref={materialRef} attach="material" />
            </mesh>
            {pieces.map(piece => (
                <mesh
                    key={piece.id}
                    position={piece.targetPos}
                    geometry={geometry}
                    material={material}
                />
            ))}
        </group>
    );
};

export default React.memo(FloatingCompleteGroup);

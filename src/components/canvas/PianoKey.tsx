import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface KeyProps {
    note: string;
    isBlack: boolean;
    position: [number, number, number];
    isPressed: boolean;
    onPointerDown?: () => void;
    onPointerUp?: () => void;
    onPointerLeave?: () => void;
}

const PianoKey: React.FC<KeyProps> = ({
    note, isBlack, position, isPressed,
    onPointerDown, onPointerUp, onPointerLeave
}) => {
    const meshRef = useRef<THREE.Mesh>(null);

    // Dimensions
    const width = isBlack ? 0.45 : 0.9;
    const height = isBlack ? 0.3 : 0.5;
    const depth = isBlack ? 3.5 : 5.5;

    // Colors
    const normalColor = isBlack ? '#111111' : '#fffff0';
    const pressedColor = isBlack ? '#333333' : '#e0e0d0';

    // Animation target
    const targetRotationX = isPressed ? 0.05 : 0;

    useFrame((state, delta) => {
        if (meshRef.current) {
            // Smoothly animate key press
            meshRef.current.rotation.x = THREE.MathUtils.lerp(
                meshRef.current.rotation.x,
                targetRotationX,
                15 * delta
            );
        }
    });

    return (
        <group position={position}>
            {/* Hinge is at the back of the key, so we offset the mesh forward */}
            <mesh
                ref={meshRef}
                position={[0, 0, depth / 2]}
                onPointerDown={(e) => { e.stopPropagation(); onPointerDown?.(); }}
                onPointerUp={(e) => { e.stopPropagation(); onPointerUp?.(); }}
                onPointerLeave={(e) => { e.stopPropagation(); onPointerLeave?.(); }}
                castShadow
                receiveShadow
            >
                <boxGeometry args={[width, height, depth]} />
                <meshStandardMaterial
                    color={isPressed ? pressedColor : normalColor}
                    roughness={0.2}
                    metalness={0.1}
                />
            </mesh>
        </group>
    );
};

export default PianoKey;

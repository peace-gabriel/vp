import React, { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useAudioAnalyser } from '../../../hooks/useAudioAnalyser';

const STAR_COUNT = 1000;

interface StarData {
    active: boolean;
    position: THREE.Vector3;
    velocity: THREE.Vector3;
    color: THREE.Color;
    scale: number;
}

const ShootingStars: React.FC = () => {
    const { audioDataRef } = useAudioAnalyser();
    const instancedMeshRef = useRef<THREE.InstancedMesh>(null);
    const groupRef = useRef<THREE.Group>(null);

    // Pool of stars
    const starsData = useMemo<StarData[]>(() => {
        return Array.from({ length: STAR_COUNT }).map(() => ({
            active: false,
            position: new THREE.Vector3(),
            velocity: new THREE.Vector3(),
            color: new THREE.Color(),
            scale: 1,
        }));
    }, []);

    // Pre-initialize star positions only once
    useEffect(() => {
        const spawnRadiusX = 250;
        const spawnRadiusY = 150;
        const spawnRadiusZ = 150;

        for (let i = 0; i < STAR_COUNT; i++) {
            const star = starsData[i];
            star.active = true;

            // Randomly scatter in a large volume behind the main object
            star.position.set(
                (Math.random() - 0.5) * spawnRadiusX,
                (Math.random() - 0.5) * spawnRadiusY + 10,
                (Math.random() - 0.5) * spawnRadiusZ - 80
            );

            // Assign base color
            const hue = (0.5 + (Math.random() * 0.2)) % 1; // Cyan to Blue/Purple
            const luminance = 0.5 + Math.random() * 0.5;
            star.color.setHSL(hue, 0.9, luminance);

            // Assign a random base scale to vary sizes
            star.scale = 0.5 + Math.random() * 1.5;

            // Give them a tiny random velocity for very slow drift
            star.velocity.set(
                (Math.random() - 0.5) * 0.5,
                (Math.random() - 0.5) * 0.5,
                (Math.random() - 0.5) * 0.5
            );
        }
    }, [starsData]);

    const geometry = useMemo(() => {
        return new THREE.SphereGeometry(0.3, 8, 8); // Small spheres
    }, []);

    const dummy = useMemo(() => new THREE.Object3D(), []);

    useFrame((state, delta) => {
        const { treble, bass } = audioDataRef.current;

        if (groupRef.current) {
            // Ambient camera sway
            groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.1) * 0.1;
            groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.15) * 0.05;
        }

        if (instancedMeshRef.current) {
            for (let i = 0; i < STAR_COUNT; i++) {
                const star = starsData[i];

                // Extremely slow drift
                star.position.addScaledVector(star.velocity, delta);

                // Audio reactive pulsation
                // High treble makes them larger and brighter
                const reactiveScale = star.scale * (1 + treble * 0.8);

                // Audio reactive color shifting
                const hueShift = (bass * 0.05);
                const currentHSL = {} as any;
                star.color.getHSL(currentHSL);

                const tempColor = new THREE.Color().setHSL(
                    (currentHSL.h + hueShift) % 1,
                    0.9,
                    currentHSL.l
                );

                // Boost intensity (simulating bloom overdrive) based on treble
                tempColor.multiplyScalar(1 + treble * 1.5);

                dummy.position.copy(star.position);
                dummy.scale.set(reactiveScale, reactiveScale, reactiveScale);
                dummy.updateMatrix();

                instancedMeshRef.current.setMatrixAt(i, dummy.matrix);
                instancedMeshRef.current.setColorAt(i, tempColor);

                // Wrap around edges to keep it infinite
                if (star.position.x > 150) star.position.x = -150;
                if (star.position.x < -150) star.position.x = 150;
                if (star.position.y > 100) star.position.y = -80;
                if (star.position.y < -80) star.position.y = 100;
            }

            instancedMeshRef.current.instanceMatrix.needsUpdate = true;
            if (instancedMeshRef.current.instanceColor) {
                instancedMeshRef.current.instanceColor.needsUpdate = true;
            }
        }
    });

    return (
        <group ref={groupRef}>
            <instancedMesh
                ref={instancedMeshRef}
                args={[undefined, undefined, STAR_COUNT]}
            >
                <primitive object={geometry} attach="geometry" />
                <meshBasicMaterial
                    toneMapped={false}
                />
            </instancedMesh>
        </group>
    );
};

export default ShootingStars;

import React, { useEffect, useState, useRef } from 'react';
import * as THREE from 'three';
import { PositionalAudio, Html } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { Physics, RigidBody } from '@react-three/rapier';
import { useAudioAnalyser } from '../../../hooks/useAudioAnalyser';
import { sculpturePieces } from './config';
import SculpturePiece from './SculpturePiece';
import FloatingCompleteGroup from './FloatingCompleteGroup';

interface SoundSculptureProps {
    musicUrl: string | null;
    cameraDistance: number;
    gravityStrength: number;
    explosionForce: number;
}

const SoundSculpture: React.FC<SoundSculptureProps> = ({ musicUrl, cameraDistance, gravityStrength, explosionForce }) => {
    const { audioDataRef } = useAudioAnalyser();
    const [revealed, setRevealed] = useState(false);

    useEffect(() => {
        // Since we are live, we use the active notes count roughly as "progress"
        // But for a continuous sculpture, we'll just leave it unrevealed,
        // or trigger it when a massive chord is played.
        if (audioDataRef.current.activeNotesCount > 20) {
            setRevealed(true);
        }
    }, [audioDataRef.current.activeNotesCount]);

    // Store references to all piece bodies to calculate Center of Mass
    const piecesRefs = useRef<(RapierRigidBody | null)[]>([]);

    const { camera } = useThree();
    const currentLookAt = useRef(new THREE.Vector3(0, 0, 0));

    useFrame((state, delta) => {
        if (revealed) return;

        let totalPos = new THREE.Vector3();
        let activeCount = 0;

        // Calculate average position of all pieces
        piecesRefs.current.forEach((body) => {
            if (body) {
                const pos = body.translation();
                // Prevent NaN from propagating
                if (!isNaN(pos.x) && !isNaN(pos.y) && !isNaN(pos.z)) {
                    totalPos.add(new THREE.Vector3(pos.x, pos.y, pos.z));
                    activeCount++;
                }
            }
        });

        if (activeCount > 0) {
            const centerOfMass = totalPos.divideScalar(activeCount);

            // Limit camera pan so it doesn't follow a rogue piece too far into the void
            const maxPan = 15;
            centerOfMass.x = THREE.MathUtils.clamp(centerOfMass.x, -maxPan, maxPan);
            centerOfMass.y = THREE.MathUtils.clamp(centerOfMass.y, -maxPan, maxPan + 10);
            centerOfMass.z = THREE.MathUtils.clamp(centerOfMass.z, -maxPan, maxPan);

            // Smoothly interpolate the camera's lookAt target towards the center of mass
            const controls = state.controls as any;
            if (controls && controls.target) {
                controls.target.lerp(centerOfMass, 2 * delta);
                controls.update();
            } else {
                currentLookAt.current.lerp(centerOfMass, 2 * delta);
                camera.lookAt(currentLookAt.current);
            }

            // Gently pull the camera back if the pieces spread out too far
            const bass = audioDataRef.current.bass;
            const targetZ = cameraDistance + (bass * 30); // Dynamic base distance + expansion
            camera.position.lerp(new THREE.Vector3(camera.position.x, camera.position.y, targetZ), 1 * delta);
        }
    });

    return (
        <group>
            {/* The physics world for our pieces */}
            <Physics gravity={[0, -2, 0]} updateLoop="independent" timeStep={1 / 45}>
                {/* Floor to prevent pieces falling forever before music starts */}
                <RigidBody type="fixed" position={[0, -10, 0]}>
                    <mesh receiveShadow>
                        <boxGeometry args={[200, 1, 200]} />
                        <meshStandardMaterial color="#050510" depthWrite={false} transparent opacity={0.5} />
                    </mesh>
                </RigidBody>

                {/* Invisible Bounding Walls so pieces don't leave the fog area */}
                <RigidBody type="fixed" position={[0, 40, -50]}>
                    <mesh><boxGeometry args={[100, 100, 1]} /><meshBasicMaterial visible={false} /></mesh>
                </RigidBody>
                <RigidBody type="fixed" position={[0, 40, 50]}>
                    <mesh><boxGeometry args={[100, 100, 1]} /><meshBasicMaterial visible={false} /></mesh>
                </RigidBody>
                <RigidBody type="fixed" position={[-50, 40, 0]}>
                    <mesh><boxGeometry args={[1, 100, 100]} /><meshBasicMaterial visible={false} /></mesh>
                </RigidBody>
                <RigidBody type="fixed" position={[50, 40, 0]}>
                    <mesh><boxGeometry args={[1, 100, 100]} /><meshBasicMaterial visible={false} /></mesh>
                </RigidBody>
                <RigidBody type="fixed" position={[0, 90, 0]}>
                    <mesh><boxGeometry args={[100, 1, 100]} /><meshBasicMaterial visible={false} /></mesh>
                </RigidBody>
                {!revealed && sculpturePieces.map((p, index) => (
                    <SculpturePiece
                        key={p.id}
                        piece={p}
                        audioData={audioDataRef}
                        progress={1} // Always fully active for live play
                        revealed={revealed}
                        gravityStrength={gravityStrength}
                        explosionForce={explosionForce}
                        onBodyCreated={(body) => piecesRefs.current[index] = body}
                    />
                ))}
            </Physics>

            {revealed && (
                <FloatingCompleteGroup audioData={audioDataRef} pieces={sculpturePieces} />
            )}



        </group>
    );
};

export default SoundSculpture;

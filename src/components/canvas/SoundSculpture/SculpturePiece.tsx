import React, { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { RigidBody, RapierRigidBody } from '@react-three/rapier';
import { type PieceConfig, TOTAL_PIECES } from './config';

interface SculpturePieceProps {
    piece: PieceConfig;
    audioData: React.MutableRefObject<{ bass: number; mid: number; treble: number; average: number }>;
    progress: number;
    revealed: boolean;
    gravityStrength: number;
    explosionForce: number;
    onBodyCreated?: (body: RapierRigidBody | null) => void;
}

const SculpturePiece: React.FC<SculpturePieceProps> = ({ piece, audioData, progress, revealed, gravityStrength, explosionForce, onBodyCreated }) => {
    const bodyRef = useRef<RapierRigidBody>(null);
    const targetVec = useMemo(() => new THREE.Vector3(...piece.targetPos), [piece.targetPos]);

    const geometry = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);

    // Pass ref to parent
    useEffect(() => {
        if (onBodyCreated) {
            onBodyCreated(bodyRef.current);
        }
    }, [bodyRef.current, onBodyCreated]);

    const material = useMemo(() => new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL((piece.id / TOTAL_PIECES) * 0.8, 0.8, 0.5),
        emissive: new THREE.Color().setHSL((piece.id / TOTAL_PIECES) * 0.8, 0.8, 0.2),
        emissiveIntensity: 0.5,
        roughness: 0.2,
        metalness: 0.8
    }), [piece.id]);

    useFrame((_, delta) => {
        if (!bodyRef.current || revealed) return;

        const { bass, mid, treble } = audioData.current;

        // Dynamic glow based on treble/mid
        if (material) {
            material.emissiveIntensity = 0.5 + (treble * 2) + (bass * 1);
        }

        const currentPos = bodyRef.current.translation();
        const currentVec = new THREE.Vector3(currentPos.x, currentPos.y, currentPos.z);
        const distanceFromCenter = currentVec.length();

        // Safe normalization to prevent NaN physics explosions when perfectly aligned
        const diffToTarget = targetVec.clone().sub(currentVec);
        const directionToTarget = diffToTarget.lengthSq() > 0.0001 ? diffToTarget.normalize() : new THREE.Vector3(0, 1, 0);

        const directionOutward = currentVec.lengthSq() > 0.0001 ? currentVec.clone().normalize() : new THREE.Vector3(0, 1, 0);

        // Progressive activation
        const activationThreshold = piece.id / TOTAL_PIECES;
        if (progress > activationThreshold * 0.5) {

            // Limit how far they can be repelled so they don't disappear forever
            let bassForce = bass * explosionForce * delta;
            if (distanceFromCenter > 40) {
                bassForce *= 0.1; // heavily dampen outward force if too far
            }

            // Treble attracts strongly to the target shape
            if (treble > 0.1) {
                bodyRef.current.applyImpulse(directionToTarget.multiplyScalar(treble * gravityStrength * delta), true);
            }

            // Bass repels outward strongly
            if (bass > 0.1) { // Lowered threshold since we fixed mapping
                bodyRef.current.applyImpulse(directionOutward.multiplyScalar(bassForce), true);
            }

            // Mid gives organic rotation
            bodyRef.current.applyTorqueImpulse({ x: mid * 5 * delta, y: mid * 5 * delta, z: 0 }, true);
        }

        // Gentle spring-back to center when quiet to keep them in view
        if (bass < 0.1 && treble < 0.1 && distanceFromCenter > 15) {
            bodyRef.current.applyImpulse(currentVec.clone().negate().normalize().multiplyScalar(5 * delta), true)
        }
    });

    if (revealed) return null;

    return (
        <RigidBody
            ref={bodyRef}
            type="dynamic"
            colliders="hull"
            position={piece.initialPos}
            restitution={0.2}
            friction={0.8}
            linearDamping={2}
            angularDamping={2}
        >
            <mesh geometry={geometry} material={material} castShadow receiveShadow />
        </RigidBody>
    );
};

export default React.memo(SculpturePiece);

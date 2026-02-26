import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useAudioAnalyser } from '../../../hooks/useAudioAnalyser';
import ShootingStars from './ShootingStars';

const SPHERE_RADIUS = 5;

interface SpikeSphereProps {
    colorMode?: 'reativo' | 'onda' | 'strobe' | 'rgb' | 'notas';
    baseColor?: string;
}

const SpikeSphere: React.FC<SpikeSphereProps> = ({ colorMode = 'reativo', baseColor = '#00ffff' }) => {
    const { audioDataRef } = useAudioAnalyser();
    const groupRef = useRef<THREE.Group>(null);
    const sphereMaterialRef = useRef<THREE.MeshPhysicalMaterial>(null);
    const ringRef = useRef<THREE.Mesh>(null);
    const ringMaterialRef = useRef<THREE.MeshStandardMaterial>(null);

    // Store base positions for vertex displacement
    const geometryData = useMemo(() => {
        const geom = new THREE.IcosahedronGeometry(SPHERE_RADIUS, 16);
        const posAttribute = geom.attributes.position;
        const positions = new Float32Array(posAttribute.count * 3);
        const indices = new Float32Array(posAttribute.count); // to map to freq

        for (let i = 0; i < posAttribute.count; i++) {
            const x = posAttribute.getX(i);
            const y = posAttribute.getY(i);
            const z = posAttribute.getZ(i);
            positions[i * 3] = x;
            positions[i * 3 + 1] = y;
            positions[i * 3 + 2] = z;

            // Map vertex direction to a frequency bin index
            const dir = new THREE.Vector3(x, y, z).normalize();
            // A pseudo-random spherical mapping
            const latitude = Math.acos(dir.y); // 0 to PI
            const longitude = Math.atan2(dir.z, dir.x); // -PI to PI
            const hash = Math.abs(Math.sin(latitude * 5.0) + Math.cos(longitude * 5.0)); // 0 to ~2
            const freqIndex = Math.floor((hash / 2) * 60) % 60;
            indices[i] = freqIndex;
        }
        return { geom, positions, indices };
    }, []);

    useFrame((state, delta) => {
        const { bass, mid, treble, freqData } = audioDataRef.current;

        if (groupRef.current) {
            // Slowly rotate the whole sphere based on mid frequencies
            groupRef.current.rotation.y += (0.1 + (mid * 0.5)) * delta;
            groupRef.current.rotation.x += (0.05 + (mid * 0.2)) * delta;
        }

        const posAttribute = geometryData.geom.attributes.position;

        for (let i = 0; i < posAttribute.count; i++) {
            const bx = geometryData.positions[i * 3];
            const by = geometryData.positions[i * 3 + 1];
            const bz = geometryData.positions[i * 3 + 2];

            const dir = new THREE.Vector3(bx, by, bz).normalize();

            const freqIndex = geometryData.indices[i];
            const rawVal = freqData[freqIndex] || -100;

            // Normalize smoothly
            const normalizedVal = Math.max(0, (rawVal + 100) / 100);
            const amplitude = Math.pow(normalizedVal, 4); // Exaggerate

            // Base pulse from bass + localized frequency burst
            const offset = (bass * 0.5) + (amplitude * 3.0);

            // Pull vertices out
            posAttribute.setXYZ(
                i,
                bx + dir.x * offset,
                by + dir.y * offset,
                bz + dir.z * offset
            );
        }
        posAttribute.needsUpdate = true;
        // Recomputing normals every frame ensures lighting reflects the deformed shape
        geometryData.geom.computeVertexNormals();

        let targetColor = new THREE.Color(baseColor);
        let finalIntensity = 0;

        if (ringRef.current) {
            ringRef.current.rotation.x -= (0.2 + (treble * 1)) * delta;
            ringRef.current.rotation.y += (0.1 + (mid * 0.5)) * delta;
            ringRef.current.rotation.z += (0.05 + (bass * 0.3)) * delta;
            const ringScaleX = 1 + (bass * 0.4);
            const ringScaleY = 1 + (mid * 0.4);
            const ringScaleZ = 1 + (treble * 0.4);
            ringRef.current.scale.lerp(new THREE.Vector3(ringScaleX, ringScaleY, ringScaleZ), delta * 10);
        }

        if (sphereMaterialRef.current) {
            const time = state.clock.elapsedTime;

            if (colorMode === 'reativo') {
                targetColor.lerp(new THREE.Color().setHSL(0.5 + (bass * 0.2), 0.8, 0.5), bass * 0.5);
                finalIntensity = bass * 2 + (mid * 1);
            } else if (colorMode === 'onda') {
                const wave = Math.sin(time * 2) * 0.5 + 0.5;
                finalIntensity = wave * 2 + (bass * 0.5);
                const hsl = { h: 0, s: 0, l: 0 };
                targetColor.getHSL(hsl);
                targetColor.setHSL((hsl.h + wave * 0.1) % 1, hsl.s, hsl.l);
            } else if (colorMode === 'strobe') {
                const flash = (bass > 0.7 || treble > 0.7) ? 1 : 0;
                finalIntensity = flash * 5;
                if (flash) targetColor.setHex(0xffffff);
            } else if (colorMode === 'notas') {
                let maxIdx = 0;
                let maxVal = 0;
                // piano fundamental frequencies usually up to bin ~80
                for (let i = 0; i < 80; i++) {
                    if (freqData[i] > maxVal) { maxVal = freqData[i]; maxIdx = i; }
                }
                const isPlaying = maxVal > 20;

                if (isPlaying) {
                    const hue = (maxIdx / 80) % 1;
                    targetColor.setHSL(hue, 1, 0.5);
                }
                finalIntensity = isPlaying ? (maxVal / 255) * 3 + (bass * 1) : 0;
            } else if (colorMode === 'rgb') {
                // Audio reactive RGB: time-based hue but speed and intensity are driven by bass
                const hue = (time * 0.1 + bass * 0.5) % 1;
                targetColor.setHSL(hue, 1, 0.5);
                finalIntensity = bass * 3 + (mid * 1);
            }

            if (colorMode === 'strobe') {
                sphereMaterialRef.current.emissive.copy(targetColor);
            } else {
                sphereMaterialRef.current.emissive.lerp(targetColor, delta * 5);
            }
            sphereMaterialRef.current.emissiveIntensity = THREE.MathUtils.lerp(
                sphereMaterialRef.current.emissiveIntensity,
                finalIntensity,
                delta * 10
            );
        }

        if (ringMaterialRef.current) {
            const time = state.clock.elapsedTime;
            if (colorMode === 'rgb') {
                const hue = (time * 0.1 + bass * 0.5 + 0.5) % 1;
                ringMaterialRef.current.color.setHSL(hue, 1, 0.5);
                ringMaterialRef.current.emissive.setHSL(hue, 1, 0.5);
            } else if (colorMode === 'notas' && finalIntensity > 0) {
                const hsl = { h: 0, s: 0, l: 0 };
                targetColor.getHSL(hsl);
                const compColor = new THREE.Color().setHSL((hsl.h + 0.5) % 1, 1, 0.5);
                ringMaterialRef.current.color.lerp(compColor, delta * 15);
                ringMaterialRef.current.emissive.lerp(compColor, delta * 15);
            } else {
                ringMaterialRef.current.color.lerp(new THREE.Color(baseColor), delta * 5);
                ringMaterialRef.current.emissive.lerp(new THREE.Color(baseColor), delta * 5);
            }

            const ringIntensityBase = (colorMode === 'strobe' && finalIntensity > 0) ? 5 : 2;
            ringMaterialRef.current.emissiveIntensity = ringIntensityBase + (treble * 8) + (bass * 3);
        }
    });

    return (
        <>
            {/* Background Universe */}
            <group position={[0, 0, -50]}>
                <ShootingStars />
            </group>

            <group ref={groupRef} position={[0, 10, 0]}>
                {/* Core Deforming Sphere */}
                <mesh castShadow receiveShadow>
                    {/* Use the dynamically created geometry */}
                    <primitive object={geometryData.geom} attach="geometry" />
                    <meshPhysicalMaterial
                        ref={sphereMaterialRef}
                        color="#ffffff"
                        emissive="#ffffff"
                        emissiveIntensity={0}
                        roughness={0.1}
                        metalness={0.1}
                        transmission={0.9} // Glass refraction
                        ior={1.5}
                        thickness={2}
                        transparent={true}
                        opacity={1}
                    />
                </mesh>

                {/* Orbiting Energy Ring */}
                <mesh ref={ringRef} castShadow receiveShadow>
                    <torusGeometry args={[SPHERE_RADIUS + 3, 0.2, 16, 100]} />
                    <meshStandardMaterial
                        ref={ringMaterialRef}
                        color={baseColor}
                        emissive={baseColor}
                        emissiveIntensity={2}
                        roughness={0.1}
                        metalness={1}
                    />
                </mesh>
            </group>
        </>
    );
};

export default SpikeSphere;


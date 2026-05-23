import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import Piano from './Piano';
import NoteColumns from './NoteColumns';
import type { PlayedNote } from './NoteColumns';

interface SceneProps {
    activeNotes: Set<string>;
    playedNotes: PlayedNote[];
    onPlayNote: (note: string) => void;
    onReleaseNote: (note: string) => void;
}

const StageBackground: React.FC = () => (
    <group>
        <mesh position={[0, 8, -24]}>
            <planeGeometry args={[96, 40]} />
            <meshBasicMaterial color="#081828" depthWrite={false} />
        </mesh>
        <mesh position={[0, -2.05, -4]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[100, 72]} />
            <meshStandardMaterial color="#07090d" roughness={0.92} metalness={0.02} />
        </mesh>
        <gridHelper args={[72, 36, '#2a3f5d', '#111927']} position={[0, -1.96, -4]} />
    </group>
);

const Scene: React.FC<SceneProps> = ({ activeNotes, playedNotes, onPlayNote, onReleaseNote }) => {
    return (
        <Canvas
            camera={{ position: [0, 15, 20], fov: 45 }}
            dpr={[1, 1.5]}
            gl={{ antialias: false, powerPreference: 'low-power' }}
            shadows
        >
            <color attach="background" args={['#05070d']} />
            <fog attach="fog" args={['#05070d', 24, 74]} />

            <hemisphereLight args={['#bcd7ff', '#090b10', 0.72]} />
            <directionalLight position={[10, 20, 10]} intensity={1.15} castShadow shadow-mapSize={[512, 512]} />

            <StageBackground />

            {/* Render Piano and Notes without Physics overhead */}
            <Piano
                activeNotes={activeNotes}
                onPlayNote={onPlayNote}
                onReleaseNote={onReleaseNote}
            />

            <NoteColumns playedNotes={playedNotes} speed={1.35} />

            {/* Removing ContactShadows as it is very expensive on the GPU */}

            <OrbitControls
                minPolarAngle={0}
                maxPolarAngle={Math.PI / 2 - 0.1}
                minDistance={5}
                maxDistance={50}
                target={[0, 0, 0]}
            />
        </Canvas>
    );
};

export default Scene;

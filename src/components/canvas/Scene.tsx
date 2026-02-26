import React, { useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows } from '@react-three/drei';
import { Physics, RigidBody } from '@react-three/rapier';
import Piano from './Piano';
import NoteColumns from './NoteColumns';
import type { PlayedNote } from './NoteColumns';

interface SceneProps {
    activeNotes: Set<string>;
    playedNotes: PlayedNote[];
    onPlayNote: (note: string) => void;
    onReleaseNote: (note: string) => void;
}

const Scene: React.FC<SceneProps> = ({ activeNotes, playedNotes, onPlayNote, onReleaseNote }) => {
    return (
        <Canvas camera={{ position: [0, 15, 20], fov: 45 }} shadows>
            <color attach="background" args={['#1a1a1a']} />

            <ambientLight intensity={0.5} />
            <directionalLight position={[10, 20, 10]} intensity={1} castShadow shadow-mapSize={[1024, 1024]} />

            <Environment preset="studio" />

            {/* Render Piano and Notes without Physics overhead */}
            <Piano
                activeNotes={activeNotes}
                onPlayNote={onPlayNote}
                onReleaseNote={onReleaseNote}
            />

            <NoteColumns playedNotes={playedNotes} speed={8} />

            {/* Floor */}
            <mesh position={[0, -2, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                <planeGeometry args={[100, 100]} />
                <meshStandardMaterial color="#111" roughness={0.8} />
            </mesh>

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

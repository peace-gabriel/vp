import React, { useMemo } from 'react';
import { getAllNotes } from '../../utils/keyMap';
import PianoKey from './PianoKey';

interface PianoProps {
    activeNotes: Set<string>;
    onPlayNote: (note: string) => void;
    onReleaseNote: (note: string) => void;
}

const Piano: React.FC<PianoProps> = ({ activeNotes, onPlayNote, onReleaseNote }) => {
    const notes = useMemo(() => getAllNotes(), []);

    // Calculate positions
    const keyLayout = useMemo(() => {
        let whiteX = 0;
        const layout: Array<{
            note: string;
            isBlack: boolean;
            position: [number, number, number];
        }> = [];

        notes.forEach((note) => {
            const isBlack = note.includes('#');

            if (isBlack) {
                layout.push({
                    note,
                    isBlack: true,
                    position: [whiteX - 0.5, 0.25, -1], // Slightly higher and pushed back, between white keys
                });
            } else {
                layout.push({
                    note,
                    isBlack: false,
                    position: [whiteX, 0, 0],
                });
                whiteX += 1; // Advance normally for the complete white key width
            }
        });

        // Center the piano
        const totalWidth = whiteX;
        const offsetX = -totalWidth / 2;
        return layout.map(k => ({ ...k, position: [k.position[0] + offsetX, k.position[1], k.position[2]] as [number, number, number] }));
    }, [notes]);

    return (
        <group>
            {keyLayout.map(({ note, isBlack, position }) => (
                <PianoKey
                    key={note}
                    note={note}
                    isBlack={isBlack}
                    position={position}
                    isPressed={activeNotes.has(note)}
                    onPointerDown={() => onPlayNote(note)}
                    onPointerUp={() => onReleaseNote(note)}
                    onPointerLeave={() => {
                        if (activeNotes.has(note)) {
                            onReleaseNote(note); // Release if dragged off
                        }
                    }}
                />
            ))}
        </group>
    );
};

export default Piano;

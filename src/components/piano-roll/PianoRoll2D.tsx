import React, { useMemo, useState } from 'react';
import { getAllNotes } from '../../utils/keyMap';
import type { PlayedNote } from '../canvas/NoteColumns';

interface PianoRoll2DProps {
    activeNotes: Set<string>;
    playedNotes: PlayedNote[];
    onPlayNote: (note: string) => void;
    onReleaseNote: (note: string) => void;
}

type NoteLayout = {
    note: string;
    isBlack: boolean;
    left: number;
    width: number;
    whiteIndex: number;
};

const NOTE_COLORS: Record<string, string> = {
    C: '#28d7ff',
    'C#': '#5878ff',
    D: '#7d5cff',
    'D#': '#bb4dff',
    E: '#ff48d0',
    F: '#ff5f86',
    'F#': '#ff9350',
    G: '#ffd84a',
    'G#': '#a8f04d',
    A: '#35e87b',
    'A#': '#2de6c2',
    B: '#38bdf8'
};

const NOTE_SPEED = 168;
const MIN_NOTE_HEIGHT = 16;
const RELEASE_FADE_SECONDS = 4.8;

const getPitchName = (note: string) => note.slice(0, -1);

const buildLayout = () => {
    const notes = getAllNotes();
    const whiteNotes = notes.filter((note) => !note.includes('#'));
    const whiteCount = whiteNotes.length;
    const whiteWidth = 100 / whiteCount;
    let whiteIndex = 0;

    const layout = notes.map<NoteLayout>((note) => {
        const isBlack = note.includes('#');
        if (isBlack) {
            return {
                note,
                isBlack,
                left: Math.max(0, (whiteIndex - 0.34) * whiteWidth),
                width: whiteWidth * 0.52,
                whiteIndex: Math.max(0, whiteIndex - 1)
            };
        }

        const item = {
            note,
            isBlack,
            left: whiteIndex * whiteWidth,
            width: whiteWidth,
            whiteIndex
        };
        whiteIndex += 1;
        return item;
    });

    return { layout, whiteCount, whiteWidth };
};

const PianoRoll2D: React.FC<PianoRoll2DProps> = ({
    activeNotes,
    playedNotes,
    onPlayNote,
    onReleaseNote
}) => {
    const [{ layout, whiteCount, whiteWidth }] = useState(buildLayout);
    const [now, setNow] = useState(() => performance.now());

    React.useEffect(() => {
        let frame = 0;

        const tick = () => {
            setNow(performance.now());
            frame = requestAnimationFrame(tick);
        };

        frame = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frame);
    }, []);

    const whiteKeys = useMemo(() => layout.filter((item) => !item.isBlack), [layout]);
    const blackKeys = useMemo(() => layout.filter((item) => item.isBlack), [layout]);
    const layoutByNote = useMemo(() => new Map(layout.map((item) => [item.note, item])), [layout]);

    const visibleNotes = playedNotes.slice(-64).map((playedNote) => {
        const info = layoutByNote.get(playedNote.note);
        if (!info) return null;

        const heldMs = playedNote.endTime ? playedNote.endTime - playedNote.startTime : now - playedNote.startTime;
        const releaseMs = playedNote.endTime ? Math.max(0, now - playedNote.endTime) : 0;
        const heldSeconds = Math.max(0, heldMs / 1000);
        const releaseSeconds = releaseMs / 1000;
        const height = Math.max(MIN_NOTE_HEIGHT, heldSeconds * NOTE_SPEED);
        const bottom = releaseSeconds * NOTE_SPEED;
        const opacity = playedNote.endTime
            ? Math.max(0, 1 - releaseSeconds / RELEASE_FADE_SECONDS)
            : 1;

        if (bottom > 720 || opacity <= 0) return null;

        const pitchName = getPitchName(playedNote.note);
        const color = NOTE_COLORS[pitchName] ?? '#38bdf8';

        return {
            id: playedNote.id,
            color,
            bottom,
            height,
            opacity,
            left: info.left + info.width * (info.isBlack ? 0.12 : 0.1),
            width: info.width * (info.isBlack ? 0.76 : 0.8),
            isBlack: info.isBlack
        };
    }).filter(Boolean);

    return (
        <div className="piano-roll-2d">
            <div className="roll-glow" />
            <div
                className="roll-lanes"
                style={{
                    backgroundSize: `${whiteWidth}% 100%, 100% 72px`
                }}
            >
                {Array.from({ length: whiteCount + 1 }).map((_, index) => (
                    <span
                        key={index}
                        className="roll-lane-line"
                        style={{ left: `${index * whiteWidth}%` }}
                    />
                ))}
                <div className="roll-hit-line" />
                {visibleNotes.map((note) => note && (
                    <div
                        key={note.id}
                        className={`roll-note ${note.isBlack ? 'roll-note-black' : ''}`}
                        style={{
                            left: `${note.left}%`,
                            width: `${note.width}%`,
                            height: `${note.height}px`,
                            bottom: `${note.bottom}px`,
                            opacity: note.opacity,
                            '--note-color': note.color
                        } as React.CSSProperties}
                    />
                ))}
            </div>

            <div className="piano-2d">
                <div className="white-key-row">
                    {whiteKeys.map((key) => (
                        <button
                            key={key.note}
                            type="button"
                            className={`piano-2d-key white-key ${activeNotes.has(key.note) ? 'active' : ''}`}
                            onPointerDown={(event) => {
                                event.currentTarget.setPointerCapture(event.pointerId);
                                onPlayNote(key.note);
                            }}
                            onPointerUp={(event) => {
                                event.currentTarget.releasePointerCapture(event.pointerId);
                                onReleaseNote(key.note);
                            }}
                            onPointerCancel={() => onReleaseNote(key.note)}
                        />
                    ))}
                </div>
                <div className="black-key-row">
                    {blackKeys.map((key) => (
                        <button
                            key={key.note}
                            type="button"
                            className={`piano-2d-key black-key ${activeNotes.has(key.note) ? 'active' : ''}`}
                            style={{
                                left: `${key.left + key.width * 0.18}%`,
                                width: `${key.width * 0.72}%`
                            }}
                            onPointerDown={(event) => {
                                event.currentTarget.setPointerCapture(event.pointerId);
                                onPlayNote(key.note);
                            }}
                            onPointerUp={(event) => {
                                event.currentTarget.releasePointerCapture(event.pointerId);
                                onReleaseNote(key.note);
                            }}
                            onPointerCancel={() => onReleaseNote(key.note)}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default PianoRoll2D;

import React, { useMemo, useRef, useState } from 'react';
import { getAllNotes } from '../../utils/keyMap';
import { useAudioAnalyser2D, type AudioBands2D } from '../../hooks/useAudioAnalyser2D';
import type { PlayedNote } from '../canvas/NoteColumns';

interface PianoRoll2DProps {
    activeNotes: Set<string>;
    playedNotes: PlayedNote[];
    vjEnabled: boolean;
    vjIntensity: number;
    vjMode: VjMode;
    onPlayNote: (note: string) => void;
    onReleaseNote: (note: string) => void;
}

type VjMode = 'clean' | 'cyber' | 'aurora' | 'pixel-rain';

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
const MAX_VJ_PARTICLES = 120;

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

type VjParticle = {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    age: number;
    life: number;
    color: string;
    shape: 'dot' | 'pixel';
};

type VjRipple = {
    x: number;
    y: number;
    age: number;
    life: number;
    color: string;
    chord: number;
};

interface StageVjCanvasProps {
    active: boolean;
    intensity: number;
    mode: VjMode;
    playedNotes: PlayedNote[];
    activeNotes: Set<string>;
    layoutByNote: Map<string, NoteLayout>;
    audioBands: AudioBands2D;
}

const usePrefersReducedMotion = () => {
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

    React.useEffect(() => {
        const query = window.matchMedia('(prefers-reduced-motion: reduce)');
        setPrefersReducedMotion(query.matches);

        const handleChange = () => setPrefersReducedMotion(query.matches);
        query.addEventListener('change', handleChange);
        return () => query.removeEventListener('change', handleChange);
    }, []);

    return prefersReducedMotion;
};

const StageVjCanvas: React.FC<StageVjCanvasProps> = ({
    active,
    intensity,
    mode,
    playedNotes,
    activeNotes,
    layoutByNote,
    audioBands
}) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const particlesRef = useRef<VjParticle[]>([]);
    const ripplesRef = useRef<VjRipple[]>([]);
    const seenIdsRef = useRef<Set<string>>(new Set());
    const bandsRef = useRef(audioBands);
    const modeRef = useRef(mode);
    const activeNotesRef = useRef(activeNotes);
    const reducedMotion = usePrefersReducedMotion();

    React.useEffect(() => {
        bandsRef.current = audioBands;
    }, [audioBands]);

    React.useEffect(() => {
        modeRef.current = mode;
    }, [mode]);

    React.useEffect(() => {
        activeNotesRef.current = activeNotes;
    }, [activeNotes]);

    React.useEffect(() => {
        if (!active || intensity <= 0) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const recentIds = new Set(playedNotes.slice(-96).map((note) => note.id));
        seenIdsRef.current.forEach((id) => {
            if (!recentIds.has(id)) seenIdsRef.current.delete(id);
        });

        const newAttacks = playedNotes.slice(-18).filter((playedNote) => !seenIdsRef.current.has(playedNote.id));
        const chordSize = Math.min(8, newAttacks.length || 1);

        newAttacks.forEach((playedNote) => {
            if (seenIdsRef.current.has(playedNote.id)) return;

            const layout = layoutByNote.get(playedNote.note);
            if (!layout) return;

            seenIdsRef.current.add(playedNote.id);
            const color = NOTE_COLORS[getPitchName(playedNote.note)] ?? '#38bdf8';
            const x = ((layout.left + layout.width * 0.5) / 100) * rect.width;
            const y = Math.max(0, rect.height - 8);

            ripplesRef.current.push({ x, y, age: 0, life: 620 + intensity * 300, color, chord: chordSize });

            if (reducedMotion) return;

            const particleCount = mode === 'aurora'
                ? Math.ceil(2 + intensity * 4)
                : mode === 'pixel-rain'
                    ? Math.ceil(4 + intensity * 8)
                    : Math.ceil(4 + intensity * 11);
            for (let i = 0; i < particleCount; i += 1) {
                const isPixel = mode === 'pixel-rain';
                particlesRef.current.push({
                    x,
                    y,
                    vx: isPixel ? (Math.random() - 0.5) * 0.65 : (Math.random() - 0.5) * (0.8 + intensity * 2.2),
                    vy: isPixel ? -(0.4 + Math.random() * 1.1) : -(1.1 + Math.random() * (1.8 + intensity * 2.2)),
                    size: isPixel ? 2 + Math.random() * 4 : 1.2 + Math.random() * (1.8 + intensity * 2.2),
                    age: 0,
                    life: isPixel ? 720 + Math.random() * 820 : 520 + Math.random() * 560,
                    color,
                    shape: isPixel ? 'pixel' : 'dot'
                });
            }

            const maxParticles = reducedMotion ? 36 : MAX_VJ_PARTICLES;
            if (particlesRef.current.length > maxParticles) {
                particlesRef.current.splice(0, particlesRef.current.length - maxParticles);
            }
        });
    }, [active, intensity, layoutByNote, mode, playedNotes, reducedMotion]);

    React.useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext('2d');
        if (!context) return;

        if (!active || intensity <= 0) {
            particlesRef.current = [];
            ripplesRef.current = [];
            context.clearRect(0, 0, canvas.width, canvas.height);
            return;
        }

        let frame = 0;
        let tickCount = 0;
        let lastTime = performance.now();
        let width = 1;
        let height = 1;
        let dpr = 1;

        const resize = () => {
            const rect = canvas.getBoundingClientRect();
            dpr = Math.min(1.5, window.devicePixelRatio || 1);
            width = Math.max(1, rect.width);
            height = Math.max(1, rect.height);
            canvas.width = Math.floor(width * dpr);
            canvas.height = Math.floor(height * dpr);
            context.setTransform(dpr, 0, 0, dpr, 0, 0);
        };

        const drawWave = (time: number, color: string, energy: number, yOffset: number, speed: number) => {
            const alpha = Math.min(0.54, (0.08 + energy * 0.34) * intensity);
            if (alpha <= 0.01) return;

            context.beginPath();
            for (let x = 0; x <= width; x += 14) {
                const y = height - yOffset - energy * 42 - Math.sin(x * 0.016 + time * speed) * (8 + energy * 22);
                if (x === 0) context.moveTo(x, y);
                else context.lineTo(x, y);
            }
            context.strokeStyle = color.replace('ALPHA', alpha.toFixed(3));
            context.lineWidth = 1.2 + energy * 2.4;
            context.stroke();
        };

        const drawActiveTrails = (activeMode: VjMode) => {
            const notes = Array.from(activeNotesRef.current);
            notes.forEach((note) => {
                const layout = layoutByNote.get(note);
                if (!layout) return;

                const pitchColor = NOTE_COLORS[getPitchName(note)] ?? '#38bdf8';
                const centerX = ((layout.left + layout.width * 0.5) / 100) * width;
                const laneWidth = Math.max(5, (layout.width / 100) * width * (layout.isBlack ? 0.48 : 0.62));
                const gradient = context.createLinearGradient(centerX, height, centerX, 0);
                gradient.addColorStop(0, pitchColor.replace('#', '#'));
                gradient.addColorStop(0.45, 'rgba(255,255,255,0.08)');
                gradient.addColorStop(1, 'rgba(255,255,255,0)');

                context.save();
                context.globalAlpha = activeMode === 'aurora' ? 0.14 + intensity * 0.16 : 0.2 + intensity * 0.22;
                context.fillStyle = gradient;
                context.shadowColor = pitchColor;
                context.shadowBlur = activeMode === 'pixel-rain' ? 8 : 18;
                context.fillRect(centerX - laneWidth * 0.5, 0, laneWidth, height);
                context.restore();
            });
        };

        const drawCyberLasers = (time: number, bands: AudioBands2D) => {
            const laserAlpha = Math.min(0.72, (0.1 + bands.peak * 0.55) * intensity);
            if (laserAlpha <= 0.01) return;

            context.save();
            context.globalCompositeOperation = 'lighter';
            const horizontal = [
                { y: height * (0.2 + bands.treble * 0.12), color: `rgba(255, 72, 208, ${laserAlpha})`, width: 1 + bands.treble * 3 },
                { y: height * (0.48 + Math.sin(time * 0.0018) * 0.03), color: `rgba(40, 215, 255, ${laserAlpha * 0.82})`, width: 1 + bands.mid * 3 },
                { y: height * (0.74 - bands.bass * 0.12), color: `rgba(53, 232, 123, ${laserAlpha * 0.78})`, width: 1 + bands.bass * 4 }
            ];

            horizontal.forEach((laser) => {
                context.strokeStyle = laser.color;
                context.lineWidth = laser.width;
                context.beginPath();
                context.moveTo(0, laser.y);
                context.lineTo(width, laser.y + Math.sin(time * 0.002 + laser.y) * 4);
                context.stroke();
            });

            const verticalCount = Math.max(4, Math.floor(width / 150));
            for (let i = 0; i < verticalCount; i += 1) {
                const x = ((i + 0.5) / verticalCount) * width + Math.sin(time * 0.0013 + i) * 18;
                const alpha = laserAlpha * (0.22 + bands.mid * 0.5);
                context.strokeStyle = `rgba(125, 249, 255, ${alpha})`;
                context.lineWidth = 1;
                context.beginPath();
                context.moveTo(x, 0);
                context.lineTo(x, height);
                context.stroke();
            }

            context.restore();
        };

        const drawSpectrumSkyline = (time: number, bands: AudioBands2D, activeMode: VjMode) => {
            const barCount = Math.max(24, Math.floor(width / 24));
            const barWidth = width / barCount;
            const baseHeight = activeMode === 'pixel-rain' ? 84 : 56;

            context.save();
            context.globalCompositeOperation = 'lighter';
            for (let i = 0; i < barCount; i += 1) {
                const position = i / Math.max(1, barCount - 1);
                const band = position < 0.34 ? bands.bass : position < 0.68 ? bands.mid : bands.treble;
                const flutter = 0.42 + Math.sin(time * 0.003 + i * 0.73) * 0.16 + Math.sin(time * 0.0017 + i * 1.6) * 0.12;
                const barHeight = Math.max(3, (band * 72 + bands.average * 38 + baseHeight * flutter) * intensity);
                const hueColor = position < 0.34 ? '53, 232, 123' : position < 0.68 ? '40, 215, 255' : '255, 72, 208';
                context.fillStyle = `rgba(${hueColor}, ${0.05 + band * intensity * 0.3})`;
                context.fillRect(i * barWidth, height - barHeight, Math.max(2, barWidth - 3), barHeight);
            }
            context.restore();
        };

        const drawAurora = (time: number, bands: AudioBands2D) => {
            context.save();
            context.globalCompositeOperation = 'lighter';
            const layers = [
                { color: '53, 232, 123', energy: bands.bass, offset: 0.18, speed: 0.0014 },
                { color: '40, 215, 255', energy: bands.mid, offset: 0.35, speed: 0.0019 },
                { color: '255, 72, 208', energy: bands.treble, offset: 0.52, speed: 0.0024 }
            ];

            layers.forEach((layer, index) => {
                const alpha = Math.min(0.28, (0.05 + layer.energy * 0.22) * intensity);
                const gradient = context.createLinearGradient(0, height * layer.offset, width, height * (layer.offset + 0.32));
                gradient.addColorStop(0, `rgba(${layer.color}, 0)`);
                gradient.addColorStop(0.5, `rgba(${layer.color}, ${alpha})`);
                gradient.addColorStop(1, `rgba(${layer.color}, 0)`);

                context.beginPath();
                context.moveTo(0, height);
                for (let x = 0; x <= width; x += 16) {
                    const y = height * (0.34 + layer.offset * 0.34)
                        + Math.sin(x * 0.008 + time * layer.speed + index) * (22 + layer.energy * 70)
                        + Math.sin(x * 0.022 - time * layer.speed * 1.8) * (8 + layer.energy * 18);
                    context.lineTo(x, y);
                }
                context.lineTo(width, height);
                context.closePath();
                context.fillStyle = gradient;
                context.fill();
            });
            context.restore();
        };

        const spawnPixelRain = (bands: AudioBands2D) => {
            if (reducedMotion || modeRef.current !== 'pixel-rain') return;
            const spawnChance = Math.min(0.72, 0.14 + bands.average * 1.25 + intensity * 0.18);
            if (Math.random() > spawnChance) return;

            const laneNotes = Array.from(activeNotesRef.current);
            const useLane = laneNotes.length > 0 && Math.random() < 0.65;
            const note = useLane ? laneNotes[Math.floor(Math.random() * laneNotes.length)] : null;
            const layout = note ? layoutByNote.get(note) : null;
            const x = layout ? ((layout.left + Math.random() * layout.width) / 100) * width : Math.random() * width;
            const color = note ? (NOTE_COLORS[getPitchName(note)] ?? '#38bdf8') : (Math.random() > 0.5 ? '#28d7ff' : '#ff48d0');

            particlesRef.current.push({
                x,
                y: -8,
                vx: 0,
                vy: 0.85 + Math.random() * (1.8 + bands.peak * 2.4),
                size: 2 + Math.random() * 5,
                age: 0,
                life: 1000 + Math.random() * 900,
                color,
                shape: 'pixel'
            });

            if (particlesRef.current.length > MAX_VJ_PARTICLES) {
                particlesRef.current.splice(0, particlesRef.current.length - MAX_VJ_PARTICLES);
            }
        };

        const tick = (time: number) => {
            const delta = Math.min(34, time - lastTime);
            const deltaScale = delta / 16.67;
            lastTime = time;
            context.clearRect(0, 0, width, height);
            tickCount += 1;

            const bands = bandsRef.current;
            const activeMode = modeRef.current;

            if (activeMode === 'aurora') {
                drawAurora(time, bands);
            } else {
                drawSpectrumSkyline(time, bands, activeMode);
            }

            drawActiveTrails(activeMode);

            if (activeMode === 'cyber') {
                drawCyberLasers(time, bands);
                drawWave(time, 'rgba(53, 232, 123, ALPHA)', bands.bass, 22, 0.0032);
                drawWave(time, 'rgba(40, 215, 255, ALPHA)', bands.mid, 52, 0.0041);
                drawWave(time, 'rgba(255, 72, 208, ALPHA)', bands.treble, 82, 0.005);
            }

            if (activeMode === 'pixel-rain' && tickCount % 2 === 0) {
                spawnPixelRain(bands);
            }

            ripplesRef.current = ripplesRef.current.filter((ripple) => {
                ripple.age += delta;
                const progress = ripple.age / ripple.life;
                if (progress >= 1) return false;

                const chordBoost = 1 + ripple.chord * 0.12;
                const radiusX = (18 + progress * (110 + intensity * 130)) * chordBoost;
                const radiusY = (4 + progress * (22 + intensity * 30)) * chordBoost;
                context.beginPath();
                context.ellipse(ripple.x, ripple.y, radiusX, radiusY, 0, 0, Math.PI * 2);
                context.strokeStyle = ripple.color;
                context.globalAlpha = (1 - progress) * (0.5 + intensity * 0.38);
                context.lineWidth = 1 + intensity * 2.5;
                context.stroke();
                context.globalAlpha = 1;
                return true;
            });

            particlesRef.current = particlesRef.current.filter((particle) => {
                particle.age += delta;
                if (particle.age >= particle.life) return false;

                particle.x += particle.vx * deltaScale;
                particle.y += particle.vy * deltaScale;
                particle.vy += (particle.shape === 'pixel' ? 0.014 : 0.025) * deltaScale;

                const alpha = (1 - particle.age / particle.life) * (0.42 + intensity * 0.45);
                context.fillStyle = particle.color;
                context.globalAlpha = alpha;
                if (particle.shape === 'pixel') {
                    context.fillRect(particle.x, particle.y, particle.size, particle.size * (1.2 + bands.average * 1.8));
                } else {
                    context.beginPath();
                    context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                    context.fill();
                }
                context.globalAlpha = 1;
                return particle.y > -20 && particle.x > -24 && particle.x < width + 24;
            });

            frame = requestAnimationFrame(tick);
        };

        resize();
        const observer = new ResizeObserver(resize);
        observer.observe(canvas);
        frame = requestAnimationFrame(tick);

        return () => {
            cancelAnimationFrame(frame);
            observer.disconnect();
        };
    }, [active, intensity, layoutByNote, reducedMotion]);

    return <canvas ref={canvasRef} className="vj-canvas" aria-hidden="true" />;
};

const PianoRoll2D: React.FC<PianoRoll2DProps> = ({
    activeNotes,
    playedNotes,
    vjEnabled,
    vjIntensity,
    vjMode,
    onPlayNote,
    onReleaseNote
}) => {
    const [{ layout, whiteCount, whiteWidth }] = useState(buildLayout);
    const [now, setNow] = useState(() => performance.now());
    const vjActive = vjEnabled && vjMode !== 'clean' && vjIntensity > 0;
    const audioBands = useAudioAnalyser2D(vjActive);

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
    const visualPulse = vjActive ? Math.min(1, (audioBands.average * 2.2 + audioBands.peak * 0.35) * vjIntensity) : 0;
    const bassGlow = vjActive ? Math.min(1, audioBands.bass * vjIntensity) : 0;
    const midGlow = vjActive ? Math.min(1, audioBands.mid * vjIntensity) : 0;
    const trebleGlow = vjActive ? Math.min(1, audioBands.treble * vjIntensity) : 0;

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
            glow: 18 + (vjActive ? audioBands.peak * vjIntensity * 44 : 0),
            energy: vjActive ? Math.min(1, (audioBands.peak + audioBands.average) * vjIntensity) : 0,
            saturate: 1 + (vjActive ? Math.min(0.9, audioBands.peak * vjIntensity) : 0),
            brightness: 1 + (vjActive ? Math.min(0.34, audioBands.average * vjIntensity) : 0),
            left: info.left + info.width * (info.isBlack ? 0.12 : 0.1),
            width: info.width * (info.isBlack ? 0.76 : 0.8),
            isBlack: info.isBlack
        };
    }).filter(Boolean);

    return (
        <div
            className={`piano-roll-2d vj-mode-${vjMode} ${vjActive ? 'vj-on' : ''}`}
            style={{
                '--vj-intensity': vjActive ? vjIntensity : 0,
                '--vj-bass': audioBands.bass,
                '--vj-mid': audioBands.mid,
                '--vj-treble': audioBands.treble,
                '--vj-average': audioBands.average,
                '--vj-peak': audioBands.peak,
                '--vj-pulse': visualPulse,
                '--vj-bass-glow': bassGlow,
                '--vj-mid-glow': midGlow,
                '--vj-treble-glow': trebleGlow
            } as React.CSSProperties}
        >
            <div className="roll-glow" />
            <div className="vj-stage-wash" />
            <div
                className="roll-lanes"
                style={{
                    backgroundSize: `${whiteWidth}% 100%, 100% 72px`
                }}
            >
                <StageVjCanvas
                    active={vjActive}
                    intensity={vjIntensity}
                    mode={vjMode}
                    playedNotes={playedNotes}
                    activeNotes={activeNotes}
                    layoutByNote={layoutByNote}
                    audioBands={audioBands}
                />
                <div className="vj-lane-energy" />
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
                            '--note-color': note.color,
                            '--note-glow': `${note.glow}px`,
                            '--note-energy': note.energy,
                            '--note-saturate': note.saturate,
                            '--note-brightness': note.brightness
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
                            style={{
                                '--key-color': NOTE_COLORS[getPitchName(key.note)] ?? '#38bdf8'
                            } as React.CSSProperties}
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
                                width: `${key.width * 0.72}%`,
                                '--key-color': NOTE_COLORS[getPitchName(key.note)] ?? '#38bdf8'
                            } as React.CSSProperties}
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

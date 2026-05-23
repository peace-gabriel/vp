import { useEffect, useRef, useState } from 'react';
import { audioEngine } from '../audio/PianoEngine';

export type AudioBands2D = {
    bass: number;
    mid: number;
    treble: number;
    average: number;
    peak: number;
};

const SILENCE: AudioBands2D = {
    bass: 0,
    mid: 0,
    treble: 0,
    average: 0,
    peak: 0
};

const normalizeDb = (value: number) => {
    const raw = Math.max(0, (value + 100) / 100);
    return Math.min(1.4, Math.pow(raw, 3) * 2);
};

const readBands = (): AudioBands2D => {
    if (!audioEngine.analyser) return SILENCE;

    const freqData = audioEngine.analyser.getValue() as Float32Array | number[];
    if (!freqData.length) return SILENCE;

    let bass = 0;
    for (let i = 0; i <= 2 && i < freqData.length; i += 1) {
        bass = Math.max(bass, normalizeDb(freqData[i]));
    }

    let mid = 0;
    for (let i = 3; i <= 12 && i < freqData.length; i += 1) {
        mid = Math.max(mid, normalizeDb(freqData[i]));
    }

    let treble = 0;
    for (let i = 13; i <= 60 && i < freqData.length; i += 1) {
        treble = Math.max(treble, normalizeDb(freqData[i]));
    }

    let sum = 0;
    let peak = 0;
    const limit = Math.min(freqData.length, 72);
    for (let i = 0; i < limit; i += 1) {
        const value = normalizeDb(freqData[i]);
        sum += value;
        peak = Math.max(peak, value);
    }

    return {
        bass,
        mid,
        treble,
        average: sum / Math.max(1, limit),
        peak
    };
};

const smoothBands = (previous: AudioBands2D, next: AudioBands2D): AudioBands2D => {
    const attack = 0.34;
    const release = 0.14;

    const smooth = (prev: number, current: number) => {
        const amount = current > prev ? attack : release;
        return prev + (current - prev) * amount;
    };

    return {
        bass: smooth(previous.bass, next.bass),
        mid: smooth(previous.mid, next.mid),
        treble: smooth(previous.treble, next.treble),
        average: smooth(previous.average, next.average),
        peak: smooth(previous.peak, next.peak)
    };
};

export function useAudioAnalyser2D(enabled: boolean) {
    const [bands, setBands] = useState<AudioBands2D>(SILENCE);
    const bandsRef = useRef<AudioBands2D>(SILENCE);

    useEffect(() => {
        if (!enabled) {
            bandsRef.current = SILENCE;
            const resetFrame = requestAnimationFrame(() => setBands(SILENCE));
            return () => cancelAnimationFrame(resetFrame);
        }

        let frameId = 0;
        let lastEmit = 0;

        const tick = (time: number) => {
            const next = smoothBands(bandsRef.current, readBands());
            bandsRef.current = next;

            if (time - lastEmit > 32) {
                lastEmit = time;
                setBands(next);
            }

            frameId = requestAnimationFrame(tick);
        };

        frameId = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frameId);
    }, [enabled]);

    return bands;
}

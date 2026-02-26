import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { audioEngine } from '../audio/PianoEngine';

export function useAudioAnalyser() {
    const audioDataRef = useRef({ bass: 0, mid: 0, treble: 0, average: 0, activeNotesCount: 0, freqData: new Float32Array(0) as Float32Array | number[] });



    useFrame((state) => {
        if (!audioEngine.analyser) {
            audioDataRef.current = { bass: 0, mid: 0, treble: 0, average: 0, activeNotesCount: 0, freqData: [] };
            return;
        }

        const freqData = audioEngine.analyser.getValue() as Float32Array;

        // Tone.js analyser gives Float32Array in dB (-100 to 0). 
        // A standard piano goes from ~27Hz (A0) to ~4.1kHz (C8).
        // With a sample rate of ~44100Hz and FFT size 256, each bin is ~86Hz.
        // Bin 0-2 (0-258Hz): Bass
        // Bin 3-12 (258Hz-1032Hz): Mid
        // Bin 13+ (1032Hz+): Treble

        // We use an exponential curve to normalize so quiet noise from reverb
        // doesn't trigger movements
        const normalize = (val: number) => {
            const raw = Math.max(0, (val + 100) / 100);
            return Math.pow(raw, 3) * 2; // Curve to emphasize peaks, silence noise
        };

        // We use Math.max across bins instead of averaging, because a piano note
        // only excites a few specific bins. Averaging dilutes the signal over empty bins.
        let bass = 0;
        for (let i = 0; i <= 2; i++) bass = Math.max(bass, normalize(freqData[i]));

        let mid = 0;
        for (let i = 3; i <= 12; i++) mid = Math.max(mid, normalize(freqData[i]));

        let treble = 0;
        for (let i = 13; i <= 60; i++) treble = Math.max(treble, normalize(freqData[i])); // Ignore extreme highs 

        let totalSum = 0;
        for (let i = 0; i < freqData.length; i++) totalSum += normalize(freqData[i]);
        const average = (totalSum / freqData.length);

        // We simulate 'progress' for the visualizer structure to unfold based on how long engine has been active
        // But since it's real-time, we'll expose a simplified object
        const activeCount = typeof (audioEngine as any).sustainedNotes !== 'undefined' ? (audioEngine as any).sustainedNotes.size : 0;

        audioDataRef.current = { bass, mid, treble, average, activeNotesCount: activeCount, freqData };

        state.invalidate();
    });

    return { audioDataRef };
}

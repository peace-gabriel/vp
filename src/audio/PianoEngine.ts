import * as Tone from 'tone';
import { WorkletSynthesizer } from 'spessasynth_lib';

type PianoSoundfont = {
    id: string;
    name: string;
    baseUrl: string;
    urls: Record<string, string>;
    eq?: {
        low: number;
        mid: number;
        high: number;
    };
    filterFrequency?: number;
    attack?: number;
    release?: number;
};

type BrowserAudioWindow = Window & typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
};

const SALAMANDER_URLS: Record<string, string> = {
    A0: "A0.mp3", C1: "C1.mp3", "D#1": "Ds1.mp3", "F#1": "Fs1.mp3",
    A1: "A1.mp3", C2: "C2.mp3", "D#2": "Ds2.mp3", "F#2": "Fs2.mp3",
    A2: "A2.mp3", C3: "C3.mp3", "D#3": "Ds3.mp3", "F#3": "Fs3.mp3",
    A3: "A3.mp3", C4: "C4.mp3", "D#4": "Ds4.mp3", "F#4": "Fs4.mp3",
    A4: "A4.mp3", C5: "C5.mp3", "D#5": "Ds5.mp3", "F#5": "Fs5.mp3",
    A5: "A5.mp3", C6: "C6.mp3", "D#6": "Ds6.mp3", "F#6": "Fs6.mp3",
    A6: "A6.mp3", C7: "C7.mp3", "D#7": "Ds7.mp3", "F#7": "Fs7.mp3",
    A7: "A7.mp3", C8: "C8.mp3"
};

const CASIO_URLS: Record<string, string> = {
    A1: "A1.mp3", C2: "C2.mp3", "D#2": "Ds2.mp3", "F#2": "Fs2.mp3", A2: "A2.mp3"
};

const MIDI_NOTE_NAMES_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const MIDI_NOTE_FILES_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const MIDI_JS_FAST_SAMPLE_MIDIS = Array.from({ length: 30 }, (_, index) => 21 + index * 3);

const getMidiOctave = (midiNote: number) => Math.floor(midiNote / 12) - 1;

const buildMidiJsPianoUrls = () => {
    return MIDI_JS_FAST_SAMPLE_MIDIS.reduce<Record<string, string>>((urls, midiNote) => {
        const noteIndex = midiNote % 12;
        const octave = getMidiOctave(midiNote);
        urls[`${MIDI_NOTE_NAMES_SHARP[noteIndex]}${octave}`] = `${MIDI_NOTE_FILES_FLAT[noteIndex]}${octave}.mp3`;
        return urls;
    }, {});
};

const MIDI_JS_PIANO_URLS = buildMidiJsPianoUrls();

class PianoAudioEngine {
    private sampler: Tone.Sampler | null = null;
    private reverb: Tone.Reverb | null = null;
    private eq: Tone.EQ3 | null = null;
    private compressor: Tone.Compressor | null = null;
    private filter: Tone.Filter | null = null;
    public spessaSynth: WorkletSynthesizer | null = null;
    public spessaContext: AudioContext | null = null;
    public spessaMasterGain: GainNode | null = null;
    public analyser: Tone.Analyser | null = null;

    public isLoaded = false;
    private currentVolume = -5;

    // Advanced Features
    private currentTranspose = 0; // in semitones
    private isSustainPedalDown = false;
    private isSustainToggleOn = false;
    private sustainedNotes: Set<string> = new Set(); // Internal notes waiting to be released

    // Soundfonts
    public availableSoundfonts: PianoSoundfont[] = [
        {
            id: 'salamander',
            name: 'Salamander Grand',
            baseUrl: 'https://tonejs.github.io/audio/salamander/',
            urls: SALAMANDER_URLS,
            release: 1.5
        },
        {
            id: 'fluid-grand',
            name: 'FluidR3 Acoustic Grand (Free)',
            baseUrl: 'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/acoustic_grand_piano-mp3/',
            urls: MIDI_JS_PIANO_URLS,
            eq: { low: 1, mid: 0, high: 1 },
            release: 1.2
        },
        {
            id: 'fluid-bright',
            name: 'FluidR3 Bright Piano (Free)',
            baseUrl: 'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/bright_acoustic_piano-mp3/',
            urls: MIDI_JS_PIANO_URLS,
            eq: { low: -1, mid: 1, high: 4 },
            release: 1.1
        },
        {
            id: 'fluid-electric-grand',
            name: 'FluidR3 Electric Grand (Free)',
            baseUrl: 'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/electric_grand_piano-mp3/',
            urls: MIDI_JS_PIANO_URLS,
            eq: { low: 0, mid: 2, high: 3 },
            release: 1
        },
        {
            id: 'fluid-honky-tonk',
            name: 'FluidR3 Honky Tonk Piano (Free)',
            baseUrl: 'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/honkytonk_piano-mp3/',
            urls: MIDI_JS_PIANO_URLS,
            eq: { low: -1, mid: 3, high: 2 },
            release: 0.9
        },
        {
            id: 'fluid-epiano-1',
            name: 'FluidR3 Electric Piano 1 (Free)',
            baseUrl: 'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/electric_piano_1-mp3/',
            urls: MIDI_JS_PIANO_URLS,
            eq: { low: 1, mid: 2, high: 1 },
            release: 1
        },
        {
            id: 'musyng-grand',
            name: 'MusyngKite Grand Piano (Free)',
            baseUrl: 'https://gleitz.github.io/midi-js-soundfonts/MusyngKite/acoustic_grand_piano-mp3/',
            urls: MIDI_JS_PIANO_URLS,
            eq: { low: 2, mid: 0, high: 1 },
            release: 1.2
        },
        {
            id: 'fatboy-grand',
            name: 'FatBoy Grand Piano (Free)',
            baseUrl: 'https://gleitz.github.io/midi-js-soundfonts/FatBoy/acoustic_grand_piano-mp3/',
            urls: MIDI_JS_PIANO_URLS,
            eq: { low: 1, mid: 1, high: 2 },
            release: 1.15
        },
        {
            id: 'casio',
            name: 'Casio Keyboard (Lite)',
            baseUrl: 'https://tonejs.github.io/audio/casio/',
            urls: CASIO_URLS,
            eq: { low: -2, mid: 2, high: 5 },
            release: 0.8
        },
        {
            id: 'hakurei-felt',
            name: 'Hakurei Felt (Emulated)',
            baseUrl: 'https://tonejs.github.io/audio/salamander/',
            urls: SALAMANDER_URLS,
            eq: { low: 6, mid: 0, high: -20 },
            filterFrequency: 800,
            attack: 0.05,
            release: 1.8
        },
        {
            id: 'sk2-pure',
            name: 'SK2 Pure (Emulated)',
            baseUrl: 'https://tonejs.github.io/audio/salamander/',
            urls: SALAMANDER_URLS,
            eq: { low: -2, mid: 2, high: 8 },
            release: 1.3
        }
    ];
    public currentSoundfont = 'salamander';

    constructor() {
        this.init(this.currentSoundfont);
    }

    private async init(soundfontId: string) {
        // Tone.js automatically starts on user interaction if Tone.start() is called
        // We will call Tone.start() explicitly via a user action method as well.
        try {
            await Tone.start();
        } catch {
            console.warn("Tone.start() skipped during init, waiting for user gesture.");
        }

        this.isLoaded = false;

        // Find soundfont config
        const sfConfig = this.availableSoundfonts.find(s => s.id === soundfontId) || this.availableSoundfonts[0];
        this.currentSoundfont = sfConfig.id;

        // Create Effects if they don't exist
        if (!this.reverb) {
            this.analyser = new Tone.Analyser('fft', 256);

            this.reverb = new Tone.Reverb({
                decay: 2.5,
                preDelay: 0.1,
                wet: 0.3
            }).connect(this.analyser);
            this.analyser.toDestination();

            this.eq = new Tone.EQ3({
                low: 0,
                mid: 1,
                high: 2
            }).connect(this.reverb);

            this.compressor = new Tone.Compressor({
                threshold: -24,
                ratio: 4,
                attack: 0.003,
                release: 0.25
            }).connect(this.eq);

            this.filter = new Tone.Filter({
                type: 'lowpass',
                frequency: 20000
            }).connect(this.compressor);
        }

        // --- EQ and Filter Dynamic Config ---
        const eqConfig = sfConfig.eq ?? { low: 0, mid: 1, high: 2 };
        const filterFreq = sfConfig.filterFrequency ?? 20000;
        const attackTime = sfConfig.attack ?? 0;
        const releaseTime = sfConfig.release ?? 1.2;

        if (this.eq) {
            this.eq.low.value = eqConfig.low;
            this.eq.mid.value = eqConfig.mid;
            this.eq.high.value = eqConfig.high;
        }

        if (this.filter) {
            this.filter.frequency.value = filterFreq;
        }

        // Dispose old sampler if changing
        if (this.sampler) {
            this.sampler.dispose();
            this.sampler = null;
        }

        // Load Piano Sampler
        this.sampler = new Tone.Sampler({
            urls: sfConfig.urls,
            baseUrl: sfConfig.baseUrl,
            attack: attackTime,
            release: releaseTime,
            volume: this.currentVolume,
            onload: () => {
                this.isLoaded = true;
                console.log(`${sfConfig.name} samples loaded`);
            }
        });

        if (this.filter) {
            this.sampler.connect(this.filter);
        }
    }

    // Utility to transpose note string (e.g., C4 -> D4 if transpose is 2)
    private getTransposedNote(note: string): string {
        if (this.currentTranspose === 0) return note;

        try {
            return Tone.Frequency(note).transpose(this.currentTranspose).toNote();
        } catch {
            console.warn("Invalid note for transpose", note);
            return note;
        }
    }

    public playNote(note: string, velocity: number = 0.8) {
        if (!this.isLoaded) return;

        const finalNote = this.getTransposedNote(note);

        // If the note is already in sustained state, we re-trigger it
        if (this.sustainedNotes.has(finalNote)) {
            this.sustainedNotes.delete(finalNote);
        }

        if (this.currentSoundfont.startsWith('custom-sf2') && this.spessaSynth) {
            // SpessaSynth routing
            const midiNote = Math.round(Tone.Frequency(finalNote).toMidi());
            // Velocity mapped 0-127
            this.spessaSynth.noteOn(0, midiNote, Math.round(velocity * 127));
        } else if (this.sampler) {
            // Tone.js routing
            this.sampler.triggerAttack(finalNote, Tone.now(), velocity);
        }
    }

    public releaseNote(note: string) {
        if (!this.isLoaded) return;

        const finalNote = this.getTransposedNote(note);

        if (this.isSustainPedalDown || this.isSustainToggleOn) {
            // Note is released by player, but pedal or toggle is down. 
            // Add it to the set of notes waiting to be released.
            this.sustainedNotes.add(finalNote);
        } else {
            // Pedal is up, release normally
            if (this.currentSoundfont.startsWith('custom-sf2') && this.spessaSynth) {
                const midiNote = Math.round(Tone.Frequency(finalNote).toMidi());
                this.spessaSynth.noteOff(0, midiNote);
            } else if (this.sampler) {
                this.sampler.triggerRelease(finalNote, Tone.now() + 0.1);
            }
            this.sustainedNotes.delete(finalNote);
        }
    }

    // Effect Controls
    public setReverb(wet: number) {
        if (this.reverb) this.reverb.wet.value = wet;
    }

    public setVolume(vol: number) {
        this.currentVolume = vol;
        if (this.sampler) this.sampler.volume.value = vol;
        if (this.spessaMasterGain) {
            // Convert dB to linear gain
            this.spessaMasterGain.gain.value = Math.pow(10, vol / 20);
        }
    }

    // Advanced Controls
    public setTranspose(semitones: number) {
        this.currentTranspose = semitones;
    }

    public setSustainPedal(isDown: boolean) {
        this.isSustainPedalDown = isDown;
        this.checkSustainRelease();
    }

    public setSustainToggle(isOn: boolean) {
        this.isSustainToggleOn = isOn;
        this.checkSustainRelease();
    }

    private checkSustainRelease() {
        const isSustainActive = this.isSustainPedalDown || this.isSustainToggleOn;
        // If pedal and toggle are both lifted, release all notes that were waiting
        if (!isSustainActive) {
            this.sustainedNotes.forEach(noteToRelease => {
                if (this.currentSoundfont.startsWith('custom-sf2') && this.spessaSynth) {
                    const midiNote = Math.round(Tone.Frequency(noteToRelease).toMidi());
                    this.spessaSynth.noteOff(0, midiNote);
                } else if (this.sampler) {
                    this.sampler.triggerRelease(noteToRelease, Tone.now() + 0.1);
                }
            });
            this.sustainedNotes.clear();
        }
    }

    public releaseAllNotes() {
        if (this.sampler) {
            this.sampler.releaseAll(Tone.now());
        }
        if (this.spessaSynth) {
            this.spessaSynth.stopAll();
        }
        this.sustainedNotes.clear();
    }

    public async loadSoundfont(soundfontId: string) {
        if (this.currentSoundfont === soundfontId) return;
        await this.init(soundfontId);
    }

    public async startAudioContext() {
        await Tone.start();
        if (this.spessaContext && this.spessaContext.state !== 'running') {
            await this.spessaContext.resume();
        }
    }

    public async loadCustomSoundfont(buffer: ArrayBuffer, name: string) {

        if (!this.spessaContext) {
            const AudioContextConstructor = window.AudioContext || (window as BrowserAudioWindow).webkitAudioContext;
            if (!AudioContextConstructor) {
                throw new Error("Web Audio API is not supported in this browser.");
            }
            this.spessaContext = new AudioContextConstructor();
            this.spessaMasterGain = this.spessaContext.createGain();

            // Connect spessa to Tone.js destination/analyser safely if possible, else destination
            Tone.setContext(this.spessaContext);
            if (!this.analyser) {
                this.analyser = new Tone.Analyser('fft', 256);
                this.analyser.toDestination();
            }
            Tone.connect(this.spessaMasterGain, this.analyser);

            this.spessaMasterGain.gain.value = Math.pow(10, this.currentVolume / 20);
        }
        if (this.spessaContext.state !== 'running') {
            await this.spessaContext.resume();
        }

        if (!this.spessaSynth) {
            // Initialize SpessaSynth
            await this.spessaContext.audioWorklet.addModule("/spessasynth_processor.min.js");
            this.spessaSynth = new WorkletSynthesizer(this.spessaContext);

            // Connect to our master gain instead of default destination
            this.spessaSynth.disconnect();
            this.spessaSynth.connect(this.spessaMasterGain!);
        }

        await this.spessaSynth.soundBankManager.addSoundBank(buffer, name);
        await this.spessaSynth.isReady;

        // Disable existing sampler if required to save memory/processing
        if (this.sampler) {
            this.sampler.dispose();
            this.sampler = null;
        }

        this.currentSoundfont = `custom-sf2-${name}`;
        this.isLoaded = true;
        console.log(`Custom Soundfont ${name} loaded via SpessaSynth`);
    }
}

export const audioEngine = new PianoAudioEngine();

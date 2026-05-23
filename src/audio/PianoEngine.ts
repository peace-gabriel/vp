import * as Tone from 'tone';
import { WorkletSynthesizer } from 'spessasynth_lib';

type PianoSoundfont = {
    id: string;
    name: string;
    baseUrl?: string;
    urls?: Record<string, string>;
    spessaUrl?: string;
    spessaProgram?: number;
    license?: string;
    eq?: {
        low: number;
        mid: number;
        high: number;
    };
    filterFrequency?: number;
    attack?: number;
    release?: number;
};

type AudioFilterPreset = {
    id: string;
    name: string;
    eq: {
        low: number;
        mid: number;
        high: number;
    };
    filterFrequency: number;
    reverbBoost: number;
    delayWet: number;
    delayFeedback: number;
    chorusWet: number;
    chorusDepth: number;
    distortionWet: number;
    distortionAmount: number;
    width?: number;
    impulse?: ImpulseProfile;
    convolverWet?: number;
    multibandAmount?: number;
    velocityCurve?: number;
    velocityGain?: number;
    humanize?: number;
    releaseDelay?: number;
};

type ImpulseProfile = 'none' | 'room' | 'plate' | 'hall';

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

const FREEPATS_UPRIGHT_URLS: Record<string, string> = {
    C1: 'samples/C1vH.wav',
    B1: 'samples/B1vH.wav',
    'F#1': 'samples/Fs1vH.wav',
    'D#2': 'samples/Ds2vH.wav',
    'F#2': 'samples/Fs2vH.wav',
    B2: 'samples/B2vH.wav',
    'D#3': 'samples/Ds3vH.wav',
    'F#3': 'samples/Fs3vH.wav',
    A3: 'samples/A3vH.wav',
    C4: 'samples/C4vH.wav',
    'D#4': 'samples/Ds4vH.wav',
    'F#4': 'samples/Fs4vH.wav',
    A4: 'samples/A4vH.wav',
    C5: 'samples/C5vH.wav',
    'D#5': 'samples/Ds5vH.wav',
    'F#5': 'samples/Fs5vH.wav',
    A5: 'samples/A5vH.wav',
    C6: 'samples/C6vH.wav',
    'D#6': 'samples/Ds6vH.wav',
    'F#6': 'samples/Fs6vH.wav',
    A6: 'samples/A6vH.wav',
    C7: 'samples/C7vH.wav',
    'D#7': 'samples/Ds7vH.wav',
    'F#7': 'samples/Fs7vH.wav',
    A7: 'samples/A7vH.wav',
    B7: 'samples/B7vH.wav'
};

const FREEPATS_OLD_PIANO_FB_URLS: Record<string, string> = {
    A0: 'samples/small/A0.wav',
    C1: 'samples/small/C1.wav',
    'F#1': 'samples/small/Fs1.wav',
    A1: 'samples/small/A1.wav',
    D2: 'samples/small/D2.wav',
    F2: 'samples/small/F2.wav',
    B2: 'samples/small/B2.wav',
    'F#3': 'samples/small/Fs3.wav',
    A3: 'samples/small/A3.wav',
    C4: 'samples/small/C4.wav',
    E4: 'samples/small/E4.wav',
    B4: 'samples/small/B4.wav',
    'C#5': 'samples/small/Cs5.wav',
    F5: 'samples/small/F5.wav',
    'A#5': 'samples/small/As5.wav',
    C6: 'samples/small/C6.wav',
    E6: 'samples/small/E6.wav',
    G6: 'samples/small/G6.wav',
    A6: 'samples/small/A6.wav',
    C7: 'samples/small/C7.wav',
    D7: 'samples/small/D7.wav',
    F7: 'samples/small/F7.wav',
    A7: 'samples/small/A7.wav'
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
    private distortion: Tone.Distortion | null = null;
    private chorus: Tone.Chorus | null = null;
    private delay: Tone.FeedbackDelay | null = null;
    private widener: Tone.StereoWidener | null = null;
    private multibandCompressor: Tone.MultibandCompressor | null = null;
    private convolver: Tone.Convolver | null = null;
    private convolverGain: Tone.Gain | null = null;
    private limiter: Tone.Limiter | null = null;
    public spessaSynth: WorkletSynthesizer | null = null;
    public spessaContext: AudioContext | null = null;
    public spessaMasterGain: GainNode | null = null;
    public analyser: Tone.Analyser | null = null;

    public isLoaded = false;
    private currentVolume = -5;
    private currentReverbWet = 0.3;
    private activeAudioBackend: 'sampler' | 'spessa' = 'sampler';
    private currentSpessaBankId: string | null = null;
    private spessaConnectedToEffects = false;

    // Advanced Features
    private currentTranspose = 0; // in semitones
    private studioMode = true;
    private currentEqConfig = { low: 0, mid: 1, high: 2 };
    private currentFilterFrequency = 20000;
    private currentFilterPresetId = 'natural';
    private currentImpulseProfile: ImpulseProfile = 'room';
    private currentVelocityCurve = 0.88;
    private currentVelocityGain = 0.98;
    private currentHumanize = 0.12;
    private currentReleaseDelay = 0.1;
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
            id: 'hakurei-pure',
            name: 'Hakurei Pure (Emulated)',
            baseUrl: 'https://tonejs.github.io/audio/salamander/',
            urls: SALAMANDER_URLS,
            eq: { low: 2, mid: 0, high: -5 },
            filterFrequency: 6500,
            attack: 0.012,
            release: 1.6
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
            id: 'nocturne-felt',
            name: 'Nocturne Felt (Emulated)',
            baseUrl: 'https://tonejs.github.io/audio/salamander/',
            urls: SALAMANDER_URLS,
            eq: { low: 4, mid: -1, high: -14 },
            filterFrequency: 1400,
            attack: 0.035,
            release: 2
        },
        {
            id: 'velvet-soft',
            name: 'Velvet Soft Piano (Emulated)',
            baseUrl: 'https://tonejs.github.io/audio/salamander/',
            urls: SALAMANDER_URLS,
            eq: { low: 3, mid: 1, high: -8 },
            filterFrequency: 2800,
            attack: 0.025,
            release: 1.7
        },
        {
            id: 'sk2-pure',
            name: 'SK2 Pure (Emulated)',
            baseUrl: 'https://tonejs.github.io/audio/salamander/',
            urls: SALAMANDER_URLS,
            eq: { low: -2, mid: 2, high: 8 },
            release: 1.3
        },
        {
            id: 'freepats-upright-kw',
            name: 'FreePats Upright KW (Local)',
            baseUrl: '/soundfonts/upright-kw-small/',
            urls: FREEPATS_UPRIGHT_URLS,
            license: 'CC0-1.0',
            eq: { low: 2, mid: -1, high: 3 },
            filterFrequency: 14000,
            attack: 0.005,
            release: 1.4
        },
        {
            id: 'freepats-upright-bright',
            name: 'FreePats Upright KW Bright (Local)',
            baseUrl: '/soundfonts/upright-kw-bright/',
            urls: FREEPATS_UPRIGHT_URLS,
            license: 'CC0-1.0',
            eq: { low: 0, mid: -1, high: 5 },
            filterFrequency: 16000,
            attack: 0.004,
            release: 1.25
        },
        {
            id: 'freepats-old-piano-fb',
            name: 'FreePats Old Piano FB (Local)',
            baseUrl: '/soundfonts/old-piano-fb/',
            urls: FREEPATS_OLD_PIANO_FB_URLS,
            license: 'CC0-1.0',
            eq: { low: 2, mid: 1, high: 2 },
            filterFrequency: 13000,
            attack: 0.006,
            release: 1.5
        },
        {
            id: 'fluid-grand',
            name: 'FluidR3 Acoustic Grand (Lite)',
            baseUrl: 'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/acoustic_grand_piano-mp3/',
            urls: MIDI_JS_PIANO_URLS,
            eq: { low: 1, mid: 0, high: 1 },
            release: 1.2
        },
        {
            id: 'fluid-bright',
            name: 'FluidR3 Bright Piano (Lite)',
            baseUrl: 'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/bright_acoustic_piano-mp3/',
            urls: MIDI_JS_PIANO_URLS,
            eq: { low: -1, mid: 1, high: 4 },
            release: 1.1
        },
        {
            id: 'fluid-electric-grand',
            name: 'FluidR3 Electric Grand (Lite)',
            baseUrl: 'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/electric_grand_piano-mp3/',
            urls: MIDI_JS_PIANO_URLS,
            eq: { low: 0, mid: 2, high: 3 },
            release: 1
        },
        {
            id: 'fluid-honky-tonk',
            name: 'FluidR3 Honky Tonk Piano (Lite)',
            baseUrl: 'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/honkytonk_piano-mp3/',
            urls: MIDI_JS_PIANO_URLS,
            eq: { low: -1, mid: 3, high: 2 },
            release: 0.9
        },
        {
            id: 'fluid-epiano-1',
            name: 'FluidR3 Electric Piano 1 (Lite)',
            baseUrl: 'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/electric_piano_1-mp3/',
            urls: MIDI_JS_PIANO_URLS,
            eq: { low: 1, mid: 2, high: 1 },
            release: 1
        },
        {
            id: 'fluid-epiano-2',
            name: 'FluidR3 DX Electric Piano (Lite)',
            baseUrl: 'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/electric_piano_2-mp3/',
            urls: MIDI_JS_PIANO_URLS,
            eq: { low: -1, mid: 1, high: 5 },
            filterFrequency: 12000,
            attack: 0.006,
            release: 1.25
        },
        {
            id: 'fluid-harpsichord',
            name: 'FluidR3 Harpsichord (Lite)',
            baseUrl: 'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/harpsichord-mp3/',
            urls: MIDI_JS_PIANO_URLS,
            eq: { low: -3, mid: 1, high: 6 },
            filterFrequency: 15000,
            attack: 0,
            release: 0.7
        },
        {
            id: 'fluid-clavinet',
            name: 'FluidR3 Clavinet (Lite)',
            baseUrl: 'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/clavinet-mp3/',
            urls: MIDI_JS_PIANO_URLS,
            eq: { low: -2, mid: 4, high: 3 },
            filterFrequency: 9000,
            attack: 0,
            release: 0.75
        },
        {
            id: 'fluid-celesta',
            name: 'FluidR3 Celesta (Lite)',
            baseUrl: 'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/celesta-mp3/',
            urls: MIDI_JS_PIANO_URLS,
            eq: { low: -5, mid: 0, high: 8 },
            filterFrequency: 14000,
            attack: 0.004,
            release: 1.6
        },
        {
            id: 'fluid-music-box',
            name: 'FluidR3 Music Box (Lite)',
            baseUrl: 'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/music_box-mp3/',
            urls: MIDI_JS_PIANO_URLS,
            eq: { low: -6, mid: -1, high: 9 },
            filterFrequency: 13000,
            attack: 0.003,
            release: 2.1
        },
        {
            id: 'fluid-vibraphone',
            name: 'FluidR3 Vibraphone (Lite)',
            baseUrl: 'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/vibraphone-mp3/',
            urls: MIDI_JS_PIANO_URLS,
            eq: { low: -3, mid: 0, high: 5 },
            filterFrequency: 12000,
            attack: 0.004,
            release: 2.2
        },
        {
            id: 'fluid-warm-pad',
            name: 'FluidR3 Warm Pad (Lite)',
            baseUrl: 'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/pad_2_warm-mp3/',
            urls: MIDI_JS_PIANO_URLS,
            eq: { low: 2, mid: -2, high: -1 },
            filterFrequency: 5200,
            attack: 0.08,
            release: 3
        },
        {
            id: 'fluid-synth-strings',
            name: 'FluidR3 Synth Strings (Lite)',
            baseUrl: 'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/synth_strings_1-mp3/',
            urls: MIDI_JS_PIANO_URLS,
            eq: { low: 1, mid: -1, high: 1 },
            filterFrequency: 7000,
            attack: 0.06,
            release: 2.6
        },
        {
            id: 'fluid-new-age-pad',
            name: 'FluidR3 New Age Pad (Remote)',
            baseUrl: 'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/pad_1_new_age-mp3/',
            urls: MIDI_JS_PIANO_URLS,
            license: 'CC-BY-3.0',
            eq: { low: 0, mid: -2, high: 2 },
            filterFrequency: 6200,
            attack: 0.12,
            release: 3.4
        },
        {
            id: 'fluid-polysynth-pad',
            name: 'FluidR3 PolySynth Pad (Remote)',
            baseUrl: 'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/pad_3_polysynth-mp3/',
            urls: MIDI_JS_PIANO_URLS,
            license: 'CC-BY-3.0',
            eq: { low: 1, mid: -1, high: 1 },
            filterFrequency: 7000,
            attack: 0.09,
            release: 2.8
        },
        {
            id: 'fluid-crystal',
            name: 'FluidR3 Crystal FX (Remote)',
            baseUrl: 'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/fx_3_crystal-mp3/',
            urls: MIDI_JS_PIANO_URLS,
            license: 'CC-BY-3.0',
            eq: { low: -5, mid: -1, high: 7 },
            filterFrequency: 15000,
            attack: 0.004,
            release: 2.9
        },
        {
            id: 'fluid-choir',
            name: 'FluidR3 Choir Aahs (Remote)',
            baseUrl: 'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/choir_aahs-mp3/',
            urls: MIDI_JS_PIANO_URLS,
            license: 'CC-BY-3.0',
            eq: { low: -1, mid: 0, high: 2 },
            filterFrequency: 9000,
            attack: 0.08,
            release: 2.8
        },
        {
            id: 'fluid-string-ensemble',
            name: 'FluidR3 String Ensemble (Remote)',
            baseUrl: 'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/string_ensemble_1-mp3/',
            urls: MIDI_JS_PIANO_URLS,
            license: 'CC-BY-3.0',
            eq: { low: 1, mid: -1, high: 1 },
            filterFrequency: 8500,
            attack: 0.07,
            release: 2.7
        },
        {
            id: 'musyng-grand',
            name: 'MusyngKite Grand Piano (Lite)',
            baseUrl: 'https://gleitz.github.io/midi-js-soundfonts/MusyngKite/acoustic_grand_piano-mp3/',
            urls: MIDI_JS_PIANO_URLS,
            license: 'CC-BY-SA-3.0',
            eq: { low: 2, mid: 0, high: 1 },
            release: 1.2
        },
        {
            id: 'musyng-epiano-2',
            name: 'MusyngKite DX Electric Piano (Remote)',
            baseUrl: 'https://gleitz.github.io/midi-js-soundfonts/MusyngKite/electric_piano_2-mp3/',
            urls: MIDI_JS_PIANO_URLS,
            license: 'CC-BY-SA-3.0',
            eq: { low: -1, mid: 1, high: 4 },
            filterFrequency: 12000,
            attack: 0.008,
            release: 1.4
        },
        {
            id: 'musyng-new-age-pad',
            name: 'MusyngKite New Age Pad (Remote)',
            baseUrl: 'https://gleitz.github.io/midi-js-soundfonts/MusyngKite/pad_1_new_age-mp3/',
            urls: MIDI_JS_PIANO_URLS,
            license: 'CC-BY-SA-3.0',
            eq: { low: 0, mid: -2, high: 3 },
            filterFrequency: 6500,
            attack: 0.12,
            release: 3.5
        },
        {
            id: 'fatboy-grand',
            name: 'FatBoy Grand Piano (Lite)',
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
        }
    ];
    public currentSoundfont = 'hakurei-felt';
    public availableFilterPresets: AudioFilterPreset[] = [
        {
            id: 'natural',
            name: 'Natural',
            eq: { low: 0, mid: 0, high: 0 },
            filterFrequency: 20000,
            reverbBoost: 0,
            delayWet: 0,
            delayFeedback: 0.08,
            chorusWet: 0,
            chorusDepth: 0,
            distortionWet: 0,
            distortionAmount: 0
        },
        {
            id: 'felt-dark',
            name: 'Felt Dark',
            eq: { low: 3, mid: -2, high: -12 },
            filterFrequency: 1100,
            reverbBoost: 0.1,
            delayWet: 0,
            delayFeedback: 0.08,
            chorusWet: 0,
            chorusDepth: 0,
            distortionWet: 0,
            distortionAmount: 0
        },
        {
            id: 'bright-glass',
            name: 'Bright Glass',
            eq: { low: -2, mid: -1, high: 7 },
            filterFrequency: 17000,
            reverbBoost: 0.04,
            delayWet: 0.02,
            delayFeedback: 0.1,
            chorusWet: 0,
            chorusDepth: 0,
            distortionWet: 0,
            distortionAmount: 0
        },
        {
            id: 'tape-warm',
            name: 'Tape Warm',
            eq: { low: 2, mid: 1, high: -5 },
            filterFrequency: 5200,
            reverbBoost: 0.05,
            delayWet: 0.03,
            delayFeedback: 0.16,
            chorusWet: 0.04,
            chorusDepth: 0.18,
            distortionWet: 0.08,
            distortionAmount: 0.12
        },
        {
            id: 'lofi-room',
            name: 'Lo-Fi Room',
            eq: { low: 1, mid: -1, high: -10 },
            filterFrequency: 2400,
            reverbBoost: -0.08,
            delayWet: 0.04,
            delayFeedback: 0.12,
            chorusWet: 0.02,
            chorusDepth: 0.12,
            distortionWet: 0.16,
            distortionAmount: 0.22
        },
        {
            id: 'dream-hall',
            name: 'Dream Hall',
            eq: { low: 0, mid: -2, high: -2 },
            filterFrequency: 7200,
            reverbBoost: 0.28,
            delayWet: 0.16,
            delayFeedback: 0.28,
            chorusWet: 0.08,
            chorusDepth: 0.24,
            distortionWet: 0,
            distortionAmount: 0
        },
        {
            id: 'wide-chorus',
            name: 'Wide Chorus',
            eq: { low: -1, mid: 0, high: 2 },
            filterFrequency: 11000,
            reverbBoost: 0.12,
            delayWet: 0.06,
            delayFeedback: 0.18,
            chorusWet: 0.22,
            chorusDepth: 0.48,
            distortionWet: 0,
            distortionAmount: 0
        },
        {
            id: 'studio-clean',
            name: 'Pro Studio Clean',
            eq: { low: -0.5, mid: 0.3, high: 1.8 },
            filterFrequency: 18000,
            reverbBoost: -0.04,
            delayWet: 0,
            delayFeedback: 0.08,
            chorusWet: 0,
            chorusDepth: 0,
            distortionWet: 0.02,
            distortionAmount: 0.03,
            width: 0.54,
            impulse: 'room',
            convolverWet: 0.018,
            multibandAmount: 0.34,
            velocityCurve: 0.9,
            velocityGain: 0.98,
            humanize: 0.08,
            releaseDelay: 0.08
        },
        {
            id: 'close-mic',
            name: 'Pro Close Mic',
            eq: { low: 1.2, mid: 0, high: -1 },
            filterFrequency: 11000,
            reverbBoost: -0.16,
            delayWet: 0,
            delayFeedback: 0.08,
            chorusWet: 0,
            chorusDepth: 0,
            distortionWet: 0,
            distortionAmount: 0,
            width: 0.48,
            impulse: 'room',
            convolverWet: 0.008,
            multibandAmount: 0.22,
            velocityCurve: 0.92,
            velocityGain: 0.99,
            humanize: 0.06,
            releaseDelay: 0.06
        },
        {
            id: 'soft-felt-pro',
            name: 'Pro Soft Felt',
            eq: { low: 4, mid: -1.8, high: -15 },
            filterFrequency: 850,
            reverbBoost: 0.06,
            delayWet: 0,
            delayFeedback: 0.08,
            chorusWet: 0,
            chorusDepth: 0,
            distortionWet: 0,
            distortionAmount: 0,
            width: 0.58,
            impulse: 'room',
            convolverWet: 0.065,
            multibandAmount: 0.28,
            velocityCurve: 0.76,
            velocityGain: 0.94,
            humanize: 0.1,
            releaseDelay: 0.14
        },
        {
            id: 'warm-console',
            name: 'Pro Warm Console',
            eq: { low: 2.2, mid: 0.4, high: -3 },
            filterFrequency: 7800,
            reverbBoost: 0.02,
            delayWet: 0.01,
            delayFeedback: 0.1,
            chorusWet: 0.02,
            chorusDepth: 0.1,
            distortionWet: 0.05,
            distortionAmount: 0.08,
            width: 0.56,
            impulse: 'room',
            convolverWet: 0.03,
            multibandAmount: 0.32,
            velocityCurve: 0.86,
            velocityGain: 0.98,
            humanize: 0.1,
            releaseDelay: 0.1
        },
        {
            id: 'presence-lift',
            name: 'Pro Presence Lift',
            eq: { low: -1.4, mid: 1.2, high: 4.4 },
            filterFrequency: 15000,
            reverbBoost: -0.02,
            delayWet: 0,
            delayFeedback: 0.08,
            chorusWet: 0,
            chorusDepth: 0,
            distortionWet: 0.01,
            distortionAmount: 0.02,
            width: 0.58,
            impulse: 'room',
            convolverWet: 0.016,
            multibandAmount: 0.3,
            velocityCurve: 0.9,
            velocityGain: 0.98,
            humanize: 0.07,
            releaseDelay: 0.08
        },
        {
            id: 'plate-space',
            name: 'Pro Plate Space',
            eq: { low: 0, mid: -1.5, high: 0.8 },
            filterFrequency: 10000,
            reverbBoost: 0.22,
            delayWet: 0.04,
            delayFeedback: 0.12,
            chorusWet: 0.02,
            chorusDepth: 0.12,
            distortionWet: 0,
            distortionAmount: 0,
            width: 0.66,
            impulse: 'plate',
            convolverWet: 0.12,
            multibandAmount: 0.36,
            velocityCurve: 0.84,
            velocityGain: 0.96,
            humanize: 0.09,
            releaseDelay: 0.12
        },
        {
            id: 'cinematic-wide',
            name: 'Pro Cinematic Wide',
            eq: { low: 1, mid: -2, high: -1 },
            filterFrequency: 6400,
            reverbBoost: 0.32,
            delayWet: 0.11,
            delayFeedback: 0.22,
            chorusWet: 0.14,
            chorusDepth: 0.34,
            distortionWet: 0,
            distortionAmount: 0,
            width: 0.78,
            impulse: 'hall',
            convolverWet: 0.14,
            multibandAmount: 0.42,
            velocityCurve: 0.82,
            velocityGain: 0.95,
            humanize: 0.1,
            releaseDelay: 0.14
        },
        {
            id: 'analog-echo',
            name: 'Pro Analog Echo',
            eq: { low: 0.5, mid: 0.2, high: -4 },
            filterFrequency: 4800,
            reverbBoost: 0.07,
            delayWet: 0.18,
            delayFeedback: 0.34,
            chorusWet: 0.03,
            chorusDepth: 0.12,
            distortionWet: 0.06,
            distortionAmount: 0.1,
            width: 0.6,
            impulse: 'plate',
            convolverWet: 0.05,
            multibandAmount: 0.26,
            velocityCurve: 0.86,
            velocityGain: 0.97,
            humanize: 0.12,
            releaseDelay: 0.11
        },
        {
            id: 'night-room',
            name: 'Pro Night Room',
            eq: { low: 2, mid: -2, high: -8 },
            filterFrequency: 2200,
            reverbBoost: 0.14,
            delayWet: 0.02,
            delayFeedback: 0.1,
            chorusWet: 0,
            chorusDepth: 0,
            distortionWet: 0.02,
            distortionAmount: 0.04,
            width: 0.52,
            impulse: 'room',
            convolverWet: 0.055,
            multibandAmount: 0.3,
            velocityCurve: 0.78,
            velocityGain: 0.95,
            humanize: 0.08,
            releaseDelay: 0.12
        },
        {
            id: 'sparkle-air',
            name: 'Pro Sparkle Air',
            eq: { low: -2.5, mid: -0.8, high: 8 },
            filterFrequency: 18000,
            reverbBoost: 0.08,
            delayWet: 0.02,
            delayFeedback: 0.1,
            chorusWet: 0.03,
            chorusDepth: 0.1,
            distortionWet: 0,
            distortionAmount: 0,
            width: 0.62,
            impulse: 'room',
            convolverWet: 0.035,
            multibandAmount: 0.32,
            velocityCurve: 0.9,
            velocityGain: 0.98,
            humanize: 0.07,
            releaseDelay: 0.08
        },
        {
            id: 'master-bus',
            name: 'Pro Master Bus',
            eq: { low: 0.6, mid: -0.2, high: 1.5 },
            filterFrequency: 17000,
            reverbBoost: 0.02,
            delayWet: 0.01,
            delayFeedback: 0.1,
            chorusWet: 0.01,
            chorusDepth: 0.08,
            distortionWet: 0.015,
            distortionAmount: 0.025,
            width: 0.58,
            impulse: 'room',
            convolverWet: 0.025,
            multibandAmount: 0.55,
            velocityCurve: 0.88,
            velocityGain: 0.97,
            humanize: 0.07,
            releaseDelay: 0.08
        },
        {
            id: 'felt-cloud',
            name: 'Pro Felt Cloud',
            eq: { low: 3.5, mid: -2.4, high: -13 },
            filterFrequency: 1200,
            reverbBoost: 0.18,
            delayWet: 0.06,
            delayFeedback: 0.18,
            chorusWet: 0.06,
            chorusDepth: 0.22,
            distortionWet: 0,
            distortionAmount: 0,
            width: 0.72,
            impulse: 'hall',
            convolverWet: 0.1,
            multibandAmount: 0.34,
            velocityCurve: 0.72,
            velocityGain: 0.93,
            humanize: 0.11,
            releaseDelay: 0.16
        },
        {
            id: 'ep-wide-clean',
            name: 'Pro EP Wide Clean',
            eq: { low: -0.8, mid: 0.8, high: 3.4 },
            filterFrequency: 14500,
            reverbBoost: 0.03,
            delayWet: 0.05,
            delayFeedback: 0.16,
            chorusWet: 0.12,
            chorusDepth: 0.28,
            distortionWet: 0.01,
            distortionAmount: 0.02,
            width: 0.76,
            impulse: 'plate',
            convolverWet: 0.045,
            multibandAmount: 0.28,
            velocityCurve: 0.9,
            velocityGain: 0.98,
            humanize: 0.08,
            releaseDelay: 0.08
        },
        {
            id: 'tape-plate',
            name: 'Pro Tape Plate',
            eq: { low: 1.8, mid: 0.2, high: -2.8 },
            filterFrequency: 6200,
            reverbBoost: 0.12,
            delayWet: 0.08,
            delayFeedback: 0.2,
            chorusWet: 0.04,
            chorusDepth: 0.16,
            distortionWet: 0.08,
            distortionAmount: 0.14,
            width: 0.62,
            impulse: 'plate',
            convolverWet: 0.08,
            multibandAmount: 0.36,
            velocityCurve: 0.84,
            velocityGain: 0.96,
            humanize: 0.12,
            releaseDelay: 0.12
        }
    ];

    constructor() {
        this.init(this.currentSoundfont);
    }

    private createImpulseBuffer(profile: Exclude<ImpulseProfile, 'none'>): AudioBuffer {
        const context = Tone.getContext().rawContext as BaseAudioContext;
        const seconds = profile === 'room' ? 0.42 : profile === 'plate' ? 0.86 : 1.35;
        const length = Math.max(1, Math.floor(context.sampleRate * seconds));
        const buffer = context.createBuffer(2, length, context.sampleRate);
        const decayCurve = profile === 'room' ? 4.4 : profile === 'plate' ? 2.2 : 2.8;
        const gain = profile === 'room' ? 0.18 : profile === 'plate' ? 0.15 : 0.12;

        for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
            const data = buffer.getChannelData(channel);
            for (let i = 0; i < length; i += 1) {
                const progress = i / length;
                const stereoOffset = channel === 0 ? 0.97 : 1.03;
                const tail = (Math.random() * 2 - 1) * Math.pow(1 - progress, decayCurve);
                const earlyTap = i % Math.floor(context.sampleRate * 0.011 * stereoOffset) === 0
                    ? (1 - progress) * 0.34
                    : 0;
                data[i] = (tail + earlyTap) * gain;
            }
        }

        return buffer;
    }

    private setImpulseProfile(profile: ImpulseProfile) {
        if (!this.convolver || profile === this.currentImpulseProfile) return;

        if (profile === 'none') {
            this.convolver.buffer = null;
            this.currentImpulseProfile = profile;
            return;
        }

        try {
            this.convolver.buffer = new Tone.ToneAudioBuffer(this.createImpulseBuffer(profile));
            this.currentImpulseProfile = profile;
        } catch (err) {
            console.warn("Could not create convolution impulse response", err);
            if (this.convolverGain) this.convolverGain.gain.value = 0;
        }
    }

    private ensureToneEffects() {
        if (this.reverb) return;

        this.analyser = new Tone.Analyser('fft', 256);
        this.limiter = new Tone.Limiter(-1).connect(this.analyser);

        this.reverb = new Tone.Reverb({
            decay: 2.8,
            preDelay: 0.08,
            wet: this.currentReverbWet
        }).connect(this.limiter);
        this.analyser.toDestination();

        this.delay = new Tone.FeedbackDelay({
            delayTime: '8n',
            feedback: 0.08,
            wet: 0
        }).connect(this.reverb);

        this.convolverGain = new Tone.Gain(0).connect(this.limiter);
        this.convolver = new Tone.Convolver(this.createImpulseBuffer('room')).connect(this.convolverGain);
        this.convolver.normalize = true;
        this.delay.connect(this.convolver);

        this.widener = new Tone.StereoWidener(0.5).connect(this.delay);

        this.chorus = new Tone.Chorus({
            frequency: 0.35,
            delayTime: 2.8,
            depth: 0,
            wet: 0
        }).connect(this.widener);
        this.chorus.start();

        this.distortion = new Tone.Distortion({
            distortion: 0,
            wet: 0
        }).connect(this.chorus);

        this.eq = new Tone.EQ3({
            low: 0,
            mid: 1,
            high: 2
        }).connect(this.distortion);

        this.compressor = new Tone.Compressor({
            threshold: -24,
            ratio: 4,
            attack: 0.003,
            release: 0.25
        }).connect(this.eq);

        this.multibandCompressor = new Tone.MultibandCompressor({
            lowFrequency: 180,
            highFrequency: 2400,
            low: { threshold: -26, ratio: 1.5, attack: 0.012, release: 0.22 },
            mid: { threshold: -28, ratio: 1.4, attack: 0.008, release: 0.2 },
            high: { threshold: -24, ratio: 1.35, attack: 0.004, release: 0.16 }
        }).connect(this.compressor);

        this.filter = new Tone.Filter({
            type: 'lowpass',
            frequency: 20000
        }).connect(this.multibandCompressor);
    }

    private applyEffectProfile(sfConfig?: PianoSoundfont) {
        this.currentEqConfig = sfConfig?.eq ?? this.currentEqConfig;
        this.currentFilterFrequency = sfConfig?.filterFrequency ?? 20000;
        const filterPreset = this.availableFilterPresets.find(preset => preset.id === this.currentFilterPresetId)
            ?? this.availableFilterPresets[0];

        const studioLow = this.studioMode ? 1.5 : 0;
        const studioMid = this.studioMode ? -0.8 : 0;
        const studioHigh = this.studioMode ? 1.2 : 0;

        if (this.eq) {
            this.eq.low.value = this.currentEqConfig.low + filterPreset.eq.low + studioLow;
            this.eq.mid.value = this.currentEqConfig.mid + filterPreset.eq.mid + studioMid;
            this.eq.high.value = this.currentEqConfig.high + filterPreset.eq.high + studioHigh;
        }

        if (this.filter) {
            const studioCeiling = this.studioMode ? 16000 : 20000;
            this.filter.frequency.value = Math.min(this.currentFilterFrequency, filterPreset.filterFrequency, studioCeiling);
        }

        if (this.compressor) {
            this.compressor.threshold.value = this.studioMode ? -28 : -24;
            this.compressor.ratio.value = this.studioMode ? 2.6 : 4;
            this.compressor.attack.value = this.studioMode ? 0.006 : 0.003;
            this.compressor.release.value = this.studioMode ? 0.32 : 0.25;
        }

        if (this.multibandCompressor) {
            const amount = Math.min(1, Math.max(0, filterPreset.multibandAmount ?? (this.studioMode ? 0.18 : 0)));
            this.multibandCompressor.low.threshold.value = -24 - amount * 10;
            this.multibandCompressor.mid.threshold.value = -26 - amount * 8;
            this.multibandCompressor.high.threshold.value = -22 - amount * 7;
            this.multibandCompressor.low.ratio.value = 1.25 + amount * 2.1;
            this.multibandCompressor.mid.ratio.value = 1.2 + amount * 1.7;
            this.multibandCompressor.high.ratio.value = 1.15 + amount * 1.45;
            this.multibandCompressor.low.release.value = 0.24 + amount * 0.12;
            this.multibandCompressor.mid.release.value = 0.18 + amount * 0.1;
            this.multibandCompressor.high.release.value = 0.12 + amount * 0.08;
        }

        if (this.distortion) {
            this.distortion.distortion = filterPreset.distortionAmount;
            this.distortion.wet.value = filterPreset.distortionWet;
        }

        if (this.chorus) {
            this.chorus.depth = filterPreset.chorusDepth;
            this.chorus.wet.value = filterPreset.chorusWet;
        }

        if (this.widener) {
            const width = filterPreset.width ?? 0.5;
            this.widener.width.value = Math.min(0.9, Math.max(0.2, this.studioMode ? width : Math.min(width, 0.6)));
        }

        if (this.delay) {
            this.delay.feedback.value = filterPreset.delayFeedback;
            this.delay.wet.value = filterPreset.delayWet;
        }

        const impulse = filterPreset.impulse ?? 'none';
        this.setImpulseProfile(impulse);

        if (this.convolverGain) {
            const wet = impulse === 'none' ? 0 : (filterPreset.convolverWet ?? 0);
            this.convolverGain.gain.value = Math.min(0.18, Math.max(0, wet * (this.studioMode ? 1 : 0.72)));
        }

        if (this.reverb) {
            const wet = this.currentReverbWet + filterPreset.reverbBoost + (this.studioMode ? 0.12 : 0);
            this.reverb.wet.value = Math.min(0.88, Math.max(0, wet));
        }

        this.currentVelocityCurve = filterPreset.velocityCurve ?? (this.studioMode ? 0.88 : 1);
        this.currentVelocityGain = filterPreset.velocityGain ?? (this.studioMode ? 0.98 : 1);
        this.currentHumanize = filterPreset.humanize ?? (this.studioMode ? 0.12 : 0.08);
        this.currentReleaseDelay = filterPreset.releaseDelay ?? (this.studioMode ? 0.1 : 0.08);
    }

    private async withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
        let timeoutId: number | undefined;
        const timeout = new Promise<never>((_, reject) => {
            timeoutId = window.setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs / 1000}s`)), timeoutMs);
        });

        try {
            return await Promise.race([promise, timeout]);
        } finally {
            if (timeoutId !== undefined) window.clearTimeout(timeoutId);
        }
    }

    private async fetchSoundfontBuffer(url: string, displayName: string) {
        const controller = new AbortController();
        const timeoutId = window.setTimeout(() => controller.abort(), 30000);

        try {
            console.log(`Downloading ${displayName}`);
            const response = await fetch(url, { signal: controller.signal });
            if (!response.ok) {
                throw new Error(`Could not download ${displayName}: ${response.status} ${response.statusText}`);
            }

            const buffer = await this.withTimeout(response.arrayBuffer(), 30000, `${displayName} download`);
            console.log(`${displayName} downloaded (${Math.round(buffer.byteLength / 1024)} KB)`);
            return buffer;
        } finally {
            window.clearTimeout(timeoutId);
        }
    }

    private async init(soundfontId: string) {
        this.isLoaded = false;
        this.releaseAllNotes();

        // Find soundfont config
        const sfConfig = this.availableSoundfonts.find(s => s.id === soundfontId) || this.availableSoundfonts[0];

        this.ensureToneEffects();
        this.applyEffectProfile(sfConfig);

        if (sfConfig.spessaUrl) {
            const buffer = await this.fetchSoundfontBuffer(sfConfig.spessaUrl, sfConfig.name);
            await this.loadSpessaSoundfont(buffer, `remote-${sfConfig.id}`, sfConfig.name, sfConfig.spessaProgram ?? 0);
            this.currentSoundfont = sfConfig.id;
            return;
        }

        if (!sfConfig.baseUrl || !sfConfig.urls) {
            throw new Error(`Sampler soundfont "${sfConfig.name}" is missing sample URLs.`);
        }

        this.currentSoundfont = sfConfig.id;
        this.activeAudioBackend = 'sampler';

        // --- EQ and Filter Dynamic Config ---
        const attackTime = sfConfig.attack ?? 0;
        const releaseTime = sfConfig.release ?? 1.2;

        // Dispose old sampler if changing
        if (this.sampler) {
            this.sampler.dispose();
            this.sampler = null;
        }

        let resolveSamplerLoad!: () => void;
        let rejectSamplerLoad!: (error: Error) => void;
        const samplerLoad = new Promise<void>((resolve, reject) => {
            resolveSamplerLoad = resolve;
            rejectSamplerLoad = reject;
        });

        const sampler = new Tone.Sampler({
            urls: sfConfig.urls,
            baseUrl: sfConfig.baseUrl,
            attack: attackTime,
            release: releaseTime,
            volume: this.currentVolume,
            onload: () => {
                this.isLoaded = true;
                console.log(`${sfConfig.name} samples loaded`);
                resolveSamplerLoad();
            },
            onerror: (error) => {
                rejectSamplerLoad(error);
            }
        });

        this.sampler = sampler;

        if (this.filter) {
            sampler.connect(this.filter);
        }

        await this.withTimeout(samplerLoad, 45000, `${sfConfig.name} sample load`);
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
        const humanize = Math.min(0.2, Math.max(0, this.currentHumanize));
        const humanVelocity = velocity * (1 - humanize * 0.5 + Math.random() * humanize);
        const shapedVelocity = Math.pow(humanVelocity, this.currentVelocityCurve) * this.currentVelocityGain;
        const expressiveVelocity = Math.min(1, Math.max(0.05, shapedVelocity));

        // If the note is already in sustained state, we re-trigger it
        if (this.sustainedNotes.has(finalNote)) {
            this.sustainedNotes.delete(finalNote);
        }

        if (this.activeAudioBackend === 'spessa' && this.spessaSynth) {
            // SpessaSynth routing
            const midiNote = Math.round(Tone.Frequency(finalNote).toMidi());
            // Velocity mapped 0-127
            this.spessaSynth.noteOn(0, midiNote, Math.round(expressiveVelocity * 127));
        } else if (this.sampler) {
            // Tone.js routing
            this.sampler.triggerAttack(finalNote, Tone.now(), expressiveVelocity);
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
            if (this.activeAudioBackend === 'spessa' && this.spessaSynth) {
                const midiNote = Math.round(Tone.Frequency(finalNote).toMidi());
                this.spessaSynth.noteOff(0, midiNote);
            } else if (this.sampler) {
                this.sampler.triggerRelease(finalNote, Tone.now() + this.currentReleaseDelay);
            }
            this.sustainedNotes.delete(finalNote);
        }
    }

    // Effect Controls
    public setReverb(wet: number) {
        this.currentReverbWet = wet;
        this.applyEffectProfile();
    }

    public setStudioMode(enabled: boolean) {
        this.studioMode = enabled;
        this.applyEffectProfile();
    }

    public setFilterPreset(filterPresetId: string) {
        const preset = this.availableFilterPresets.find(item => item.id === filterPresetId);
        if (!preset) return;

        this.currentFilterPresetId = preset.id;
        this.applyEffectProfile();
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
                if (this.activeAudioBackend === 'spessa' && this.spessaSynth) {
                    const midiNote = Math.round(Tone.Frequency(noteToRelease).toMidi());
                    this.spessaSynth.noteOff(0, midiNote);
                } else if (this.sampler) {
                    this.sampler.triggerRelease(noteToRelease, Tone.now() + this.currentReleaseDelay);
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
        try {
            await this.withTimeout(Tone.start(), 5000, 'Audio context start');
        } catch (err) {
            console.warn("Audio context did not start immediately", err);
        }

        if (this.spessaContext && this.spessaContext.state !== 'running') {
            await this.withTimeout(this.spessaContext.resume(), 5000, 'SpessaSynth audio context resume');
        }
    }

    private async ensureSpessaSynth() {
        this.ensureToneEffects();

        if (!this.spessaContext) {
            const AudioContextConstructor = window.AudioContext || (window as BrowserAudioWindow).webkitAudioContext;
            if (!AudioContextConstructor) {
                throw new Error("Web Audio API is not supported in this browser.");
            }
            const toneRawContext = Tone.getContext().rawContext;
            this.spessaContext = toneRawContext instanceof AudioContextConstructor
                ? toneRawContext
                : new AudioContextConstructor();
            this.spessaMasterGain = this.spessaContext.createGain();

            this.spessaMasterGain.gain.value = Math.pow(10, this.currentVolume / 20);
        }

        if (!this.spessaConnectedToEffects && this.spessaMasterGain && this.filter) {
            Tone.connect(this.spessaMasterGain, this.filter);
            this.spessaConnectedToEffects = true;
        }

        if (this.spessaContext.state !== 'running') {
            try {
                await this.withTimeout(this.spessaContext.resume(), 5000, 'SpessaSynth audio context resume');
            } catch (err) {
                console.warn("SpessaSynth audio context did not resume immediately", err);
            }
        }

        if (!this.spessaSynth) {
            // Initialize SpessaSynth
            await this.withTimeout(
                this.spessaContext.audioWorklet.addModule("/spessasynth_processor.min.js"),
                15000,
                'SpessaSynth worklet load'
            );
            this.spessaSynth = new WorkletSynthesizer(this.spessaContext);

            // Connect to our master gain instead of default destination
            this.spessaSynth.disconnect();
            this.spessaSynth.connect(this.spessaMasterGain!);
        }
    }

    private async loadSpessaSoundfont(buffer: ArrayBuffer, bankId: string, displayName: string, program = 0) {
        await this.ensureSpessaSynth();

        if (this.currentSpessaBankId && this.currentSpessaBankId !== bankId) {
            try {
                await this.spessaSynth!.soundBankManager.deleteSoundBank(this.currentSpessaBankId);
            } catch (err) {
                console.warn("Could not unload previous SpessaSynth bank", err);
            }
        }

        if (this.currentSpessaBankId !== bankId) {
            console.log(`Loading ${displayName} into SpessaSynth`);
            await this.withTimeout(
                this.spessaSynth!.soundBankManager.addSoundBank(buffer, bankId),
                30000,
                `${displayName} SpessaSynth import`
            );
            this.currentSpessaBankId = bankId;
        }

        const priorityOrder = this.spessaSynth!.soundBankManager.priorityOrder.filter(id => id !== bankId);
        this.spessaSynth!.soundBankManager.priorityOrder = [bankId, ...priorityOrder];

        await this.withTimeout(this.spessaSynth!.isReady, 30000, `${displayName} SpessaSynth ready`);
        this.spessaSynth!.programChange(0, program);
        this.spessaSynth!.stopAll(true);

        // Disable existing sampler if required to save memory/processing
        if (this.sampler) {
            this.sampler.dispose();
            this.sampler = null;
        }

        this.activeAudioBackend = 'spessa';
        this.isLoaded = true;
        console.log(`${displayName} loaded via SpessaSynth`);
    }

    public async loadCustomSoundfont(buffer: ArrayBuffer, name: string) {
        const bankId = `custom-${name.replace(/[^a-z0-9.-]+/gi, '-')}`;
        await this.loadSpessaSoundfont(buffer, bankId, `Custom Soundfont ${name}`);
        this.currentSoundfont = `custom-sf2-${name}`;
    }
}

export const audioEngine = new PianoAudioEngine();

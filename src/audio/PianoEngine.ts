import * as Tone from 'tone';
import { WorkletSynthesizer } from 'spessasynth_lib';

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
    public availableSoundfonts = [
        { id: 'salamander', name: 'Salamander Grand', baseUrl: 'https://tonejs.github.io/audio/salamander/' },
        { id: 'casio', name: 'Casio Keyboard', baseUrl: 'https://tonejs.github.io/audio/casio/' },
        { id: 'guitar-acoustic', name: 'Acoustic Guitar', baseUrl: 'https://tonejs.github.io/audio/guitar-acoustic/' },
        { id: 'xylophone', name: 'Xylophone', baseUrl: 'https://tonejs.github.io/audio/xylophone/' },
        { id: 'harp', name: 'Harp', baseUrl: 'https://tonejs.github.io/audio/harp/' },
        { id: 'hakurei-felt', name: 'Hakurei Felt (Emulated)', baseUrl: 'https://tonejs.github.io/audio/salamander/' },
        { id: 'sk2-pure', name: 'SK2 Pure (Emulated)', baseUrl: 'https://tonejs.github.io/audio/salamander/' }
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
        } catch (e) {
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
        let lowFreq = 0, midFreq = 1, highFreq = 2;
        let filterFreq = 20000;
        let attackTime = 0; // default for sampler

        if (sfConfig.id === 'hakurei-felt') {
            lowFreq = 6;
            midFreq = 0;
            highFreq = -20; // Cut highs for felt
            filterFreq = 800; // Lowpass filter
            attackTime = 0.05; // Softer attack
        } else if (sfConfig.id === 'sk2-pure') {
            lowFreq = -2;
            midFreq = 2;
            highFreq = 8; // Brighten up
            filterFreq = 20000;
        }

        if (this.eq) {
            this.eq.low.value = lowFreq;
            this.eq.mid.value = midFreq;
            this.eq.high.value = highFreq;
        }

        if (this.filter) {
            this.filter.frequency.value = filterFreq;
        }

        // Dispose old sampler if changing
        if (this.sampler) {
            this.sampler.dispose();
            this.sampler = null;
        }

        let urls: any = {};
        if (sfConfig.id === 'casio') {
            urls = {
                A1: "A1.mp3", A2: "A2.mp3", C2: "C2.mp3", C3: "C3.mp3", "D#2": "Ds2.mp3", "F#2": "Fs2.mp3"
            };
        } else if (sfConfig.id === 'guitar-acoustic') {
            urls = {
                F4: "F4.mp3", F3: "F3.mp3", F2: "F2.mp3",
                C4: "C4.mp3", C3: "C3.mp3",
                A4: "A4.mp3", A3: "A3.mp3", A2: "A2.mp3"
            };
        } else if (sfConfig.id === 'xylophone') {
            urls = {
                C5: "C5.mp3", C6: "C6.mp3", C7: "C7.mp3", C8: "C8.mp3",
                G4: "G4.mp3", G5: "G5.mp3", G6: "G6.mp3", G7: "G7.mp3"
            };
        } else if (sfConfig.id === 'harp') {
            urls = {
                C5: "C5.mp3", D2: "D2.mp3", D4: "D4.mp3", D6: "D6.mp3", D7: "D7.mp3",
                E1: "E1.mp3", E3: "E3.mp3", E5: "E5.mp3", F2: "F2.mp3", F4: "F4.mp3",
                F6: "F6.mp3", F7: "F7.mp3", G1: "G1.mp3", G3: "G3.mp3", G5: "G5.mp3",
                A2: "A2.mp3", A4: "A4.mp3", A6: "A6.mp3", B1: "B1.mp3", B3: "B3.mp3",
                B5: "B5.mp3", B6: "B6.mp3", C3: "C3.mp3"
            };
        } else {
            // Salamander Grand (default)
            urls = {
                A0: "A0.mp3", C1: "C1.mp3", "D#1": "Ds1.mp3", "F#1": "Fs1.mp3",
                A1: "A1.mp3", C2: "C2.mp3", "D#2": "Ds2.mp3", "F#2": "Fs2.mp3",
                A2: "A2.mp3", C3: "C3.mp3", "D#3": "Ds3.mp3", "F#3": "Fs3.mp3",
                A3: "A3.mp3", C4: "C4.mp3", "D#4": "Ds4.mp3", "F#4": "Fs4.mp3",
                A4: "A4.mp3", C5: "C5.mp3", "D#5": "Ds5.mp3", "F#5": "Fs5.mp3",
                A5: "A5.mp3", C6: "C6.mp3", "D#6": "Ds6.mp3", "F#6": "Fs6.mp3",
                A6: "A6.mp3", C7: "C7.mp3", "D#7": "Ds7.mp3", "F#7": "Fs7.mp3",
                A7: "A7.mp3", C8: "C8.mp3"
            };
        }


        // Load Piano Sampler
        this.sampler = new Tone.Sampler({
            urls: urls,
            baseUrl: sfConfig.baseUrl,
            attack: attackTime,
            release: 1.5,
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
        } catch (e) {
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
            this.spessaContext = new (window.AudioContext || (window as any).webkitAudioContext)();
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

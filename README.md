# Virtual Piano & Sound Sculpture

A 3D virtual piano built with React Three Fiber, Rapier Physics, and Tone.js. Play notes, switch piano soundfonts, and use Sound Sculpture mode for reactive visuals.

## Features

*   **Interactive 3D Piano Scene**: A playable 3D piano built with `@react-three/fiber` and `@react-three/drei`.
*   **Piano Audio Engine**: Powered by `Tone.js` and `SpessaSynth`, with Salamander Grand, emulated felt/studio presets, free SoundFont sources, and custom `.sf2`/`.sf3` SoundFont loading.
*   **Sound Sculpture Mode**: A dynamic audio-reactive 3D physics environment.
*   **Advanced Audio Controls**: Real-time control over volume, reverb, Studio Mode, transposition, sustain, and instrument selection.
*   **Interactive UI**: Overlay controls plus a draggable, resizable notepad for chords and lyrics.

## Getting Started

### Prerequisites

*   Node.js v18 or higher
*   npm or yarn

### Installation

1.  Clone the repository and navigate to the project directory:
    ```bash
    cd vp
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Start the development server:
    ```bash
    npm run dev
    ```

4.  Open `http://localhost:5173` or the port provided by Vite.

## How to Play

*   **Keyboard**: Use your computer keyboard to play the piano, for example `A`, `W`, `S`, `E`, `D`.
*   **Mouse**: Click directly on the 3D piano keys.
*   **Sustain Pedal**: Hold `Spacebar` or toggle `Sustain (Always On)` in the overlay.
*   **Sculpture Mode**: Use the overlay button to switch between piano mode and the visualizer.

## Piano Soundfonts

The instrument selector includes fast-loading free piano presets from:

*   Salamander Grand Piano samples hosted by Tone.js.
*   FluidR3, MusyngKite, and FatBoy presets hosted by `gleitz/midi-js-soundfonts`.
*   Extra lightweight FluidR3 instruments for different colors: DX electric piano, harpsichord, clavinet, celesta, music box, vibraphone, warm pad, and synth strings.
*   Lightweight emulated soft/felt variants such as Hakurei Pure, Hakurei Felt, Nocturne Felt, and Velvet Soft.
*   FreePats Upright Piano KW local samples (`CC0-1.0`) in `public/soundfonts/upright-kw-small/` and `public/soundfonts/upright-kw-bright/`.
*   FreePats Old Piano FB local samples (`CC0-1.0`) in `public/soundfonts/old-piano-fb/`.
*   Local `.sf2` / `.sf3` files can still be loaded through SpessaSynth, with a fallback to Hakurei Felt if the browser rejects or times out while importing the bank.

The filter selector can reshape any instrument with lightweight Web Audio presets: Natural, Felt Dark, Bright Glass, Tape Warm, Lo-Fi Room, Dream Hall, and Wide Chorus.

To add more local soundfonts, use the `+ Load .SF2/.SF3 File` option in the overlay. Built-in web presets are mapped in `src/audio/PianoEngine.ts`.

Recommended full-quality SF2 sources:

*   FreePats Upright Piano KW: CC0, 27MiB SF2 archive, 2 velocity layers. The built-in version uses extracted local WAV samples so it loads reliably in the browser.
*   FreePats Salamander Grand Piano: CC-BY-3.0, 296MiB SF2 archive, 16 velocity layers.

## Technology Stack

*   **Frontend Framework**: React 19 + TypeScript
*   **3D Rendering**: `@react-three/fiber`, `@react-three/drei`, `three.js`
*   **Physics Engine**: `@react-three/rapier`
*   **Post-Processing**: `@react-three/postprocessing`
*   **Audio Synthesis**: `tone.js`, `spessasynth_lib`
*   **Build Tool**: Vite
*   **Styling**: Vanilla CSS

## License

This project is created for educational and experimental purposes.

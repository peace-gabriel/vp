# Virtual Piano & Sound Sculpture

A 3D virtual piano built with React Three Fiber, Rapier Physics, and Tone.js. Play notes, switch piano soundfonts, and use Sound Sculpture mode for reactive visuals.

## Features

*   **Interactive 3D Piano Scene**: A playable 3D piano built with `@react-three/fiber` and `@react-three/drei`.
*   **Piano Audio Engine**: Powered by `Tone.js` and `SpessaSynth`, with Salamander Grand, multiple free built-in piano presets from MIDI.js Soundfonts, and custom `.sf2`/`.sf3` SoundFont loading.
*   **Sound Sculpture Mode**: A dynamic audio-reactive 3D physics environment.
*   **Advanced Audio Controls**: Real-time control over volume, reverb, transposition, sustain, and instrument selection.
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

To add more local soundfonts, use the `+ Load .SF2/.SF3 File` option in the overlay. Built-in web presets are mapped in `src/audio/PianoEngine.ts`.

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

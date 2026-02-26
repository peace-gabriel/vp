# Virtual Piano & Sound Sculpture 🎹✨

A stunning, interactive 3D Virtual Piano application built with React Three Fiber, Rapier Physics, and Tone.js. Play notes, explore different soundfonts, and watch the music come alive in the immersive "Sound Sculpture" mode.

## 🌟 Features

*   **Interactive 3D Piano Scene**: A fully playable, visually rich 3D piano built with `@react-three/fiber` and `@react-three/drei`.
*   **Realistic Audio Engine**: Powered by `Tone.js` and `SpessaSynth`, supporting multiple built-in instruments (Salamander Grand, Acoustic Guitar, Harp, etc.) and custom `.sf2` SoundFont loading.
*   **🎵 Sound Sculpture Mode**: A dynamic, audio-reactive 3D physics environment!
    *   **Live Reaction**: The sculpture pieces react in real-time to the keys you play.
    *   **Frequency-driven Physics**: 
        *   **Treble (High Notes)**: Produce a strong gravitational pull, attracting the pieces to form a central shape.
        *   **Bass (Low Notes)**: Generate explosive repulsion force, scattering the pieces outward into the void.
    *   **Center of Mass Tracking**: The camera intelligently pans and zooms based on the average location and spread of the active pieces.
    *   **Post-processing Magic**: Stunning visual effects including Black Fog, Bloom, and Chromatic Aberration (`@react-three/postprocessing`).
*   **Advanced Audio Controls**: Real-time control over Volume, Reverb, Transposition, Sustain Toggle, and Instrument selection.
*   **Interactive UI**: A sleek, glassmorphic overlay to manage settings and a draggable, resizable Notepad for jotting down chords and lyrics.

## 🚀 Getting Started

### Prerequisites

*   Node.js (v18 or higher recommended)
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
4.  Open your browser and navigate to `http://localhost:5173` (or the port provided by Vite).

## 🎮 How to Play

*   **Keyboard**: Use your computer keyboard to play the piano (e.g., `A`, `W`, `S`, `E`, `D` for the C major scale).
*   **Mouse**: Click directly on the 3D piano keys.
*   **Sustain Pedal**: Hold the `Spacebar` or toggle the "Sustain (Always On)" checkbox in the overlay.
*   **Sculpture Mode**: Click the "🎵 Sculpture Mode" button in the overlay to switch to the immersive visualizer. Play notes to scatter and attract the physics pieces!

## 🛠️ Technology Stack

*   **Frontend Framework**: React 19 + TypeScript
*   **3D Rendering**: `@react-three/fiber`, `@react-three/drei`, `three.js`
*   **Physics Engine**: `@react-three/rapier` (Rapier physics engine bindings for React)
*   **Post-Processing**: `@react-three/postprocessing`
*   **Audio Synthesis**: `tone.js`, `spessasynth_lib` (for .sf2 soundfonts)
*   **Build Tool**: Vite
*   **Styling**: Vanilla CSS

## 📝 License

This project is created for educational and experimental purposes.

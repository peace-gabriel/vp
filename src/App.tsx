import { useEffect, useState, useCallback, useRef } from 'react';
import Scene from './components/canvas/Scene';
import Overlay from './components/ui/Overlay';
import Notepad from './components/ui/Notepad';
import PianoRoll2D from './components/piano-roll/PianoRoll2D';
import SoundSculpture from './components/canvas/SoundSculpture/SoundSculpture';
import SpikeSphere from './components/canvas/SoundSculpture/SpikeSphere';
import ShootingStars from './components/canvas/SoundSculpture/ShootingStars';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom, ChromaticAberration } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import * as THREE from 'three';
import { getNoteFromKey } from './utils/keyMap';
import { audioEngine } from './audio/PianoEngine';
import type { PlayedNote } from './components/canvas/NoteColumns';
import './index.css';

type VjMode = 'clean' | 'cyber' | 'aurora' | 'pixel-rain';

function App() {
  const [started, setStarted] = useState(false);
  const [showNotepad, setShowNotepad] = useState(false);
  const [sculptureMode, setSculptureMode] = useState(false);
  const [visualMode, setVisualMode] = useState<'2d' | '3d'>(() => {
    const stored = localStorage.getItem('vp_visualMode');
    return stored === '3d' ? '3d' : '2d';
  });
  const [vjEnabled, setVjEnabled] = useState<boolean>(() => {
    const stored = localStorage.getItem('vp_vjEnabled');
    if (stored === null) return true;
    try {
      return JSON.parse(stored);
    } catch {
      return true;
    }
  });
  const [vjIntensity, setVjIntensity] = useState<number>(() => {
    const stored = localStorage.getItem('vp_vjIntensity');
    if (stored === null) return 0.72;
    try {
      const parsed = Number(JSON.parse(stored));
      return Number.isFinite(parsed) ? Math.min(1, Math.max(0, parsed)) : 0.72;
    } catch {
      return 0.72;
    }
  });
  const [vjMode, setVjMode] = useState<VjMode>(() => {
    const stored = localStorage.getItem('vp_vjMode');
    return stored === 'clean' || stored === 'aurora' || stored === 'pixel-rain' || stored === 'cyber'
      ? stored
      : 'cyber';
  });
  const [sculptureType, setSculptureType] = useState<'cubes' | 'sphere' | 'stars'>('cubes');
  const [bloomIntensity, setBloomIntensity] = useState(1.5);
  const [cameraDistance, setCameraDistance] = useState(30);
  const [gravityStrength, setGravityStrength] = useState(300);
  const [explosionForce, setExplosionForce] = useState(120);
  const [spikeColorMode, setSpikeColorMode] = useState<'reativo' | 'onda' | 'strobe' | 'rgb' | 'notas'>('reativo');
  const [spikeColor, setSpikeColor] = useState('#00ffff');
  const [activeNotes, setActiveNotes] = useState<Set<string>>(new Set());
  const [playedNotes, setPlayedNotes] = useState<PlayedNote[]>([]);

  // Using a ref for active notes to efficiently check in event listeners without stale closures
  const activeNotesRef = useRef<Set<string>>(new Set());
  const playedNotesRef = useRef<PlayedNote[]>([]);
  const pressedKeysRef = useRef<Map<string, string>>(new Map());

  const addNote = useCallback((note: string) => {
    setActiveNotes((prev) => {
      const next = new Set(prev);
      next.add(note);
      activeNotesRef.current = next;
      return next;
    });

    const newPlayedNote: PlayedNote = {
      id: Math.random().toString(36).substr(2, 9),
      note,
      startTime: performance.now(),
      endTime: null
    };

    setPlayedNotes((prev) => {
      // Keep only the last 40 notes to prevent huge React fiber trees and memory/render lag
      const next = [...prev, newPlayedNote].slice(-40);
      playedNotesRef.current = next;
      return next;
    });
  }, []);

  const removeNote = useCallback((note: string) => {
    setActiveNotes((prev) => {
      const next = new Set(prev);
      next.delete(note);
      activeNotesRef.current = next;
      return next;
    });

    setPlayedNotes((prev) => {
      const now = performance.now();
      const next = prev.map(pn =>
        pn.note === note && pn.endTime === null
          ? { ...pn, endTime: now }
          : pn
      );
      playedNotesRef.current = next;
      return next;
    });
  }, []);

  const handlePlayNote = useCallback((note: string) => {
    if (!activeNotesRef.current.has(note)) {
      addNote(note);
      audioEngine.playNote(note);
    }
  }, [addNote]);

  const handleReleaseNote = useCallback((note: string) => {
    if (activeNotesRef.current.has(note)) {
      removeNote(note);
      audioEngine.releaseNote(note);
    }
  }, [removeNote]);

  useEffect(() => {
    if (!started) return;

    const releaseAllActiveNotes = () => {
      audioEngine.releaseAllNotes();
      pressedKeysRef.current.clear();

      setActiveNotes(new Set());
      activeNotesRef.current = new Set();

      setPlayedNotes((prev) => {
        const now = performance.now();
        const next = prev.map(pn => ({ ...pn, endTime: pn.endTime || now }));
        playedNotesRef.current = next;
        return next;
      });
    };

    const onKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;

      // Sustain Pedal (Spacebar)
      if (e.code === 'Space') {
        e.preventDefault();
        audioEngine.setSustainPedal(true);
        return;
      }

      const keyId = e.code || e.key;
      if (e.repeat || pressedKeysRef.current.has(keyId)) return; // Prevent continuous firing if key is held down

      const note = getNoteFromKey(e);
      if (note) {
        e.preventDefault();
        pressedKeysRef.current.set(keyId, note);
        handlePlayNote(note);
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        audioEngine.setSustainPedal(false);
        return;
      }

      const keyId = e.code || e.key;
      const note = pressedKeysRef.current.get(keyId) ?? getNoteFromKey(e);
      pressedKeysRef.current.delete(keyId);

      if (note) {
        e.preventDefault();
        handleReleaseNote(note);
      }
    };

    // Fix stuck notes on blur using visibilitychange which is safer for <select> popups
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        releaseAllActiveNotes();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', releaseAllActiveNotes);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', releaseAllActiveNotes);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [started, handlePlayNote, handleReleaseNote]);

  return (
    <>
      <Overlay
        onStart={async () => {
          setStarted(true);
        }}
        started={started}
        onOpenNotepad={() => setShowNotepad(true)}
        sculptureMode={sculptureMode}
        onToggleSculptureMode={() => setSculptureMode(!sculptureMode)}
        sculptureType={sculptureType}
        onSculptureTypeChange={setSculptureType}
        bloomIntensity={bloomIntensity}
        onBloomChange={setBloomIntensity}
        cameraDistance={cameraDistance}
        onCameraDistanceChange={setCameraDistance}
        gravityStrength={gravityStrength}
        onGravityChange={setGravityStrength}
        explosionForce={explosionForce}
        onExplosionChange={setExplosionForce}
        spikeColorMode={spikeColorMode}
        onSpikeColorModeChange={setSpikeColorMode}
        spikeColor={spikeColor}
        onSpikeColorChange={setSpikeColor}
        visualMode={visualMode}
        onToggleVisualMode={() => {
          const next = visualMode === '2d' ? '3d' : '2d';
          setVisualMode(next);
          localStorage.setItem('vp_visualMode', next);
        }}
        vjEnabled={vjEnabled}
        onToggleVj={() => {
          const next = !vjEnabled;
          setVjEnabled(next);
          localStorage.setItem('vp_vjEnabled', JSON.stringify(next));
        }}
        vjIntensity={vjIntensity}
        onVjIntensityChange={(value) => {
          setVjIntensity(value);
          localStorage.setItem('vp_vjIntensity', JSON.stringify(value));
        }}
        vjMode={vjMode}
        onVjModeChange={(value) => {
          setVjMode(value);
          localStorage.setItem('vp_vjMode', value);
        }}
        onUploadAudio={() => { }} // Now unused but kept for prop satisfaction or future use
      />
      {started && showNotepad && <Notepad onClose={() => setShowNotepad(false)} />}

      {started && !sculptureMode && visualMode === '2d' && (
        <PianoRoll2D
          activeNotes={activeNotes}
          playedNotes={playedNotes}
          vjEnabled={vjEnabled}
          vjIntensity={vjIntensity}
          vjMode={vjMode}
          onPlayNote={handlePlayNote}
          onReleaseNote={handleReleaseNote}
        />
      )}

      {started && !sculptureMode && visualMode === '3d' && (
        <Scene
          activeNotes={activeNotes}
          playedNotes={playedNotes}
          onPlayNote={handlePlayNote}
          onReleaseNote={handleReleaseNote}
        />
      )}

      {started && sculptureMode && (
        <Canvas camera={{ position: [0, 15, 30], fov: 45 }} shadows>
          <color attach="background" args={['#010103']} />
          {sculptureType === 'cubes' && <fog attach="fog" args={['#010103', 10, 60]} />}
          <ambientLight intensity={0.3} />
          <directionalLight position={[10, 20, 10]} intensity={1.5} castShadow />

          {sculptureType === 'cubes' && <SoundSculpture musicUrl={null} cameraDistance={cameraDistance} gravityStrength={gravityStrength} explosionForce={explosionForce} />}
          {sculptureType === 'sphere' && <SpikeSphere colorMode={spikeColorMode} baseColor={spikeColor} />}
          {sculptureType === 'stars' && <ShootingStars />}

          <OrbitControls
            makeDefault
            minPolarAngle={0}
            maxPolarAngle={Math.PI / 2 + 0.1}
            minDistance={10}
            maxDistance={80}
          />
          <EffectComposer enableNormalPass={false}>
            <Bloom luminanceThreshold={0.2} mipmapBlur intensity={bloomIntensity} />
            <ChromaticAberration
              blendFunction={BlendFunction.NORMAL}
              offset={new THREE.Vector2(0.002, 0.002)}
            />
          </EffectComposer>
        </Canvas>
      )}
    </>
  );
}

export default App;

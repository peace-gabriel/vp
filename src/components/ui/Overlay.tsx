import React, { useState } from 'react';
import { audioEngine } from '../../audio/PianoEngine';
import { Box, PanelsTopLeft, Play, SlidersHorizontal, Sparkles } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

type VjMode = 'clean' | 'cyber' | 'aurora' | 'pixel-rain';

const FX_MODE_OPTIONS: Array<{ id: VjMode; name: string }> = [
    { id: 'clean', name: 'Clean' },
    { id: 'cyber', name: 'Cyber Stage' },
    { id: 'aurora', name: 'Aurora' },
    { id: 'pixel-rain', name: 'Pixel Rain' }
];

const buttonMotion = {
    whileHover: { y: -1, scale: 1.015 },
    whileTap: { y: 1, scale: 0.985 },
    transition: { duration: 0.14 }
};

interface OverlayProps {
    onStart: () => void;
    started: boolean;
    onOpenNotepad: () => void;
    sculptureMode: boolean;
    onToggleSculptureMode: () => void;
    sculptureType: 'cubes' | 'sphere' | 'stars';
    onSculptureTypeChange: (val: 'cubes' | 'sphere' | 'stars') => void;
    bloomIntensity: number;
    onBloomChange: (val: number) => void;
    cameraDistance: number;
    onCameraDistanceChange: (val: number) => void;
    gravityStrength: number;
    onGravityChange: (val: number) => void;
    explosionForce: number;
    onExplosionChange: (val: number) => void;
    spikeColorMode: 'reativo' | 'onda' | 'strobe' | 'rgb' | 'notas';
    onSpikeColorModeChange: (val: 'reativo' | 'onda' | 'strobe' | 'rgb' | 'notas') => void;
    spikeColor: string;
    onSpikeColorChange: (val: string) => void;
    visualMode: '2d' | '3d';
    onToggleVisualMode: () => void;
    vjEnabled: boolean;
    onToggleVj: () => void;
    vjIntensity: number;
    onVjIntensityChange: (val: number) => void;
    vjMode: VjMode;
    onVjModeChange: (val: VjMode) => void;
    onUploadAudio: (url: string) => void;
}

const Overlay: React.FC<OverlayProps> = ({
    onStart, started, onOpenNotepad,
    sculptureMode, onToggleSculptureMode,
    sculptureType, onSculptureTypeChange,
    bloomIntensity, onBloomChange,
    cameraDistance, onCameraDistanceChange,
    gravityStrength, onGravityChange,
    explosionForce, onExplosionChange,
    spikeColorMode, onSpikeColorModeChange,
    spikeColor, onSpikeColorChange,
    visualMode, onToggleVisualMode,
    vjEnabled, onToggleVj,
    vjIntensity, onVjIntensityChange,
    vjMode, onVjModeChange,
    onUploadAudio
}) => {
    void onUploadAudio;

    const getStored = <T,>(key: string, fallback: T): T => {
        const stored = localStorage.getItem(`vp_${key}`);
        if (stored !== null) {
            try { return JSON.parse(stored); } catch { return fallback; }
        }
        return fallback;
    };
    const saveStored = (key: string, val: unknown) => localStorage.setItem(`vp_${key}`, JSON.stringify(val));
    const query = new URLSearchParams(window.location.search);

    const [volume, setVolume] = useState<number>(() => getStored('volume', -5));
    const [reverb, setReverb] = useState<number>(() => getStored('reverb', 0.3));
    const [transpose, setTranspose] = useState<number>(() => getStored('transpose', 0));
    const [studioMode, setStudioMode] = useState<boolean>(() => {
        const queryStudio = query.get('studio');
        if (queryStudio !== null) return queryStudio !== '0' && queryStudio !== 'false';
        return getStored('studioMode', true);
    });
    const [starting, setStarting] = useState(false);
    const [soundfont, setSoundfont] = useState<string>(() => {
        const sf = query.get('soundfont') ?? getStored('soundfont', audioEngine.currentSoundfont);
        if (sf.startsWith('custom-sf2-')) return 'salamander';
        return audioEngine.availableSoundfonts.some((available) => available.id === sf) ? sf : 'salamander';
    });
    const [filterPreset, setFilterPreset] = useState<string>(() => {
        const preset = query.get('filter') ?? getStored('filterPreset', 'natural');
        return audioEngine.availableFilterPresets.some((available) => available.id === preset) ? preset : 'natural';
    });
    const [sustainToggle, setSustainToggle] = useState<boolean>(() => getStored('sustainToggle', false));

    // Load initial visual settings from localStorage only once on mount
    React.useEffect(() => {
        const storedBloom = getStored('bloomIntensity', 1.5);
        if (storedBloom !== bloomIntensity) onBloomChange(storedBloom);

        const storedCam = getStored('cameraDistance', 30);
        if (storedCam !== cameraDistance) onCameraDistanceChange(storedCam);

        const storedType = getStored<'cubes' | 'sphere' | 'stars'>('sculptureType', 'cubes');
        if (storedType !== sculptureType) onSculptureTypeChange(storedType);

        const storedGravity = getStored('gravityStrength', 300);
        if (storedGravity !== gravityStrength) onGravityChange(storedGravity);

        const storedExplosion = getStored('explosionForce', 120);
        if (storedExplosion !== explosionForce) onExplosionChange(storedExplosion);

        const storedSpikeColorMode = getStored<'reativo' | 'onda' | 'strobe' | 'rgb' | 'notas'>('spikeColorMode', 'reativo');
        if (storedSpikeColorMode !== spikeColorMode) onSpikeColorModeChange(storedSpikeColorMode);

        const storedSpikeColor = getStored('spikeColor', '#00ffff');
        if (storedSpikeColor !== spikeColor) onSpikeColorChange(storedSpikeColor);
        // Settings above are intentionally hydrated once from localStorage on mount.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleStart = async () => {
        if (starting) return;
        setStarting(true);

        try {
            await audioEngine.startAudioContext();

            // Sync loaded preferences to engine
            audioEngine.setVolume(volume);
            audioEngine.setReverb(reverb);
            audioEngine.setTranspose(transpose);
            audioEngine.setStudioMode(studioMode);
            audioEngine.setFilterPreset(filterPreset);
            audioEngine.setSustainToggle(sustainToggle);
            await audioEngine.loadSoundfont(soundfont);
            onStart();
        } catch (err) {
            console.error("Failed to start selected soundfont", err);
            await audioEngine.loadSoundfont('hakurei-felt');
            setSoundfont('hakurei-felt');
            saveStored('soundfont', 'hakurei-felt');
            alert("Error loading selected soundfont. Falling back to Hakurei Felt.");
            onStart();
        } finally {
            setStarting(false);
        }
    };

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseFloat(e.target.value);
        setVolume(val);
        audioEngine.setVolume(val);
        saveStored('volume', val);
    };

    const handleReverbChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseFloat(e.target.value);
        setReverb(val);
        audioEngine.setReverb(val);
        saveStored('reverb', val);
    };

    const handleTransposeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseInt(e.target.value);
        setTranspose(val);
        audioEngine.setTranspose(val);
        saveStored('transpose', val);
    };

    const handleStudioToggle = () => {
        const val = !studioMode;
        setStudioMode(val);
        audioEngine.setStudioMode(val);
        saveStored('studioMode', val);
    };

    const handleFilterPresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        setFilterPreset(val);
        audioEngine.setFilterPreset(val);
        saveStored('filterPreset', val);
        e.target.blur();
    };

    const handleVjIntensityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onVjIntensityChange(parseFloat(e.target.value));
    };

    const handleVjModeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        onVjModeChange(e.target.value as VjMode);
        e.target.blur();
    };

    const handleSoundfontChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        setSoundfont(val);
        try {
            await audioEngine.loadSoundfont(val);
            saveStored('soundfont', val);
        } catch (err) {
            console.error("Failed to load soundfont", err);
            alert("Error loading piano soundfont");
            setSoundfont(audioEngine.currentSoundfont);
        }
        e.target.blur();
    };

    const handleFileLoad = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const buffer = await file.arrayBuffer();
            await audioEngine.loadCustomSoundfont(buffer, file.name);
            setSoundfont(`custom-sf2-${file.name}`);
        } catch (err) {
            console.error("Failed to load soundfont", err);
            alert("Error loading .sf2 file");
        }

        e.target.value = ''; // Reset
        e.target.blur();
    };

    const handleSustainToggleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.checked;
        setSustainToggle(val);
        audioEngine.setSustainToggle(val);
        saveStored('sustainToggle', val);
        e.target.blur();
    };

    if (!started) {
        return (
            <div className="ui-container start-screen">
                <motion.button
                    className="btn"
                    onClick={handleStart}
                    disabled={starting}
                    style={{ padding: '1rem 2rem', fontSize: '1.25rem' }}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    {...buttonMotion}
                >
                    <Play size={24} /> {starting ? 'Loading Piano...' : 'Start Virtual Piano'}
                </motion.button>
            </div>
        );
    }

    return (
        <div className="ui-container">
            <motion.div
                className="panel control-panel"
                initial={{ opacity: 0, y: -16, filter: 'blur(8px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{ duration: 0.28, ease: 'easeOut' }}
            >
                <div className="control-section">
                    <div className="control-group">
                        <label>Volume</label>
                        <input
                            type="range"
                            min="-30" max="0" step="1"
                            value={volume}
                            onChange={handleVolumeChange}
                        />
                    </div>
                    <div className="control-group">
                        <label>Reverb</label>
                        <input
                            type="range"
                            min="0" max="1" step="0.05"
                            value={reverb}
                            onChange={handleReverbChange}
                        />
                    </div>
                    <div className="control-group">
                        <label className="icon-label"><SlidersHorizontal size={12} /> Filter</label>
                        <select
                            value={filterPreset}
                            onChange={handleFilterPresetChange}
                            className="select-control filter-select"
                        >
                            {audioEngine.availableFilterPresets.map(preset => (
                                <option key={preset.id} value={preset.id}>{preset.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="control-group">
                        <label>Transpose ({transpose > 0 ? `+${transpose}` : transpose})</label>
                        <input
                            type="range"
                            min="-12" max="12" step="1"
                            value={transpose}
                            onChange={handleTransposeChange}
                        />
                    </div>
                    <motion.button
                        className={`btn compact-toggle ${studioMode ? 'active' : ''}`}
                        onClick={handleStudioToggle}
                        animate={{
                            boxShadow: studioMode ? '0 0 22px rgba(45, 212, 191, 0.2)' : '0 0 0 rgba(0,0,0,0)'
                        }}
                        {...buttonMotion}
                    >
                        <Sparkles size={16} /> Studio
                    </motion.button>
                    <motion.button
                        className={`btn compact-toggle ${visualMode === '2d' ? 'active' : ''}`}
                        onClick={onToggleVisualMode}
                        animate={{
                            boxShadow: visualMode === '2d' ? '0 0 22px rgba(56, 189, 248, 0.2)' : '0 0 0 rgba(0,0,0,0)'
                        }}
                        {...buttonMotion}
                    >
                        {visualMode === '2d' ? <PanelsTopLeft size={16} /> : <Box size={16} />}
                        {visualMode === '2d' ? '2D' : '3D'}
                    </motion.button>
                    <AnimatePresence initial={false}>
                        {visualMode === '2d' && (
                            <motion.div
                                className="vj-controls"
                                key="vj-controls"
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -8 }}
                                transition={{ duration: 0.18 }}
                            >
                                <motion.button
                                    type="button"
                                className={`btn compact-toggle ${vjEnabled ? 'active' : ''}`}
                                onClick={onToggleVj}
                                    animate={{
                                        scale: vjEnabled ? 1 : 0.98,
                                        boxShadow: vjEnabled ? '0 0 24px rgba(255, 72, 208, 0.18)' : '0 0 0 rgba(0,0,0,0)'
                                    }}
                                    {...buttonMotion}
                            >
                                VJ
                                </motion.button>
                                <div className="control-group vj-intensity-control">
                                    <label>Intensity</label>
                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.05"
                                        value={vjIntensity}
                                        onChange={handleVjIntensityChange}
                                        disabled={!vjEnabled}
                                    />
                                </div>
                                <div className="control-group">
                                    <label>FX Mode</label>
                                    <select
                                        value={vjMode}
                                        onChange={handleVjModeChange}
                                        className="select-control fx-select"
                                        disabled={!vjEnabled}
                                    >
                                        {FX_MODE_OPTIONS.map((mode) => (
                                            <option key={mode.id} value={mode.id}>{mode.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="panel-divider" />

                <div className="control-section instrument-section">
                    <div className="control-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input
                            type="checkbox"
                            checked={sustainToggle}
                            onChange={handleSustainToggleChange}
                            id="sustain-toggle"
                            style={{ cursor: 'pointer' }}
                        />
                        <label htmlFor="sustain-toggle" style={{ margin: 0, cursor: 'pointer' }}>Sustain (Always On)</label>
                    </div>
                    <div className="control-group">
                        <label>Instrument</label>
                        <div className="select-stack">
                            <select
                                value={soundfont}
                                onChange={handleSoundfontChange}
                                className="select-control"
                            >
                                {audioEngine.availableSoundfonts.map(sf => (
                                    <option key={sf.id} value={sf.id}>{sf.name}</option>
                                ))}
                                {soundfont.startsWith('custom-sf2-') && (
                                    <option value={soundfont}>[Custom] {soundfont.replace('custom-sf2-', '')}</option>
                                )}
                            </select>
                            <label className="file-link">
                                + Load .SF2/.SF3 File
                                <input
                                    type="file"
                                    accept=".sf2,.sf3,.sfpack,.dls"
                                    onChange={handleFileLoad}
                                    style={{ display: 'none' }}
                                />
                            </label>
                        </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <motion.button className={`btn compact-toggle ${sculptureMode ? 'active' : ''}`} onClick={onToggleSculptureMode} {...buttonMotion}>
                            {sculptureMode ? 'Piano Mode' : 'Sculpture'}
                        </motion.button>
                    </div>
                    <AnimatePresence initial={false}>
                    {sculptureMode && (
                        <motion.div
                            style={{ display: 'flex', gap: '1rem', borderLeft: '1px solid rgba(255,255,255,0.2)', paddingLeft: '1rem' }}
                            initial={{ opacity: 0, width: 0 }}
                            animate={{ opacity: 1, width: 'auto' }}
                            exit={{ opacity: 0, width: 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            <div className="control-group">
                                <label>Type</label>
                                <select
                                    style={{ background: 'rgba(0,0,0,0.5)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', padding: '0.25rem', borderRadius: '4px' }}
                                    value={sculptureType}
                                    onChange={(e) => {
                                        const val = e.target.value as 'cubes' | 'sphere';
                                        onSculptureTypeChange(val);
                                        saveStored('sculptureType', val);
                                        e.target.blur();
                                    }}
                                >
                                    <option value="cubes">Chaos Cubes</option>
                                    <option value="sphere">Spike Sphere</option>
                                    <option value="stars">Shooting Stars</option>
                                </select>
                            </div>
                            <div className="control-group">
                                <label>Bloom</label>
                                <input
                                    type="range"
                                    min="0" max="4" step="0.1"
                                    value={bloomIntensity}
                                    onChange={(e) => {
                                        const val = parseFloat(e.target.value);
                                        onBloomChange(val);
                                        saveStored('bloomIntensity', val);
                                    }}
                                />
                            </div>
                            <div className="control-group">
                                <label>Distance</label>
                                <input
                                    type="range"
                                    min="15" max="80" step="1"
                                    value={cameraDistance}
                                    onChange={(e) => {
                                        const val = parseFloat(e.target.value);
                                        onCameraDistanceChange(val);
                                        saveStored('cameraDistance', val);
                                    }}
                                />
                            </div>
                            {sculptureType === 'sphere' && (
                                <>
                                    <div className="control-group">
                                        <label>Color Mode</label>
                                        <select
                                            style={{ background: 'rgba(0,0,0,0.5)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', padding: '0.25rem', borderRadius: '4px' }}
                                            value={spikeColorMode}
                                            onChange={(e) => {
                                                const val = e.target.value as 'reativo' | 'onda' | 'strobe' | 'rgb' | 'notas';
                                                onSpikeColorModeChange(val);
                                                saveStored('spikeColorMode', val);
                                                e.target.blur();
                                            }}
                                        >
                                            <option value="reativo">Reactive</option>
                                            <option value="notas">Pitch (Notas)</option>
                                            <option value="onda">Wave</option>
                                            <option value="strobe">Strobe</option>
                                            <option value="rgb">RGB Loop</option>
                                        </select>
                                    </div>
                                    {spikeColorMode !== 'rgb' && (
                                        <div className="control-group">
                                            <label>Base Color</label>
                                            <input
                                                type="color"
                                                value={spikeColor}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    onSpikeColorChange(val);
                                                    saveStored('spikeColor', val);
                                                }}
                                                style={{ cursor: 'pointer', background: 'none', border: 'none', width: '30px', height: '30px', padding: 0 }}
                                            />
                                        </div>
                                    )}
                                </>
                            )}
                            {sculptureType === 'cubes' && (
                                <>
                                    <div className="control-group">
                                        <label>Gravity</label>
                                        <input
                                            type="range"
                                            min="0" max="1000" step="10"
                                            value={gravityStrength}
                                            onChange={(e) => {
                                                const val = parseFloat(e.target.value);
                                                onGravityChange(val);
                                                saveStored('gravityStrength', val);
                                            }}
                                        />
                                    </div>
                                    <div className="control-group">
                                        <label>Explosion</label>
                                        <input
                                            type="range"
                                            min="0" max="500" step="10"
                                            value={explosionForce}
                                            onChange={(e) => {
                                                const val = parseFloat(e.target.value);
                                                onExplosionChange(val);
                                                saveStored('explosionForce', val);
                                            }}
                                        />
                                    </div>
                                </>
                            )}
                        </motion.div>
                    )}
                    </AnimatePresence>
                    <motion.button className="btn" onClick={onOpenNotepad} style={{ marginLeft: 'auto' }} {...buttonMotion}>
                        Open Notepad
                    </motion.button>
                </div>
            </motion.div>
        </div>
    );
};

export default Overlay;

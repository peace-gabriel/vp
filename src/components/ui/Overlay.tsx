import React, { useState } from 'react';
import { audioEngine } from '../../audio/PianoEngine';
import { Play } from 'lucide-react';

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
    onUploadAudio
}) => {
    const getStored = <T,>(key: string, fallback: T): T => {
        const stored = localStorage.getItem(`vp_${key}`);
        if (stored !== null) {
            try { return JSON.parse(stored); } catch (e) { return fallback; }
        }
        return fallback;
    };
    const saveStored = (key: string, val: any) => localStorage.setItem(`vp_${key}`, JSON.stringify(val));

    const [volume, setVolume] = useState<number>(() => getStored('volume', -5));
    const [reverb, setReverb] = useState<number>(() => getStored('reverb', 0.3));
    const [transpose, setTranspose] = useState<number>(() => getStored('transpose', 0));
    const [soundfont, setSoundfont] = useState<string>(() => {
        const sf = getStored('soundfont', audioEngine.currentSoundfont);
        if (sf.startsWith('custom-sf2-')) return 'salamander';
        return sf;
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
    }, []);

    const handleStart = async () => {
        // Sync loaded preferences to engine
        audioEngine.setVolume(volume);
        audioEngine.setReverb(reverb);
        audioEngine.setTranspose(transpose);
        audioEngine.setSustainToggle(sustainToggle);
        await audioEngine.loadSoundfont(soundfont);
        onStart();
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

    const handleSoundfontChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        setSoundfont(val);
        audioEngine.loadSoundfont(val);
        saveStored('soundfont', val);
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
            <div className="ui-container" style={{ pointerEvents: 'auto', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <button className="btn" onClick={handleStart} style={{ padding: '1rem 2rem', fontSize: '1.25rem' }}>
                    <Play size={24} /> Start Virtual Piano
                </button>
            </div>
        );
    }

    return (
        <div className="ui-container">
            <div className="panel" style={{ display: 'inline-flex', gap: '2rem' }}>
                <div style={{ display: 'flex', gap: '1rem' }}>
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
                        <label>Transpose ({transpose > 0 ? `+${transpose}` : transpose})</label>
                        <input
                            type="range"
                            min="-12" max="12" step="1"
                            value={transpose}
                            onChange={handleTransposeChange}
                        />
                    </div>
                </div>

                <div style={{ borderLeft: '1px solid rgba(255,255,255,0.2)', paddingLeft: '2rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
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
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <select
                                value={soundfont}
                                onChange={handleSoundfontChange}
                                style={{ background: 'rgba(0,0,0,0.5)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', padding: '0.25rem', borderRadius: '4px' }}
                            >
                                {audioEngine.availableSoundfonts.map(sf => (
                                    <option key={sf.id} value={sf.id}>{sf.name}</option>
                                ))}
                                {soundfont.startsWith('custom-sf2-') && (
                                    <option value={soundfont}>[Custom] {soundfont.replace('custom-sf2-', '')}</option>
                                )}
                            </select>
                            <label style={{ cursor: 'pointer', fontSize: '0.7rem', color: '#88f', textDecoration: 'underline' }}>
                                + Load .SF2 File
                                <input
                                    type="file"
                                    accept=".sf2"
                                    onChange={handleFileLoad}
                                    style={{ display: 'none' }}
                                />
                            </label>
                        </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <button className="btn" onClick={onToggleSculptureMode} style={{ backgroundColor: sculptureMode ? 'rgba(80, 80, 255, 0.5)' : undefined }}>
                            {sculptureMode ? '🎹 Piano Mode' : '🎵 Sculpture Mode'}
                        </button>
                    </div>
                    {sculptureMode && (
                        <div style={{ display: 'flex', gap: '1rem', borderLeft: '1px solid rgba(255,255,255,0.2)', paddingLeft: '1rem' }}>
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
                        </div>
                    )}
                    <button className="btn" onClick={onOpenNotepad} style={{ marginLeft: 'auto' }}>
                        Open Notepad
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Overlay;

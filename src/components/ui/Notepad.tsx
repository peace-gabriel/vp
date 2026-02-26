import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, X } from 'lucide-react';

interface NotepadProps {
    onClose: () => void;
}

const Notepad: React.FC<NotepadProps> = ({ onClose }) => {
    const [text, setText] = useState<string>('');
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(0.05); // user-requested default multiplier
    const [fontFamily, setFontFamily] = useState<string>('monospace');
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const requestRef = useRef<number>();
    const lastTimeRef = useRef<number>();

    const handlePlayPause = () => {
        setIsPlaying(!isPlaying);
    };

    const animate = (time: number) => {
        if (lastTimeRef.current !== undefined && isPlaying && scrollContainerRef.current) {
            const deltaTime = time - lastTimeRef.current;

            // Calculate scroll amount based on deltaTime and speed multiplier
            // If speed is 1, it scrolls 1 pixel per ms. At 0.05, it's very slow.
            const scrollAmount = deltaTime * speed;

            scrollContainerRef.current.scrollTop += scrollAmount;

            // Auto pause if reached the bottom
            const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
            if (scrollTop + clientHeight >= scrollHeight - 1 && scrollHeight > clientHeight) {
                setIsPlaying(false);
            }
        }
        lastTimeRef.current = time;
        requestRef.current = requestAnimationFrame(animate);
    };

    useEffect(() => {
        requestRef.current = requestAnimationFrame(animate);
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [isPlaying, speed]);

    return (
        <div className="panel" style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            width: '350px',
            height: '500px',
            minWidth: '250px',
            minHeight: '200px',
            flexDirection: 'column',
            alignItems: 'stretch',
            pointerEvents: 'auto',
            zIndex: 50,
            resize: 'both',
            overflow: 'hidden'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h3 style={{ margin: 0, fontSize: '1rem', color: '#fff' }}>Notepad</h3>
                <button className="btn" style={{ padding: '0.25rem' }} onClick={onClose} title="Close">
                    <X size={16} />
                </button>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', alignItems: 'center' }}>
                <button className="btn" onClick={handlePlayPause} style={{ flex: 1, justifyContent: 'center' }}>
                    {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                    {isPlaying ? 'Pause' : 'Play'}
                </button>

                <div className="control-group" style={{ flex: 2 }}>
                    <label style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Speed: {speed.toFixed(3)}x</span>
                    </label>
                    <input
                        type="range"
                        min="0.01" max="0.5" step="0.01"
                        value={speed}
                        onChange={(e) => setSpeed(parseFloat(e.target.value))}
                        style={{ width: '100%' }}
                    />
                </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', alignItems: 'center' }}>
                <label style={{ fontSize: '12px', color: '#ccc' }}>Font:</label>
                <select
                    value={fontFamily}
                    onChange={(e) => { setFontFamily(e.target.value); e.target.blur(); }}
                    style={{ background: 'rgba(0,0,0,0.5)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', padding: '0.25rem', borderRadius: '4px', flex: 1 }}
                >
                    <option value="monospace">Monospace</option>
                    <option value="Arial, sans-serif">Arial</option>
                    <option value='"Courier New", Courier, monospace'>Courier New</option>
                    <option value='"Times New Roman", Times, serif'>Times New Roman</option>
                    <option value='"Comic Sans MS", cursive, sans-serif'>Comic Sans</option>
                </select>
            </div>

            <div
                ref={scrollContainerRef}
                style={{
                    flex: 1,
                    overflowY: 'auto',
                    background: 'rgba(0,0,0,0.5)',
                    borderRadius: '6px',
                    padding: '10px',
                    scrollBehavior: 'auto' // Important for manual JS scrolling
                }}
                onWheel={() => {
                    // Optional: Pause scrolling when user manually scrolls
                    // setIsPlaying(false); 
                }}
            >
                <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Paste your Virtual Piano sheet music or lyrics here..."
                    style={{
                        width: '100%',
                        minHeight: '100%',
                        background: 'transparent',
                        border: 'none',
                        color: 'white',
                        fontFamily: fontFamily,
                        fontSize: '14px',
                        lineHeight: '1.6',
                        resize: 'none',
                        outline: 'none',
                        overflow: 'hidden' // Let the parent div handle the scroll
                    }}
                    onInput={(e) => {
                        // Auto resize textarea to fit content so the parent div scrolls
                        const target = e.target as HTMLTextAreaElement;
                        target.style.height = 'auto';
                        target.style.height = target.scrollHeight + 'px';
                    }}
                />
            </div>
        </div>
    );
};

export default Notepad;

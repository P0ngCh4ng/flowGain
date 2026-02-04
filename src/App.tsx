import { useState, useCallback, useEffect } from 'react';
import { Knob } from './components/Knob';
import { useAudio, type SoundType } from './hooks/useAudio';
import './App.css';

interface SoundConfig {
  id: SoundType;
  label: string;
  color: string;
}

const SOUNDS: SoundConfig[] = [
  { id: 'rain', label: 'Rain', color: '#64b5f6' },
  { id: 'birds', label: 'Birds', color: '#81c784' },
  { id: 'wind', label: 'Wind', color: '#b0bec5' },
  { id: 'fire', label: 'Fire', color: '#ffb74d' },
];

const STORAGE_KEY = 'flowgain-volumes';

function loadSavedVolumes(): Record<SoundType, number> {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch {}
  return { rain: 0, birds: 0, wind: 0, fire: 0 };
}

function App() {
  const [volumes, setVolumes] = useState<Record<SoundType, number>>(loadSavedVolumes);
  const { isPlaying, setVolume, start, stop } = useAudio();

  // Save volumes to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(volumes));
  }, [volumes]);

  // Apply saved volumes when audio starts
  useEffect(() => {
    if (isPlaying) {
      Object.entries(volumes).forEach(([id, vol]) => {
        setVolume(id as SoundType, vol);
      });
    }
  }, [isPlaying, volumes, setVolume]);

  const handleVolumeChange = useCallback((id: SoundType, value: number) => {
    setVolumes(prev => ({ ...prev, [id]: value }));
    setVolume(id, value);
  }, [setVolume]);

  // Auto-start audio on first knob interaction
  const handleInteractionStart = useCallback(() => {
    if (!isPlaying) {
      start();
    }
  }, [isPlaying, start]);

  const handlePowerToggle = useCallback(() => {
    if (isPlaying) {
      stop();
    } else {
      start();
    }
  }, [isPlaying, start, stop]);

  const hasAnyVolume = Object.values(volumes).some(v => v > 0);

  return (
    <div className="app">
      <header className="header">
        <h1 className="title">Flowgain</h1>
        <p className="subtitle">Ambient Sound Mixer</p>
      </header>

      <main className="main">
        <div className="panel">
          {/* Power indicator */}
          <button
            className={`power-button ${isPlaying ? 'on' : ''}`}
            onClick={handlePowerToggle}
            aria-label={isPlaying ? 'Stop' : 'Start'}
          >
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path
                fill="currentColor"
                d="M12 3a1 1 0 0 1 1 1v8a1 1 0 1 1-2 0V4a1 1 0 0 1 1-1zm-5.657 3.343a1 1 0 0 1 0 1.414 6 6 0 1 0 8.485 0 1 1 0 1 1 1.415-1.414 8 8 0 1 1-11.314 0 1 1 0 0 1 1.414 0z"
              />
            </svg>
          </button>

          <div className="knobs">
            {SOUNDS.map(sound => (
              <Knob
                key={sound.id}
                value={volumes[sound.id]}
                onChange={(v) => handleVolumeChange(sound.id, v)}
                onInteractionStart={handleInteractionStart}
                label={sound.label}
                color={sound.color}
              />
            ))}
          </div>
        </div>

        {!isPlaying && hasAnyVolume && (
          <p className="hint">Drag any knob to start</p>
        )}
      </main>

      <footer className="footer">
        <p>Scroll or drag up/down to adjust · Double-click to reset</p>
      </footer>
    </div>
  );
}

export default App;

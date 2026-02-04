import { useState, useCallback } from 'react';
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

function App() {
  const [volumes, setVolumes] = useState<Record<SoundType, number>>({
    rain: 0,
    birds: 0,
    wind: 0,
    fire: 0,
  });

  const { isReady, isPlaying, setVolume, start, stop } = useAudio();

  const handleVolumeChange = useCallback((id: SoundType, value: number) => {
    setVolumes(prev => ({ ...prev, [id]: value }));
    setVolume(id, value);
  }, [setVolume]);

  const handleToggle = useCallback(() => {
    if (isPlaying) {
      stop();
    } else {
      start();
    }
  }, [isPlaying, start, stop]);

  return (
    <div className="app">
      <header className="header">
        <h1 className="title">Flowgain</h1>
        <p className="subtitle">Ambient Sound Mixer</p>
      </header>

      <main className="main">
        <div className="knobs">
          {SOUNDS.map(sound => (
            <Knob
              key={sound.id}
              value={volumes[sound.id]}
              onChange={(v) => handleVolumeChange(sound.id, v)}
              label={sound.label}
              color={sound.color}
            />
          ))}
        </div>

        <button
          className={`play-button ${isPlaying ? 'playing' : ''}`}
          onClick={handleToggle}
          disabled={!isReady}
        >
          {!isReady ? 'Loading...' : isPlaying ? 'Stop' : 'Play'}
        </button>
      </main>

      <footer className="footer">
        <p>Drag knobs up/down or scroll to adjust</p>
      </footer>
    </div>
  );
}

export default App;

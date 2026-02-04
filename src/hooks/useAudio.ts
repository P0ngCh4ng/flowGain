import { useRef, useCallback, useState, useEffect } from 'react';

export type SoundType = 'rain' | 'birds';

interface SoundConfig {
  id: SoundType;
  url: string;
  label: string;
}

const SOUNDS: SoundConfig[] = [
  { id: 'rain', url: '/sounds/rain.mp3', label: 'Rain' },
  { id: 'birds', url: '/sounds/birds.mp3', label: 'Birds' },
];

interface UseAudioReturn {
  isReady: boolean;
  isPlaying: boolean;
  error: string | null;
  setVolume: (id: SoundType, volume: number) => void;
  start: () => void;
  stop: () => void;
}

export function useAudio(): UseAudioReturn {
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodesRef = useRef<Map<SoundType, GainNode>>(new Map());
  const sourceNodesRef = useRef<Map<SoundType, AudioBufferSourceNode>>(new Map());
  const buffersRef = useRef<Map<SoundType, AudioBuffer>>(new Map());
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Preload audio files
  useEffect(() => {
    const loadAudio = async () => {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = ctx;

      const missingFiles: string[] = [];

      const loadPromises = SOUNDS.map(async (sound) => {
        try {
          const response = await fetch(sound.url);
          if (!response.ok) {
            missingFiles.push(sound.label);
            return;
          }
          const arrayBuffer = await response.arrayBuffer();
          const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
          buffersRef.current.set(sound.id, audioBuffer);
        } catch {
          missingFiles.push(sound.label);
        }
      });

      await Promise.all(loadPromises);

      if (missingFiles.length > 0) {
        setError(`音源ファイルが見つかりません: ${missingFiles.join(', ')}\n\npublic/sounds/ に配置してください`);
      }

      // Suspend context until user interaction
      if (ctx.state === 'running') {
        await ctx.suspend();
      }

      setIsReady(true);
    };

    loadAudio();

    return () => {
      audioContextRef.current?.close();
    };
  }, []);

  const setVolume = useCallback((id: SoundType, volume: number) => {
    const gainNode = gainNodesRef.current.get(id);
    if (gainNode && audioContextRef.current) {
      gainNode.gain.setTargetAtTime(
        volume / 100,
        audioContextRef.current.currentTime,
        0.05
      );
    }
  }, []);

  const start = useCallback(() => {
    if (isPlaying || !audioContextRef.current) return;

    const ctx = audioContextRef.current;

    // Resume context
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    // Create gain nodes and source nodes for each sound
    SOUNDS.forEach((sound) => {
      const buffer = buffersRef.current.get(sound.id);
      if (!buffer) return;

      // Create gain node
      const gain = ctx.createGain();
      gain.gain.value = 0;
      gain.connect(ctx.destination);
      gainNodesRef.current.set(sound.id, gain);

      // Create source node with loop
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      source.connect(gain);
      source.start();
      sourceNodesRef.current.set(sound.id, source);
    });

    setIsPlaying(true);
  }, [isPlaying]);

  const stop = useCallback(() => {
    if (!isPlaying) return;

    // Stop all sources
    sourceNodesRef.current.forEach((source) => {
      try {
        source.stop();
      } catch {}
    });
    sourceNodesRef.current.clear();
    gainNodesRef.current.clear();

    // Suspend context
    if (audioContextRef.current?.state === 'running') {
      audioContextRef.current.suspend();
    }

    setIsPlaying(false);
  }, [isPlaying]);

  return { isReady, isPlaying, error, setVolume, start, stop };
}

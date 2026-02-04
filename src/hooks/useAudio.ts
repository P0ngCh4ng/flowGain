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
          console.log('[Flowgain] Fetching:', sound.url);
          const response = await fetch(sound.url);
          console.log('[Flowgain] Response:', sound.id, response.status, response.headers.get('content-type'));
          if (!response.ok) {
            console.log('[Flowgain] Response not ok for:', sound.id);
            missingFiles.push(sound.label);
            return;
          }
          const arrayBuffer = await response.arrayBuffer();
          console.log('[Flowgain] ArrayBuffer size:', sound.id, arrayBuffer.byteLength);
          const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
          console.log('[Flowgain] Decoded:', sound.id, audioBuffer.duration, 'seconds');
          buffersRef.current.set(sound.id, audioBuffer);
        } catch (err) {
          console.error('[Flowgain] Error loading', sound.id, err);
          missingFiles.push(sound.label);
        }
      });

      await Promise.all(loadPromises);

      console.log('[Flowgain] Loaded buffers:', Array.from(buffersRef.current.keys()));

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
    console.log('[Flowgain] setVolume', id, volume, 'gainNode:', gainNode ? 'exists' : 'missing');
    if (gainNode && audioContextRef.current) {
      gainNode.gain.setTargetAtTime(
        volume / 100,
        audioContextRef.current.currentTime,
        0.05
      );
    }
  }, []);

  const start = useCallback(async () => {
    console.log('[Flowgain] start() called, isPlaying:', isPlaying);
    if (isPlaying || !audioContextRef.current) return;

    const ctx = audioContextRef.current;

    // Resume context (must await)
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    console.log('[Flowgain] AudioContext state:', ctx.state);

    // Create gain nodes and source nodes for each sound
    SOUNDS.forEach((sound) => {
      const buffer = buffersRef.current.get(sound.id);
      console.log('[Flowgain] Buffer for', sound.id, ':', buffer ? 'exists' : 'missing');
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
      console.log('[Flowgain] Started source for', sound.id);
    });

    console.log('[Flowgain] All sources started');
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

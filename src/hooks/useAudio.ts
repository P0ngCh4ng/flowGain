import { useRef, useCallback, useState } from 'react';

export type SoundType = 'rain' | 'birds' | 'wind' | 'fire';

interface UseAudioReturn {
  isReady: boolean;
  isPlaying: boolean;
  setVolume: (id: SoundType, volume: number) => void;
  start: () => void;
  stop: () => void;
}

// Create filtered noise for ambient sounds
function createNoiseSource(ctx: AudioContext): AudioBufferSourceNode {
  const bufferSize = ctx.sampleRate * 2; // 2 seconds
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  return source;
}

// Rain: filtered noise with low-mid frequencies
function createRainSound(ctx: AudioContext, gainNode: GainNode) {
  const noise = createNoiseSource(ctx);

  const lowpass = ctx.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.value = 4000;

  const highpass = ctx.createBiquadFilter();
  highpass.type = 'highpass';
  highpass.frequency.value = 400;

  noise.connect(highpass);
  highpass.connect(lowpass);
  lowpass.connect(gainNode);

  return noise;
}

// Wind: low frequency filtered noise with modulation
function createWindSound(ctx: AudioContext, gainNode: GainNode) {
  const noise = createNoiseSource(ctx);

  const lowpass = ctx.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.value = 800;

  // Modulate the filter frequency for wind gusts
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  lfo.frequency.value = 0.1;
  lfoGain.gain.value = 400;
  lfo.connect(lfoGain);
  lfoGain.connect(lowpass.frequency);
  lfo.start();

  noise.connect(lowpass);
  lowpass.connect(gainNode);

  return { noise, lfo };
}

// Birds: periodic chirping sounds
function createBirdsSound(ctx: AudioContext, gainNode: GainNode) {
  const masterGain = ctx.createGain();
  masterGain.connect(gainNode);

  const oscillators: OscillatorNode[] = [];
  const gains: GainNode[] = [];

  // Create multiple bird chirp oscillators
  const birdFreqs = [2200, 2800, 3200, 3800, 4200];

  birdFreqs.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const chirpGain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.value = freq;

    // Frequency modulation for natural chirping
    const freqLfo = ctx.createOscillator();
    const freqLfoGain = ctx.createGain();
    freqLfo.frequency.value = 5 + i * 2;
    freqLfoGain.gain.value = 100 + i * 50;
    freqLfo.connect(freqLfoGain);
    freqLfoGain.connect(osc.frequency);

    // Volume modulation for chirp pattern
    const volLfo = ctx.createOscillator();
    const volLfoGain = ctx.createGain();
    volLfo.frequency.value = 0.3 + i * 0.15;
    volLfoGain.gain.value = 0.15;

    chirpGain.gain.value = 0;
    volLfo.connect(volLfoGain);
    volLfoGain.connect(chirpGain.gain);

    osc.connect(chirpGain);
    chirpGain.connect(masterGain);

    osc.start();
    freqLfo.start();
    volLfo.start();

    oscillators.push(osc, freqLfo, volLfo);
    gains.push(chirpGain);
  });

  return { oscillators, gains };
}

// Fire: crackling noise
function createFireSound(ctx: AudioContext, gainNode: GainNode) {
  const noise = createNoiseSource(ctx);

  const lowpass = ctx.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.value = 2000;

  const highpass = ctx.createBiquadFilter();
  highpass.type = 'highpass';
  highpass.frequency.value = 200;

  // Add some crackle with a bandpass
  const bandpass = ctx.createBiquadFilter();
  bandpass.type = 'bandpass';
  bandpass.frequency.value = 800;
  bandpass.Q.value = 2;

  // Modulate for crackling effect
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  lfo.frequency.value = 8;
  lfoGain.gain.value = 500;
  lfo.connect(lfoGain);
  lfoGain.connect(bandpass.frequency);
  lfo.start();

  noise.connect(highpass);
  highpass.connect(lowpass);
  lowpass.connect(bandpass);
  bandpass.connect(gainNode);

  return { noise, lfo };
}

export function useAudio(): UseAudioReturn {
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodesRef = useRef<Map<SoundType, GainNode>>(new Map());
  const sourcesRef = useRef<Map<SoundType, any>>(new Map());
  const [isPlaying, setIsPlaying] = useState(false);

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
    if (isPlaying) return;

    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    audioContextRef.current = ctx;

    // Create gain nodes for each sound
    const soundTypes: SoundType[] = ['rain', 'birds', 'wind', 'fire'];
    soundTypes.forEach((type) => {
      const gain = ctx.createGain();
      gain.gain.value = 0;
      gain.connect(ctx.destination);
      gainNodesRef.current.set(type, gain);
    });

    // Create and start all sounds
    const rainGain = gainNodesRef.current.get('rain')!;
    const rainSource = createRainSound(ctx, rainGain);
    rainSource.start();
    sourcesRef.current.set('rain', rainSource);

    const windGain = gainNodesRef.current.get('wind')!;
    const windSource = createWindSound(ctx, windGain);
    windSource.noise.start();
    sourcesRef.current.set('wind', windSource);

    const birdsGain = gainNodesRef.current.get('birds')!;
    const birdsSource = createBirdsSound(ctx, birdsGain);
    sourcesRef.current.set('birds', birdsSource);

    const fireGain = gainNodesRef.current.get('fire')!;
    const fireSource = createFireSound(ctx, fireGain);
    fireSource.noise.start();
    sourcesRef.current.set('fire', fireSource);

    setIsPlaying(true);
  }, [isPlaying]);

  const stop = useCallback(() => {
    if (!isPlaying || !audioContextRef.current) return;

    audioContextRef.current.close();
    audioContextRef.current = null;
    gainNodesRef.current.clear();
    sourcesRef.current.clear();

    setIsPlaying(false);
  }, [isPlaying]);

  return { isReady: true, isPlaying, setVolume, start, stop };
}

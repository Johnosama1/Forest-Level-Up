import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

export function useForestAmbient(enabled: boolean) {
  const ctxRef      = useRef<any>(null);
  const chirpRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gainRef     = useRef<any>(null);

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AC) return;

    let active = true;
    let audioCtx: any = null;
    let windSource: any = null;

    function startAudio() {
      audioCtx = new AC();
      ctxRef.current = audioCtx;

      // ── Wind: filtered white noise ──────────────────────
      const sr = audioCtx.sampleRate;
      const buf = audioCtx.createBuffer(1, sr * 4, sr);
      const data = buf.getChannelData(0);
      for (let i = 0; i < buf.length; i++) data[i] = Math.random() * 2 - 1;

      windSource = audioCtx.createBufferSource();
      windSource.buffer = buf;
      windSource.loop = true;

      const lpf = audioCtx.createBiquadFilter();
      lpf.type = 'lowpass';
      lpf.frequency.value = 350;
      lpf.Q.value = 0.5;

      // Gentle LFO to make wind "breathe"
      const lfo = audioCtx.createOscillator();
      const lfoGain = audioCtx.createGain();
      lfo.frequency.value = 0.12;
      lfoGain.gain.value = 80;
      lfo.connect(lfoGain);
      lfoGain.connect(lpf.frequency);
      lfo.start();

      const windGain = audioCtx.createGain();
      windGain.gain.value = 0;
      gainRef.current = windGain;
      windGain.gain.linearRampToValueAtTime(0.06, audioCtx.currentTime + 2);

      windSource.connect(lpf);
      lpf.connect(windGain);
      windGain.connect(audioCtx.destination);
      windSource.start();

      // ── Bird chirps ────────────────────────────────────
      function chirp() {
        if (!active || !ctxRef.current) return;
        const c = ctxRef.current;
        const now = c.currentTime;

        // Random 1-3 short notes per chirp
        const notes = 1 + Math.floor(Math.random() * 3);
        for (let n = 0; n < notes; n++) {
          const delay = n * 0.09;
          const baseFreq = 2200 + Math.random() * 1200;
          const osc = c.createOscillator();
          const g   = c.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(baseFreq, now + delay);
          osc.frequency.linearRampToValueAtTime(baseFreq * 1.2, now + delay + 0.06);
          osc.frequency.linearRampToValueAtTime(baseFreq * 0.9, now + delay + 0.12);
          g.gain.setValueAtTime(0, now + delay);
          g.gain.linearRampToValueAtTime(0.045, now + delay + 0.02);
          g.gain.linearRampToValueAtTime(0, now + delay + 0.13);
          osc.connect(g);
          g.connect(c.destination);
          osc.start(now + delay);
          osc.stop(now + delay + 0.2);
        }

        // Next chirp in 2-6 seconds
        const nextIn = (2000 + Math.random() * 4000);
        chirpRef.current = setTimeout(chirp, nextIn) as unknown as ReturnType<typeof setTimeout>;
      }

      // First chirp after 1.5s
      chirpRef.current = setTimeout(chirp, 1500) as unknown as ReturnType<typeof setTimeout>;
    }

    if (enabled) {
      // Needs user interaction on some browsers before AudioContext can start
      startAudio();
    }

    return () => {
      active = false;
      if (chirpRef.current) clearTimeout(chirpRef.current);
      if (gainRef.current) {
        try {
          gainRef.current.gain.linearRampToValueAtTime(0, ctxRef.current?.currentTime + 0.5);
        } catch (_) {}
      }
      setTimeout(() => {
        try { windSource?.stop(); } catch (_) {}
        try { audioCtx?.close(); } catch (_) {}
        ctxRef.current = null;
      }, 600);
    };
  }, [enabled]);
}

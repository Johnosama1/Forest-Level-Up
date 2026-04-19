import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

/**
 * Forest ambient audio — web only.
 *
 * Strategy:
 *  - AudioContext is created ONCE on the first user interaction (browser
 *    autoplay policy requires this — context can't start without a gesture).
 *  - Toggling sound uses ctx.suspend() / ctx.resume() so the context stays
 *    alive and never needs to be rebuilt.
 *  - Chirp timer is paused while suspended.
 */
export function useForestAmbient(enabled: boolean) {
  const ctxRef      = useRef<any>(null);
  const gainRef     = useRef<any>(null);
  const chirpRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeRef   = useRef(false);
  const enabledRef  = useRef(enabled);

  // Keep enabledRef in sync so chirp() can read latest value
  enabledRef.current = enabled;

  // ── Set up audio once (on first user interaction) ──────────────────────
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    function buildAudio() {
      const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AC || ctxRef.current) return;   // already built or not supported

      const audioCtx = new AC();
      ctxRef.current = audioCtx;
      activeRef.current = true;

      // ── Wind: looping filtered white-noise ───────────────────────────
      const sr  = audioCtx.sampleRate;
      const buf = audioCtx.createBuffer(1, sr * 4, sr);
      const d   = buf.getChannelData(0);
      for (let i = 0; i < buf.length; i++) d[i] = Math.random() * 2 - 1;

      const wind = audioCtx.createBufferSource();
      wind.buffer = buf;
      wind.loop   = true;

      const lpf = audioCtx.createBiquadFilter();
      lpf.type = 'lowpass';
      lpf.frequency.value = 350;
      lpf.Q.value = 0.5;

      const lfo     = audioCtx.createOscillator();
      const lfoGain = audioCtx.createGain();
      lfo.frequency.value = 0.12;
      lfoGain.gain.value  = 80;
      lfo.connect(lfoGain);
      lfoGain.connect(lpf.frequency);
      lfo.start();

      const windGain = audioCtx.createGain();
      windGain.gain.value = 0;
      gainRef.current = windGain;
      windGain.gain.linearRampToValueAtTime(0.06, audioCtx.currentTime + 2);

      wind.connect(lpf);
      lpf.connect(windGain);
      windGain.connect(audioCtx.destination);
      wind.start();

      // ── Bird chirps ──────────────────────────────────────────────────
      function chirp() {
        if (!activeRef.current || !ctxRef.current) return;
        if (!enabledRef.current) {
          // Sound is off — reschedule but don't play
          chirpRef.current = setTimeout(chirp, 3000) as unknown as ReturnType<typeof setTimeout>;
          return;
        }
        const c   = ctxRef.current;
        const now = c.currentTime;
        const notes = 1 + Math.floor(Math.random() * 3);
        for (let n = 0; n < notes; n++) {
          const delay    = n * 0.09;
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
        chirpRef.current = setTimeout(chirp, 2000 + Math.random() * 4000) as unknown as ReturnType<typeof setTimeout>;
      }

      chirpRef.current = setTimeout(chirp, 1500) as unknown as ReturnType<typeof setTimeout>;

      // Suspend immediately if user had sound off before first interaction
      if (!enabledRef.current) {
        audioCtx.suspend().catch(() => {});
      }

      // Remove listeners — only need one-time setup
      window.removeEventListener('click',      buildAudio);
      window.removeEventListener('touchstart', buildAudio);
      window.removeEventListener('keydown',    buildAudio);
    }

    window.addEventListener('click',      buildAudio, { once: true });
    window.addEventListener('touchstart', buildAudio, { once: true });
    window.addEventListener('keydown',    buildAudio, { once: true });

    return () => {
      // Component unmount — clean up completely
      activeRef.current = false;
      if (chirpRef.current) clearTimeout(chirpRef.current);
      if (gainRef.current) {
        try { gainRef.current.gain.cancelScheduledValues(0); } catch (_) {}
        try { gainRef.current.gain.setValueAtTime(0, 0); } catch (_) {}
      }
      try { ctxRef.current?.close(); } catch (_) {}
      ctxRef.current = null;
    };
  }, []); // runs once

  // ── React to enabled toggle ─────────────────────────────────────────────
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const ctx = ctxRef.current;
    if (!ctx) return; // AudioContext not built yet — enabledRef is checked at build time

    if (enabled) {
      ctx.resume().catch(() => {});
    } else {
      ctx.suspend().catch(() => {});
    }
  }, [enabled]);
}

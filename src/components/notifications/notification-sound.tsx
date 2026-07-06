"use client";

import { useEffect, useRef } from "react";

/**
 * Plays a short beep when notificationCount increases.
 */
export function NotificationSound({ notificationCount = 0 }: { notificationCount?: number }) {
  const prevCount = useRef(notificationCount);
  const audioCtx = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (notificationCount <= prevCount.current) {
      prevCount.current = notificationCount;
      return;
    }

    prevCount.current = notificationCount;

    try {
      const AudioContextCtor =
        window.AudioContext ??
        (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextCtor) return;

      if (!audioCtx.current) {
        audioCtx.current = new AudioContextCtor();
      }
      const ctx = audioCtx.current;
      if (ctx.state === "suspended") {
        void ctx.resume();
      }

      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.18);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.2);
    } catch {
      // Ignore audio errors (autoplay policies, unsupported browsers)
    }
  }, [notificationCount]);

  return null;
}
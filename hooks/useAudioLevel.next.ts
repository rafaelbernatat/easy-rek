"use client";

import { useEffect, useRef, useState } from "react";

export const useAudioLevel = (stream: MediaStream | null) => {
  const [level, setLevel] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    // Ensure we're in the browser
    if (typeof window === "undefined" || !window.AudioContext) return;

    if (!stream) {
      setLevel(0);
      return;
    }

    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) {
      setLevel(0);
      return;
    }

    // Initialize Audio Context
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
    }

    const ctx = audioContextRef.current;
    if (ctx.state === "suspended") {
      ctx.resume();
    }

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256; // Smaller FFT size for responsiveness
    analyserRef.current = analyser;

    try {
      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);
      sourceRef.current = source;
    } catch (e) {
      console.error("Error creating audio source", e);
      return;
    }

    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const updateLevel = () => {
      analyser.getByteFrequencyData(dataArray);

      // Calculate average volume
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      const average = sum / dataArray.length;

      // Normalize somewhat (0-255 -> 0-1)
      // Apply some sensitivity scaling
      const normalized = Math.min(1, average / 50);

      setLevel(normalized);
      rafRef.current = requestAnimationFrame(updateLevel);
    };

    updateLevel();

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (sourceRef.current) sourceRef.current.disconnect();
      // We don't close the context to reuse it or avoid strict browser limits, but we could.
    };
  }, [stream]);

  return level;
};

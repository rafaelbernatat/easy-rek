"use client";

import { useState, useCallback } from "react";

export const useDisplayMedia = () => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const startDisplayMedia = useCallback(async () => {
    // Ensure we're in the browser
    if (typeof window === "undefined") {
      setError(new Error("Not in browser environment"));
      return;
    }

    try {
      // Check if getDisplayMedia is supported
      if (!navigator.mediaDevices?.getDisplayMedia) {
        throw new Error("Screen recording is not supported in this browser.");
      }

      // @ts-ignore - getDisplayMedia is standard but TS might complain depending on lib version
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: "monitor", // Prefer monitor
        },
        audio: true, // Request system audio
      });
      setStream(displayStream);
      setError(null);
    } catch (err) {
      console.error("Error accessing display media:", err);
      setError(err as Error);
    }
  }, []);

  const stopDisplayMedia = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  }, [stream]);

  return { stream, error, startDisplayMedia, stopDisplayMedia };
};

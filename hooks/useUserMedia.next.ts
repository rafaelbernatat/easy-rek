"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { MediaDevice } from "@/types";

export const useUserMedia = () => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [retryCount, setRetryCount] = useState(0);

  const [audioDevices, setAudioDevices] = useState<MediaDevice[]>([]);
  const [videoDevices, setVideoDevices] = useState<MediaDevice[]>([]);
  const [selectedAudioId, setSelectedAudioId] = useState<string>("");
  const [selectedVideoId, setSelectedVideoId] = useState<string>("");

  const activeStreamRef = useRef<MediaStream | null>(null);

  const getDevices = useCallback(async () => {
    // Check if navigator is available (client-side only)
    if (typeof window === "undefined" || !navigator.mediaDevices) return;

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      setAudioDevices(
        devices
          .filter((d) => d.kind === "audioinput")
          .map((d) => ({
            deviceId: d.deviceId,
            label: d.label || `Microphone ${d.deviceId.slice(0, 5)}...`,
          })),
      );
      setVideoDevices(
        devices
          .filter((d) => d.kind === "videoinput")
          .map((d) => ({
            deviceId: d.deviceId,
            label: d.label || `Camera ${d.deviceId.slice(0, 5)}...`,
          })),
      );
    } catch (e) {
      console.error("Error enumerating devices", e);
    }
  }, []);

  // Initialize or restart stream when devices change
  useEffect(() => {
    // Ensure we're in the browser
    if (typeof window === "undefined" || !navigator.mediaDevices) return;

    let mounted = true;

    const initMedia = async () => {
      // Stop old tracks immediately before requesting new ones to release hardware
      if (activeStreamRef.current) {
        activeStreamRef.current
          .getTracks()
          .forEach((track: MediaStreamTrack) => track.stop());
        activeStreamRef.current = null;
      }
      setStream(null);
      setError(null);

      try {
        const constraints: MediaStreamConstraints = {
          audio: selectedAudioId
            ? { deviceId: { exact: selectedAudioId } }
            : true,
          video: selectedVideoId
            ? {
                deviceId: { exact: selectedVideoId },
                width: { ideal: 1280 },
                height: { ideal: 720 },
              }
            : {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                facingMode: "user",
              },
        };

        const userStream =
          await navigator.mediaDevices.getUserMedia(constraints);

        if (mounted) {
          activeStreamRef.current = userStream;
          setStream(userStream);
          setError(null);

          // Apply current toggle state
          userStream
            .getAudioTracks()
            .forEach((t: MediaStreamTrack) => (t.enabled = isAudioEnabled));
          userStream
            .getVideoTracks()
            .forEach((t: MediaStreamTrack) => (t.enabled = isVideoEnabled));

          // Refresh devices now that we have permissions
          getDevices();
        } else {
          // Component unmounted while waiting
          userStream.getTracks().forEach((t: MediaStreamTrack) => t.stop());
        }
      } catch (err) {
        if (mounted) {
          const error = err as Error;
          console.warn("Camera/Microphone not available:", error.message);

          // Set a more user-friendly error
          const friendlyError = new Error(
            error.name === "NotFoundError"
              ? "No camera or microphone found. You can still record screen only."
              : error.name === "NotAllowedError"
                ? "Camera/microphone access denied. You can still record screen only."
                : "Camera/microphone unavailable. You can still record screen only.",
          );
          friendlyError.name = error.name;

          setError(friendlyError);
          // Try getting devices anyway (labels might be missing, but we can see availability)
          getDevices();
        }
      }
    };

    initMedia();

    return () => {
      mounted = false;
      // Cleanup happens in next run or unmount
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAudioId, selectedVideoId, retryCount]); // Add retryCount to dependency array

  // Handle toggles effect
  useEffect(() => {
    if (stream) {
      stream
        .getAudioTracks()
        .forEach((t: MediaStreamTrack) => (t.enabled = isAudioEnabled));
      stream
        .getVideoTracks()
        .forEach((t: MediaStreamTrack) => (t.enabled = isVideoEnabled));
    }
  }, [isAudioEnabled, isVideoEnabled, stream]);

  // Listen for device changes
  useEffect(() => {
    // Ensure we're in the browser
    if (typeof window === "undefined" || !navigator.mediaDevices) return;

    const handleDeviceChange = () => getDevices();
    navigator.mediaDevices.addEventListener("devicechange", handleDeviceChange);
    return () =>
      navigator.mediaDevices.removeEventListener(
        "devicechange",
        handleDeviceChange,
      );
  }, [getDevices]);

  // Final cleanup
  useEffect(() => {
    return () => {
      if (activeStreamRef.current) {
        activeStreamRef.current
          .getTracks()
          .forEach((t: MediaStreamTrack) => t.stop());
      }
    };
  }, []);

  const toggleAudio = useCallback(() => {
    setIsAudioEnabled((prev: boolean) => !prev);
  }, []);

  const toggleVideo = useCallback(() => {
    setIsVideoEnabled((prev: boolean) => !prev);
  }, []);

  const retryMedia = useCallback(() => {
    setRetryCount((c: number) => c + 1);
  }, []);

  const stopUserMedia = useCallback(() => {
    if (activeStreamRef.current) {
      activeStreamRef.current
        .getTracks()
        .forEach((t: MediaStreamTrack) => t.stop());
      activeStreamRef.current = null;
      setStream(null);
    }
  }, []);

  return {
    stream,
    error,
    toggleAudio,
    toggleVideo,
    isAudioEnabled,
    isVideoEnabled,
    audioDevices,
    videoDevices,
    selectedAudioId,
    selectedVideoId,
    setAudioDevice: setSelectedAudioId,
    setVideoDevice: setSelectedVideoId,
    retryMedia,
    stopUserMedia,
  };
};

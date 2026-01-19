"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { RecordedFiles } from "@/types";

interface UseMultiRecorderProps {
  userStream: MediaStream | null;
  displayStream: MediaStream | null;
  compositeStream?: MediaStream | null;
}

export const useMultiRecorder = ({
  userStream,
  displayStream,
  compositeStream,
}: UseMultiRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordings, setRecordings] = useState<RecordedFiles | null>(null);

  const userRecorderRef = useRef<MediaRecorder | null>(null);
  const displayRecorderRef = useRef<MediaRecorder | null>(null);
  const compositeRecorderRef = useRef<MediaRecorder | null>(null);

  const userChunksRef = useRef<Blob[]>([]);
  const displayChunksRef = useRef<Blob[]>([]);
  const compositeChunksRef = useRef<Blob[]>([]);

  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  const getSupportedMimeType = () => {
    // Ensure we're in the browser
    if (typeof window === "undefined" || typeof MediaRecorder === "undefined")
      return "";

    const types = [
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm",
      "video/mp4",
    ];
    return types.find((type) => MediaRecorder.isTypeSupported(type)) || "";
  };

  const startRecording = useCallback(() => {
    // Ensure we're in the browser
    if (typeof window === "undefined" || typeof MediaRecorder === "undefined")
      return;
    if (!userStream && !displayStream) return;

    // Reset
    userChunksRef.current = [];
    displayChunksRef.current = [];
    compositeChunksRef.current = [];
    setRecordings(null);
    setRecordingTime(0);

    const mimeType = getSupportedMimeType();

    const startStreamRecorder = (
      stream: MediaStream,
      chunksRef: React.MutableRefObject<Blob[]>
    ) => {
      try {
        // Ensure stream has tracks before recording
        if (stream.getTracks().length === 0) return null;

        const options: MediaRecorderOptions = mimeType ? { mimeType } : {};
        const recorder = new MediaRecorder(stream, options);

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };
        recorder.start(100);
        return recorder;
      } catch (err) {
        console.error("Failed to create recorder", err);
        return null;
      }
    };

    if (userStream) {
      userRecorderRef.current = startStreamRecorder(userStream, userChunksRef);
    }

    if (displayStream) {
      displayRecorderRef.current = startStreamRecorder(
        displayStream,
        displayChunksRef
      );
    }

    if (compositeStream) {
      compositeRecorderRef.current = startStreamRecorder(
        compositeStream,
        compositeChunksRef
      );
    }

    setIsRecording(true);
    startTimeRef.current = Date.now();

    // Start Timer
    timerRef.current = window.setInterval(() => {
      setRecordingTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
  }, [userStream, displayStream, compositeStream]);

  const stopRecording = useCallback(() => {
    if (!isRecording) return;

    // Stop timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const finalize = () => {
      const finalDuration = Math.floor(
        (Date.now() - startTimeRef.current) / 1000
      );
      const type = getSupportedMimeType() || "video/webm";

      const userBlob =
        userChunksRef.current.length > 0
          ? new Blob(userChunksRef.current, { type })
          : undefined;

      const displayBlob =
        displayChunksRef.current.length > 0
          ? new Blob(displayChunksRef.current, { type })
          : undefined;

      const compositeBlob =
        compositeChunksRef.current.length > 0
          ? new Blob(compositeChunksRef.current, { type })
          : undefined;

      setRecordings({
        camera: userBlob,
        screen: displayBlob,
        composite: compositeBlob,
        duration: finalDuration,
      });
      setIsRecording(false);
    };

    // Helper to stop a recorder safely
    const stopRecorder = (recorder: MediaRecorder | null) => {
      if (recorder && recorder.state !== "inactive") {
        recorder.stop();
      }
    };

    stopRecorder(userRecorderRef.current);
    stopRecorder(displayRecorderRef.current);
    stopRecorder(compositeRecorderRef.current);

    setTimeout(finalize, 300);
  }, [isRecording]);

  const clearRecordings = useCallback(() => {
    setRecordings(null);
    setRecordingTime(0);
  }, []);

  return {
    isRecording,
    recordingTime,
    startRecording,
    stopRecording,
    recordings,
    clearRecordings,
  };
};

"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { RecordedFiles } from "@/types";
import {
  saveChunk,
  assembleStream,
  clearStream,
  clearAllChunks,
} from "@/lib/chunkStorage";
import { StreamingUploader } from "@/lib/streamingUpload";

export interface UploadState {
  recordingId: string | null;
  isStreaming: boolean;
  completionStatus: "idle" | "completing" | "done" | "failed";
}

interface UseMultiRecorderProps {
  userStream: MediaStream | null;
  displayStream: MediaStream | null;
  compositeStream?: MediaStream | null;
}

const FLUSH_INTERVAL_MS = 30_000; // Flush chunks to IndexedDB every 30 seconds
const TIMESLICE_MS = 5_000; // Capture data every 5 seconds (less overhead)

export const useMultiRecorder = ({
  userStream,
  displayStream,
  compositeStream,
}: UseMultiRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordings, setRecordings] = useState<RecordedFiles | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>({
    recordingId: null,
    isStreaming: false,
    completionStatus: "idle",
  });

  const userRecorderRef = useRef<MediaRecorder | null>(null);
  const displayRecorderRef = useRef<MediaRecorder | null>(null);
  const compositeRecorderRef = useRef<MediaRecorder | null>(null);

  // StreamingUploader refs — one per stream
  const userUploaderRef = useRef<StreamingUploader | null>(null);
  const displayUploaderRef = useRef<StreamingUploader | null>(null);
  const compositeUploaderRef = useRef<StreamingUploader | null>(null);

  const userChunksRef = useRef<Blob[]>([]);
  const displayChunksRef = useRef<Blob[]>([]);
  const compositeChunksRef = useRef<Blob[]>([]);

  // Chunk counters for IndexedDB keys
  const userChunkIndexRef = useRef<number>(0);
  const displayChunkIndexRef = useRef<number>(0);
  const compositeChunkIndexRef = useRef<number>(0);

  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const flushIntervalRef = useRef<number | null>(null);

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

  /**
   * Flush in-memory chunks to IndexedDB and free memory.
   */
  const flushChunksToStorage = useCallback(async () => {
    const flushStream = async (
      name: string,
      chunksRef: React.MutableRefObject<Blob[]>,
      indexRef: React.MutableRefObject<number>,
      mimeType: string,
    ) => {
      if (chunksRef.current.length === 0) return;

      // Consolidate all pending chunks into a single blob
      const consolidated = new Blob(chunksRef.current, { type: mimeType });
      chunksRef.current = []; // Free memory immediately

      try {
        await saveChunk(name, indexRef.current, consolidated);
        indexRef.current++;
      } catch (err) {
        console.error(
          `[Recorder] Failed to flush ${name} chunks to IndexedDB:`,
          err,
        );
      }
    };

    const mimeType = getSupportedMimeType() || "video/webm";
    await Promise.all([
      flushStream("user", userChunksRef, userChunkIndexRef, mimeType),
      flushStream("display", displayChunksRef, displayChunkIndexRef, mimeType),
      flushStream(
        "composite",
        compositeChunksRef,
        compositeChunkIndexRef,
        mimeType,
      ),
    ]);
  }, []);

  const startRecording = useCallback(async () => {
    // Ensure we're in the browser
    if (typeof window === "undefined" || typeof MediaRecorder === "undefined")
      return;
    if (!userStream && !displayStream) return;

    // Reset
    userChunksRef.current = [];
    displayChunksRef.current = [];
    compositeChunksRef.current = [];
    userChunkIndexRef.current = 0;
    displayChunkIndexRef.current = 0;
    compositeChunkIndexRef.current = 0;
    setRecordings(null);
    setRecordingTime(0);

    // Clear any previous chunks from IndexedDB
    await clearAllChunks();

    const mimeType = getSupportedMimeType();

    // Initialize StreamingUploaders for each active stream (non-blocking)
    const timestamp = Date.now();
    const initUploaders = async () => {
      const initUploader = async (
        uploaderRef: React.MutableRefObject<StreamingUploader | null>,
        streamType: string,
      ) => {
        try {
          const uploader = new StreamingUploader(streamType, mimeType || "video/webm");
          uploaderRef.current = uploader;
          const result = await uploader.initialize(`recording-${timestamp}-${streamType}.webm`);
          // Use composite recordingId as the primary one
          if (streamType === "video" || streamType === "composite") {
            setUploadState((s) => ({ ...s, recordingId: result.recordingId, isStreaming: true }));
          }
        } catch (err) {
          console.error(`[StreamingUploader] Failed to init ${streamType}:`, err);
          uploaderRef.current = null;
        }
      };

      const promises: Promise<void>[] = [];
      if (userStream) promises.push(initUploader(userUploaderRef, "camera"));
      if (displayStream) promises.push(initUploader(displayUploaderRef, "screen"));
      if (compositeStream) promises.push(initUploader(compositeUploaderRef, "video"));
      await Promise.allSettled(promises);
    };

    // Fire-and-forget — recording must not wait for upload init
    void initUploaders();

    const startStreamRecorder = (
      stream: MediaStream,
      chunksRef: React.MutableRefObject<Blob[]>,
      uploaderRef: React.MutableRefObject<StreamingUploader | null>,
    ) => {
      try {
        // Ensure stream has tracks before recording
        if (stream.getTracks().length === 0) return null;

        const options: MediaRecorderOptions = mimeType ? { mimeType } : {};
        const recorder = new MediaRecorder(stream, options);

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            // IndexedDB fallback — always save
            chunksRef.current.push(e.data);
            // Streaming upload — non-blocking
            const uploader = uploaderRef.current;
            if (uploader) {
              void e.data.arrayBuffer().then((buf) => {
                void uploader.appendChunk(new Uint8Array(buf));
              });
            }
          }
        };
        recorder.start(TIMESLICE_MS);
        return recorder;
      } catch (err) {
        console.error("Failed to create recorder", err);
        return null;
      }
    };

    if (userStream) {
      userRecorderRef.current = startStreamRecorder(userStream, userChunksRef, userUploaderRef);
    }

    if (displayStream) {
      displayRecorderRef.current = startStreamRecorder(
        displayStream,
        displayChunksRef,
        displayUploaderRef,
      );
    }

    if (compositeStream) {
      compositeRecorderRef.current = startStreamRecorder(
        compositeStream,
        compositeChunksRef,
        compositeUploaderRef,
      );
    }

    setIsRecording(true);
    startTimeRef.current = performance.now();

    // Start timer using performance.now() for accuracy over long durations
    timerRef.current = window.setInterval(() => {
      setRecordingTime(
        Math.floor((performance.now() - startTimeRef.current) / 1000),
      );
    }, 1000);

    // Start periodic flush to IndexedDB
    flushIntervalRef.current = window.setInterval(() => {
      flushChunksToStorage();
    }, FLUSH_INTERVAL_MS);
  }, [userStream, displayStream, compositeStream, flushChunksToStorage]);

  const stopRecording = useCallback(async () => {
    if (!isRecording) return;

    // Stop timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Stop flush interval
    if (flushIntervalRef.current) {
      clearInterval(flushIntervalRef.current);
      flushIntervalRef.current = null;
    }

    // Helper to stop a recorder safely
    const stopRecorder = (recorder: MediaRecorder | null) => {
      if (recorder && recorder.state !== "inactive") {
        recorder.stop();
      }
    };

    stopRecorder(userRecorderRef.current);
    stopRecorder(displayRecorderRef.current);
    stopRecorder(compositeRecorderRef.current);

    // Small delay to ensure ondataavailable fires with remaining data
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Final flush of remaining in-memory chunks
    await flushChunksToStorage();

    const finalDuration = Math.floor(
      (performance.now() - startTimeRef.current) / 1000,
    );
    const type = getSupportedMimeType() || "video/webm";

    // Assemble full recordings from IndexedDB (for editor + legacy fallback)
    const [userBlob, displayBlob, compositeBlob] = await Promise.all([
      assembleStream("user", type),
      assembleStream("display", type),
      assembleStream("composite", type),
    ]);

    setRecordings({
      camera: userBlob,
      screen: displayBlob,
      composite: compositeBlob,
      duration: finalDuration,
    });
    setIsRecording(false);

    // Complete streaming uploads asynchronously
    setUploadState((s) => ({ ...s, completionStatus: "completing" }));
    const completeUploaders = async () => {
      const totalSize =
        (userBlob?.size ?? 0) + (displayBlob?.size ?? 0) + (compositeBlob?.size ?? 0);

      const flushAndComplete = async (
        uploaderRef: React.MutableRefObject<StreamingUploader | null>,
      ) => {
        const uploader = uploaderRef.current;
        if (!uploader) return;
        try {
          await uploader.flush();
          await uploader.complete(finalDuration, totalSize);
        } catch (err) {
          console.error("[StreamingUploader] flush/complete failed:", err);
          throw err;
        }
      };

      try {
        await Promise.all([
          flushAndComplete(userUploaderRef),
          flushAndComplete(displayUploaderRef),
          flushAndComplete(compositeUploaderRef),
        ]);
        setUploadState((s) => ({ ...s, isStreaming: false, completionStatus: "done" }));
      } catch {
        setUploadState((s) => ({ ...s, isStreaming: false, completionStatus: "failed" }));
      }
    };

    void completeUploaders();
  }, [isRecording, flushChunksToStorage]);

  const clearRecordings = useCallback(async () => {
    setRecordings(null);
    setRecordingTime(0);
    setUploadState({ recordingId: null, isStreaming: false, completionStatus: "idle" });
    await clearAllChunks();
  }, []);

  // Abort active multipart uploads when tab is closed during recording
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isRecording) return;

      const abortUploader = (uploaderRef: React.MutableRefObject<StreamingUploader | null>) => {
        const uploader = uploaderRef.current;
        if (!uploader) return;
        // Use sendBeacon for reliable delivery on page unload
        const data = JSON.stringify({
          // We'll trigger abort via the uploader's stored state
        });
        navigator.sendBeacon?.("/api/upload/multipart/abort", new Blob([data], { type: "application/json" }));
      };

      e.preventDefault();
      e.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isRecording]);

  return {
    isRecording,
    recordingTime,
    startRecording,
    stopRecording,
    recordings,
    clearRecordings,
    uploadState,
  };
};

"use client";

import React, { useState, useEffect, useRef } from "react";
import { RecordedFiles, ExportResolution, RESOLUTION_MAP } from "@/types";
import {
  Download,
  X,
  Film,
  Video,
  CheckCircle,
  Layers,
  Scissors,
  Loader2,
  Monitor,
  Mic,
} from "lucide-react";
import { convertToMp4 } from "@/lib/mp4Encoder";

interface PreviewModalProps {
  recordings: RecordedFiles;
  onClose: () => void;
  onEdit: () => void;
  onSaveAndGoHome?: () => void;
  isUploading?: boolean;
  uploadProgress?: number;
  // New props for server-side transcode download
  recordingId?: string;
  transcodeStatus?: "pending" | "processing" | "done" | "failed" | null;
  mp4Keys?: { "720p": string | null; "1080p": string | null; "4k": string | null };
}

export const PreviewModal: React.FC<PreviewModalProps> = ({
  recordings,
  onClose,
  onEdit,
  onSaveAndGoHome,
  isUploading = false,
  uploadProgress = 0,
  recordingId,
  transcodeStatus: initialTranscodeStatus,
  mp4Keys: initialMp4Keys,
}) => {
  const [selectedResolution, setSelectedResolution] =
    useState<ExportResolution>("1080p");
  const [isConverting, setIsConverting] = useState<string | null>(null); // which stream is converting
  const [convertProgress, setConvertProgress] = useState(0);
  const [convertStatus, setConvertStatus] = useState("");

  // Transcode polling state
  const [transcodeStatus, setTranscodeStatus] = useState(initialTranscodeStatus);
  const [mp4Keys, setMp4Keys] = useState(initialMp4Keys);
  const pollRef = useRef<number | null>(null);

  // Determine download mode:
  // Mode A: recordingId + done → direct R2 download
  // Mode B: recordingId + pending/processing → polling
  // Mode C: no recordingId or failed/null → WASM fallback
  const isServerDone = recordingId && transcodeStatus === "done";
  const isServerPending = recordingId && (transcodeStatus === "pending" || transcodeStatus === "processing");
  const useWasmFallback = !recordingId || transcodeStatus === "failed" || transcodeStatus === null || transcodeStatus === undefined;

  // Mode B: poll for transcode completion
  useEffect(() => {
    if (!isServerPending || !recordingId) return;

    const poll = async () => {
      try {
        const response = await fetch(`/api/transcode/status/${recordingId}`);
        if (!response.ok) return;
        const data = await response.json();
        setTranscodeStatus(data.status);
        if (data.mp4Keys) setMp4Keys(data.mp4Keys);
      } catch {
        // Ignore polling errors
      }
    };

    pollRef.current = window.setInterval(poll, 10_000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [isServerPending, recordingId]);

  // Stop polling when done
  useEffect(() => {
    if (transcodeStatus === "done" || transcodeStatus === "failed") {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    }
  }, [transcodeStatus]);

  // Cleanup on close
  const handleClose = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    onClose();
  };

  // Mode A: direct R2 download
  const handleDirectDownload = async (streamKey?: string | null) => {
    if (!streamKey) return;
    try {
      const response = await fetch(`/api/get-video-url?key=${encodeURIComponent(streamKey)}`);
      if (!response.ok) throw new Error("Failed to get download URL");
      const data = await response.json();
      const url = data.url ?? data.presignedUrl ?? data.uploadUrl;
      window.open(url, "_blank");
    } catch (err) {
      console.error("Direct download failed:", err);
    }
  };

  const download = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadMp4 = async (
    blob: Blob,
    filename: string,
    streamId: string,
  ) => {
    if (isConverting) return;

    setIsConverting(streamId);
    setConvertProgress(0);
    setConvertStatus("Initializing...");

    try {
      const res = RESOLUTION_MAP[selectedResolution];
      const mp4Blob = await convertToMp4(blob, {
        width: res.width,
        height: res.height,
        onProgress: (ratio) => setConvertProgress(ratio),
        onStatus: (msg) => setConvertStatus(msg),
      });

      download(mp4Blob, filename);
    } catch (err) {
      console.error("MP4 conversion failed:", err);
      // Fallback: download as WebM
      download(blob, filename.replace(".mp4", ".webm"));
    } finally {
      setIsConverting(null);
      setConvertProgress(0);
      setConvertStatus("");
    }
  };

  const resolutionOptions: ExportResolution[] = ["720p", "1080p", "4k"];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-6">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in duration-300">
        {/* Header */}
        <div className="p-8 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              Recording Complete!
            </h2>
            <p className="text-slate-500 mt-1">
              Edit your video or download tracks as MP4.
            </p>
          </div>
          <button
            onClick={handleClose}
            disabled={!!isConverting}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600 disabled:opacity-50"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 grid gap-4 max-h-[60vh] overflow-y-auto">
          {/* Main Action: Edit */}
          <div className="p-6 rounded-2xl bg-indigo-600 text-white shadow-xl shadow-indigo-200 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                <Scissors size={24} />
              </div>
              <div>
                <h3 className="font-bold text-lg">Edit Video</h3>
                <p className="text-indigo-100 text-sm">
                  Add zooms, change layouts, and trim.
                </p>
              </div>
            </div>
            <button
              onClick={onEdit}
              disabled={!!isConverting}
              className="px-6 py-2.5 bg-white text-indigo-700 rounded-lg font-bold hover:bg-indigo-50 transition-colors disabled:opacity-50"
            >
              Open Editor
            </button>
          </div>

          <div className="my-2 border-t border-slate-100 relative">
            <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              OR Download MP4
            </span>
          </div>

          {/* Resolution Selector */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Export Resolution
            </p>
            <div className="flex gap-2">
              {resolutionOptions.map((res) => {
                const info = RESOLUTION_MAP[res];
                const isSelected = selectedResolution === res;
                return (
                  <button
                    key={res}
                    onClick={() => setSelectedResolution(res)}
                    disabled={!!isConverting}
                    className={`flex-1 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all border-2 relative ${
                      isSelected
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-200"
                        : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300"
                    } disabled:opacity-50`}
                  >
                    <div>{info.label}</div>
                    <div
                      className={`text-[10px] mt-0.5 ${isSelected ? "text-indigo-200" : "text-slate-400"}`}
                    >
                      {info.width}×{info.height}
                    </div>
                    {info.badge && (
                      <span
                        className={`absolute -top-2 -right-2 text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                          info.badge === "Recomendado"
                            ? "bg-green-500 text-white"
                            : "bg-amber-500 text-white"
                        }`}
                      >
                        {info.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mode B: Waiting for server transcode */}
          {isServerPending && (
            <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200">
              <div className="flex items-center gap-3">
                <Loader2 size={16} className="animate-spin text-indigo-600" />
                <span className="text-sm font-medium text-indigo-700">
                  Preparando seu download... transcodificando em background
                </span>
              </div>
            </div>
          )}

          {/* Mode A: Direct R2 download (transcode done) */}
          {isServerDone && mp4Keys && (
            <div className="p-4 rounded-2xl bg-green-50 border border-green-200">
              <div className="flex items-center gap-3 mb-3">
                <CheckCircle size={16} className="text-green-600" />
                <span className="text-sm font-semibold text-green-700">
                  Download rápido disponível
                </span>
              </div>
              <button
                onClick={() => handleDirectDownload(mp4Keys[selectedResolution])}
                disabled={!mp4Keys[selectedResolution]}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                <Download size={16} />
                Download {selectedResolution} MP4 (direto do servidor)
              </button>
            </div>
          )}

          {/* Conversion Progress Bar */}
          {isConverting && (
            <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200">
              <div className="flex items-center gap-3 mb-2">
                <Loader2 size={16} className="animate-spin text-indigo-600" />
                <span className="text-sm font-medium text-indigo-700">
                  {convertStatus}
                </span>
                <span className="ml-auto text-sm font-bold text-indigo-600">
                  {Math.round(convertProgress * 100)}%
                </span>
              </div>
              <div className="w-full bg-indigo-200 rounded-full h-2">
                <div
                  className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.round(convertProgress * 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Screen Recording: MP4 Download */}
          {recordings.screen && (
            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600">
                  <Monitor size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">
                    Screen Recording
                  </h3>
                  <p className="text-sm text-slate-500">
                    {(recordings.screen.size / 1024 / 1024).toFixed(2)} MB ·
                    With system audio (if shared)
                  </p>
                </div>
              </div>
              <button
                onClick={() =>
                  handleDownloadMp4(
                    recordings.screen!,
                    "screen-recording.mp4",
                    "screen",
                  )
                }
                disabled={!!isConverting}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors text-sm disabled:opacity-50"
              >
                {isConverting === "screen" ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Download size={16} />
                )}
                .mp4
              </button>
            </div>
          )}

          {/* Camera Recording: MP4 Download */}
          {recordings.camera && (
            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-pink-100 flex items-center justify-center text-pink-600">
                  <Video size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">
                    Camera Recording
                  </h3>
                  <p className="text-sm text-slate-500">
                    {(recordings.camera.size / 1024 / 1024).toFixed(2)} MB ·
                    With microphone audio
                  </p>
                </div>
              </div>
              <button
                onClick={() =>
                  handleDownloadMp4(
                    recordings.camera!,
                    "camera-recording.mp4",
                    "camera",
                  )
                }
                disabled={!!isConverting}
                className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-lg font-medium hover:bg-pink-700 transition-colors text-sm disabled:opacity-50"
              >
                {isConverting === "camera" ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Download size={16} />
                )}
                .mp4
              </button>
            </div>
          )}

          {/* Composite Download (optional, secondary) */}
          {recordings.composite && (
            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50/50 border border-slate-100/50">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center">
                  <Layers size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-600">
                    Combined Video
                  </h3>
                  <p className="text-sm text-slate-400">
                    {(recordings.composite.size / 1024 / 1024).toFixed(2)} MB ·
                    Screen + Camera overlay
                  </p>
                </div>
              </div>
              <button
                onClick={() =>
                  handleDownloadMp4(
                    recordings.composite!,
                    "complete-video.mp4",
                    "composite",
                  )
                }
                disabled={!!isConverting}
                className="flex items-center gap-2 px-4 py-2 bg-slate-500 text-white rounded-lg font-medium hover:bg-slate-600 transition-colors text-sm disabled:opacity-50"
              >
                {isConverting === "composite" ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Download size={16} />
                )}
                .mp4
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
          <button
            onClick={handleClose}
            disabled={isUploading || !!isConverting}
            className="px-6 py-3 text-slate-500 font-medium hover:text-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Discard
          </button>
          {onSaveAndGoHome && (
            <button
              onClick={onSaveAndGoHome}
              disabled={isUploading || !!isConverting}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Uploading {uploadProgress}%
                </>
              ) : (
                <>
                  <CheckCircle size={20} />
                  Save & Go Home
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

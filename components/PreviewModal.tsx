"use client";

import React from "react";
import { RecordedFiles } from "@/types";
import {
  Download,
  X,
  Film,
  Video,
  CheckCircle,
  Layers,
  Scissors,
} from "lucide-react";

interface PreviewModalProps {
  recordings: RecordedFiles;
  onClose: () => void;
  onEdit: () => void;
  onSaveAndGoHome?: () => void;
  isUploading?: boolean;
  uploadProgress?: number;
}

export const PreviewModal: React.FC<PreviewModalProps> = ({
  recordings,
  onClose,
  onEdit,
  onSaveAndGoHome,
  isUploading = false,
  uploadProgress = 0,
}) => {
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
              Edit your video or download tracks.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600"
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
              className="px-6 py-2.5 bg-white text-indigo-700 rounded-lg font-bold hover:bg-indigo-50 transition-colors"
            >
              Open Editor
            </button>
          </div>

          <div className="my-2 border-t border-slate-100 relative">
            <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              OR Download
            </span>
          </div>

          {/* Composite Recording Item */}
          {recordings.composite && (
            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
                  <Layers size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">
                    Complete Video
                  </h3>
                  <p className="text-sm text-slate-500">
                    {(recordings.composite.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <button
                onClick={() =>
                  download(recordings.composite!, "complete-video.webm")
                }
                className="p-2 hover:bg-white rounded-lg transition-colors text-slate-500 hover:text-indigo-600"
              >
                <Download size={20} />
              </button>
            </div>
          )}

          {/* Screen Recording Item */}
          {recordings.screen && (
            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600">
                  <Film size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Screen Only</h3>
                  <p className="text-sm text-slate-500">
                    {(recordings.screen.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <button
                onClick={() =>
                  download(recordings.screen!, "screen-recording.webm")
                }
                className="p-2 hover:bg-white rounded-lg transition-colors text-slate-500 hover:text-indigo-600"
              >
                <Download size={20} />
              </button>
            </div>
          )}

          {/* Camera Recording Item */}
          {recordings.camera && (
            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-pink-100 flex items-center justify-center text-pink-600">
                  <Video size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Camera Only</h3>
                  <p className="text-sm text-slate-500">
                    {(recordings.camera.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <button
                onClick={() =>
                  download(recordings.camera!, "camera-recording.webm")
                }
                className="p-2 hover:bg-white rounded-lg transition-colors text-slate-500 hover:text-indigo-600"
              >
                <Download size={20} />
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
          <button
            onClick={onClose}
            disabled={isUploading}
            className="px-6 py-3 text-slate-500 font-medium hover:text-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Discard
          </button>
          {onSaveAndGoHome && (
            <button
              onClick={onSaveAndGoHome}
              disabled={isUploading}
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

"use client";

import React, { useState, useRef, useCallback } from "react";
import { Upload, X, FileVideo, AlertCircle } from "lucide-react";

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: () => void;
}

interface UploadProgress {
  fileName: string;
  progress: number;
  status: "uploading" | "processing" | "done" | "error";
  error?: string;
}

const VIDEO_FORMATS = ["mp4", "webm", "mov", "avi"] as const;
const MAX_SIZE = {
  free: 500 * 1024 * 1024, // 500MB
  pro: 2 * 1024 * 1024 * 1024, // 2GB
  enterprise: 10 * 1024 * 1024 * 1024, // 10GB
} as const;

type VideoFormat = typeof VIDEO_FORMATS[number];
type PlanType = keyof typeof MAX_SIZE;

export default function UploadModal({
  isOpen,
  onClose,
  onUploadSuccess,
}: UploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // For now, default to free plan limits
  // TODO: Get user's plan type from auth
  const userPlanType: PlanType = "free";
  const maxSize = MAX_SIZE[userPlanType];

  const validateVideoFormat = (filename: string): boolean => {
    const ext = filename.split(".").pop()?.toLowerCase();
    return VIDEO_FORMATS.includes(ext as VideoFormat);
  };

  const validateVideoSize = (file: File): boolean => {
    return file.size <= maxSize;
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const handleFileSelect = (file: File) => {
    // Validate format
    if (!validateVideoFormat(file.name)) {
      alert(
        `Formato não suportado. Use: ${VIDEO_FORMATS.join(", ")}.`
      );
      return;
    }

    // Validate size
    if (!validateVideoSize(file)) {
      alert(
        `Arquivo muito grande. Limite para plano ${userPlanType}: ${formatBytes(maxSize)}`
      );
      return;
    }

    setSelectedFile(file);
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploadProgress({
      fileName: selectedFile.name,
      progress: 0,
      status: "uploading",
    });

    try {
      // Simulate progress for better UX
      let progress = 0;
      const progressInterval = setInterval(() => {
        progress += 10;
        setUploadProgress((prev) =>
          prev ? { ...prev, progress } : null
        );
        if (progress >= 90) {
          clearInterval(progressInterval);
        }
      }, 200);

      // Create FormData for the upload
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("title", selectedFile.name);

      // Call the API route
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);

      const result = await response.json();

      if (response.ok && result.success) {
        setUploadProgress((prev) =>
          prev ? { ...prev, progress: 100, status: "done" } : null
        );

        // Close modal and refresh after success
        setTimeout(() => {
          onUploadSuccess();
          handleClose();
        }, 1000);
      } else {
        setUploadProgress((prev) =>
          prev
            ? { ...prev, status: "error", error: result.error || "Failed to upload video" }
            : null
        );
      }
    } catch (error) {
      console.error("Upload error:", error);
      setUploadProgress((prev) =>
        prev
          ? { ...prev, status: "error", error: "Failed to upload video" }
          : null
      );
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setUploadProgress(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-full max-w-lg mx-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Upload Video</h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {!selectedFile && !uploadProgress ? (
            /* Drop Zone */
            <div
              ref={dropZoneRef}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
                isDragging
                  ? "border-indigo-500 bg-indigo-50"
                  : "border-gray-300 hover:border-indigo-400 hover:bg-gray-50"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".mp4,.webm,.mov,.avi"
                onChange={handleInputChange}
                className="hidden"
              />
              <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Upload className="w-8 h-8 text-indigo-600" />
              </div>
              <p className="text-lg font-medium text-gray-900 mb-2">
                Drag & drop your video here
              </p>
              <p className="text-sm text-gray-500 mb-4">or</p>
              <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium transition-colors">
                Browse files
              </button>
              <p className="text-xs text-gray-400 mt-4">
                Supported formats: {VIDEO_FORMATS.join(", ").toUpperCase()}
              </p>
              <p className="text-xs text-gray-400">
                Max size: {formatBytes(maxSize)}
              </p>
            </div>
          ) : uploadProgress ? (
            /* Upload Progress */
            <div className="text-center py-8">
              {uploadProgress.status === "uploading" && (
                <>
                  <FileVideo className="w-16 h-16 text-indigo-600 mx-auto mb-4" />
                  <p className="text-lg font-medium text-gray-900 mb-2">
                    Uploading...
                  </p>
                  <p className="text-sm text-gray-500 mb-4">
                    {uploadProgress.fileName}
                  </p>
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                    <div
                      className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress.progress}%` }}
                    />
                  </div>
                  <p className="text-sm text-gray-600">
                    {uploadProgress.progress}%
                  </p>
                </>
              )}

              {uploadProgress.status === "processing" && (
                <>
                  <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-lg font-medium text-gray-900 mb-2">
                    Processing video...
                  </p>
                  <p className="text-sm text-gray-500">
                    Generating thumbnail and preparing your video
                  </p>
                </>
              )}

              {uploadProgress.status === "done" && (
                <>
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileVideo className="w-8 h-8 text-green-600" />
                  </div>
                  <p className="text-lg font-medium text-gray-900 mb-2">
                    Upload complete!
                  </p>
                  <p className="text-sm text-gray-500">
                    Your video is ready to edit
                  </p>
                </>
              )}

              {uploadProgress.status === "error" && (
                <>
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="w-8 h-8 text-red-600" />
                  </div>
                  <p className="text-lg font-medium text-red-600 mb-2">
                    Upload failed
                  </p>
                  <p className="text-sm text-gray-500 mb-4">
                    {uploadProgress.error || "Something went wrong"}
                  </p>
                  <button
                    onClick={() => setUploadProgress(null)}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-2 rounded-lg font-medium transition-colors"
                  >
                    Try again
                  </button>
                </>
              )}
            </div>
          ) : selectedFile ? (
            /* File Preview */
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileVideo className="w-8 h-8 text-indigo-600" />
              </div>
              <p className="text-lg font-medium text-gray-900 mb-1">
                {selectedFile.name}
              </p>
              <p className="text-sm text-gray-500 mb-6">
                {formatBytes(selectedFile.size)}
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setSelectedFile(null)}
                  className="px-6 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpload}
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
                >
                  Upload
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

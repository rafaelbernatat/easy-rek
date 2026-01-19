"use client";

import React, { useRef } from "react";
import {
  LayoutConfig,
  CameraSize,
  BackgroundStyle,
  CameraShape,
  BorderType,
  ShadowStyle,
  ProjectMetadata,
} from "@/types";
import { clsx } from "clsx";
import {
  Circle,
  Square,
  RectangleHorizontal,
  RectangleVertical,
  Settings,
  Palette,
  Upload,
  Image as ImageIcon,
  X,
  Volume2,
  Mic,
  Monitor,
  FlipHorizontal,
} from "lucide-react";

interface SidebarProps {
  layoutConfig: LayoutConfig;
  onChange: (config: LayoutConfig) => void;
  metadata: ProjectMetadata;
  onMetadataChange: (meta: ProjectMetadata) => void;
  isRecording: boolean;
  onToggleSidebar?: () => void;
  // New props for volume control
  globalMicVolume?: number;
  globalScreenVolume?: number;
  onGlobalVolumeChange?: (type: "mic" | "screen", val: number) => void;
  // Specific Action Volume (if an audio action is selected)
  actionVolume?: number;
  onActionVolumeChange?: (val: number) => void;
  // Camera mirror control for editor
  isMirrored?: boolean;
  onToggleMirror?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  layoutConfig,
  onChange,
  metadata,
  onMetadataChange,
  isRecording,
  onToggleSidebar,
  globalMicVolume = 1,
  globalScreenVolume = 1,
  onGlobalVolumeChange,
  actionVolume,
  onActionVolumeChange,
  isMirrored,
  onToggleMirror,
}) => {
  const [activeTab, setActiveTab] = React.useState<
    "setup" | "style" | "templates"
  >("templates");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateConfig = (key: keyof LayoutConfig, value: any) => {
    onChange({ ...layoutConfig, [key]: value });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      // Important: Update both keys simultaneously to avoid state race conditions
      onChange({
        ...layoutConfig,
        backgroundImage: url,
        background: BackgroundStyle.IMAGE,
      });
      e.target.value = "";
    }
  };

  const removeImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Update both simultaneously when removing
    const newConfig = { ...layoutConfig, backgroundImage: undefined };
    if (layoutConfig.background === BackgroundStyle.IMAGE) {
      newConfig.background = BackgroundStyle.GRADIENT_1;
    }
    onChange(newConfig);
  };

  const applyCameraShape = (shape: CameraShape) => {
    let aspect = 16 / 9;
    if (shape === CameraShape.SQUARE || shape === CameraShape.CIRCLE)
      aspect = 1;
    if (shape === CameraShape.VERTICAL) aspect = 9 / 16;

    let newW = 0.25;
    if (layoutConfig.cameraSize === CameraSize.SMALL) newW = 0.18;
    if (layoutConfig.cameraSize === CameraSize.MEDIUM) newW = 0.25;
    if (layoutConfig.cameraSize === CameraSize.LARGE) newW = 0.35;

    if (shape === CameraShape.VERTICAL) {
      newW = newW * 0.6;
    }

    const canvasRatio = 16 / 9;
    const newH = (newW * canvasRatio) / aspect;

    const oldT = layoutConfig.cameraTransform;
    const centerX = oldT.x + oldT.width / 2;
    const centerY = oldT.y + oldT.height / 2;

    onChange({
      ...layoutConfig,
      cameraShape: shape,
      cameraTransform: {
        x: centerX - newW / 2,
        y: centerY - newH / 2,
        width: newW,
        height: newH,
        aspectRatio: aspect,
      },
    });
  };

  const applyCameraSize = (size: CameraSize) => {
    const shape = layoutConfig.cameraShape;
    const aspect = layoutConfig.cameraTransform.aspectRatio;
    const oldT = layoutConfig.cameraTransform;
    const centerX = oldT.x + oldT.width / 2;
    const centerY = oldT.y + oldT.height / 2;

    let newW = 0.25;
    if (size === CameraSize.SMALL) newW = 0.18;
    if (size === CameraSize.MEDIUM) newW = 0.25;
    if (size === CameraSize.LARGE) newW = 0.35;

    if (shape === CameraShape.VERTICAL) newW = newW * 0.6;

    const canvasRatio = 16 / 9;
    const newH = (newW * canvasRatio) / aspect;

    onChange({
      ...layoutConfig,
      cameraSize: size,
      cameraTransform: {
        ...oldT,
        x: centerX - newW / 2,
        y: centerY - newH / 2,
        width: newW,
        height: newH,
      },
    });
  };

  // If we are editing a specific audio action, only show that control
  if (actionVolume !== undefined && onActionVolumeChange) {
    return (
      <div className="w-80 bg-white border-l border-slate-200 h-full flex flex-col z-20 shadow-xl shrink-0">
        <div className="p-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2 text-slate-500 font-bold uppercase tracking-wider text-xs">
            <Volume2 size={14} />
            Audio Settings
          </div>
        </div>
        <div className="p-6 space-y-6">
          <section>
            <div className="flex justify-between mb-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Volume
              </label>
              <span className="text-xs font-bold text-indigo-600">
                {Math.round(actionVolume * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1.5"
              step="0.05"
              value={actionVolume}
              onChange={(e) => onActionVolumeChange(parseFloat(e.target.value))}
              className="w-full accent-indigo-600 h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer"
            />
          </section>
          <p className="text-xs text-slate-400">
            Adjusting this volume will only affect the selected section of the
            track.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 bg-white border-l border-slate-200 h-full flex flex-col z-20 shadow-xl shrink-0">
      {/* Header com botão fechar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
        <h2 className="text-sm font-bold text-slate-700">Settings</h2>
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="p-1.5 hover:bg-slate-200 rounded-md transition-colors text-slate-500 hover:text-slate-700"
            title="Hide settings"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 shrink-0">
        <button
          onClick={() => setActiveTab("templates")}
          className={clsx(
            "flex-1 py-3 text-xs font-bold uppercase tracking-wide flex items-center justify-center gap-2 transition-colors",
            activeTab === "templates"
              ? "text-slate-900 border-b-2 border-slate-900 bg-slate-50"
              : "text-slate-500 hover:text-slate-700 hover:bg-slate-50",
          )}
        >
          <RectangleHorizontal size={14} />
          Templates
        </button>
        <button
          onClick={() => setActiveTab("style")}
          className={clsx(
            "flex-1 py-3 text-xs font-bold uppercase tracking-wide flex items-center justify-center gap-2 transition-colors",
            activeTab === "style"
              ? "text-slate-900 border-b-2 border-slate-900 bg-slate-50"
              : "text-slate-500 hover:text-slate-700 hover:bg-slate-50",
          )}
        >
          <Palette size={14} />
          Style
        </button>
        <button
          onClick={() => setActiveTab("setup")}
          className={clsx(
            "flex-1 py-3 text-xs font-bold uppercase tracking-wide flex items-center justify-center gap-2 transition-colors",
            activeTab === "setup"
              ? "text-slate-900 border-b-2 border-slate-900 bg-slate-50"
              : "text-slate-500 hover:text-slate-700 hover:bg-slate-50",
          )}
        >
          <Settings size={14} />
          Setup
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
        {/* TEMPLATES TAB */}
        {activeTab === "templates" && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <section>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 block">
                Layout Templates
              </label>

              {/* Screen + Camera (Default) */}
              <button
                onClick={() => {
                  onChange({
                    ...layoutConfig,
                    cameraTransform: {
                      x: 0.73,
                      y: 0.65,
                      width: 0.25,
                      height: 0.3,
                      aspectRatio: 16 / 9,
                    },
                    screenTransform: {
                      x: 0.05,
                      y: 0.05,
                      width: 0.9,
                      height: 0.9,
                      aspectRatio: 16 / 9,
                    },
                  });
                }}
                className="w-full p-4 border-2 border-slate-200 hover:border-indigo-400 rounded-xl transition-all hover:shadow-md group mb-3"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center group-hover:bg-indigo-200 transition-colors">
                    <Monitor size={20} className="text-indigo-600" />
                  </div>
                  <div className="text-left flex-1">
                    <h3 className="font-bold text-sm text-slate-900">
                      Screen + Camera
                    </h3>
                    <p className="text-xs text-slate-500">
                      Default recording layout
                    </p>
                  </div>
                </div>
                <div className="w-full h-24 bg-slate-100 rounded-lg relative overflow-hidden">
                  <div className="absolute inset-2 bg-gradient-to-br from-blue-200 to-blue-300 rounded" />
                  <div className="absolute bottom-2 right-2 w-16 h-12 bg-gradient-to-br from-purple-400 to-pink-400 rounded border-2 border-white shadow-lg" />
                </div>
              </button>

              {/* Camera Only */}
              <button
                onClick={() => {
                  onChange({
                    ...layoutConfig,
                    cameraTransform: {
                      x: 0.1,
                      y: 0.1,
                      width: 0.8,
                      height: 0.8,
                      aspectRatio: 16 / 9,
                    },
                    screenTransform: {
                      x: 0,
                      y: 0,
                      width: 0,
                      height: 0,
                      aspectRatio: 16 / 9,
                    },
                  });
                }}
                className="w-full p-4 border-2 border-slate-200 hover:border-purple-400 rounded-xl transition-all hover:shadow-md group mb-3"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                    <Circle size={20} className="text-purple-600" />
                  </div>
                  <div className="text-left flex-1">
                    <h3 className="font-bold text-sm text-slate-900">
                      Camera Only
                    </h3>
                    <p className="text-xs text-slate-500">
                      Record yourself talking
                    </p>
                  </div>
                </div>
                <div className="w-full h-24 bg-slate-100 rounded-lg relative overflow-hidden flex items-center justify-center">
                  <div className="w-32 h-20 bg-gradient-to-br from-purple-400 to-pink-400 rounded-lg border-2 border-white shadow-xl" />
                </div>
              </button>

              {/* Screen Only */}
              <button
                onClick={() => {
                  onChange({
                    ...layoutConfig,
                    cameraTransform: {
                      x: 0,
                      y: 0,
                      width: 0,
                      height: 0,
                      aspectRatio: 16 / 9,
                    },
                    screenTransform: {
                      x: 0,
                      y: 0,
                      width: 1,
                      height: 1,
                      aspectRatio: 16 / 9,
                    },
                  });
                }}
                className="w-full p-4 border-2 border-slate-200 hover:border-blue-400 rounded-xl transition-all hover:shadow-md group mb-3"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                    <Monitor size={20} className="text-blue-600" />
                  </div>
                  <div className="text-left flex-1">
                    <h3 className="font-bold text-sm text-slate-900">
                      Screen Only
                    </h3>
                    <p className="text-xs text-slate-500">No camera overlay</p>
                  </div>
                </div>
                <div className="w-full h-24 bg-gradient-to-br from-blue-200 to-blue-300 rounded-lg" />
              </button>

              {/* Split 50/50 */}
              <button
                onClick={() => {
                  onChange({
                    ...layoutConfig,
                    cameraTransform: {
                      x: 0,
                      y: 0.1,
                      width: 0.48,
                      height: 0.8,
                      aspectRatio: 16 / 9,
                    },
                    screenTransform: {
                      x: 0.52,
                      y: 0.1,
                      width: 0.48,
                      height: 0.8,
                      aspectRatio: 16 / 9,
                    },
                  });
                }}
                className="w-full p-4 border-2 border-slate-200 hover:border-green-400 rounded-xl transition-all hover:shadow-md group mb-3"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors">
                    <RectangleHorizontal size={20} className="text-green-600" />
                  </div>
                  <div className="text-left flex-1">
                    <h3 className="font-bold text-sm text-slate-900">
                      Split View
                    </h3>
                    <p className="text-xs text-slate-500">
                      Camera and screen side-by-side
                    </p>
                  </div>
                </div>
                <div className="w-full h-24 bg-slate-100 rounded-lg relative overflow-hidden flex gap-1 p-1">
                  <div className="flex-1 bg-gradient-to-br from-purple-400 to-pink-400 rounded" />
                  <div className="flex-1 bg-gradient-to-br from-blue-200 to-blue-300 rounded" />
                </div>
              </button>

              {/* Camera Split - Top/Bottom */}
              <button
                onClick={() => {
                  onChange({
                    ...layoutConfig,
                    cameraTransform: {
                      x: 0.1,
                      y: 0,
                      width: 0.8,
                      height: 0.48,
                      aspectRatio: 16 / 9,
                    },
                    screenTransform: {
                      x: 0.1,
                      y: 0.52,
                      width: 0.8,
                      height: 0.48,
                      aspectRatio: 16 / 9,
                    },
                  });
                }}
                className="w-full p-4 border-2 border-slate-200 hover:border-teal-400 rounded-xl transition-all hover:shadow-md group mb-3"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center group-hover:bg-teal-200 transition-colors">
                    <RectangleVertical size={20} className="text-teal-600" />
                  </div>
                  <div className="text-left flex-1">
                    <h3 className="font-bold text-sm text-slate-900">
                      Vertical Split
                    </h3>
                    <p className="text-xs text-slate-500">
                      Camera on top, screen below
                    </p>
                  </div>
                </div>
                <div className="w-full h-24 bg-slate-100 rounded-lg relative overflow-hidden flex flex-col gap-1 p-1">
                  <div className="flex-1 bg-gradient-to-br from-purple-400 to-pink-400 rounded" />
                  <div className="flex-1 bg-gradient-to-br from-blue-200 to-blue-300 rounded" />
                </div>
              </button>

              {/* Camera Left - 70/30 */}
              <button
                onClick={() => {
                  onChange({
                    ...layoutConfig,
                    cameraTransform: {
                      x: 0,
                      y: 0.05,
                      width: 0.35,
                      height: 0.9,
                      aspectRatio: 16 / 9,
                    },
                    screenTransform: {
                      x: 0.38,
                      y: 0.05,
                      width: 0.6,
                      height: 0.9,
                      aspectRatio: 16 / 9,
                    },
                  });
                }}
                className="w-full p-4 border-2 border-slate-200 hover:border-cyan-400 rounded-xl transition-all hover:shadow-md group mb-3"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-cyan-100 rounded-lg flex items-center justify-center group-hover:bg-cyan-200 transition-colors">
                    <Square size={20} className="text-cyan-600" />
                  </div>
                  <div className="text-left flex-1">
                    <h3 className="font-bold text-sm text-slate-900">
                      Camera Focus
                    </h3>
                    <p className="text-xs text-slate-500">
                      Larger camera on left
                    </p>
                  </div>
                </div>
                <div className="w-full h-24 bg-slate-100 rounded-lg relative overflow-hidden flex gap-1 p-1">
                  <div className="w-10 bg-gradient-to-br from-purple-400 to-pink-400 rounded" />
                  <div className="flex-1 bg-gradient-to-br from-blue-200 to-blue-300 rounded" />
                </div>
              </button>

              {/* Screen Focus - 70/30 */}
              <button
                onClick={() => {
                  onChange({
                    ...layoutConfig,
                    cameraTransform: {
                      x: 0.65,
                      y: 0.05,
                      width: 0.33,
                      height: 0.9,
                      aspectRatio: 16 / 9,
                    },
                    screenTransform: {
                      x: 0.02,
                      y: 0.05,
                      width: 0.6,
                      height: 0.9,
                      aspectRatio: 16 / 9,
                    },
                  });
                }}
                className="w-full p-4 border-2 border-slate-200 hover:border-sky-400 rounded-xl transition-all hover:shadow-md group mb-3"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-sky-100 rounded-lg flex items-center justify-center group-hover:bg-sky-200 transition-colors">
                    <Monitor size={20} className="text-sky-600" />
                  </div>
                  <div className="text-left flex-1">
                    <h3 className="font-bold text-sm text-slate-900">
                      Screen Focus
                    </h3>
                    <p className="text-xs text-slate-500">
                      Larger screen on left
                    </p>
                  </div>
                </div>
                <div className="w-full h-24 bg-slate-100 rounded-lg relative overflow-hidden flex gap-1 p-1">
                  <div className="flex-1 bg-gradient-to-br from-blue-200 to-blue-300 rounded" />
                  <div className="w-10 bg-gradient-to-br from-purple-400 to-pink-400 rounded" />
                </div>
              </button>

              {/* Picture-in-Picture Vertical */}
              <button
                onClick={() => {
                  onChange({
                    ...layoutConfig,
                    cameraTransform: {
                      x: 0.05,
                      y: 0.65,
                      width: 0.15,
                      height: 0.3,
                      aspectRatio: 9 / 16,
                    },
                    screenTransform: {
                      x: 0.05,
                      y: 0.05,
                      width: 0.9,
                      height: 0.9,
                      aspectRatio: 16 / 9,
                    },
                  });
                }}
                className="w-full p-4 border-2 border-slate-200 hover:border-orange-400 rounded-xl transition-all hover:shadow-md group"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center group-hover:bg-orange-200 transition-colors">
                    <RectangleVertical size={20} className="text-orange-600" />
                  </div>
                  <div className="text-left flex-1">
                    <h3 className="font-bold text-sm text-slate-900">
                      Vertical Camera
                    </h3>
                    <p className="text-xs text-slate-500">
                      For mobile-style content
                    </p>
                  </div>
                </div>
                <div className="w-full h-24 bg-slate-100 rounded-lg relative overflow-hidden">
                  <div className="absolute inset-2 bg-gradient-to-br from-blue-200 to-blue-300 rounded" />
                  <div className="absolute bottom-2 left-2 w-10 h-16 bg-gradient-to-br from-purple-400 to-pink-400 rounded border-2 border-white shadow-lg" />
                </div>
              </button>
            </section>
          </div>
        )}

        {/* SETUP TAB */}
        {activeTab === "setup" && (
          <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <section>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">
                Project Name
              </label>
              <input
                type="text"
                value={metadata.name}
                onChange={(e) =>
                  onMetadataChange({ ...metadata, name: e.target.value })
                }
                placeholder="My Recording..."
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all text-slate-900 bg-white text-sm font-medium shadow-sm"
              />
            </section>

            {/* Global Audio Controls */}
            {onGlobalVolumeChange && (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-4">
                <div className="flex items-center gap-2 text-slate-500 font-bold uppercase tracking-wider text-[10px] mb-2">
                  <Volume2 size={12} /> Global Audio
                </div>

                <div>
                  <div className="flex justify-between mb-1 items-center">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                      <Mic size={12} /> Microphone
                    </div>
                    <span className="text-[10px] font-bold text-slate-400">
                      {Math.round(globalMicVolume * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1.5"
                    step="0.05"
                    value={globalMicVolume}
                    onChange={(e) =>
                      onGlobalVolumeChange("mic", parseFloat(e.target.value))
                    }
                    className="w-full accent-slate-500 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-1 items-center">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                      <Monitor size={12} /> System Audio
                    </div>
                    <span className="text-[10px] font-bold text-slate-400">
                      {Math.round(globalScreenVolume * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1.5"
                    step="0.05"
                    value={globalScreenVolume}
                    onChange={(e) =>
                      onGlobalVolumeChange("screen", parseFloat(e.target.value))
                    }
                    className="w-full accent-slate-500 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* STYLE TAB */}
        {activeTab === "style" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Camera Shape */}
            <section>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">
                Camera Shape
              </label>
              <div className="grid grid-cols-4 gap-2">
                <button
                  onClick={() => applyCameraShape(CameraShape.CIRCLE)}
                  className={clsx(
                    "h-12 flex items-center justify-center rounded-lg border-2 transition-all hover:scale-105 active:scale-95",
                    layoutConfig.cameraShape === CameraShape.CIRCLE
                      ? "border-purple-500 bg-purple-50 text-purple-600 shadow-sm"
                      : "border-slate-100 hover:border-slate-200 text-slate-400 hover:bg-slate-50",
                  )}
                >
                  <Circle size={20} strokeWidth={2.5} />
                </button>
                <button
                  onClick={() => applyCameraShape(CameraShape.SQUARE)}
                  className={clsx(
                    "h-12 flex items-center justify-center rounded-lg border-2 transition-all hover:scale-105 active:scale-95",
                    layoutConfig.cameraShape === CameraShape.SQUARE
                      ? "border-purple-500 bg-purple-50 text-purple-600 shadow-sm"
                      : "border-slate-100 hover:border-slate-200 text-slate-400 hover:bg-slate-50",
                  )}
                >
                  <Square size={20} strokeWidth={2.5} />
                </button>
                <button
                  onClick={() => applyCameraShape(CameraShape.HORIZONTAL)}
                  className={clsx(
                    "h-12 flex items-center justify-center rounded-lg border-2 transition-all hover:scale-105 active:scale-95",
                    layoutConfig.cameraShape === CameraShape.HORIZONTAL
                      ? "border-purple-500 bg-purple-50 text-purple-600 shadow-sm"
                      : "border-slate-100 hover:border-slate-200 text-slate-400 hover:bg-slate-50",
                  )}
                >
                  <RectangleHorizontal size={24} strokeWidth={2.5} />
                </button>
                <button
                  onClick={() => applyCameraShape(CameraShape.VERTICAL)}
                  className={clsx(
                    "h-12 flex items-center justify-center rounded-lg border-2 transition-all hover:scale-105 active:scale-95",
                    layoutConfig.cameraShape === CameraShape.VERTICAL
                      ? "border-purple-500 bg-purple-50 text-purple-600 shadow-sm"
                      : "border-slate-100 hover:border-slate-200 text-slate-400 hover:bg-slate-50",
                  )}
                >
                  <RectangleVertical size={20} strokeWidth={2.5} />
                </button>
              </div>
            </section>

            {/* Camera Size */}
            <section>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">
                Camera Size
              </label>
              <div className="flex bg-slate-100 p-1 rounded-lg">
                {Object.values(CameraSize).map((size) => (
                  <button
                    key={size}
                    onClick={() => applyCameraSize(size)}
                    className={clsx(
                      "flex-1 py-1.5 text-[10px] font-bold rounded-md transition-all capitalize",
                      layoutConfig.cameraSize === size
                        ? "bg-white shadow-sm text-slate-900 ring-1 ring-black/5"
                        : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50",
                    )}
                  >
                    {size.toLowerCase()}
                  </button>
                ))}
              </div>
            </section>

            {/* Camera Mirror - Only show in editor when callback is provided */}
            {onToggleMirror && (
              <section>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">
                  Camera Mirror
                </label>
                <button
                  onClick={onToggleMirror}
                  className={clsx(
                    "w-full h-12 flex items-center justify-center gap-2 rounded-lg border-2 transition-all hover:scale-[1.02] active:scale-95",
                    isMirrored
                      ? "border-indigo-500 bg-indigo-50 text-indigo-600 shadow-sm"
                      : "border-slate-100 hover:border-slate-200 text-slate-400 hover:bg-slate-50",
                  )}
                >
                  <FlipHorizontal size={20} strokeWidth={2.5} />
                  <span className="text-sm font-semibold">
                    {isMirrored ? "Mirrored" : "Normal"}
                  </span>
                </button>
              </section>
            )}

            {/* Border Type */}
            <section>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">
                Border Radius
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => updateConfig("border", BorderType.NONE)}
                  className={clsx(
                    "h-10 border-2 rounded-lg flex items-center justify-center transition-all hover:scale-105 active:scale-95",
                    layoutConfig.border === BorderType.NONE
                      ? "border-purple-500 bg-purple-50"
                      : "border-slate-100 hover:border-slate-200 hover:bg-slate-50",
                  )}
                >
                  <div
                    className={clsx(
                      "w-5 h-5 border-2 bg-white",
                      layoutConfig.border === BorderType.NONE
                        ? "border-purple-400"
                        : "border-slate-300",
                    )}
                  />
                </button>
                <button
                  onClick={() => updateConfig("border", BorderType.ROUNDED)}
                  className={clsx(
                    "h-10 border-2 rounded-lg flex items-center justify-center transition-all hover:scale-105 active:scale-95",
                    layoutConfig.border === BorderType.ROUNDED
                      ? "border-purple-500 bg-purple-50"
                      : "border-slate-100 hover:border-slate-200 hover:bg-slate-50",
                  )}
                >
                  <div
                    className={clsx(
                      "w-5 h-5 border-2 rounded-md bg-white",
                      layoutConfig.border === BorderType.ROUNDED
                        ? "border-purple-400"
                        : "border-slate-300",
                    )}
                  />
                </button>
                <button
                  onClick={() => updateConfig("border", BorderType.CURVED)}
                  className={clsx(
                    "h-10 border-2 rounded-lg flex items-center justify-center transition-all hover:scale-105 active:scale-95",
                    layoutConfig.border === BorderType.CURVED
                      ? "border-purple-500 bg-purple-50"
                      : "border-slate-100 hover:border-slate-200 hover:bg-slate-50",
                  )}
                >
                  <div
                    className={clsx(
                      "w-5 h-5 border-2 rounded-full bg-white",
                      layoutConfig.border === BorderType.CURVED
                        ? "border-purple-400"
                        : "border-slate-300",
                    )}
                  />
                </button>
              </div>
            </section>

            {/* Shadow Style & Color */}
            <section>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Shadow
                </label>
                <div className="relative group">
                  <input
                    type="color"
                    value={layoutConfig.shadowColor || "#000000"}
                    onChange={(e) =>
                      updateConfig("shadowColor", e.target.value)
                    }
                    className="w-6 h-6 p-0 border-0 rounded-full overflow-hidden cursor-pointer ring-1 ring-slate-200"
                  />
                  <div className="absolute inset-0 rounded-full ring-1 ring-black/10 pointer-events-none"></div>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                <button
                  onClick={() => updateConfig("shadow", ShadowStyle.NONE)}
                  className={clsx(
                    "h-9 border-2 rounded-lg flex items-center justify-center text-[10px] font-bold transition-all",
                    layoutConfig.shadow === ShadowStyle.NONE
                      ? "border-purple-500 bg-purple-50 text-purple-600"
                      : "border-slate-100 text-slate-400 hover:border-slate-200 hover:bg-slate-50",
                  )}
                >
                  None
                </button>
                <button
                  onClick={() => updateConfig("shadow", ShadowStyle.SOFT)}
                  className={clsx(
                    "h-9 border-2 rounded-lg flex items-center justify-center text-[10px] font-bold shadow-md transition-all",
                    layoutConfig.shadow === ShadowStyle.SOFT
                      ? "border-purple-500 bg-purple-50 text-purple-600"
                      : "border-slate-100 text-slate-400 hover:border-slate-200 hover:bg-slate-50",
                  )}
                >
                  Soft
                </button>
                <button
                  onClick={() => updateConfig("shadow", ShadowStyle.HARD)}
                  className={clsx(
                    "h-9 border-2 rounded-lg flex items-center justify-center text-[10px] font-bold shadow-[2px_2px_0px_rgba(0,0,0,0.8)] transition-all",
                    layoutConfig.shadow === ShadowStyle.HARD
                      ? "border-purple-500 bg-purple-50 text-purple-600"
                      : "border-slate-100 text-slate-400 hover:border-slate-200 hover:bg-slate-50",
                  )}
                >
                  Retro
                </button>
                <button
                  onClick={() => updateConfig("shadow", ShadowStyle.NEON)}
                  className={clsx(
                    "h-9 border-2 rounded-lg flex items-center justify-center text-[10px] font-bold shadow-[0_0_6px_rgba(168,85,247,0.5)] transition-all",
                    layoutConfig.shadow === ShadowStyle.NEON
                      ? "border-purple-500 bg-purple-50 text-purple-600"
                      : "border-slate-100 text-slate-400 hover:border-slate-200 hover:bg-slate-50",
                  )}
                >
                  Neon
                </button>
              </div>
            </section>

            <div className="h-px bg-slate-100 my-2" />

            {/* Background Options */}
            <section>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">
                Background
              </label>

              <div className="grid grid-cols-2 gap-2 mb-3">
                <button
                  onClick={() =>
                    updateConfig("background", BackgroundStyle.GRADIENT_1)
                  }
                  className={clsx(
                    "h-12 rounded-lg bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 border-2 transition-all hover:scale-[1.02]",
                    layoutConfig.background === BackgroundStyle.GRADIENT_1
                      ? "border-purple-500 shadow-sm ring-2 ring-purple-200"
                      : "border-transparent",
                  )}
                />
                <button
                  onClick={() =>
                    updateConfig("background", BackgroundStyle.GRADIENT_2)
                  }
                  className={clsx(
                    "h-12 rounded-lg bg-gradient-to-tr from-blue-100 via-sky-100 to-cyan-100 border-2 transition-all hover:scale-[1.02]",
                    layoutConfig.background === BackgroundStyle.GRADIENT_2
                      ? "border-purple-500 shadow-sm ring-2 ring-purple-200"
                      : "border-transparent",
                  )}
                />
                <button
                  onClick={() =>
                    updateConfig("background", BackgroundStyle.SOLID_DARK)
                  }
                  className={clsx(
                    "h-12 rounded-lg bg-slate-900 border-2 transition-all hover:scale-[1.02]",
                    layoutConfig.background === BackgroundStyle.SOLID_DARK
                      ? "border-purple-500 shadow-sm ring-2 ring-purple-200"
                      : "border-transparent",
                  )}
                />
                <button
                  onClick={() =>
                    updateConfig("background", BackgroundStyle.BLURRED)
                  }
                  className={clsx(
                    "h-12 rounded-lg bg-slate-200 border-2 transition-all relative overflow-hidden hover:scale-[1.02]",
                    layoutConfig.background === BackgroundStyle.BLURRED
                      ? "border-purple-500 shadow-sm ring-2 ring-purple-200"
                      : "border-transparent",
                  )}
                >
                  <div className="absolute inset-0 bg-white/40 backdrop-blur-md flex items-center justify-center text-[10px] font-bold text-slate-600">
                    BLUR
                  </div>
                </button>
              </div>

              {/* Image Upload / Preview */}
              {layoutConfig.backgroundImage ? (
                <div className="relative group w-full h-16">
                  <button
                    onClick={() =>
                      updateConfig("background", BackgroundStyle.IMAGE)
                    }
                    className={clsx(
                      "w-full h-full rounded-lg bg-cover bg-center border-2 transition-all",
                      layoutConfig.background === BackgroundStyle.IMAGE
                        ? "border-purple-500 shadow-sm ring-2 ring-purple-200"
                        : "border-slate-200",
                    )}
                    style={{
                      backgroundImage: `url(${layoutConfig.backgroundImage})`,
                    }}
                  ></button>
                  <button
                    onClick={removeImage}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center shadow-md hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
                    title="Remove Image"
                  >
                    <X size={12} strokeWidth={3} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className={clsx(
                    "w-full h-10 border-2 border-dashed rounded-lg flex items-center justify-center gap-2 text-xs font-semibold transition-all hover:scale-[1.01] active:scale-[0.99]",
                    "border-slate-200 text-slate-500 hover:border-slate-400 hover:bg-slate-50",
                  )}
                >
                  <Upload size={14} />
                  Upload Image
                </button>
              )}

              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleImageUpload}
              />
            </section>
          </div>
        )}
      </div>

      {isRecording && (
        <div className="mt-auto p-3 bg-red-50 border-t border-red-100 shrink-0">
          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <p className="text-[10px] text-red-600 font-bold uppercase tracking-wide">
              Recording in progress
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

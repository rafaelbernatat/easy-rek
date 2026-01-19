"use client";

import React, { useRef, useEffect, useState } from "react";
import {
  LayoutConfig,
  CameraShape,
  BackgroundStyle,
  BorderType,
  ShadowStyle,
} from "@/types";
import { clsx } from "clsx";
import { Monitor } from "lucide-react";
import { TransformableLayer } from "@/components/TransformableLayer";
import { motion } from "framer-motion";

interface BlurAction {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  intensity: number;
}

interface StageProps {
  userStream?: MediaStream | null;
  displayStream?: MediaStream | null;
  // Playback sources (Blobs)
  userSource?: string;
  displaySource?: string;
  // State
  layoutConfig: LayoutConfig;
  onLayoutConfigChange?: (config: LayoutConfig) => void;
  activeLayer: string | null;
  onSelectLayer: (id: string | null) => void;
  // Editor
  isReadOnly?: boolean;
  zoom?: { scale: number; x: number; y: number };
  currentTime?: number; // Used to sync videos if provided
  isPlaying?: boolean;
  // Audio Control
  micVolume?: number;
  screenVolume?: number;
  // Blur Layers
  activeBlurs?: BlurAction[];
  onUpdateBlur?: (
    id: string,
    config: {
      x: number;
      y: number;
      width: number;
      height: number;
      intensity: number;
    },
  ) => void;
  selectedBlurId?: string | null;
  isMirrored?: boolean;
}

export const Stage: React.FC<StageProps> = ({
  userStream,
  displayStream,
  userSource,
  displaySource,
  layoutConfig,
  onLayoutConfigChange = (_config: LayoutConfig) => {},
  activeLayer,
  onSelectLayer,
  isReadOnly = false,
  zoom = { scale: 1, x: 0.5, y: 0.5 },
  currentTime,
  isPlaying,
  micVolume = 1,
  screenVolume = 1,
  activeBlurs = [],
  onUpdateBlur,
  selectedBlurId,
  isMirrored = false,
}) => {
  const userVideoRef = useRef<HTMLVideoElement>(null);
  const displayVideoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [fitStyle, setFitStyle] = useState<React.CSSProperties>({
    width: "100%",
    height: "100%",
  });

  // Handle Sources (Stream or Blob URL)
  useEffect(() => {
    if (userVideoRef.current) {
      if (userStream) {
        userVideoRef.current.srcObject = userStream;
        userVideoRef.current.play().catch(() => {}); // Auto play for streams (recording mode)
      } else if (userSource) {
        userVideoRef.current.srcObject = null;
        userVideoRef.current.src = userSource;
        // Do not auto play for sources (editor mode) - wait for isPlaying
      }
    }
  }, [userStream, userSource]);

  useEffect(() => {
    if (displayVideoRef.current) {
      if (displayStream) {
        displayVideoRef.current.srcObject = displayStream;
        displayVideoRef.current.play().catch(() => {}); // Auto play for streams
      } else if (displaySource) {
        displayVideoRef.current.srcObject = null;
        displayVideoRef.current.src = displaySource;
        // Do not auto play for sources
      }
    }
  }, [displayStream, displaySource]);

  // Handle Volume Changes
  useEffect(() => {
    if (userVideoRef.current && userSource) {
      userVideoRef.current.volume = Math.max(0, Math.min(1, micVolume));
    }
    if (displayVideoRef.current && displaySource) {
      displayVideoRef.current.volume = Math.max(0, Math.min(1, screenVolume));
    }
  }, [micVolume, screenVolume, userSource, displaySource]);

  // Sync Video Playback for Editor
  useEffect(() => {
    if (currentTime !== undefined && Number.isFinite(currentTime)) {
      if (
        userVideoRef.current &&
        Math.abs(userVideoRef.current.currentTime - currentTime) > 0.5
      ) {
        userVideoRef.current.currentTime = currentTime;
      }
      if (
        displayVideoRef.current &&
        Math.abs(displayVideoRef.current.currentTime - currentTime) > 0.5
      ) {
        displayVideoRef.current.currentTime = currentTime;
      }
    }
  }, [currentTime]);

  useEffect(() => {
    if (isPlaying !== undefined) {
      if (isPlaying) {
        userVideoRef.current?.play().catch(() => {});
        displayVideoRef.current?.play().catch(() => {});
      } else {
        userVideoRef.current?.pause();
        displayVideoRef.current?.pause();
      }
    }
  }, [isPlaying]);

  // Resize Observer for Aspect Ratio Fit
  useEffect(() => {
    if (!wrapperRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        const parentRatio = width / height;
        const targetRatio = 16 / 9;

        // If parent is wider than 16:9, constrain by height
        if (parentRatio > targetRatio) {
          setFitStyle({
            height: "100%",
            width: "auto",
            aspectRatio: "16/9",
          });
        } else {
          // If parent is taller than 16:9, constrain by width
          setFitStyle({
            width: "100%",
            height: "auto",
            aspectRatio: "16/9",
          });
        }
      }
    });

    observer.observe(wrapperRef.current);
    return () => observer.disconnect();
  }, []);

  const getBackgroundStyle = (): React.CSSProperties => {
    if (
      layoutConfig.background === BackgroundStyle.IMAGE &&
      layoutConfig.backgroundImage
    ) {
      return {
        backgroundImage: `url(${layoutConfig.backgroundImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      };
    }
    return {};
  };

  const getBackgroundClass = () => {
    switch (layoutConfig.background) {
      case BackgroundStyle.GRADIENT_1:
        return "bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100";
      case BackgroundStyle.GRADIENT_2:
        return "bg-gradient-to-tr from-blue-100 via-sky-100 to-cyan-100";
      case BackgroundStyle.SOLID_DARK:
        return "bg-slate-900";
      case BackgroundStyle.BLURRED:
        return "bg-slate-200 backdrop-blur-3xl";
      default:
        return "bg-slate-100";
    }
  };

  // Derived check for active content
  const hasScreen = displayStream || displaySource;
  const hasUser = userStream || userSource;

  const isMutedUser = !!userStream && !userSource;
  const isMutedDisplay = !!displayStream && !displaySource;

  return (
    <div
      ref={wrapperRef}
      className="w-full h-full flex items-center justify-center p-1 overflow-hidden"
      onClick={() => !isReadOnly && onSelectLayer(null)}
    >
      {/* Aspect Ratio Container (16:9) */}
      <div
        ref={containerRef}
        className="relative rounded-3xl overflow-hidden shadow-2xl border-4 border-white ring-1 ring-slate-900/5 bg-slate-900 mx-auto transition-all duration-200 ease-out"
        style={fitStyle}
        onClick={(e) => {
          if (isReadOnly) return;
          e.stopPropagation();
          onSelectLayer(null);
        }}
      >
        {/* BACKGROUND */}
        <div
          className={clsx(
            "absolute inset-0 transition-colors duration-500",
            getBackgroundClass(),
          )}
          style={getBackgroundStyle()}
        ></div>

        {/* SCREEN LAYER - Zoomable Container */}
        <motion.div
          className="absolute inset-0 w-full h-full"
          animate={{
            scale: zoom.scale,
            originX: zoom.x,
            originY: zoom.y,
          }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        >
          {!hasScreen && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 pointer-events-none">
              <Monitor className="w-16 h-16 mb-4 opacity-50" />
              <p className="text-lg font-medium">Share your screen to start</p>
            </div>
          )}

          {hasScreen && (
            <TransformableLayer
              transform={layoutConfig.screenTransform}
              onChange={(newTransform) =>
                onLayoutConfigChange({
                  ...layoutConfig,
                  screenTransform: newTransform,
                })
              }
              containerRef={containerRef}
              isActive={activeLayer === "screen"}
              onSelect={() => {
                onSelectLayer("screen");
              }}
              className="bg-black"
              baseZIndex={10}
              borderType={layoutConfig.border}
              shadowStyle={layoutConfig.shadow}
              shadowColor={layoutConfig.shadowColor}
              isLocked={isReadOnly}
              lockAspectRatio={true}
            >
              <video
                ref={displayVideoRef}
                // removed autoPlay to allow manual control in editor
                muted={isMutedDisplay}
                playsInline
                loop={!!displaySource}
                className="w-full h-full object-contain pointer-events-none bg-black/5"
              />
            </TransformableLayer>
          )}
        </motion.div>

        {/* CAMERA LAYER - Fixed Top Layer (Not affected by Screen Zoom) */}
        {hasUser && (
          <TransformableLayer
            transform={layoutConfig.cameraTransform}
            onChange={(newTransform) =>
              onLayoutConfigChange({
                ...layoutConfig,
                cameraTransform: newTransform,
              })
            }
            containerRef={containerRef}
            isActive={activeLayer === "camera"}
            onSelect={() => {
              onSelectLayer("camera");
            }}
            className={
              layoutConfig.cameraShape === CameraShape.CIRCLE
                ? "rounded-full bg-black"
                : "bg-black"
            }
            baseZIndex={30} // Camera always on top by default
            borderType={layoutConfig.border}
            shadowStyle={layoutConfig.shadow}
            shadowColor={layoutConfig.shadowColor}
            isLocked={isReadOnly}
            lockAspectRatio={true}
          >
            <video
              ref={userVideoRef}
              // removed autoPlay
              muted={isMutedUser}
              playsInline
              loop={!!userSource}
              className={clsx(
                "w-full h-full object-cover pointer-events-none transition-transform duration-300",
                isMirrored && "scale-x-[-1]",
              )}
            />
          </TransformableLayer>
        )}

        {/* BLUR LAYERS (Topmost) */}
        {activeBlurs.map((blur) => (
          <TransformableLayer
            key={blur.id}
            transform={{
              x: blur.x,
              y: blur.y,
              width: blur.width,
              height: blur.height,
              aspectRatio: blur.width / blur.height,
            }}
            onChange={(newT) =>
              onUpdateBlur &&
              onUpdateBlur(blur.id, {
                x: newT.x,
                y: newT.y,
                width: newT.width,
                height: newT.height,
                intensity: blur.intensity,
              })
            }
            containerRef={containerRef}
            isActive={selectedBlurId === blur.id}
            onSelect={() => onSelectLayer && onSelectLayer(null)} // Blurs are selected via timeline mainly, but let's allow basic selection logic overlap
            className="rounded-lg border border-white/20"
            baseZIndex={50}
            borderType={BorderType.NONE}
            shadowStyle={ShadowStyle.NONE}
            isLocked={false}
            lockAspectRatio={false}
          >
            <div
              className="w-full h-full backdrop-blur-md bg-white/10 transition-all"
              style={{ backdropFilter: `blur(${blur.intensity}px)` }}
            />
          </TransformableLayer>
        ))}
      </div>
    </div>
  );
};

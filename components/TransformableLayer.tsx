"use client";

import React, { useState, useEffect, useRef } from "react";
import { ElementTransform, BorderType, ShadowStyle } from "@/types";
import { clsx } from "clsx";

interface TransformableLayerProps {
  transform: ElementTransform;
  onChange: (t: ElementTransform) => void;
  containerRef: React.RefObject<HTMLDivElement>;
  children: React.ReactNode;
  isActive: boolean;
  onSelect?: () => void;
  className?: string;
  baseZIndex?: number;
  borderType?: BorderType;
  shadowStyle?: ShadowStyle;
  shadowColor?: string;
  isLocked?: boolean; // For playback mode
  lockAspectRatio?: boolean;
}

export const TransformableLayer: React.FC<TransformableLayerProps> = ({
  transform,
  onChange,
  containerRef,
  children,
  isActive,
  onSelect,
  className,
  baseZIndex = 10,
  borderType = BorderType.ROUNDED,
  shadowStyle = ShadowStyle.SOFT,
  shadowColor = "#000000",
  isLocked = false,
  lockAspectRatio = true,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState<string | null>(null);
  const [showSnapX, setShowSnapX] = useState(false);
  const [showSnapY, setShowSnapY] = useState(false);

  const startPos = useRef({ x: 0, y: 0 });
  const startTransform = useRef(transform);

  const getDelta = (e: MouseEvent) => {
    if (!containerRef.current) return { dx: 0, dy: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    return {
      dx: (e.clientX - startPos.current.x) / rect.width,
      dy: (e.clientY - startPos.current.y) / rect.height,
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isLocked) return;
    e.preventDefault();
    if (onSelect) onSelect();
    setIsDragging(true);
    startPos.current = { x: e.clientX, y: e.clientY };
    startTransform.current = { ...transform };
  };

  const handleClick = (e: React.MouseEvent) => {
    if (isLocked) return;
    e.stopPropagation();
  };

  const handleResizeStart = (e: React.MouseEvent, handle: string) => {
    if (isLocked) return;
    e.stopPropagation();
    e.preventDefault();
    setIsResizing(handle);
    startPos.current = { x: e.clientX, y: e.clientY };
    startTransform.current = { ...transform };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging && !isResizing) return;

      const { dx, dy } = getDelta(e);
      let newT = { ...startTransform.current };

      if (isDragging) {
        newT.x += dx;
        newT.y += dy;

        // Snapping Logic
        const SNAP_THRESHOLD = 0.02;
        const centerX = newT.x + newT.width / 2;
        if (Math.abs(centerX - 0.5) < SNAP_THRESHOLD) {
          newT.x = 0.5 - newT.width / 2;
          setShowSnapX(true);
        } else {
          setShowSnapX(false);
        }

        const centerY = newT.y + newT.height / 2;
        if (Math.abs(centerY - 0.5) < SNAP_THRESHOLD) {
          newT.y = 0.5 - newT.height / 2;
          setShowSnapY(true);
        } else {
          setShowSnapY(false);
        }

        newT.x = Math.max(-0.2, Math.min(1.2 - newT.width, newT.x));
        newT.y = Math.max(-0.2, Math.min(1.2 - newT.height, newT.y));
      }

      if (isResizing) {
        if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          const aspect = rect.width / rect.height; // Container aspect

          // Handle resizing logic
          // Handle X-axis resize (Width)
          if (isResizing.includes("w")) {
            newT.width = Math.max(0.05, startTransform.current.width - dx);
            newT.x =
              startTransform.current.x +
              (startTransform.current.width - newT.width);
          } else if (isResizing.includes("e")) {
            newT.width = Math.max(0.05, startTransform.current.width + dx);
          }

          // Handle Y-axis resize (Height)
          if (isResizing.includes("n")) {
            newT.height = Math.max(0.05, startTransform.current.height - dy);
            newT.y =
              startTransform.current.y +
              (startTransform.current.height - newT.height);
          } else if (isResizing.includes("s")) {
            newT.height = Math.max(0.05, startTransform.current.height + dy);
          }

          // Enforce Aspect Ratio if Locked
          if (lockAspectRatio) {
            // Prioritize width change for corner handles, unless user is dragging strictly vertical?
            // Usually for corners, we pick the dominant change or simply drive height by width

            // If only resizing width (e, w), fix height
            if (isResizing === "e" || isResizing === "w") {
              newT.height = (newT.width * aspect) / newT.aspectRatio;
              // Adjust Y to center vertically if we wanted, but standard resize usually expands down unless corner
              // For simple corner resize, let's drive height by width
            }

            // If corner resize (ne, se, nw, sw), drive height by width
            else if (isResizing.length === 2) {
              const oldHeight = newT.height;
              newT.height = (newT.width * aspect) / newT.aspectRatio;

              // If resizing from North, we must adjust Y position because height changed
              if (isResizing.includes("n")) {
                // The 'n' logic above already adjusted Y based on dy.
                // But now we recalculated Height based on Width.
                // We need to fix Y so the bottom edge stays fixed.
                const bottom =
                  startTransform.current.y + startTransform.current.height;
                newT.y = bottom - newT.height;
              }
            }

            // If resizing only height (n, s), fix width
            else if (isResizing === "n" || isResizing === "s") {
              const oldWidth = newT.width;
              newT.width = (newT.height * newT.aspectRatio) / aspect;

              // If resizing from West, adjust X? But n/s don't have w/e component normally.
              // Wait, dragging 'N' changes Height. We fix Width.
              // Center width? Or fix left? Usually center or fix left.
              // Let's keep X fixed for N/S drag, effectively scaling width to match new height from center?
              // No, simpler: Scale width around center of object
              const centerX =
                startTransform.current.x + startTransform.current.width / 2;
              newT.x = centerX - newT.width / 2;
            }
          }
        }
        setShowSnapX(false);
        setShowSnapY(false);
      }

      onChange(newT);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(null);
      setShowSnapX(false);
      setShowSnapY(false);
    };

    if (isDragging || isResizing) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [
    isDragging,
    isResizing,
    onChange,
    transform,
    containerRef,
    lockAspectRatio,
  ]);

  const currentZIndex = isActive ? baseZIndex + 10 : baseZIndex;

  // Resolve Styles
  const getBorderClass = () => {
    switch (borderType) {
      case BorderType.NONE:
        return "rounded-none";
      case BorderType.ROUNDED:
        return "rounded-2xl";
      case BorderType.CURVED:
        return "rounded-[2.5rem]"; // Pill-like
      default:
        return "rounded-xl";
    }
  };

  // Custom Shadow Logic
  const getShadowStyle = () => {
    if (shadowStyle === ShadowStyle.NONE) return {};

    const rgb = hexToRgb(shadowColor || "#000000");
    const colorStr = rgb ? `${rgb.r}, ${rgb.g}, ${rgb.b}` : "0,0,0";

    switch (shadowStyle) {
      case ShadowStyle.SOFT:
        return {
          boxShadow: `0 20px 25px -5px rgba(${colorStr}, 0.2), 0 8px 10px -6px rgba(${colorStr}, 0.2)`,
        };
      case ShadowStyle.HARD:
        return { boxShadow: `8px 8px 0px rgba(${colorStr}, 1)` };
      case ShadowStyle.NEON:
        return {
          boxShadow: `0 0 15px rgba(${colorStr}, 0.6), 0 0 30px rgba(${colorStr}, 0.4)`,
        };
      default:
        return {};
    }
  };

  function hexToRgb(hex: string) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : null;
  }

  // Combine shape classes (circle override)
  const isCircle = className?.includes("rounded-full");
  const finalBorderClass = isCircle ? "rounded-full" : getBorderClass();

  const style: React.CSSProperties = {
    left: `${transform.x * 100}%`,
    top: `${transform.y * 100}%`,
    width: `${transform.width * 100}%`,
    height: `${transform.height * 100}%`,
    zIndex: currentZIndex,
  };

  // Render Handle Helper
  const RenderHandle = ({
    cursor,
    posClass,
    handle,
  }: {
    cursor: string;
    posClass: string;
    handle: string;
  }) => (
    <div
      className={clsx(
        "absolute w-3 h-3 bg-white border border-indigo-500 rounded-full z-50 shadow-sm hover:scale-125 transition-transform",
        cursor,
        posClass
      )}
      onMouseDown={(e) => handleResizeStart(e, handle)}
    />
  );

  return (
    <>
      {showSnapX && !isLocked && (
        <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-indigo-500 z-[100] shadow-[0_0_8px_rgba(99,102,241,0.8)] pointer-events-none" />
      )}
      {showSnapY && !isLocked && (
        <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-indigo-500 z-[100] shadow-[0_0_8px_rgba(99,102,241,0.8)] pointer-events-none" />
      )}

      <div
        className={clsx(
          "absolute touch-none group",
          !isLocked
            ? isActive
              ? "cursor-move"
              : "cursor-pointer hover:ring-2 hover:ring-indigo-500/30 rounded-lg"
            : ""
        )}
        style={style}
        onMouseDown={handleMouseDown}
        onClick={handleClick}
      >
        <div
          className={clsx(
            "w-full h-full relative overflow-hidden transition-all duration-300",
            isActive && !isLocked && "ring-2 ring-indigo-500",
            finalBorderClass,
            className
          )}
          style={getShadowStyle()}
        >
          {children}
        </div>

        {isActive && !isLocked && (
          <>
            {/* Corners */}
            <RenderHandle
              cursor="cursor-nwse-resize"
              posClass="-top-1.5 -left-1.5"
              handle="nw"
            />
            <RenderHandle
              cursor="cursor-nesw-resize"
              posClass="-top-1.5 -right-1.5"
              handle="ne"
            />
            <RenderHandle
              cursor="cursor-nesw-resize"
              posClass="-bottom-1.5 -left-1.5"
              handle="sw"
            />
            <RenderHandle
              cursor="cursor-nwse-resize"
              posClass="-bottom-1.5 -right-1.5"
              handle="se"
            />

            {/* Sides (Top, Bottom, Left, Right) */}
            <RenderHandle
              cursor="cursor-ns-resize"
              posClass="-top-1.5 left-1/2 -ml-1.5"
              handle="n"
            />
            <RenderHandle
              cursor="cursor-ns-resize"
              posClass="-bottom-1.5 left-1/2 -ml-1.5"
              handle="s"
            />
            <RenderHandle
              cursor="cursor-ew-resize"
              posClass="top-1/2 -left-1.5 -mt-1.5"
              handle="w"
            />
            <RenderHandle
              cursor="cursor-ew-resize"
              posClass="top-1/2 -right-1.5 -mt-1.5"
              handle="e"
            />
          </>
        )}
      </div>
    </>
  );
};

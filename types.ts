export enum CameraShape {
  CIRCLE = "CIRCLE",
  SQUARE = "SQUARE",
  VERTICAL = "VERTICAL", // 9:16
  HORIZONTAL = "HORIZONTAL", // 16:9
}

export enum CameraSize {
  SMALL = "SMALL",
  MEDIUM = "MEDIUM",
  LARGE = "LARGE",
}

export enum BackgroundStyle {
  GRADIENT_1 = "GRADIENT_1",
  GRADIENT_2 = "GRADIENT_2",
  SOLID_DARK = "SOLID_DARK",
  BLURRED = "BLURRED",
  IMAGE = "IMAGE",
}

export enum BorderType {
  NONE = "NONE",
  ROUNDED = "ROUNDED",
  CURVED = "CURVED",
}

export enum ShadowStyle {
  NONE = "NONE",
  SOFT = "SOFT",
  HARD = "HARD",
  NEON = "NEON",
}

export interface ElementTransform {
  x: number; // Percentage 0-1
  y: number; // Percentage 0-1
  width: number; // Percentage 0-1
  height: number; // Derived from aspect ratio usually, but stored for rendering
  aspectRatio: number;
}

export interface LayoutConfig {
  cameraShape: CameraShape;
  cameraSize: CameraSize;
  background: BackgroundStyle;
  backgroundImage?: string; // Blob URL or Base64
  border: BorderType;
  shadow: ShadowStyle;
  shadowColor?: string; // Hex code
  cameraTransform: ElementTransform;
  screenTransform: ElementTransform;
}

export interface RecordedFiles {
  screen?: Blob;
  camera?: Blob;
  composite?: Blob;
  duration: number;
}

export interface MediaDevice {
  deviceId: string;
  label: string;
}

export type ActionType =
  | "ZOOM"
  | "LAYOUT"
  | "CUT"
  | "AUDIO_MIC"
  | "AUDIO_SCREEN"
  | "VIDEO_CLIP"
  | "BLUR";

export interface TimelineAction {
  id: string;
  type: ActionType;
  startTime: number;
  endTime: number;
  // For NLE (Non-Linear Editing)
  sourceStartTime?: number; // The timestamp in the original source file
  // Zoom properties
  zoomTarget?: { x: number; y: number; scale: number };
  // Layout properties
  layoutConfig?: Partial<LayoutConfig>;
  // Audio properties
  volume?: number; // 0 to 1 (or higher for boost)
  // Blur properties
  blurConfig?: {
    x: number;
    y: number;
    width: number;
    height: number;
    intensity: number; // 0 to 20 usually
  };
}

export interface ProjectMetadata {
  name: string;
}

export type ExportResolution = '720p' | '1080p' | '4k';

export const RESOLUTION_MAP: Record<ExportResolution, { width: number; height: number; label: string; badge?: string }> = {
  '720p': { width: 1280, height: 720, label: '720p (HD)' },
  '1080p': { width: 1920, height: 1080, label: '1080p (Full HD)', badge: 'Recomendado' },
  '4k': { width: 3840, height: 2160, label: '4K (Ultra HD)', badge: 'Lento' },
};

"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  RecordedFiles,
  LayoutConfig,
  TimelineAction,
  ActionType,
  ProjectMetadata,
  CameraShape,
  BorderType,
  ShadowStyle,
  BackgroundStyle,
  ExportResolution,
  RESOLUTION_MAP,
} from "@/types";
import { Stage } from "@/components/Stage";
import { Sidebar } from "@/components/Sidebar";
import {
  Play,
  Pause,
  SkipBack,
  Trash2,
  ZoomIn,
  Download,
  ChevronLeft,
  Layout as LayoutIcon,
  ZoomOut,
  Film,
  Scissors,
  Volume2,
  Mic,
  Home,
  Monitor,
  Spline,
  Undo,
  Redo,
  X,
  Video,
  Loader2,
  GripHorizontal,
  FileJson,
  EyeOff,
  Maximize,
  Minimize,
} from "lucide-react";
import { clsx } from "clsx";
import { saveVideo } from "@/lib/videoStorage";
import { updateEditConfigAction } from "@/app/actions/recordings";
import { convertToMp4 } from "@/lib/mp4Encoder";

interface EditorProps {
  recordings: RecordedFiles;
  initialLayoutConfig: LayoutConfig;
  recordingId?: string; // NOVO
  initialActions?: TimelineAction[]; // NOVO (para Fase 3)
  initialMetadata?: ProjectMetadata; // NOVO (para Fase 3)
  initialVolumes?: { mic: number; screen: number }; // NOVO (para Fase 3)
  onClose: () => void;
}

// --- HELPER: Safe Audio Decode ---
const safeDecodeAudio = async (
  ctx: BaseAudioContext,
  blob: Blob | undefined,
): Promise<AudioBuffer | null> => {
  if (!blob || blob.size === 0) return null;
  try {
    const arrayBuffer = await blob.arrayBuffer();
    return await ctx.decodeAudioData(arrayBuffer);
  } catch (e) {
    return null;
  }
};

// --- HELPER: Safe Video Load with Timeout ---
const safeLoadVideo = async (
  blob: Blob | undefined,
): Promise<HTMLVideoElement | null> => {
  if (!blob) return null;
  return new Promise((resolve) => {
    const v = document.createElement("video");
    v.src = URL.createObjectURL(blob);
    v.crossOrigin = "anonymous";
    v.muted = true;
    v.playsInline = true;
    v.preload = "auto";

    let resolved = false;
    const finish = (result: HTMLVideoElement | null) => {
      if (resolved) return;
      resolved = true;
      resolve(result);
    };

    v.onloadedmetadata = () => finish(v);
    v.onerror = () => finish(null);
    setTimeout(() => finish(null), 3000);
  });
};

// --- HELPER: Safe Image Load with Timeout ---
const safeLoadImage = async (
  src: string,
  cache: Map<string, HTMLImageElement>,
): Promise<void> => {
  if (cache.has(src)) return;
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    let resolved = false;
    const finish = () => {
      if (resolved) return;
      resolved = true;
      if (img.complete && img.naturalWidth > 0) cache.set(src, img);
      resolve();
    };
    img.onload = finish;
    img.onerror = finish;
    img.src = src;
    setTimeout(finish, 3000);
  });
};

const generateWaveform = async (
  blob: Blob,
  duration: number,
  samples: number,
): Promise<number[]> => {
  let audioCtx: AudioContext | null = null;
  try {
    const arrayBuffer = await blob.arrayBuffer();
    audioCtx = new (
      window.AudioContext || (window as any).webkitAudioContext
    )();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    const rawData = audioBuffer.getChannelData(0);
    const blockSize = Math.floor(rawData.length / samples);
    const filteredData = [];
    for (let i = 0; i < samples; i++) {
      let blockStart = blockSize * i;
      let sum = 0;
      const step = Math.ceil(blockSize / 100) || 1;
      let count = 0;
      for (let j = 0; j < blockSize; j += step) {
        sum = sum + Math.abs(rawData[blockStart + j]);
        count++;
      }
      filteredData.push(sum / count);
    }
    const maxVal = Math.max(...filteredData);
    const multiplier = maxVal > 0 ? 1 / maxVal : 1;
    return filteredData.map((n) => n * multiplier);
  } catch (e) {
    return new Array(samples).fill(0);
  } finally {
    if (audioCtx) await audioCtx.close();
  }
};

const drawWaveform = (
  canvas: HTMLCanvasElement,
  data: number[],
  color: string,
) => {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const { width, height } = canvas;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = color;
  const barWidth = 3;
  const gap = 1;
  const totalBars = Math.floor(width / (barWidth + gap));
  for (let i = 0; i < totalBars; i++) {
    const dataIndex = Math.floor((i / totalBars) * data.length);
    const val = data[dataIndex] || 0;
    const barHeight = Math.max(2, val * height * 0.8);
    const y = (height - barHeight) / 2;
    ctx.fillRect(i * (barWidth + gap), y, barWidth, barHeight);
  }
};

const generateThumbnails = async (
  blob: Blob,
  count: number,
  fallbackDuration: number,
): Promise<string[]> => {
  const safeCount = Math.min(count, 20);
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.src = URL.createObjectURL(blob);
    video.crossOrigin = "anonymous";
    video.muted = true;
    const thumbs: string[] = [];
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const process = async () => {
      canvas.width = 160;
      canvas.height = 90;
      let duration = video.duration;
      if (!Number.isFinite(duration) || duration <= 0)
        duration = fallbackDuration;
      if (!Number.isFinite(duration) || duration <= 0) {
        resolve([]);
        return;
      }
      const interval = duration / safeCount;
      for (let i = 0; i < safeCount; i++) {
        const time = i * interval;
        if (Number.isFinite(time)) {
          video.currentTime = time;
          await new Promise((r) => {
            video.onseeked = r;
          });
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            thumbs.push(canvas.toDataURL("image/jpeg", 0.5));
          }
        }
      }
      resolve(thumbs);
    };
    video.onloadedmetadata = process;
    video.onerror = () => resolve([]);
    setTimeout(() => resolve([]), 5000);
  });
};

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  if (w < 2 * r) r = w / 2;
  if (h < 2 * r) r = h / 2;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

type DragMode =
  | "NONE"
  | "SELECT"
  | "MOVE"
  | "RESIZE_START"
  | "RESIZE_END"
  | "SCRUB";

interface HistoryState {
  actions: TimelineAction[];
  duration: number;
}

export const Editor: React.FC<EditorProps> = ({
  recordings,
  initialLayoutConfig,
  recordingId,
  initialActions = [],
  initialMetadata,
  initialVolumes,
  onClose,
}) => {
  console.log("🎬 [EDITOR] Editor inicializado com:", {
    recordingId,
    hasBlobComposite: !!recordings?.composite,
    recordingsDuration: recordings?.duration,
    initialActionsCount: initialActions.length,
  });

  // Minimum duration for action blocks in seconds
  const MIN_ACTION_DURATION = 0.4;

  // Playback State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(recordings.duration || 1);
  const [zoomSlider, setZoomSlider] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStatus, setExportStatus] = useState("Initializing...");
  const [selectedExportResolution, setSelectedExportResolution] = useState<ExportResolution>('1080p');
  const [mp4ConvertProgress, setMp4ConvertProgress] = useState(0);
  const [mp4ConvertStatus, setMp4ConvertStatus] = useState('');
  const [isConvertingScreenMp4, setIsConvertingScreenMp4] = useState(false);
  const [isConvertingCameraMp4, setIsConvertingCameraMp4] = useState(false);
  const [timelineHeight, setTimelineHeight] = useState(180);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Editor State
  const [actions, setActions] = useState<TimelineAction[]>(initialActions);
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null);
  const [editorActiveLayer, setEditorActiveLayer] = useState<string | null>(
    "camera",
  );
  const [showExportModal, setShowExportModal] = useState(false);
  const [videoThumbnails, setVideoThumbnails] = useState<string[]>([]);

  // Save status for auto-save
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">(
    "idle",
  );
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Undo/Redo History
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const clipboardRef = useRef<Omit<TimelineAction, "id"> | null>(null);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [showHomeConfirm, setShowHomeConfirm] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [isMirrored, setIsMirrored] = useState(true);

  // Persist isMirrored preference
  useEffect(() => {
    const saved = localStorage.getItem("camera-mirrored");
    if (saved !== null) {
      setIsMirrored(saved === "true");
    } else {
      localStorage.setItem("camera-mirrored", "true");
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("camera-mirrored", isMirrored.toString());
  }, [isMirrored]);

  // Audio State
  const [globalMicVolume, setGlobalMicVolume] = useState(
    initialVolumes?.mic ?? 1,
  );
  const [globalScreenVolume, setGlobalScreenVolume] = useState(
    initialVolumes?.screen ?? 1,
  );
  const [currentMicVolume, setCurrentMicVolume] = useState(1);
  const [currentScreenVolume, setCurrentScreenVolume] = useState(1);

  // Interaction State
  const [selection, setSelection] = useState<{
    start: number;
    end: number;
  } | null>(null);
  const [dragMode, setDragMode] = useState<DragMode>("NONE");
  const [activeActionId, setActiveActionId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<number>(0);
  const [isDraggingFocus, setIsDraggingFocus] = useState(false);

  const [containerWidth, setContainerWidth] = useState(1000);

  const dragStartRef = useRef<{ x: number; time: number } | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const timelineContainerRef = useRef<HTMLDivElement>(null);
  const stageContainerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(Date.now());
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previousActionsRef = useRef<TimelineAction[]>([]);

  const micCanvasRef = useRef<HTMLCanvasElement>(null);
  const screenCanvasRef = useRef<HTMLCanvasElement>(null);
  const [micWaveform, setMicWaveform] = useState<number[]>([]);
  const [screenWaveform, setScreenWaveform] = useState<number[]>([]);

  const [baseLayoutConfig, setBaseLayoutConfig] =
    useState<LayoutConfig>(initialLayoutConfig);
  const [metadata, setMetadata] = useState<ProjectMetadata>(
    initialMetadata || { name: "Edited Video" },
  );

  const [userUrl, setUserUrl] = useState<string | undefined>();
  const [displayUrl, setDisplayUrl] = useState<string | undefined>();

  const initializedRef = useRef(false);

  // Measure Timeline Container Width
  useEffect(() => {
    if (!timelineContainerRef.current) return;
    const obs = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    obs.observe(timelineContainerRef.current);
    return () => obs.disconnect();
  }, []);

  // --- ZOOM CALCULATION ---
  const SIDEBAR_LABEL_WIDTH = 128;
  const availableWidth = Math.max(100, containerWidth - SIDEBAR_LABEL_WIDTH);
  const minScale = availableWidth / Math.max(0.1, duration);
  const maxScale = Math.max(minScale * 20, 200);
  const pixelsPerSecond = minScale + (zoomSlider / 100) * (maxScale - minScale);
  const totalTimelineWidth = Math.max(
    availableWidth,
    duration * pixelsPerSecond,
  );

  // --- HISTORY MANAGEMENT ---
  const pushToHistory = useCallback(
    (newActions: TimelineAction[], newDuration: number) => {
      setHistory((prev) => {
        const current = prev.slice(0, historyIndex + 1);
        const next = [
          ...current,
          { actions: newActions, duration: newDuration },
        ];
        if (next.length > 50) return next.slice(next.length - 50);
        return next;
      });
      setHistoryIndex((prev) => Math.min(prev + 1, 49));
    },
    [historyIndex],
  );

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1];
      setActions(prevState.actions);
      setDuration(prevState.duration);
      setHistoryIndex(historyIndex - 1);
      setSelectedActionId(null);
    }
  }, [historyIndex, history]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      setActions(nextState.actions);
      setDuration(nextState.duration);
      setHistoryIndex(historyIndex + 1);
      setSelectedActionId(null);
    }
  }, [historyIndex, history]);

  const handleSplit = useCallback(() => {
    const splitTime = currentTime;
    const clipsToSplit = actions.filter(
      (a) =>
        (a.type === "VIDEO_CLIP" ||
          a.type === "AUDIO_MIC" ||
          a.type === "AUDIO_SCREEN") &&
        splitTime > a.startTime + 0.05 &&
        splitTime < a.endTime - 0.05,
    );
    if (clipsToSplit.length === 0) return;
    const newActions = [...actions];
    clipsToSplit.forEach((clip) => {
      const idx = newActions.findIndex((a) => a.id === clip.id);
      if (idx !== -1) {
        const originalEndTime = clip.endTime;
        const splitPointOffset = splitTime - clip.startTime;
        const newId = Math.random().toString(36).substr(2, 9);
        newActions[idx] = { ...newActions[idx], endTime: splitTime };
        newActions.push({
          ...clip,
          id: newId,
          startTime: splitTime,
          endTime: originalEndTime,
          sourceStartTime: (clip.sourceStartTime || 0) + splitPointOffset,
        });
      }
    });
    setActions(newActions);
    pushToHistory(newActions, duration);
    setSelectedActionId(null);
    setSelection(null);
  }, [currentTime, actions, duration, pushToHistory]);

  const createAction = useCallback(
    (type: ActionType) => {
      let start: number;
      let end: number;

      if (selection) {
        start = selection.start;
        end = selection.end;
      } else {
        // When adding without selection, ensure minimum duration
        const desiredEnd = currentTime + MIN_ACTION_DURATION;
        if (desiredEnd <= duration) {
          // Enough space ahead
          start = currentTime;
          end = desiredEnd;
        } else {
          // Not enough space ahead, adjust start backwards
          end = duration;
          start = Math.max(0, duration - MIN_ACTION_DURATION);
        }
      }

      // Ensure minimum duration
      if (end - start < MIN_ACTION_DURATION) {
        end = start + MIN_ACTION_DURATION;
      }

      const id = Math.random().toString(36).substr(2, 9);
      const newAction: TimelineAction = {
        id,
        type,
        startTime: start,
        endTime: end,
        layoutConfig: type === "LAYOUT" ? { ...baseLayoutConfig } : undefined,
        zoomTarget:
          type === "ZOOM" ? { x: 0.5, y: 0.5, scale: 1.5 } : undefined,
        volume: type === "AUDIO_MIC" || type === "AUDIO_SCREEN" ? 1 : undefined,
        blurConfig:
          type === "BLUR"
            ? { x: 0.4, y: 0.4, width: 0.2, height: 0.2, intensity: 10 }
            : undefined,
      };
      const nextActions = [...actions, newAction];
      setActions(nextActions);
      pushToHistory(nextActions, duration);
      setSelectedActionId(id);
      setSelection(null);
    },
    [
      selection,
      currentTime,
      duration,
      actions,
      baseLayoutConfig,
      pushToHistory,
      MIN_ACTION_DURATION,
    ],
  );

  const deleteAction = useCallback(
    (id: string) => {
      const actionToDelete = actions.find((a) => a.id === id);
      if (!actionToDelete) return;

      if (actionToDelete.type === "VIDEO_CLIP") {
        const startTime = actionToDelete.startTime;
        const endTime = actionToDelete.endTime;
        const deletedDuration = endTime - startTime;
        let updatedActions = actions.filter((a) => a.id !== id);
        const TOLERANCE = 0.05;
        updatedActions = updatedActions.filter((a) => {
          if (a.type === "AUDIO_MIC" || a.type === "AUDIO_SCREEN") {
            if (
              Math.abs(a.startTime - startTime) < TOLERANCE &&
              Math.abs(a.endTime - endTime) < TOLERANCE
            ) {
              return false;
            }
          }
          return true;
        });
        updatedActions = updatedActions.map((a) => {
          if (a.startTime >= startTime) {
            return {
              ...a,
              startTime: a.startTime - deletedDuration,
              endTime: a.endTime - deletedDuration,
            };
          } else if (a.endTime > startTime) {
            return {
              ...a,
              endTime: Math.max(a.startTime, a.endTime - deletedDuration),
            };
          }
          return a;
        });
        updatedActions = updatedActions.filter((a) => a.endTime > a.startTime);
        const newDur = duration - deletedDuration;
        setActions(updatedActions);
        setDuration(newDur);
        pushToHistory(updatedActions, newDur);
      } else {
        const nextActions = actions.filter((a) => a.id !== id);
        setActions(nextActions);
        pushToHistory(nextActions, duration);
      }
      if (selectedActionId === id) setSelectedActionId(null);
    },
    [actions, duration, pushToHistory, selectedActionId],
  );

  const toggleFullscreen = useCallback(() => {
    if (!stageContainerRef.current) return;
    if (!document.fullscreenElement) {
      stageContainerRef.current.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  }, []);

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handleFsChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  // --- KEYBOARD SHORTCUTS ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInput =
        (e.target as HTMLElement).tagName === "INPUT" ||
        (e.target as HTMLElement).tagName === "TEXTAREA";
      if (isInput) return;

      const ctrl = e.ctrlKey || e.metaKey;

      // Play/Pause
      if (e.code === "Space") {
        e.preventDefault();
        setIsPlaying((prev) => !prev);
      }
      // Undo/Redo
      else if (ctrl && e.code === "KeyZ") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (ctrl && e.code === "KeyY") {
        e.preventDefault();
        redo();
      }
      // Copy/Paste/Cut
      else if (ctrl && e.code === "KeyC") {
        if (selectedActionId) {
          const action = actions.find((a) => a.id === selectedActionId);
          if (action) {
            const { id, ...rest } = action;
            clipboardRef.current = rest;
          }
        }
      } else if (ctrl && e.code === "KeyX") {
        if (selectedActionId) {
          const action = actions.find((a) => a.id === selectedActionId);
          if (action) {
            const { id, ...rest } = action;
            clipboardRef.current = rest;
            deleteAction(id);
          }
        }
      } else if (ctrl && e.code === "KeyV") {
        if (clipboardRef.current) {
          const duration =
            clipboardRef.current.endTime - clipboardRef.current.startTime;
          const newAction: TimelineAction = {
            ...clipboardRef.current,
            id: Math.random().toString(36).substr(2, 9),
            startTime: currentTime,
            endTime: currentTime + duration,
          };
          const nextActions = [...actions, newAction];
          setActions(nextActions);
          pushToHistory(nextActions, duration);
          setSelectedActionId(newAction.id);
        }
      }
      // Tools
      else if (e.code === "KeyC" && !ctrl) {
        handleSplit();
      } else if (e.code === "KeyZ" && !ctrl) {
        createAction("ZOOM");
      } else if (e.code === "KeyL" && !ctrl) {
        createAction("LAYOUT");
      } else if (e.code === "KeyB" && !ctrl) {
        createAction("BLUR");
      }
      // Navigation
      else if (e.code === "ArrowLeft") {
        e.preventDefault();
        setCurrentTime((prev) => Math.max(0, prev - 0.1));
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        setCurrentTime((prev) => Math.min(duration, prev + 0.1));
      }
      // Fullscreen
      else if (ctrl && e.code === "KeyF") {
        e.preventDefault();
        toggleFullscreen();
      }
      // Delete
      else if (e.code === "Delete" || e.code === "Backspace") {
        if (selectedActionId) deleteAction(selectedActionId);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    selectedActionId,
    actions,
    currentTime,
    duration,
    undo,
    redo,
    deleteAction,
    handleSplit,
    createAction,
    pushToHistory,
    toggleFullscreen,
  ]);

  // --- INITIALIZATION ---
  useEffect(() => {
    console.log("🎥 [EDITOR] Configurando fontes de vídeo:", {
      hasCamera: !!recordings.camera,
      hasScreen: !!recordings.screen,
      hasComposite: !!recordings.composite,
    });

    // Se temos camera e screen separados, usar eles
    if (recordings.camera) {
      const url = URL.createObjectURL(recordings.camera);
      console.log("🎥 [EDITOR] Camera URL criada");
      setUserUrl(url);
    }

    if (recordings.screen) {
      const url = URL.createObjectURL(recordings.screen);
      console.log("🎥 [EDITOR] Screen URL criada");
      setDisplayUrl(url);
    }

    // Se só temos composite (vídeo carregado do R2), usar como displaySource
    if (recordings.composite && !recordings.camera && !recordings.screen) {
      const url = URL.createObjectURL(recordings.composite);
      console.log(
        "🎥 [EDITOR] Composite URL criada (usando como displaySource)",
      );
      setDisplayUrl(url);
    }

    const sourceBlob =
      recordings.composite || recordings.screen || recordings.camera;
    if (sourceBlob) {
      const interval = Math.min(5, duration / 20);
      const count = Math.ceil(duration / interval);
      generateThumbnails(sourceBlob, count, duration).then(setVideoThumbnails);
    }
  }, [recordings, duration]);

  useEffect(() => {
    if (!initializedRef.current && duration > 0) {
      let finalActions: TimelineAction[] = [];

      // Só criar actions padrão se não tiver initialActions
      if (initialActions.length === 0) {
        console.log(
          "🎬 [EDITOR] Criando actions padrão (nenhuma foi fornecida)",
        );
        finalActions.push({
          id: "base-video-clip",
          type: "VIDEO_CLIP",
          startTime: 0,
          endTime: duration,
          sourceStartTime: 0,
          volume: 1,
        });
        if (recordings.camera) {
          finalActions.push({
            id: "default-mic-track",
            type: "AUDIO_MIC",
            startTime: 0,
            endTime: duration,
            sourceStartTime: 0,
            volume: 1,
          });
        }
        if (recordings.screen) {
          finalActions.push({
            id: "default-screen-track",
            type: "AUDIO_SCREEN",
            startTime: 0,
            endTime: duration,
            sourceStartTime: 0,
            volume: 1,
          });
        }
      } else {
        console.log(
          "🎬 [EDITOR] Usando initialActions fornecidas:",
          initialActions.length,
        );
        // Usar as actions fornecidas
        finalActions = [...initialActions];

        // Verificar se faltam ações de áudio e adicionar se necessário
        const hasAudioMic = finalActions.some((a) => a.type === "AUDIO_MIC");
        const hasAudioScreen = finalActions.some(
          (a) => a.type === "AUDIO_SCREEN",
        );

        if (recordings.camera && !hasAudioMic) {
          console.log("🎤 [EDITOR] Adicionando AUDIO_MIC faltante");
          finalActions.push({
            id: "default-mic-track",
            type: "AUDIO_MIC",
            startTime: 0,
            endTime: duration,
            sourceStartTime: 0,
            volume: 1,
          });
        }

        if (recordings.screen && !hasAudioScreen) {
          console.log("🔊 [EDITOR] Adicionando AUDIO_SCREEN faltante");
          finalActions.push({
            id: "default-screen-track",
            type: "AUDIO_SCREEN",
            startTime: 0,
            endTime: duration,
            sourceStartTime: 0,
            volume: 1,
          });
        }
      }

      setActions(finalActions);
      setHistory([{ actions: finalActions, duration }]);
      setHistoryIndex(0);
      initializedRef.current = true;
    }
  }, [duration, recordings, initialActions]);

  useEffect(() => {
    const process = async () => {
      const samples = Math.floor(duration * 5);
      if (recordings.camera)
        setMicWaveform(
          await generateWaveform(recordings.camera, duration, samples),
        );
      if (recordings.screen)
        setScreenWaveform(
          await generateWaveform(recordings.screen, duration, samples),
        );
    };
    process();
  }, [recordings, duration]);

  useEffect(() => {
    if (micCanvasRef.current && micWaveform.length > 0) {
      micCanvasRef.current.width = totalTimelineWidth;
      micCanvasRef.current.height = 32;
      drawWaveform(micCanvasRef.current, micWaveform, "#fbbf24");
    }
    if (screenCanvasRef.current && screenWaveform.length > 0) {
      screenCanvasRef.current.width = totalTimelineWidth;
      screenCanvasRef.current.height = 32;
      drawWaveform(screenCanvasRef.current, screenWaveform, "#4ade80");
    }
  }, [micWaveform, screenWaveform, totalTimelineWidth]);

  // --- RENDER ENGINE ---
  const renderMasterAudio = async (): Promise<AudioBuffer | null> => {
    const AudioContextClass =
      window.AudioContext || (window as any).webkitAudioContext;
    const tempCtx = new AudioContextClass();
    let micBuffer: AudioBuffer | null = null,
      screenBuffer: AudioBuffer | null = null;
    try {
      if (recordings.camera)
        micBuffer = await safeDecodeAudio(tempCtx, recordings.camera);
      if (recordings.screen)
        screenBuffer = await safeDecodeAudio(tempCtx, recordings.screen);
    } finally {
      await tempCtx.close();
    }
    if (!micBuffer && !screenBuffer) return null;
    const sampleRate = 44100;
    const length = Math.max(1, Math.ceil(duration * sampleRate));
    const OfflineCtxClass =
      window.OfflineAudioContext || (window as any).webkitOfflineAudioContext;
    const offlineCtx = new OfflineCtxClass(2, length, sampleRate);
    actions.forEach((action) => {
      let buffer: AudioBuffer | null = null,
        baseVolume = 1;
      if (action.type === "AUDIO_MIC") {
        buffer = micBuffer;
        baseVolume = globalMicVolume;
      } else if (action.type === "AUDIO_SCREEN") {
        buffer = screenBuffer;
        baseVolume = globalScreenVolume;
      }
      if (buffer) {
        const source = offlineCtx.createBufferSource();
        source.buffer = buffer;
        const gain = offlineCtx.createGain();
        gain.gain.value =
          (action.volume !== undefined ? action.volume : 1) * baseVolume;
        source.connect(gain);
        gain.connect(offlineCtx.destination);
        const offset = action.sourceStartTime || 0;
        const dur = action.endTime - action.startTime;
        if (dur > 0 && offset < buffer.duration)
          source.start(action.startTime, offset, dur);
      }
    });
    return await offlineCtx.startRendering();
  };

  const handleExportRender = async () => {
    try {
      setIsExporting(true);
      setExportProgress(0);
      setExportStatus("Processing Audio...");
      setIsPlaying(false);
      const masterAudioBuffer = await renderMasterAudio();
      setExportStatus("Preloading Assets...");
      const resInfo = RESOLUTION_MAP[selectedExportResolution];
      const EXPORT_W = resInfo.width;
      const EXPORT_H = resInfo.height;
      const canvas = document.createElement("canvas");
      canvas.width = EXPORT_W;
      canvas.height = EXPORT_H;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not create canvas");
      const loadedImages = new Map<string, HTMLImageElement>();
      if (baseLayoutConfig.backgroundImage)
        await safeLoadImage(baseLayoutConfig.backgroundImage, loadedImages);
      for (const a of actions)
        if (a.type === "LAYOUT" && a.layoutConfig?.backgroundImage)
          await safeLoadImage(a.layoutConfig.backgroundImage, loadedImages);
      const userVid = await safeLoadVideo(recordings.camera);
      const screenVid = await safeLoadVideo(recordings.screen);
      const AudioContextClass =
        window.AudioContext || (window as any).webkitAudioContext;
      const playCtx = new AudioContextClass();
      const dest = playCtx.createMediaStreamDestination();
      const audioSource = playCtx.createBufferSource();
      if (masterAudioBuffer) audioSource.buffer = masterAudioBuffer;
      else
        audioSource.buffer = playCtx.createBuffer(
          2,
          playCtx.sampleRate * duration,
          playCtx.sampleRate,
        );
      audioSource.connect(dest);
      const canvasStream = canvas.captureStream(30);
      const finalStream = new MediaStream([
        ...canvasStream.getVideoTracks(),
        ...dest.stream.getAudioTracks(),
      ]);
      const mimeType = MediaRecorder.isTypeSupported(
        "video/webm;codecs=vp9,opus",
      )
        ? "video/webm;codecs=vp9,opus"
        : "video/webm";
      const recorder = new MediaRecorder(finalStream, {
        mimeType,
        videoBitsPerSecond: 5000000,
      });
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      recorder.onstop = async () => {
        const webmBlob = new Blob(chunks, { type: "video/webm" });
        try {
          setExportStatus("Converting to MP4...");
          const mp4Blob = await convertToMp4(webmBlob, {
            width: EXPORT_W,
            height: EXPORT_H,
            onProgress: (ratio) => setExportProgress(0.8 + ratio * 0.2),
            onStatus: (msg) => setExportStatus(`Converting: ${msg}`),
          });
          downloadBlob(
            mp4Blob,
            `${metadata.name || "edited-video"}.mp4`,
          );
        } catch (err) {
          console.error("MP4 conversion failed, falling back to WebM:", err);
          downloadBlob(webmBlob, `${metadata.name || "edited-video"}.webm`);
        }
        setIsExporting(false);
        setShowExportModal(false);
        playCtx.close();
      };
      setExportStatus("Rendering Video...");
      recorder.start();
      audioSource.start();
      const startTime = playCtx.currentTime;
      if (userVid) userVid.play().catch(() => {});
      if (screenVid) screenVid.play().catch(() => {});
      let animationFrameId: number,
        lastActiveClipId: string | null = null;
      const renderLoop = () => {
        const t = playCtx.currentTime - startTime;
        if (t >= duration) {
          cancelAnimationFrame(animationFrameId);
          recorder.stop();
          audioSource.stop();
          return;
        }
        setExportProgress(t / duration);
        const activeClip = actions.find(
          (a) => a.type === "VIDEO_CLIP" && t >= a.startTime && t <= a.endTime,
        );
        if (activeClip) {
          const targetSourceTime =
            (activeClip.sourceStartTime || 0) + (t - activeClip.startTime);
          const syncVideo = (vid: HTMLVideoElement) => {
            if (activeClip.id !== lastActiveClipId)
              vid.currentTime = targetSourceTime;
            else if (Math.abs(vid.currentTime - targetSourceTime) > 0.15)
              vid.currentTime = targetSourceTime;
            else if (vid.paused) vid.play().catch(() => {});
          };
          if (userVid) syncVideo(userVid);
          if (screenVid) syncVideo(screenVid);
          lastActiveClipId = activeClip.id;
        } else {
          if (userVid) userVid.pause();
          if (screenVid) screenVid.pause();
        }
        const drawScene = (
          context: CanvasRenderingContext2D,
          layout: LayoutConfig,
          zoom: { scale: number; x: number; y: number },
          clipMode = false,
        ) => {
          if (!clipMode) {
            if (layout.background === BackgroundStyle.SOLID_DARK) {
              context.fillStyle = "#0f172a";
              context.fillRect(0, 0, EXPORT_W, EXPORT_H);
            } else if (layout.background === BackgroundStyle.BLURRED) {
              context.fillStyle = "#e2e8f0";
              context.fillRect(0, 0, EXPORT_W, EXPORT_H);
            } else if (
              layout.background === BackgroundStyle.IMAGE &&
              layout.backgroundImage
            ) {
              const img = loadedImages.get(layout.backgroundImage);
              if (img) {
                const imgRatio = img.width / img.height,
                  canvasRatio = EXPORT_W / EXPORT_H;
                let dw = EXPORT_W,
                  dh = EXPORT_H,
                  ox = 0,
                  oy = 0;
                if (imgRatio > canvasRatio) {
                  dw = EXPORT_H * imgRatio;
                  ox = (EXPORT_W - dw) / 2;
                } else {
                  dh = EXPORT_W / imgRatio;
                  oy = (EXPORT_H - dh) / 2;
                }
                context.drawImage(img, ox, oy, dw, dh);
              } else {
                context.fillStyle = "#0f172a";
                context.fillRect(0, 0, EXPORT_W, EXPORT_H);
              }
            } else {
              const g = context.createLinearGradient(0, 0, EXPORT_W, EXPORT_H);
              if (layout.background === BackgroundStyle.GRADIENT_1) {
                g.addColorStop(0, "#e0e7ff");
                g.addColorStop(1, "#fce7f3");
              } else {
                g.addColorStop(0, "#dbeafe");
                g.addColorStop(1, "#cffafe");
              }
              context.fillStyle = g;
              context.fillRect(0, 0, EXPORT_W, EXPORT_H);
            }
          }
          context.save();
          const zx = zoom.x * EXPORT_W,
            zy = zoom.y * EXPORT_H;
          context.translate(zx, zy);
          context.scale(zoom.scale, zoom.scale);
          context.translate(-zx, -zy);
          if (screenVid)
            drawLayer(
              context,
              screenVid,
              layout.screenTransform.x,
              layout.screenTransform.y,
              layout.screenTransform.width,
              layout.screenTransform.height,
              layout.border,
              layout.shadow,
              layout.shadowColor,
            );
          context.restore();
          if (userVid)
            drawLayer(
              context,
              userVid,
              layout.cameraTransform.x,
              layout.cameraTransform.y,
              layout.cameraTransform.width,
              layout.cameraTransform.height,
              layout.border,
              layout.shadow,
              layout.shadowColor,
              layout.cameraShape,
            );
        };
        const activeLayoutAction = actions.find(
          (a) => a.type === "LAYOUT" && t >= a.startTime && t <= a.endTime,
        );
        const activeZoomAction = actions.find(
          (a) => a.type === "ZOOM" && t >= a.startTime && t <= a.endTime,
        );
        const activeBlurs = actions.filter(
          (a) => a.type === "BLUR" && t >= a.startTime && t <= a.endTime,
        );
        const currentLayout = activeLayoutAction?.layoutConfig
          ? { ...baseLayoutConfig, ...activeLayoutAction.layoutConfig }
          : baseLayoutConfig;
        const currentZoom = activeZoomAction?.zoomTarget || {
          scale: 1,
          x: 0.5,
          y: 0.5,
        };
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(0, 0, EXPORT_W, EXPORT_H);
        if (activeClip) {
          drawScene(ctx, currentLayout, currentZoom, false);
          for (const blurAction of activeBlurs) {
            if (!blurAction.blurConfig) continue;
            const { x, y, width, height, intensity } = blurAction.blurConfig;
            ctx.save();
            ctx.beginPath();
            ctx.rect(x * EXPORT_W, y * EXPORT_H, width * EXPORT_W, height * EXPORT_H);
            ctx.clip();
            ctx.filter = `blur(${intensity}px)`;
            drawScene(ctx, currentLayout, currentZoom, true);
            ctx.restore();
          }
        }
        animationFrameId = requestAnimationFrame(renderLoop);
      };
      animationFrameId = requestAnimationFrame(renderLoop);
    } catch (e) {
      setIsExporting(false);
      setShowExportModal(false);
    }
  };

  const drawLayer = (
    ctx: CanvasRenderingContext2D,
    img: HTMLVideoElement,
    xPct: number,
    yPct: number,
    wPct: number,
    hPct: number,
    border: BorderType,
    shadow: ShadowStyle,
    shadowColor: string | undefined,
    shape?: CameraShape,
  ) => {
    const canvasW = ctx.canvas.width;
    const canvasH = ctx.canvas.height;
    const x = xPct * canvasW,
      y = yPct * canvasH,
      w = wPct * canvasW,
      h = hPct * canvasH;
    ctx.save();
    if (shadow !== "NONE") {
      ctx.shadowColor = shadowColor || "rgba(0,0,0,0.5)";
      if (shadow === "SOFT") {
        ctx.shadowBlur = 40;
        ctx.shadowOffsetY = 20;
      } else if (shadow === "HARD") {
        ctx.shadowOffsetX = 15;
        ctx.shadowOffsetY = 15;
        ctx.shadowBlur = 0;
      } else if (shadow === "NEON") {
        ctx.shadowBlur = 20;
        ctx.shadowColor = shadowColor || "#a855f7";
      }
    }
    ctx.beginPath();
    if (shape === "CIRCLE") {
      ctx.arc(x + w / 2, y + h / 2, Math.min(w, h) / 2, 0, Math.PI * 2);
    } else {
      let r = 0;
      if (border === "ROUNDED") r = 30;
      if (border === "CURVED") r = Math.min(w, h) / 2;
      roundRect(ctx, x, y, w, h, r);
    }
    ctx.closePath();
    ctx.fillStyle = "#000";
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.clip();
    if (img.readyState >= 2) {
      const imgRatio = img.videoWidth / img.videoHeight,
        targetRatio = w / h;
      let dw = w,
        dh = h,
        ox = x,
        oy = y;
      if (imgRatio > targetRatio) {
        dw = h * imgRatio;
        ox = x - (dw - w) / 2;
      } else {
        dh = w / imgRatio;
        oy = y - (dh - h) / 2;
      }
      ctx.drawImage(img, ox, oy, dw, dh);
    } else {
      ctx.fillStyle = "#000";
      ctx.fillRect(x, y, w, h);
    }
    ctx.restore();
  };

  // --- PLAYBACK LOGIC ---
  const getSourceTime = (timelineTime: number) => {
    const videoClip = actions.find(
      (a) =>
        a.type === "VIDEO_CLIP" &&
        timelineTime >= a.startTime &&
        timelineTime < a.endTime,
    );
    return videoClip
      ? (videoClip.sourceStartTime || 0) + (timelineTime - videoClip.startTime)
      : timelineTime;
  };

  useEffect(() => {
    if (isPlaying && !isExporting) {
      lastTimeRef.current = Date.now();
      const loop = () => {
        const delta = (Date.now() - lastTimeRef.current) / 1000;
        lastTimeRef.current = Date.now();
        setCurrentTime((prev) => {
          const next = prev + delta;
          if (next >= duration) {
            setIsPlaying(false);
            return duration;
          }
          return next;
        });
        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);
    } else if (rafRef.current) cancelAnimationFrame(rafRef.current);
  }, [isPlaying, duration, isExporting]);

  useEffect(() => {
    const activeMicAction = actions.find(
      (a) =>
        a.type === "AUDIO_MIC" &&
        currentTime >= a.startTime &&
        currentTime <= a.endTime,
    );
    const activeScreenAction = actions.find(
      (a) =>
        a.type === "AUDIO_SCREEN" &&
        currentTime >= a.startTime &&
        currentTime <= a.endTime,
    );
    setCurrentMicVolume(activeMicAction?.volume ?? globalMicVolume);
    setCurrentScreenVolume(activeScreenAction?.volume ?? globalScreenVolume);
  }, [currentTime, actions, globalMicVolume, globalScreenVolume]);

  // --- AUTO-SAVE EFFECT ---
  useEffect(() => {
    // Não salvar se não tiver recordingId (modo preview sem salvar)
    if (!recordingId) {
      console.log(
        "⚠️ [AUTO-SAVE] RecordingId não encontrado, pulando auto-save",
      );
      return;
    }

    console.log("💾 [AUTO-SAVE] RecordingId detectado:", recordingId);

    // Limpar timer anterior se houver
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce de 1.5 segundos
    saveTimeoutRef.current = setTimeout(async () => {
      // Indicar que está salvando (dentro do setTimeout para evitar loop)
      setSaveStatus("saving");
      try {
        console.log("💾 [AUTO-SAVE] Iniciando salvamento...");

        // Montar objeto completo de configuração
        const editConfig = {
          actions,
          layoutConfig: baseLayoutConfig,
          metadata,
          volumes: {
            mic: globalMicVolume,
            screen: globalScreenVolume,
          },
          version: "1.0", // Para versionamento futuro
        };

        console.log("💾 [AUTO-SAVE] Config a ser salvo:", {
          actionsCount: editConfig.actions.length,
          layoutConfig: editConfig.layoutConfig,
          metadata: editConfig.metadata,
          volumes: editConfig.volumes,
        });

        // Serializar para JSON
        const configJson = JSON.stringify(editConfig);

        // Chamar server action
        console.log("💾 [AUTO-SAVE] Chamando updateEditConfigAction...");
        const result = await updateEditConfigAction(recordingId, configJson);

        console.log("💾 [AUTO-SAVE] Resultado:", result);

        if (result.success) {
          console.log("💾 [AUTO-SAVE] ✅ Salvo com sucesso!");
          setSaveStatus("saved");

          // Voltar para idle após 2 segundos
          setTimeout(() => setSaveStatus("idle"), 2000);
        } else {
          console.error("💾 [AUTO-SAVE] ❌ Falha ao salvar:", result.error);
          setSaveStatus("idle");
        }
      } catch (error) {
        console.error("💾 [AUTO-SAVE] ❌ Erro:", error);
        setSaveStatus("idle");
      }
    }, 1500);

    // Cleanup
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [
    actions,
    baseLayoutConfig,
    metadata,
    globalMicVolume,
    globalScreenVolume,
    recordingId,
  ]);

  // Cleanup para updateTimeout
  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, []);

  // --- INTERACTION ---
  const handleTimelineMouseDown = (e: React.MouseEvent) => {
    const time = getTimelineTime(e);
    dragStartRef.current = { x: e.clientX, time };
    setDragMode("SELECT");
    setSelection({ start: time, end: time });
    setSelectedActionId(null);
    setCurrentTime(time);
  };

  const handleActionMouseDown = (
    e: React.MouseEvent,
    actionId: string,
    mode: DragMode,
  ) => {
    e.stopPropagation();
    e.preventDefault();
    const time = getTimelineTime(e);
    dragStartRef.current = { x: e.clientX, time };
    setDragMode(mode);
    setActiveActionId(actionId);
    if (mode === "MOVE") {
      const action = actions.find((a) => a.id === actionId);
      if (action) setDragOffset(time - action.startTime);
    }
  };

  const handleTimelineMouseMove = (e: React.MouseEvent) => {
    const time = getTimelineTime(e);
    if (e.buttons === 0 && dragMode !== "NONE") {
      setDragMode("NONE");
      return;
    }
    if (dragMode === "SCRUB") {
      setCurrentTime(Math.max(0, Math.min(time, duration)));
      return;
    }
    if (dragMode === "SELECT" && dragStartRef.current) {
      setSelection({
        start: Math.min(dragStartRef.current.time, time),
        end: Math.max(dragStartRef.current.time, time),
      });
      setCurrentTime(time);
    } else if (dragMode === "MOVE" && activeActionId) {
      const action = actions.find((a) => a.id === activeActionId);
      if (action) {
        const adur = action.endTime - action.startTime;
        let ns = Math.max(0, Math.min(time - dragOffset, duration - adur));
        setActions((prev) =>
          prev.map((a) =>
            a.id === activeActionId
              ? { ...a, startTime: ns, endTime: ns + adur }
              : a,
          ),
        );
      }
    } else if (
      (dragMode === "RESIZE_START" || dragMode === "RESIZE_END") &&
      activeActionId
    ) {
      const action = actions.find((a) => a.id === activeActionId);
      if (action) {
        if (dragMode === "RESIZE_START") {
          let ns = Math.min(
            Math.max(0, time),
            action.endTime - MIN_ACTION_DURATION,
          );
          setActions((prev) =>
            prev.map((a) =>
              a.id === activeActionId
                ? {
                    ...a,
                    startTime: ns,
                    sourceStartTime:
                      (action.sourceStartTime || 0) + (ns - action.startTime),
                  }
                : a,
            ),
          );
        } else {
          let ne = Math.max(time, action.startTime + MIN_ACTION_DURATION);
          setActions((prev) =>
            prev.map((a) =>
              a.id === activeActionId ? { ...a, endTime: ne } : a,
            ),
          );
        }
      }
    }
  };

  const getTimelineTime = (e: React.MouseEvent | MouseEvent) => {
    if (!timelineRef.current) return 0;
    const rect = timelineRef.current.getBoundingClientRect();
    return (
      Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)) * duration
    );
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const renderActionBlock = (
    action: TimelineAction,
    color: string,
    icon: React.ReactNode,
    label: string,
  ) => {
    const left = (action.startTime / duration) * 100,
      width = ((action.endTime - action.startTime) / duration) * 100;
    const isSelected = selectedActionId === action.id;
    let bgClass = `bg-${color}-50/60`,
      borderClass = `border-${color}-300`,
      textClass = `text-${color}-900`;
    if (isSelected) {
      bgClass = `bg-${color}-100/90`;
      borderClass = `border-${color}-500`;
      textClass = `text-${color}-950`;
    }
    if (action.type === "VIDEO_CLIP") bgClass = "bg-slate-100";
    return (
      <div
        key={action.id}
        onMouseDown={(e) => handleActionMouseDown(e, action.id, "MOVE")}
        className={clsx(
          "absolute top-0 bottom-0 rounded-md border flex items-center justify-center shadow-sm overflow-hidden backdrop-blur-[1px] transition-all pointer-events-auto",
          isSelected
            ? "z-20 ring-2 ring-offset-1 ring-slate-400"
            : "hover:brightness-95",
          dragMode === "MOVE" && activeActionId === action.id
            ? "cursor-grabbing scale-[1.01] shadow-md z-50 opacity-90"
            : "cursor-grab",
          bgClass,
          borderClass,
        )}
        style={{ left: `${left}%`, width: `${width}%` }}
      >
        {action.type === "VIDEO_CLIP" && videoThumbnails.length > 0 && (
          <div
            className="absolute inset-0 opacity-40 pointer-events-none overflow-hidden flex"
            style={{
              width: `${
                ((recordings.duration || 1) /
                  (action.endTime - action.startTime)) *
                100
              }%`,
              left: `${
                (-(action.sourceStartTime || 0) /
                  (action.endTime - action.startTime)) *
                100
              }%`,
            }}
          >
            {videoThumbnails.map((src, i) => (
              <div key={i} className="h-full flex-1 min-w-0">
                <img
                  src={src}
                  className="h-full w-full object-cover opacity-80"
                  alt=""
                />
              </div>
            ))}
          </div>
        )}
        <div
          className={clsx(
            "flex items-center gap-1 text-[10px] font-bold pointer-events-none z-10 px-2 truncate",
            textClass,
          )}
        >
          {" "}
          {icon} {label}{" "}
        </div>
        {(isSelected || dragMode === "NONE") && (
          <>
            <div
              className={clsx(
                "absolute left-0 top-0 bottom-0 w-3 cursor-ew-resize hover:bg-black/10 z-30 transition-colors pointer-events-auto",
                dragMode === "RESIZE_START" &&
                  activeActionId === action.id &&
                  "bg-black/10",
              )}
              onMouseDown={(e) =>
                handleActionMouseDown(e, action.id, "RESIZE_START")
              }
            />
            <div
              className={clsx(
                "absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize hover:bg-black/10 z-30 transition-colors pointer-events-auto",
                dragMode === "RESIZE_END" &&
                  activeActionId === action.id &&
                  "bg-black/10",
              )}
              onMouseDown={(e) =>
                handleActionMouseDown(e, action.id, "RESIZE_END")
              }
            />
          </>
        )}
      </div>
    );
  };

  // Find the currently selected action from the actions array based on the selectedActionId
  const selectedAction = actions.find((a) => a.id === selectedActionId);

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-50 overflow-hidden relative">
      {/* Close Confirmation Modal */}
      {showCloseConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">
              Return to Recording?
            </h3>
            <p className="text-sm text-slate-600">
              What would you like to do with your current work?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCloseConfirm(false)}
                className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowCloseConfirm(false);
                  onClose();
                }}
                className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors"
              >
                Discard Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Home Confirmation Modal */}
      {showHomeConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">
              Return to Home?
            </h3>
            <p className="text-sm text-slate-600">
              Your current work will be lost.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowHomeConfirm(false)}
                className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (typeof window !== "undefined") {
                    window.location.href = "/";
                  }
                }}
                className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors"
              >
                Go to Home
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Confirmation Modal */}
      {showSaveConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Save Video?</h3>
            <p className="text-sm text-slate-600">
              Your video will be saved and you will be redirected to the home
              page.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowSaveConfirm(false)}
                className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  // Convert Blobs to URLs
                  const compositeUrl = recordings.composite
                    ? URL.createObjectURL(recordings.composite)
                    : undefined;
                  const cameraUrl = recordings.camera
                    ? URL.createObjectURL(recordings.camera)
                    : undefined;
                  const screenUrl = recordings.screen
                    ? URL.createObjectURL(recordings.screen)
                    : undefined;

                  // Format duration as MM:SS
                  const minutes = Math.floor(duration / 60);
                  const seconds = Math.floor(duration % 60);
                  const formattedDuration = `${minutes}:${seconds.toString().padStart(2, "0")}`;

                  const savedVideo = await saveVideo({
                    title: metadata.name || "Untitled Video",
                    compositeUrl,
                    cameraUrl,
                    screenUrl,
                    duration: formattedDuration,
                  });
                  if (savedVideo && typeof window !== "undefined") {
                    window.location.href = "/";
                  }
                }}
                className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors"
              >
                Save & Go Home
              </button>
            </div>
          </div>
        </div>
      )}

      {showExportModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {isExporting ? (
              <div className="p-12 flex flex-col items-center justify-center space-y-4">
                <div className="relative w-16 h-16">
                  <Loader2 className="w-16 h-16 text-indigo-200 animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-indigo-600">
                    {Math.round(exportProgress * 100)}%
                  </div>
                </div>
                <h3 className="text-lg font-bold text-slate-900">
                  {exportStatus}
                </h3>
                <p className="text-slate-500 text-sm">
                  Applying edits, mixing audio, and encoding to MP4.
                </p>
                <div className="w-full max-w-xs bg-indigo-100 rounded-full h-2">
                  <div
                    className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.round(exportProgress * 100)}%` }}
                  />
                </div>
              </div>
            ) : (
              <>
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">
                      Export Video as MP4
                    </h2>
                    <p className="text-sm text-slate-500">
                      Choose resolution and export.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowExportModal(false)}
                    className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-slate-600"
                  >
                    <X size={20} />
                  </button>
                </div>
                <div className="p-8 space-y-6">
                  {/* Resolution Selector */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                      Export Resolution
                    </p>
                    <div className="flex gap-2">
                      {(['720p', '1080p', '4k'] as ExportResolution[]).map((res) => {
                        const info = RESOLUTION_MAP[res];
                        const isSelected = selectedExportResolution === res;
                        return (
                          <button
                            key={res}
                            onClick={() => setSelectedExportResolution(res)}
                            className={`flex-1 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all border-2 relative ${
                              isSelected
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-200'
                                : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
                            }`}
                          >
                            <div>{info.label}</div>
                            <div className={`text-[10px] mt-0.5 ${isSelected ? 'text-indigo-200' : 'text-slate-400'}`}>
                              {info.width}×{info.height}
                            </div>
                            {info.badge && (
                              <span
                                className={`absolute -top-2 -right-2 text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                                  info.badge === 'Recomendado'
                                    ? 'bg-green-500 text-white'
                                    : 'bg-amber-500 text-white'
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

                  {/* Render Edited Video */}
                  <div className="p-6 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-200">
                        <Film size={24} />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900">
                          Render Edited Video (MP4)
                        </h3>
                        <p className="text-sm text-slate-500">
                          Combines edits, zooms, audio and layouts.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleExportRender}
                      className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-all shadow-md active:translate-y-0.5"
                    >
                      Export MP4
                    </button>
                  </div>

                  {/* Separator */}
                  <div className="my-2 border-t border-slate-100 relative">
                    <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      OR Download Raw Tracks
                    </span>
                  </div>

                  {/* Screen MP4 Download */}
                  {recordings.screen && (
                    <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center">
                          <Monitor size={20} />
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-900">Screen Recording (MP4)</h3>
                          <p className="text-sm text-slate-500">
                            {(recordings.screen.size / 1024 / 1024).toFixed(2)} MB · With system audio
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={async () => {
                          if (isConvertingScreenMp4 || isConvertingCameraMp4) return;
                          setIsConvertingScreenMp4(true);
                          setMp4ConvertProgress(0);
                          setMp4ConvertStatus('Initializing...');
                          try {
                            const res = RESOLUTION_MAP[selectedExportResolution];
                            const mp4 = await convertToMp4(recordings.screen!, {
                              width: res.width,
                              height: res.height,
                              onProgress: (r) => setMp4ConvertProgress(r),
                              onStatus: (m) => setMp4ConvertStatus(m),
                            });
                            downloadBlob(mp4, 'screen-recording.mp4');
                          } catch (err) {
                            console.error('Screen MP4 conversion failed:', err);
                            downloadBlob(recordings.screen!, 'screen-recording.webm');
                          } finally {
                            setIsConvertingScreenMp4(false);
                          }
                        }}
                        disabled={isConvertingScreenMp4 || isConvertingCameraMp4}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors text-sm disabled:opacity-50"
                      >
                        {isConvertingScreenMp4 ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Download size={16} />
                        )}
                        .mp4
                      </button>
                    </div>
                  )}

                  {/* Camera MP4 Download */}
                  {recordings.camera && (
                    <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-pink-100 text-pink-600 flex items-center justify-center">
                          <Video size={20} />
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-900">Camera Recording (MP4)</h3>
                          <p className="text-sm text-slate-500">
                            {(recordings.camera.size / 1024 / 1024).toFixed(2)} MB · With microphone audio
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={async () => {
                          if (isConvertingScreenMp4 || isConvertingCameraMp4) return;
                          setIsConvertingCameraMp4(true);
                          setMp4ConvertProgress(0);
                          setMp4ConvertStatus('Initializing...');
                          try {
                            const res = RESOLUTION_MAP[selectedExportResolution];
                            const mp4 = await convertToMp4(recordings.camera!, {
                              width: res.width,
                              height: res.height,
                              onProgress: (r) => setMp4ConvertProgress(r),
                              onStatus: (m) => setMp4ConvertStatus(m),
                            });
                            downloadBlob(mp4, 'camera-recording.mp4');
                          } catch (err) {
                            console.error('Camera MP4 conversion failed:', err);
                            downloadBlob(recordings.camera!, 'camera-recording.webm');
                          } finally {
                            setIsConvertingCameraMp4(false);
                          }
                        }}
                        disabled={isConvertingScreenMp4 || isConvertingCameraMp4}
                        className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-lg font-medium hover:bg-pink-700 transition-colors text-sm disabled:opacity-50"
                      >
                        {isConvertingCameraMp4 ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Download size={16} />
                        )}
                        .mp4
                      </button>
                    </div>
                  )}

                  {/* Conversion Progress (for raw track downloads) */}
                  {(isConvertingScreenMp4 || isConvertingCameraMp4) && (
                    <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200">
                      <div className="flex items-center gap-3 mb-2">
                        <Loader2 size={16} className="animate-spin text-indigo-600" />
                        <span className="text-sm font-medium text-indigo-700">
                          {mp4ConvertStatus}
                        </span>
                        <span className="ml-auto text-sm font-bold text-indigo-600">
                          {Math.round(mp4ConvertProgress * 100)}%
                        </span>
                      </div>
                      <div className="w-full bg-indigo-200 rounded-full h-2">
                        <div
                          className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${Math.round(mp4ConvertProgress * 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <div className="h-16 px-6 border-b border-slate-200 flex items-center justify-between bg-white z-10 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCloseConfirm(true)}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-medium text-sm"
          >
            <ChevronLeft size={16} />
            Back to Recording
          </button>
          <button
            onClick={() => setShowHomeConfirm(true)}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-medium text-sm"
          >
            <Home size={16} />
            Back to Home
          </button>

          {/* Save Status Indicator */}
          {recordingId && saveStatus !== "idle" && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-medium">
              {saveStatus === "saving" && (
                <>
                  <Loader2 className="w-3 h-3 animate-spin text-indigo-500" />
                  <span className="text-slate-600">Salvando...</span>
                </>
              )}
              {saveStatus === "saved" && (
                <>
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-slate-600">Salvo</span>
                </>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSaveConfirm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700"
          >
            <Download size={16} />
            Save
          </button>
          <button
            onClick={() => setShowExportModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700"
          >
            <Download size={16} />
            Export
          </button>
        </div>
      </div>

      <div className="flex-1 flex min-h-0 overflow-hidden">
        <div
          ref={stageContainerRef}
          className="flex-1 min-h-0 bg-slate-100 relative flex flex-col overflow-hidden"
        >
          <Stage
            layoutConfig={
              (selectedAction?.type === "LAYOUT"
                ? selectedAction?.layoutConfig
                : (actions
                    .filter(
                      (a) =>
                        currentTime >= a.startTime && currentTime <= a.endTime,
                    )
                    .find((a) => a.type === "LAYOUT")?.layoutConfig ??
                  baseLayoutConfig)) as LayoutConfig
            }
            onLayoutConfigChange={(newConfig) =>
              selectedAction?.type === "LAYOUT"
                ? updateAction(selectedAction.id, { layoutConfig: newConfig })
                : setBaseLayoutConfig(newConfig)
            }
            activeLayer={
              selectedAction?.type === "LAYOUT"
                ? editorActiveLayer || "camera"
                : null
            }
            onSelectLayer={setEditorActiveLayer}
            userSource={userUrl}
            displaySource={displayUrl}
            isReadOnly={selectedAction?.type !== "LAYOUT" && !!selectedActionId}
            zoom={
              actions
                .filter(
                  (a) => currentTime >= a.startTime && currentTime <= a.endTime,
                )
                .find((a) => a.type === "ZOOM")?.zoomTarget || {
                scale: 1,
                x: 0.5,
                y: 0.5,
              }
            }
            currentTime={getSourceTime(currentTime)}
            isPlaying={isPlaying}
            micVolume={currentMicVolume}
            screenVolume={currentScreenVolume}
            isMirrored={isMirrored}
            activeBlurs={actions
              .filter(
                (a) =>
                  a.type === "BLUR" &&
                  currentTime >= a.startTime &&
                  currentTime <= a.endTime,
              )
              .map((a) => ({ ...a.blurConfig!, id: a.id }))}
            onUpdateBlur={(id, newConfig) =>
              updateAction(id, { blurConfig: newConfig })
            }
            selectedBlurId={
              selectedAction?.type === "BLUR" ? selectedAction.id : null
            }
          />
          {/* Fullscreen Button - Always visible */}
          <div className="absolute top-4 right-4 z-[100]">
            <button
              onClick={toggleFullscreen}
              className="p-2.5 bg-slate-900/70 hover:bg-slate-900/90 backdrop-blur-sm text-white rounded-lg transition-all shadow-lg"
              title="Toggle Fullscreen (Ctrl+F)"
            >
              {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
            </button>
          </div>
        </div>
        <div className="w-80 bg-white border-l border-slate-200 flex flex-col z-20 shadow-xl shrink-0 overflow-hidden">
          {selectedActionId && selectedAction ? (
            <div className="flex flex-col h-full">
              <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-wider">
                  {selectedAction.type === "ZOOM" ? (
                    <ZoomIn size={14} />
                  ) : selectedAction.type === "LAYOUT" ? (
                    <LayoutIcon size={14} />
                  ) : selectedAction.type === "AUDIO_MIC" ||
                    selectedAction.type === "AUDIO_SCREEN" ? (
                    <Volume2 size={14} />
                  ) : selectedAction.type === "BLUR" ? (
                    <EyeOff size={14} />
                  ) : (
                    <Scissors size={14} />
                  )}
                  <span>
                    {selectedAction.type.replace("AUDIO_", " ")} Action
                  </span>
                </div>
                <button
                  onClick={() => deleteAction(selectedAction.id)}
                  className="p-1.5 text-red-400 hover:text-red-600 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <div className="p-6 flex-1 overflow-y-auto">
                {selectedAction.type === "ZOOM" && (
                  <div className="space-y-6">
                    <section>
                      <div className="flex justify-between mb-2">
                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                          Scale
                        </label>
                        <span className="text-xs font-bold text-purple-600">
                          {Math.round(
                            (selectedAction.zoomTarget?.scale || 1) * 100,
                          )}
                          %
                        </span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="3"
                        step="0.1"
                        value={selectedAction.zoomTarget?.scale || 1.5}
                        onChange={(e) =>
                          updateAction(selectedAction.id, {
                            zoomTarget: {
                              ...selectedAction.zoomTarget!,
                              scale: parseFloat(e.target.value),
                            },
                          })
                        }
                        className="w-full accent-purple-600 h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer"
                      />
                    </section>
                    <section>
                      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 block">
                        Focus Point
                      </label>
                      <div
                        className="w-full aspect-video bg-slate-100 rounded-xl border border-slate-200 relative cursor-crosshair overflow-hidden"
                        onMouseDown={(e) => {
                          setIsDraggingFocus(true);
                          const r = e.currentTarget.getBoundingClientRect();
                          updateAction(selectedAction.id, {
                            zoomTarget: {
                              ...selectedAction.zoomTarget!,
                              x: (e.clientX - r.left) / r.width,
                              y: (e.clientY - r.top) / r.height,
                            },
                          });
                        }}
                        onMouseMove={(e) => {
                          if (isDraggingFocus) {
                            const r = e.currentTarget.getBoundingClientRect();
                            updateAction(selectedAction.id, {
                              zoomTarget: {
                                ...selectedAction.zoomTarget!,
                                x: Math.max(
                                  0,
                                  Math.min(1, (e.clientX - r.left) / r.width),
                                ),
                                y: Math.max(
                                  0,
                                  Math.min(1, (e.clientY - r.top) / r.height),
                                ),
                              },
                            });
                          }
                        }}
                        onMouseUp={() => setIsDraggingFocus(false)}
                      >
                        <div
                          className="absolute w-4 h-4 bg-purple-600 rounded-full -ml-2 -mt-2 shadow-sm border-2 border-white"
                          style={{
                            left: `${selectedAction.zoomTarget?.x! * 100}%`,
                            top: `${selectedAction.zoomTarget?.y! * 100}%`,
                          }}
                        />
                      </div>
                    </section>
                  </div>
                )}
                {selectedAction.type === "BLUR" &&
                  selectedAction.blurConfig && (
                    <div className="space-y-6">
                      <section>
                        <div className="flex justify-between mb-2">
                          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                            Intensity
                          </label>
                          <span className="text-xs font-bold text-slate-600">
                            {Math.round(selectedAction.blurConfig.intensity)}px
                          </span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="50"
                          step="1"
                          value={selectedAction.blurConfig.intensity}
                          onChange={(e) =>
                            updateAction(selectedAction.id, {
                              blurConfig: {
                                ...selectedAction.blurConfig!,
                                intensity: parseInt(e.target.value),
                              },
                            })
                          }
                          className="w-full accent-slate-600 h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer"
                        />
                      </section>
                    </div>
                  )}
                {(selectedAction.type === "AUDIO_MIC" ||
                  selectedAction.type === "AUDIO_SCREEN") && (
                  <Sidebar
                    layoutConfig={baseLayoutConfig}
                    onChange={setBaseLayoutConfig}
                    metadata={metadata}
                    onMetadataChange={setMetadata}
                    isRecording={false}
                    actionVolume={selectedAction.volume}
                    onActionVolumeChange={(val) =>
                      updateAction(selectedAction.id, { volume: val })
                    }
                  />
                )}
                {selectedAction.type === "LAYOUT" && (
                  <Sidebar
                    layoutConfig={selectedAction.layoutConfig as LayoutConfig}
                    onChange={(c) =>
                      updateAction(selectedAction.id, { layoutConfig: c })
                    }
                    metadata={metadata}
                    onMetadataChange={setMetadata}
                    isRecording={false}
                    isMirrored={isMirrored}
                    onToggleMirror={() => setIsMirrored(!isMirrored)}
                  />
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              <Sidebar
                layoutConfig={baseLayoutConfig}
                onChange={setBaseLayoutConfig}
                metadata={metadata}
                onMetadataChange={setMetadata}
                isRecording={false}
                globalMicVolume={globalMicVolume}
                globalScreenVolume={globalScreenVolume}
                onGlobalVolumeChange={(t, v) =>
                  t === "mic" ? setGlobalMicVolume(v) : setGlobalScreenVolume(v)
                }
                isMirrored={isMirrored}
                onToggleMirror={() => setIsMirrored(!isMirrored)}
              />
            </div>
          )}
        </div>
      </div>

      <div className="bg-white border-t border-slate-200 flex flex-col z-30 shrink-0 shadow-lg relative pb-safe">
        <div
          className="absolute -top-1.5 left-0 right-0 h-3 cursor-row-resize z-50 flex items-center justify-center hover:bg-indigo-500/10 transition-colors group"
          onMouseDown={(e) => {
            e.preventDefault();
            const sy = e.clientY,
              sh = timelineHeight;
            const mv = (m: MouseEvent) =>
              setTimelineHeight(
                Math.max(180, Math.min(600, sh + (sy - m.clientY))),
              );
            const mu = () => {
              window.removeEventListener("mousemove", mv);
              window.removeEventListener("mouseup", mu);
            };
            window.addEventListener("mousemove", mv);
            window.addEventListener("mouseup", mu);
          }}
        >
          <div className="w-12 h-1 bg-slate-200 rounded-full group-hover:bg-indigo-400 transition-colors"></div>
        </div>
        <div className="px-6 py-2 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentTime(0)}
              className="p-2 text-slate-500 hover:text-slate-800 rounded-lg"
            >
              <SkipBack size={16} fill="currentColor" />
            </button>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-2 text-indigo-600 bg-indigo-50 rounded-lg"
            >
              {isPlaying ? (
                <Pause size={16} fill="currentColor" />
              ) : (
                <Play size={16} fill="currentColor" />
              )}
            </button>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1 shadow-sm">
              <button
                onClick={() => createAction("ZOOM")}
                className="px-3 py-1.5 rounded-md text-xs font-bold text-purple-600 hover:bg-purple-50 flex items-center gap-2"
              >
                <ZoomIn size={14} /> Zoom (Z)
              </button>
              <button
                onClick={() => createAction("LAYOUT")}
                className="px-3 py-1.5 rounded-md text-xs font-bold text-blue-600 hover:bg-blue-50 flex items-center gap-2"
              >
                <LayoutIcon size={14} /> Layout (L)
              </button>
              <button
                onClick={() => createAction("BLUR")}
                className="px-3 py-1.5 rounded-md text-xs font-bold text-slate-700 hover:bg-slate-100 flex items-center gap-2"
              >
                <EyeOff size={14} /> Blur (B)
              </button>
            </div>
            <button
              onClick={handleSplit}
              className="px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-300 text-slate-700 flex items-center gap-2 hover:bg-slate-50 shadow-sm"
            >
              <Spline size={14} /> Split (C)
            </button>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs font-mono text-slate-500">
              {Math.floor(currentTime / 60)}:
              {(currentTime % 60).toFixed(1).padStart(4, "0")}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={undo}
                disabled={historyIndex <= 0}
                className="p-1.5 hover:bg-slate-200 rounded-md disabled:opacity-30"
              >
                <Undo size={14} />
              </button>
              <button
                onClick={redo}
                disabled={historyIndex >= history.length - 1}
                className="p-1.5 hover:bg-slate-200 rounded-md disabled:opacity-30"
              >
                <Redo size={14} />
              </button>
            </div>
            <div className="flex items-center gap-2 w-32">
              <ZoomOut size={14} />
              <input
                type="range"
                min="0"
                max="100"
                value={zoomSlider}
                onChange={(e) => setZoomSlider(parseFloat(e.target.value))}
                className="w-full accent-slate-600 h-1 bg-slate-200 rounded-lg appearance-none"
              />
              <ZoomIn size={14} />
            </div>
          </div>
        </div>
        <div
          className="overflow-x-auto overflow-y-auto bg-slate-50 relative shrink-0"
          style={{ height: `${timelineHeight}px` }}
          ref={timelineContainerRef}
        >
          <div className="sticky left-0 z-40 w-32 bg-white/95 backdrop-blur border-r border-slate-200 flex flex-col text-[10px] font-bold text-slate-500 uppercase min-h-full float-left">
            <div className="h-[24px] border-b border-slate-100 flex items-center px-4 bg-slate-50">
              Timeline
            </div>
            <div className="h-[28px] border-b border-slate-100 flex flex-col justify-center px-4">
              <div className="flex items-center gap-2">
                <EyeOff size={12} /> Blur
              </div>
            </div>
            <div className="h-[28px] border-b border-slate-100 flex flex-col justify-center px-4">
              <div className="flex items-center gap-2 text-purple-600">
                <ZoomIn size={12} /> Zoom
              </div>
            </div>
            <div className="h-[28px] border-b border-slate-100 flex flex-col justify-center px-4">
              <div className="flex items-center gap-2 text-blue-600">
                <LayoutIcon size={12} /> Layout
              </div>
            </div>
            <div className="h-[42px] border-b border-slate-100 flex flex-col justify-center px-4 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Film size={12} /> Video
              </div>
            </div>
            <div className="h-[32px] border-b border-slate-100 flex flex-col justify-center px-4">
              <div className="flex items-center gap-2 text-amber-600">
                <Mic size={12} /> Mic
              </div>
            </div>
            <div className="h-[32px] border-b border-slate-100 flex flex-col justify-center px-4">
              <div className="flex items-center gap-2 text-green-600">
                <Monitor size={12} /> System
              </div>
            </div>
          </div>
          <div
            className="relative min-h-full select-none"
            style={{ width: `${totalTimelineWidth}px`, marginLeft: "128px" }}
            ref={timelineRef}
            onMouseDown={handleTimelineMouseDown}
            onMouseMove={handleTimelineMouseMove}
            onMouseUp={(e) => {
              handleTimelineMouseUp(e);
              setDragMode("NONE");
              setActiveActionId(null);
            }}
          >
            <div
              className="absolute top-0 left-0 right-0 h-[24px] border-b border-slate-200 bg-white z-20 cursor-pointer"
              onMouseDown={(e) => {
                e.stopPropagation();
                setCurrentTime(getTimelineTime(e));
                setDragMode("SCRUB");
              }}
            />
            <div
              className="absolute left-0 right-0 h-[28px] border-b border-slate-200"
              style={{ top: "24px" }}
            >
              {actions
                .filter((a) => a.type === "BLUR")
                .map((a) =>
                  renderActionBlock(a, "pink", <EyeOff size={10} />, "BLUR"),
                )}
            </div>
            <div
              className="absolute left-0 right-0 h-[28px] border-b border-slate-200"
              style={{ top: "52px" }}
            >
              {actions
                .filter((a) => a.type === "ZOOM")
                .map((a) =>
                  renderActionBlock(a, "cyan", <ZoomIn size={10} />, "ZOOM"),
                )}
            </div>
            <div
              className="absolute left-0 right-0 h-[28px] border-b border-slate-200"
              style={{ top: "80px" }}
            >
              {actions
                .filter((a) => a.type === "LAYOUT")
                .map((a) =>
                  renderActionBlock(
                    a,
                    "indigo",
                    <LayoutIcon size={10} />,
                    "LAYOUT",
                  ),
                )}
            </div>
            <div
              className="absolute left-0 right-0 h-[42px] border-b border-slate-200"
              style={{ top: "108px" }}
            >
              {actions
                .filter((a) => a.type === "VIDEO_CLIP")
                .map((a, i) =>
                  renderActionBlock(
                    a,
                    "slate",
                    <Film size={10} />,
                    `Clip ${i + 1}`,
                  ),
                )}
            </div>
            <div
              className="absolute left-0 right-0 h-[32px] border-b border-slate-200"
              style={{ top: "150px" }}
            >
              <canvas
                ref={micCanvasRef}
                className="absolute inset-0 opacity-60"
              />
              {actions
                .filter((a) => a.type === "AUDIO_MIC")
                .map((a) =>
                  renderActionBlock(
                    a,
                    "amber",
                    <Mic size={10} />,
                    `${Math.round((a.volume ?? 1) * 100)}%`,
                  ),
                )}
            </div>
            <div
              className="absolute left-0 right-0 h-[32px] border-b border-slate-200"
              style={{ top: "182px" }}
            >
              <canvas
                ref={screenCanvasRef}
                className="absolute inset-0 opacity-60"
              />
              {actions
                .filter((a) => a.type === "AUDIO_SCREEN")
                .map((a) =>
                  renderActionBlock(
                    a,
                    "green",
                    <Monitor size={10} />,
                    `${Math.round((a.volume ?? 1) * 100)}%`,
                  ),
                )}
            </div>
            {selection && (
              <div
                className="absolute top-6 bottom-0 bg-indigo-500/10 border-x-2 border-indigo-500 z-20"
                style={{
                  left: `${(selection.start / duration) * 100}%`,
                  width: `${
                    ((selection.end - selection.start) / duration) * 100
                  }%`,
                }}
              />
            )}
            <div
              className="absolute top-0 bottom-0 w-px bg-red-500 z-50 pointer-events-none"
              style={{ left: `${(currentTime / duration) * 100}%` }}
            >
              <div className="w-3 h-3 bg-red-500 rounded-full -ml-1.5 mt-[-1.5px] border-2 border-white" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  function handleTimelineMouseUp(e: React.MouseEvent) {
    // Só adicionar ao histórico se houve movimento real (mais de 5 pixels)
    const didMove =
      dragStartRef.current && Math.abs(e.clientX - dragStartRef.current.x) >= 5;

    if (
      activeActionId &&
      (dragMode === "MOVE" || dragMode.startsWith("RESIZE")) &&
      didMove
    ) {
      pushToHistory(actions, duration);
    }

    // Se foi um clique simples (menos de 5 pixels), apenas selecionar
    if (
      activeActionId &&
      dragStartRef.current &&
      Math.abs(e.clientX - dragStartRef.current.x) < 5
    ) {
      setSelectedActionId(activeActionId);
    }
  }

  function updateAction(id: string, updates: Partial<TimelineAction>) {
    // Salvar estado anterior na primeira atualização
    if (previousActionsRef.current.length === 0) {
      previousActionsRef.current = actions;
    }

    // Atualizar o estado imediatamente
    setActions((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...updates } : a)),
    );

    // Limpar timeout anterior
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }

    // Adicionar ao histórico após 500ms de inatividade
    updateTimeoutRef.current = setTimeout(() => {
      if (previousActionsRef.current.length > 0) {
        pushToHistory(previousActionsRef.current, duration);
        previousActionsRef.current = [];
      }
    }, 500);
  }
};

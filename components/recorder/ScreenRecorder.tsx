"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Layout } from "@/components/Layout";
import { Stage } from "@/components/Stage";
import { ControlBar } from "@/components/ControlBar";
import { Sidebar } from "@/components/Sidebar";
import { Editor } from "@/components/Editor";
import { PreviewModal } from "@/components/PreviewModal";
import { useUserMedia } from "@/hooks/useUserMedia.next";
import { useDisplayMedia } from "@/hooks/useDisplayMedia.next";
import { useMultiRecorder } from "@/hooks/useMultiRecorder.next";
import { useCompositor } from "@/hooks/useCompositor.next";
import {
  LayoutConfig,
  CameraSize,
  BackgroundStyle,
  CameraShape,
  BorderType,
  ShadowStyle,
  ProjectMetadata,
  RecordedFiles,
} from "@/types";
import { AlertCircle, RefreshCw, ArrowLeft, Settings } from "lucide-react";
import { saveVideo } from "@/lib/videoStorage";
import { useR2Upload } from "@/hooks/useR2Upload";
import { generateThumbnailFromVideo } from "@/lib/thumbnail";

const ScreenRecorder: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { uploadToR2, isUploading, uploadProgress } = useR2Upload();

  // Application State
  const [layoutConfig, setLayoutConfig] = useState<LayoutConfig>({
    cameraShape: CameraShape.HORIZONTAL,
    cameraSize: CameraSize.MEDIUM,
    background: BackgroundStyle.GRADIENT_1,
    border: BorderType.ROUNDED,
    shadow: ShadowStyle.SOFT,
    cameraTransform: {
      x: 0.73,
      y: 0.65,
      width: 0.25,
      height: 0.3,
      aspectRatio: 16 / 9,
    },
    // Default Screen Transform with Padding
    screenTransform: {
      x: 0.05,
      y: 0.05,
      width: 0.9,
      height: 0.9,
      aspectRatio: 16 / 9,
    },
  });

  const [metadata, setMetadata] = useState<ProjectMetadata>({
    name: "",
  });

  const [activeLayer, setActiveLayer] = useState<string | null>(null);
  const [pendingStart, setPendingStart] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [isMirrored, setIsMirrored] = useState(true);

  // Persist isMirrored preference
  useEffect(() => {
    const saved = localStorage.getItem("camera-mirrored");
    if (saved !== null) {
      setIsMirrored(saved === "true");
    } else {
      // Se nunca foi configurado, salvar o padrão (true)
      localStorage.setItem("camera-mirrored", "true");
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("camera-mirrored", isMirrored.toString());
  }, [isMirrored]);

  // Media Hooks
  const {
    stream: userStream,
    error: userMediaError,
    toggleAudio,
    toggleVideo,
    isAudioEnabled,
    isVideoEnabled,
    audioDevices,
    videoDevices,
    selectedAudioId,
    selectedVideoId,
    setAudioDevice,
    setVideoDevice,
    retryMedia,
    stopUserMedia,
  } = useUserMedia();

  const {
    stream: displayStream,
    error: displayMediaError,
    startDisplayMedia,
    stopDisplayMedia,
  } = useDisplayMedia();

  // Create Composite Stream
  const compositeStream = useCompositor({
    userStream,
    displayStream,
    layoutConfig,
  });

  // Recorder Hook
  const {
    isRecording,
    recordingTime,
    startRecording,
    stopRecording,
    recordings,
    clearRecordings,
  } = useMultiRecorder({ userStream, displayStream, compositeStream });

  // Effects
  useEffect(() => {
    if (displayStream) {
      displayStream.getVideoTracks()[0].onended = () => {
        if (isRecording) stopRecording();
        stopDisplayMedia();
      };
    }
  }, [displayStream, isRecording, stopRecording, stopDisplayMedia]);

  useEffect(() => {
    if (pendingStart) {
      if (displayStream) {
        startRecording();
        setPendingStart(false);
      } else if (displayMediaError) {
        setPendingStart(false);
      }
    }
  }, [pendingStart, displayStream, displayMediaError, startRecording]);

  // Transition to Preview when recordings are ready
  useEffect(() => {
    if (recordings && recordings.composite && !isRecording) {
      setShowPreview(true);
    }
  }, [recordings, isRecording]);

  const handleStartRecording = async () => {
    if (isRecording) {
      handleStopRecording();
      return;
    }

    // Verificar se tem pelo menos uma fonte de vídeo (câmera ou tela)
    const hasVideoSource = userStream || displayStream;

    if (!hasVideoSource) {
      // Se não tem nenhuma fonte, mostrar erro
      console.warn("No video source available (camera or screen)");
      return;
    }

    // Se não tem displayStream mas a configuração precisa dele (screen width > 0)
    const needsScreen = layoutConfig.screenTransform.width > 0;

    if (needsScreen && !displayStream) {
      setPendingStart(true);
      await startDisplayMedia();
    } else {
      // Pode iniciar gravação com apenas câmera ou apenas tela
      startRecording();
    }
  };

  const handleStopRecording = () => {
    stopRecording();
  };

  const startEditing = async () => {
    // First, save the video to get a recordingId
    if (!recordings || !recordings.composite) {
      console.error("❌ No recordings available to edit");
      return;
    }

    try {
      console.log("💾 Salvando vídeo antes de editar...");
      console.log(
        "⏱️ [RECORDER] recordingTime (já em segundos):",
        recordingTime,
      );
      console.log(
        "⏱️ [RECORDER] recordings.duration (s):",
        recordings.duration,
      );

      // recordingTime já está em segundos, não precisa dividir por 1000!
      const duration = recordingTime > 0 ? recordingTime : recordings.duration;
      console.log("💾 [RECORDER] Duração final para salvar (s):", duration);

      // Generate thumbnail
      let thumbnailBlob: Blob | undefined;
      try {
        thumbnailBlob = await generateThumbnailFromVideo(recordings.composite);
        console.log("📸 Thumbnail gerada");
      } catch (thumbError) {
        console.warn("⚠️ Erro ao gerar thumbnail:", thumbError);
      }

      // Upload to R2 and save to database
      const result = await uploadToR2({
        blob: recordings.composite,
        fileName: `recording-${Date.now()}.webm`,
        title: metadata.name || "My Recording",
        duration,
        thumbnailBlob,
        cameraBlob: recordings.camera,
        screenBlob: recordings.screen,
      });

      if (result.success && result.recording) {
        console.log("✅ Vídeo salvo com sucesso! ID:", result.recording.id);

        // Salvar o layout usado durante a gravação como editConfig inicial
        console.log(
          "💾 Salvando layout da gravação como editConfig inicial...",
        );
        try {
          const { updateEditConfigAction } =
            await import("@/app/actions/recordings");

          const initialEditConfig = {
            actions: [], // Sem ações ainda
            layoutConfig: layoutConfig, // Layout usado na gravação
            metadata: {
              name: metadata.name || "My Recording",
            },
            volumes: {
              mic: 1,
              screen: 1,
            },
            version: "1.0",
          };

          await updateEditConfigAction(
            result.recording.id,
            JSON.stringify(initialEditConfig),
          );
          console.log("✅ Layout da gravação salvo!");
        } catch (saveError) {
          console.warn("⚠️ Erro ao salvar layout inicial:", saveError);
          // Não bloqueia o fluxo se falhar
        }

        // Release live resources
        stopUserMedia();
        stopDisplayMedia();
        clearRecordings();

        // Redirecionar para a rota do editor
        router.push(`/editor/${result.recording.id}`);
      } else {
        alert(`Failed to save recording: ${result.error}`);
      }
    } catch (error) {
      console.error("❌ Erro ao salvar vídeo:", error);
      alert("Failed to save recording. Please try again.");
    }
  };

  const closeEditor = () => {
    // Refresh the page to reset media state properly or implement restart logic
    // For simplicity in this architecture, a reload is often safest to reset WebRTC states
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  const closePreview = () => {
    setShowPreview(false);
    clearRecordings();
    // User might want to record again with same streams
  };

  const handleSaveAndGoHome = async () => {
    if (!recordings || !recordings.composite) {
      return;
    }

    try {
      // recordingTime já está em segundos, não precisa dividir por 1000!
      const duration = recordingTime > 0 ? recordingTime : recordings.duration;
      console.log("💾 [SAVE HOME] Duração para salvar (s):", duration);

      // Generate thumbnail from video
      console.log("📸 Gerando thumbnail do vídeo...");
      let thumbnailBlob: Blob | undefined;
      try {
        thumbnailBlob = await generateThumbnailFromVideo(recordings.composite);
        console.log("📸 ✅ Thumbnail gerada com sucesso!");
      } catch (thumbError) {
        console.warn(
          "📸 ⚠️ Erro ao gerar thumbnail, continuando sem ela:",
          thumbError,
        );
      }

      // Upload para R2 e salvar no database
      const result = await uploadToR2({
        blob: recordings.composite,
        fileName: `recording-${Date.now()}.webm`,
        title: metadata.name || "My Recording",
        duration,
        thumbnailBlob,
        cameraBlob: recordings.camera,
        screenBlob: recordings.screen,
      });

      if (result.success) {
        // Salvar o layout usado durante a gravação como editConfig inicial
        if (result.recording) {
          console.log("💾 Salvando layout da gravação...");
          try {
            const { updateEditConfigAction } =
              await import("@/app/actions/recordings");

            const initialEditConfig = {
              actions: [],
              layoutConfig: layoutConfig,
              metadata: {
                name: metadata.name || "My Recording",
              },
              volumes: {
                mic: 1,
                screen: 1,
              },
              version: "1.0",
            };

            await updateEditConfigAction(
              result.recording.id,
              JSON.stringify(initialEditConfig),
            );
            console.log("✅ Layout da gravação salvo!");
          } catch (saveError) {
            console.warn("⚠️ Erro ao salvar layout:", saveError);
          }
        }

        // Limpar recursos
        stopUserMedia();
        stopDisplayMedia();
        clearRecordings();

        // Voltar para home
        router.push("/");
      } else {
        alert(`Failed to save recording: ${result.error}`);
      }
    } catch (error) {
      console.error("Error saving recording:", error);
      alert("Failed to save recording. Please try again.");
    }
  };

  const handleBackToHome = () => {
    // Limpar recursos sem salvar
    stopUserMedia();
    stopDisplayMedia();
    clearRecordings();

    // Voltar para home
    router.push("/");
  };
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50">
      {/* Botão Voltar - Escondido durante gravação */}
      {!isRecording && (
        <button
          onClick={handleBackToHome}
          className="absolute top-6 left-6 z-[60] flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-gray-100 border border-gray-300 rounded-lg shadow-sm hover:shadow-md transition-all text-gray-700 hover:text-gray-900 font-medium"
        >
          <ArrowLeft size={20} />
          <span>Back to Home</span>
        </button>
      )}
      {/* Error Banner for Camera/Mic */}
      {userMediaError && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[100] bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 animate-in fade-in slide-in-from-top-2 max-w-md">
          <AlertCircle size={20} className="shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-sm">
              {userMediaError.name === "NotFoundError"
                ? "No Camera/Microphone Found"
                : userMediaError.name === "NotAllowedError"
                  ? "Camera/Microphone Access Denied"
                  : "Camera/Microphone Unavailable"}
            </p>
            <p className="text-xs opacity-90 mt-0.5">
              {userMediaError.message ||
                "You can still record your screen only."}
            </p>
          </div>
          <button
            onClick={retryMedia}
            className="ml-2 p-2 hover:bg-red-100 rounded-lg transition-colors text-red-700"
            title="Retry Access"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      )}

      {/* Error Banner for Screen Share */}
      {displayMediaError && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-[100] bg-orange-50 border border-orange-200 text-orange-700 px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
          <AlertCircle size={20} />
          <div>
            <p className="font-semibold text-sm">Screen Recording Failed</p>
            <p className="text-xs opacity-90">
              {displayMediaError.message || "Permission denied or cancelled."}
            </p>
          </div>
          <button
            onClick={() => startDisplayMedia()}
            className="ml-2 p-2 hover:bg-orange-100 rounded-lg transition-colors text-orange-800"
            title="Retry"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      )}

      {showPreview && recordings && (
        <PreviewModal
          recordings={recordings}
          onClose={closePreview}
          onEdit={startEditing}
          onSaveAndGoHome={handleSaveAndGoHome}
          isUploading={isUploading}
          uploadProgress={uploadProgress}
        />
      )}

      {/* Open Sidebar Button - Only visible when sidebar is closed */}
      {!showSidebar && (
        <button
          onClick={() => setShowSidebar(true)}
          className="absolute top-6 right-6 z-[60] p-3 bg-white hover:bg-indigo-50 border border-gray-300 hover:border-indigo-400 rounded-lg shadow-sm hover:shadow-md transition-all text-gray-700 hover:text-indigo-600"
          title="Open Settings"
        >
          <Settings size={20} />
        </button>
      )}

      <div className="flex-1 flex flex-col relative h-full">
        <Layout>
          <Stage
            userStream={userStream}
            displayStream={displayStream}
            layoutConfig={layoutConfig}
            onLayoutConfigChange={setLayoutConfig}
            activeLayer={activeLayer}
            onSelectLayer={setActiveLayer}
            isMirrored={isMirrored}
          />
        </Layout>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50 w-full max-w-4xl flex justify-center">
          <ControlBar
            isRecording={isRecording}
            recordingTime={recordingTime}
            isAudioEnabled={isAudioEnabled}
            isVideoEnabled={isVideoEnabled}
            hasDisplayStream={!!displayStream}
            audioDevices={audioDevices}
            videoDevices={videoDevices}
            selectedAudioId={selectedAudioId}
            selectedVideoId={selectedVideoId}
            userStream={userStream}
            displayStream={displayStream}
            mediaError={userMediaError}
            onToggleAudio={toggleAudio}
            onToggleVideo={toggleVideo}
            onToggleScreen={
              displayStream ? stopDisplayMedia : startDisplayMedia
            }
            onStartRecording={handleStartRecording}
            onAudioDeviceChange={setAudioDevice}
            onVideoDeviceChange={setVideoDevice}
            isMirrored={isMirrored}
            onToggleMirror={() => setIsMirrored(!isMirrored)}
          />
        </div>
      </div>

      {showSidebar && (
        <Sidebar
          layoutConfig={layoutConfig}
          onChange={setLayoutConfig}
          metadata={metadata}
          onMetadataChange={setMetadata}
          isRecording={isRecording}
          onToggleSidebar={() => setShowSidebar(false)}
        />
      )}
    </div>
  );
};

export default ScreenRecorder;

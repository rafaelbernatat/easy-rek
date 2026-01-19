"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getRecordingsAction } from "@/app/actions/recordings";
import { Editor } from "@/components/Editor";
import { Loader2 } from "lucide-react";
import { RecordedFiles } from "@/types";

export default function EditorPage() {
  const params = useParams();
  const router = useRouter();
  const recordingId = params.id as string;

  const [recording, setRecording] = useState<any>(null);
  const [editModeRecordings, setEditModeRecordings] =
    useState<RecordedFiles | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRecording();
  }, [recordingId]);

  // Helper para obter URL assinada do R2
  const getSignedUrl = async (key: string): Promise<string | null> => {
    try {
      const response = await fetch("/api/get-video-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ key }),
      });

      if (!response.ok) {
        console.error("❌ Erro ao obter URL assinada para key:", key);
        return null;
      }

      const { url } = await response.json();
      return url;
    } catch (error) {
      console.error("❌ Erro ao obter URL assinada:", error);
      return null;
    }
  };

  const loadRecording = async () => {
    console.log("📥 [EDITOR PAGE] Carregando gravação:", recordingId);

    try {
      const result = await getRecordingsAction();

      console.log("📥 [EDITOR PAGE] Resultado:", result);

      if (!result.success) {
        setError("Falha ao carregar gravações");
        setIsLoading(false);
        return;
      }

      const found = result.recordings.find((r: any) => r.id === recordingId);

      console.log("📥 [EDITOR PAGE] Gravação encontrada:", found);
      console.log(
        "📥 [EDITOR PAGE] Duração salva no banco:",
        found?.duration,
        "segundos",
      );
      console.log("📥 [EDITOR PAGE] VideoKey:", found?.videoKey);
      console.log("📥 [EDITOR PAGE] CameraKey:", found?.cameraKey);
      console.log("📥 [EDITOR PAGE] ScreenKey:", found?.screenKey);
      console.log("📥 [EDITOR PAGE] VideoUrl:", found?.videoUrl);
      console.log("📥 [EDITOR PAGE] CameraUrl:", found?.cameraUrl);
      console.log("📥 [EDITOR PAGE] ScreenUrl:", found?.screenUrl);

      if (!found) {
        setError("Gravação não encontrada");
        setIsLoading(false);
        return;
      }

      setRecording(found);

      const editConfig = found.editConfig
        ? typeof found.editConfig === "string"
          ? JSON.parse(found.editConfig)
          : found.editConfig
        : null;

      // Carregar vídeos do R2
      console.log("📹 [EDITOR PAGE] Carregando vídeos:", {
        hasCamera: !!found.cameraKey,
        hasScreen: !!found.screenKey,
        hasComposite: !!found.videoKey,
      });

      let cameraBlob: Blob | undefined;
      let screenBlob: Blob | undefined;
      let compositeBlob: Blob | undefined;
      let actualDuration = found.duration;

      // Carregar câmera se disponível
      if (found.cameraKey) {
        try {
          console.log(
            "📹 [EDITOR PAGE] Obtendo URL para câmera:",
            found.cameraKey,
          );
          const cameraUrl = await getSignedUrl(found.cameraKey);

          if (cameraUrl) {
            console.log("📹 [EDITOR PAGE] Carregando câmera...");
            const response = await fetch(cameraUrl);
            if (!response.ok) {
              throw new Error(`Erro HTTP: ${response.status}`);
            }
            cameraBlob = await response.blob();
            console.log(
              "✅ [EDITOR PAGE] Câmera carregada:",
              cameraBlob.size,
              "bytes",
            );
          }
        } catch (camError) {
          console.error("❌ [EDITOR PAGE] Erro ao carregar câmera:", camError);
        }
      } else {
        console.log("⚠️ [EDITOR PAGE] Câmera não disponível (sem cameraKey)");
      }

      // Carregar tela se disponível
      if (found.screenKey) {
        try {
          console.log(
            "📹 [EDITOR PAGE] Obtendo URL para tela:",
            found.screenKey,
          );
          const screenUrl = await getSignedUrl(found.screenKey);

          if (screenUrl) {
            console.log("📹 [EDITOR PAGE] Carregando tela...");
            const response = await fetch(screenUrl);
            if (!response.ok) {
              throw new Error(`Erro HTTP: ${response.status}`);
            }
            screenBlob = await response.blob();
            console.log(
              "✅ [EDITOR PAGE] Tela carregada:",
              screenBlob.size,
              "bytes",
            );
          }
        } catch (scrError) {
          console.error("❌ [EDITOR PAGE] Erro ao carregar tela:", scrError);
        }
      } else {
        console.log("⚠️ [EDITOR PAGE] Tela não disponível (sem screenKey)");
      }

      // Carregar composite (obrigatório)
      if (found.videoKey) {
        try {
          console.log(
            "📹 [EDITOR PAGE] Obtendo URL para composite:",
            found.videoKey,
          );
          const compositeUrl = await getSignedUrl(found.videoKey);

          if (!compositeUrl) {
            throw new Error("Falha ao obter URL assinada para composite");
          }

          console.log("📹 [EDITOR PAGE] Carregando composite...");
          const response = await fetch(compositeUrl);
          if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
          }
          compositeBlob = await response.blob();
          console.log(
            "✅ [EDITOR PAGE] Composite carregado:",
            compositeBlob.size,
            "bytes",
          );

          // Tentar obter duração do vídeo
          console.log("📊 [EDITOR PAGE] Tentando obter duração do vídeo...");
          const blobUrl = URL.createObjectURL(compositeBlob);
          const video = document.createElement("video");
          video.src = blobUrl;
          video.preload = "metadata";

          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
              console.warn(
                "⚠️ [EDITOR PAGE] Timeout ao carregar metadados do vídeo",
              );
              reject(new Error("Timeout loading video"));
            }, 10000);

            video.onloadedmetadata = () => {
              clearTimeout(timeout);
              console.log("✅ [EDITOR PAGE] Metadados carregados");
              console.log("📊 [EDITOR PAGE] Duração do vídeo:", video.duration);
              console.log("📊 [EDITOR PAGE] Duração do banco:", found.duration);
              resolve();
            };

            video.onerror = (e) => {
              clearTimeout(timeout);
              console.error("❌ [EDITOR PAGE] Erro ao carregar metadados:", e);
              reject(new Error("Failed to load video metadata"));
            };
          });

          if (
            video.duration &&
            isFinite(video.duration) &&
            video.duration > 0
          ) {
            actualDuration = video.duration;
            console.log(
              "✅ [EDITOR PAGE] Usando duração do vídeo:",
              actualDuration,
            );
          } else {
            console.log(
              "⚠️ [EDITOR PAGE] Duração do vídeo inválida, usando do banco:",
              actualDuration,
            );
          }

          URL.revokeObjectURL(blobUrl);
        } catch (compError) {
          console.error(
            "❌ [EDITOR PAGE] Erro ao carregar composite:",
            compError,
          );
          // Continuar mesmo com erro, usar duração do banco
        }
      }

      const mockRecordings: RecordedFiles = {
        camera: cameraBlob,
        screen: screenBlob,
        composite: compositeBlob,
        duration: actualDuration,
      };

      console.log("✅ [EDITOR PAGE] RecordedFiles criado:", {
        hasCamera: !!mockRecordings.camera,
        hasScreen: !!mockRecordings.screen,
        hasComposite: !!mockRecordings.composite,
        duration: mockRecordings.duration,
      });

      setEditModeRecordings(mockRecordings);

      // Preparar estado inicial para o Editor
      const initialState: any = {
        recordingId: found.id,
      };

      if (editConfig) {
        initialState.editConfig = editConfig;
      }

      // Armazenar no sessionStorage para o Editor usar
      sessionStorage.setItem(
        "editorInitialState",
        JSON.stringify(initialState),
      );

      console.log("💾 [EDITOR PAGE] Estado inicial preparado:", initialState);

      setIsLoading(false);
    } catch (error) {
      console.error("❌ [EDITOR PAGE] Erro geral:", error);
      setError("Erro ao processar gravação");
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    sessionStorage.removeItem("editorInitialState");
    router.push("/");
  };

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
          <p className="text-slate-600 font-medium">Carregando editor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md">
          <h2 className="text-xl font-bold text-slate-900 mb-2">Erro</h2>
          <p className="text-slate-600 mb-4">{error}</p>
          <button
            onClick={() => router.push("/")}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Voltar para Home
          </button>
        </div>
      </div>
    );
  }

  if (!editModeRecordings || !recording) {
    return null;
  }

  // Layout padrão para quando não houver editConfig
  const defaultLayout = {
    cameraShape: "HORIZONTAL" as any,
    cameraSize: "MEDIUM" as any,
    background: "GRADIENT_1" as any,
    border: "ROUNDED" as any,
    shadow: "SOFT" as any,
    cameraTransform: {
      x: 0.73,
      y: 0.65,
      width: 0.25,
      height: 0.3,
      aspectRatio: 16 / 9,
    },
    screenTransform: {
      x: 0.5,
      y: 0.5,
      width: 1,
      height: 1,
      aspectRatio: 16 / 9,
    },
  };

  // Recuperar estado inicial
  const storedState = sessionStorage.getItem("editorInitialState");
  let initialState = null;

  if (storedState) {
    try {
      initialState = JSON.parse(storedState);
      console.log("📋 [EDITOR PAGE] Estado inicial carregado:", initialState);
    } catch (e) {
      console.warn("⚠️ [EDITOR PAGE] Erro ao parsear estado inicial:", e);
    }
  }

  console.log("🚀 [EDITOR PAGE] Renderizando Editor com:", {
    recordingId: recordingId,
    hasRecordings: !!editModeRecordings,
    recordingsDuration: editModeRecordings?.duration,
    hasEditConfig: !!initialState?.editConfig,
    editConfig: initialState?.editConfig,
  });

  // Usar layoutConfig salvo ou default
  const initialLayout = initialState?.editConfig?.layoutConfig || defaultLayout;
  const initialActions = initialState?.editConfig?.actions || [];
  const initialMetadata = initialState?.editConfig?.metadata || {
    name: recording.title,
  };
  const initialVolumes = initialState?.editConfig?.volumes;

  console.log("🎬 [EDITOR PAGE] Valores iniciais:", {
    hasLayoutConfig: !!initialState?.editConfig?.layoutConfig,
    actionsCount: initialActions.length,
    hasVolumes: !!initialVolumes,
  });

  return (
    <Editor
      recordings={editModeRecordings}
      initialLayoutConfig={initialLayout}
      recordingId={recordingId}
      initialActions={initialActions}
      initialMetadata={initialMetadata}
      initialVolumes={initialVolumes}
      onClose={handleClose}
    />
  );
}

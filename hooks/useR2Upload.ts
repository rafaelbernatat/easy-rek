"use client";

import { useState } from "react";
import { saveRecordingAction } from "@/app/actions/recordings";

interface UploadToR2Params {
  blob: Blob;
  fileName: string;
  title: string;
  duration: number;
  thumbnailBlob?: Blob; // Optional thumbnail blob
  cameraBlob?: Blob; // Optional camera source
  screenBlob?: Blob; // Optional screen source
}

export function useR2Upload() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const uploadToR2 = async ({
    blob,
    fileName,
    title,
    duration,
    thumbnailBlob,
    cameraBlob,
    screenBlob,
  }: UploadToR2Params) => {
    console.log("🚀 [R2 UPLOAD] Iniciando upload...");
    console.log("🚀 [R2 UPLOAD] Parâmetros:", {
      fileName,
      title,
      duration,
      blobSize: blob.size,
      blobType: blob.type,
      hasThumbnail: !!thumbnailBlob,
      hasCamera: !!cameraBlob,
      hasScreen: !!screenBlob,
    });

    setIsUploading(true);
    setUploadProgress(0);
    setUploadError(null);

    try {
      // Step 1: Get presigned URL from API for video
      console.log(
        "🚀 [R2 UPLOAD] Etapa 1: Solicitando presigned URL para vídeo...",
      );
      setUploadProgress(10);
      const response = await fetch("/api/upload/presigned", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          fileName,
          contentType: blob.type,
          fileType: "video",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to get upload URL");
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to get upload URL");
      }

      const { uploadUrl, key } = data;
      console.log("🚀 [R2 UPLOAD] ✅ Presigned URL obtida");
      console.log("🚀 [R2 UPLOAD] Video key:", key);
      setUploadProgress(15);

      // Step 2: Upload thumbnail if provided
      let thumbnailKey: string | undefined;
      if (thumbnailBlob) {
        console.log("🚀 [R2 UPLOAD] Etapa 2a: Fazendo upload da thumbnail...");
        const thumbnailFileName = `thumb-${Date.now()}.jpg`;
        const thumbResponse = await fetch("/api/upload/presigned", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            fileName: thumbnailFileName,
            contentType: "image/jpeg",
            fileType: "thumbnail",
          }),
        });

        if (!thumbResponse.ok) {
          console.warn(
            "Failed to get thumbnail upload URL, continuing without thumbnail",
          );
        } else {
          const thumbData = await thumbResponse.json();
          if (thumbData.success) {
            const { uploadUrl: thumbUploadUrl, key: thumbKey } = thumbData;
            thumbnailKey = thumbKey;

            const thumbUpload = await fetch(thumbUploadUrl, {
              method: "PUT",
              body: thumbnailBlob,
              headers: {
                "Content-Type": "image/jpeg",
              },
            });

            if (thumbUpload.ok) {
              console.log("🚀 [R2 UPLOAD] ✅ Thumbnail enviada com sucesso");
            } else {
              console.warn("Failed to upload thumbnail, continuing without it");
              thumbnailKey = undefined;
            }
          }
        }
        setUploadProgress(35);
      }

      // Step 3: Upload video to R2 using presigned URL
      console.log("🚀 [R2 UPLOAD] Etapa 3: Fazendo upload do vídeo para R2...");
      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        body: blob,
        headers: {
          "Content-Type": blob.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload video to R2");
      }

      console.log("🚀 [R2 UPLOAD] ✅ Upload para R2 concluído");
      setUploadProgress(50);

      // Step 3b: Upload camera source if provided
      let cameraKey: string | undefined;
      if (cameraBlob) {
        console.log(
          "🚀 [R2 UPLOAD] Etapa 3b: Fazendo upload da fonte da câmera...",
        );
        const cameraFileName = `camera-${Date.now()}.webm`;
        const cameraResponse = await fetch("/api/upload/presigned", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            fileName: cameraFileName,
            contentType: cameraBlob.type,
            fileType: "camera",
          }),
        });

        if (cameraResponse.ok) {
          const cameraData = await cameraResponse.json();
          if (cameraData.success) {
            const { uploadUrl: cameraUploadUrl, key: camKey } = cameraData;
            cameraKey = camKey;

            const camUpload = await fetch(cameraUploadUrl, {
              method: "PUT",
              body: cameraBlob,
              headers: {
                "Content-Type": cameraBlob.type,
              },
            });

            if (camUpload.ok) {
              console.log("🚀 [R2 UPLOAD] ✅ Fonte da câmera enviada");
            } else {
              console.warn("Failed to upload camera source");
              cameraKey = undefined;
            }
          }
        }
        setUploadProgress(60);
      }

      // Step 3c: Upload screen source if provided
      let screenKey: string | undefined;
      if (screenBlob) {
        console.log(
          "🚀 [R2 UPLOAD] Etapa 3c: Fazendo upload da fonte da tela...",
        );
        const screenFileName = `screen-${Date.now()}.webm`;
        const screenResponse = await fetch("/api/upload/presigned", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            fileName: screenFileName,
            contentType: screenBlob.type,
            fileType: "screen",
          }),
        });

        if (screenResponse.ok) {
          const screenData = await screenResponse.json();
          if (screenData.success) {
            const { uploadUrl: screenUploadUrl, key: scrKey } = screenData;
            screenKey = scrKey;

            const scrUpload = await fetch(screenUploadUrl, {
              method: "PUT",
              body: screenBlob,
              headers: {
                "Content-Type": screenBlob.type,
              },
            });

            if (scrUpload.ok) {
              console.log("🚀 [R2 UPLOAD] ✅ Fonte da tela enviada");
            } else {
              console.warn("Failed to upload screen source");
              screenKey = undefined;
            }
          }
        }
        setUploadProgress(70);
      }

      // Step 4: Save metadata to database
      console.log("🚀 [R2 UPLOAD] Etapa 4: Salvando metadata no banco...");
      const metadataPayload = {
        title,
        videoKey: key,
        cameraKey,
        screenKey,
        thumbnailKey,
        duration,
        size: blob.size,
      };
      console.log(
        "🚀 [R2 UPLOAD] Payload para server action:",
        metadataPayload,
      );

      const result = await saveRecordingAction(metadataPayload);

      console.log("🚀 [R2 UPLOAD] Resposta da server action:", result);

      if (!result.success) {
        throw new Error(result.error || "Failed to save recording metadata");
      }

      console.log("🚀 [R2 UPLOAD] ✅ Upload completo com sucesso!");
      setUploadProgress(100);
      setIsUploading(false);

      return {
        success: true,
        recording: result.recording,
      };
    } catch (error) {
      console.error("🚀 [R2 UPLOAD] ❌ ERRO:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown upload error";
      setUploadError(errorMessage);
      setIsUploading(false);

      return {
        success: false,
        error: errorMessage,
      };
    }
  };

  return {
    uploadToR2,
    isUploading,
    uploadProgress,
    uploadError,
  };
}

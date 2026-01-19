/**
 * Generate a thumbnail from a video blob
 * @param videoBlob - The video blob to extract the thumbnail from
 * @param quality - JPEG quality (0-1), default 0.8
 * @returns Promise<Blob> - The thumbnail as a JPEG blob
 */
export async function generateThumbnailFromVideo(
  videoBlob: Blob,
  quality: number = 0.8,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      reject(new Error("Could not get canvas context"));
      return;
    }

    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;

    const videoUrl = URL.createObjectURL(videoBlob);
    video.src = videoUrl;

    video.onloadedmetadata = () => {
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Seek to first frame (0.1 seconds to ensure we get a frame)
      video.currentTime = 0.1;
    };

    video.onseeked = () => {
      try {
        // Draw the current frame to canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Convert canvas to blob
        canvas.toBlob(
          (blob) => {
            // Cleanup
            URL.revokeObjectURL(videoUrl);

            if (blob) {
              resolve(blob);
            } else {
              reject(new Error("Failed to create thumbnail blob"));
            }
          },
          "image/jpeg",
          quality,
        );
      } catch (error) {
        URL.revokeObjectURL(videoUrl);
        reject(error);
      }
    };

    video.onerror = () => {
      URL.revokeObjectURL(videoUrl);
      reject(new Error("Failed to load video"));
    };
  });
}

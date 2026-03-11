/**
 * mp4Encoder.ts
 *
 * Wrapper around FFmpeg.wasm for converting WebM blobs to MP4.
 * FFmpeg is loaded lazily on first use to avoid bloating the initial bundle.
 */

import { FFmpeg } from '@ffmpeg/ffmpeg';

let ffmpegInstance: FFmpeg | null = null;
let loadPromise: Promise<FFmpeg> | null = null;

/**
 * Lazily load and return the shared FFmpeg instance.
 */
async function getFFmpeg(
  onProgress?: (message: string) => void,
): Promise<FFmpeg> {
  if (ffmpegInstance) return ffmpegInstance;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    onProgress?.('Loading FFmpeg...');
    const ffmpeg = new FFmpeg();
    
    // Listen to FFmpeg logs to debug why it freezes at 0%
    ffmpeg.on('log', ({ message }) => {
      console.log('[FFmpeg Log]:', message);
    });

    // Load the core from CDN using the UMD version, NOT ESM!
    // Next.js/Webpack intercepts dynamic import() for ESM and crashes on blob: URLs.
    const { toBlobURL } = await import('@ffmpeg/util');
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });

    ffmpegInstance = ffmpeg;
    onProgress?.('FFmpeg ready');
    return ffmpeg;
  })();

  return loadPromise;
}

export interface ConvertOptions {
  /** Target width in pixels */
  width?: number;
  /** Target height in pixels */
  height?: number;
  /** Progress callback: 0 to 1 */
  onProgress?: (ratio: number) => void;
  /** Status message callback */
  onStatus?: (message: string) => void;
}

/**
 * Convert a WebM blob to MP4.
 *
 * Optionally re-encodes at a specific resolution.
 * Returns the resulting MP4 Blob.
 */
export async function convertToMp4(
  webmBlob: Blob,
  options: ConvertOptions = {},
): Promise<Blob> {
  const { width, height, onProgress, onStatus } = options;

  const ffmpeg = await getFFmpeg(onStatus);

  // Set up progress listener
  if (onProgress) {
    ffmpeg.on('progress', ({ progress }) => {
      onProgress(Math.min(1, Math.max(0, progress)));
    });
  }

  onStatus?.('Writing input file...');

  // Write input WebM to virtual filesystem - bypass fetchFile to avoid blob URL resolution bugs
  const arrayBuffer = await webmBlob.arrayBuffer();
  const inputData = new Uint8Array(arrayBuffer);
  await ffmpeg.writeFile('input.webm', inputData);

  onStatus?.('Converting to MP4...');

  // Build FFmpeg command.
  // Chrome MediaRecorder WebM blobs lack duration and have timestamp issues which causes 
  // ffmpeg.wasm to hang on frame 1. We fix this by parsing it asynchronously and ignoring audio if it doesn't exist.
  const args = [
    '-analyzeduration', '2147483647', // Give FFmpeg more time to figure out the file
    '-probesize', '2147483647',
    '-i', 'input.webm'
  ];

  if (width && height) {
    // Re-encode with resolution scaling
    args.push(
      '-vf', `scale=${width}:${height}`,
      '-c:v', 'libx264',
      '-preset', 'ultrafast', // ultrafast to avoid hanging on slow CPU
      '-crf', '28',           // lower quality slightly for web
      '-c:a', 'aac',
      '-strict', 'experimental',
      '-fps_mode', 'vfr'      // Important: fixes Chrome WebM timestamp stalling
    );
  } else {
    // Transcode without scaling
    args.push(
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-crf', '28',
      '-c:a', 'aac',
      '-strict', 'experimental',
      '-fps_mode', 'vfr'
    );
  }

  args.push('-movflags', '+faststart', 'output.mp4');

  await ffmpeg.exec(args);

  onStatus?.('Reading output...');

  // Read the output — readFile returns string | Uint8Array, we force Uint8Array
  const outputData = await ffmpeg.readFile('output.mp4');
  // Create a fresh copy to guarantee a plain ArrayBuffer (not SharedArrayBuffer)
  const uint8 = new Uint8Array(outputData as Uint8Array);
  const mp4Blob = new Blob([uint8.buffer as ArrayBuffer], { type: 'video/mp4' });

  // Cleanup virtual filesystem
  await ffmpeg.deleteFile('input.webm');
  await ffmpeg.deleteFile('output.mp4');

  onStatus?.('Done!');

  return mp4Blob;
}

/**
 * Convert a WebM blob to MP4 at a specific resolution.
 * Convenience wrapper around convertToMp4.
 */
export async function convertToMp4WithResolution(
  webmBlob: Blob,
  width: number,
  height: number,
  onProgress?: (ratio: number) => void,
  onStatus?: (message: string) => void,
): Promise<Blob> {
  return convertToMp4(webmBlob, { width, height, onProgress, onStatus });
}

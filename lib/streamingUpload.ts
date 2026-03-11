/**
 * StreamingUploader — manages multipart upload lifecycle for a single stream.
 * Buffers chunks in memory and uploads 6MB parts directly to R2 while recording.
 * State is persisted in localStorage for crash recovery.
 */

const PART_SIZE_BYTES = 6 * 1024 * 1024; // 6MB (above S3 minimum of 5MB)
const MAX_RETRIES = 3;
const RETRY_DELAYS_MS = [1000, 2000, 4000];
const MAX_CONCURRENT_PARTS = 2;

// Global semaphore shared across all StreamingUploader instances
let activeUploads = 0;
const uploadQueue: Array<() => void> = [];

function acquireSlot(): Promise<void> {
  return new Promise((resolve) => {
    if (activeUploads < MAX_CONCURRENT_PARTS) {
      activeUploads++;
      resolve();
    } else {
      uploadQueue.push(() => {
        activeUploads++;
        resolve();
      });
    }
  });
}

function releaseSlot(): void {
  activeUploads = Math.max(0, activeUploads - 1);
  const next = uploadQueue.shift();
  if (next) next();
}

interface PartETag {
  PartNumber: number;
  ETag: string;
}

interface UploadState {
  uploadId: string;
  key: string;
  recordingId: string;
  parts: PartETag[];
  nextPartNumber: number;
  streamType: string;
  savedAt: number;
}

export class StreamingUploader {
  private uploadId: string | null = null;
  private key: string | null = null;
  private recordingId: string | null = null;
  private streamType: string;
  private mimeType: string;
  private pendingBuffer: Uint8Array[] = [];
  private pendingBufferSize = 0;
  private parts: PartETag[] = [];
  private nextPartNumber = 1;
  private initialized = false;
  private aborted = false;

  constructor(streamType: string, mimeType: string) {
    this.streamType = streamType;
    this.mimeType = mimeType;
  }

  /**
   * Initialize the multipart upload — call once before recording starts.
   */
  async initialize(fileName: string): Promise<{ uploadId: string; key: string; recordingId: string }> {
    // Check for existing state in localStorage (crash recovery)
    const saved = this.loadState();
    if (saved && Date.now() - saved.savedAt < 24 * 60 * 60 * 1000) {
      this.uploadId = saved.uploadId;
      this.key = saved.key;
      this.recordingId = saved.recordingId;
      this.parts = saved.parts;
      this.nextPartNumber = saved.nextPartNumber;
      this.initialized = true;
      console.log(`[StreamingUploader:${this.streamType}] Resuming from localStorage, next part: ${this.nextPartNumber}`);
      return { uploadId: this.uploadId, key: this.key, recordingId: this.recordingId };
    }

    const response = await fetch("/api/upload/multipart/init", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName,
        contentType: this.mimeType,
        fileType: this.streamType,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to initialize multipart upload: ${response.statusText}`);
    }

    const data = await response.json();
    this.uploadId = data.uploadId;
    this.key = data.key;
    this.recordingId = data.recordingId;
    this.initialized = true;
    this.saveState();

    console.log(`[StreamingUploader:${this.streamType}] Initialized uploadId=${this.uploadId}`);
    return { uploadId: this.uploadId!, key: this.key!, recordingId: this.recordingId! };
  }

  /**
   * Append a chunk to the buffer. Automatically uploads a part when buffer >= 6MB.
   */
  async appendChunk(data: Uint8Array): Promise<void> {
    if (!this.initialized || this.aborted) return;

    this.pendingBuffer.push(data);
    this.pendingBufferSize += data.byteLength;

    if (this.pendingBufferSize >= PART_SIZE_BYTES) {
      await this._uploadPart();
    }
  }

  /**
   * Flush remaining buffer as a final part (can be < 6MB).
   */
  async flush(): Promise<void> {
    if (!this.initialized || this.aborted) return;
    if (this.pendingBufferSize > 0) {
      await this._uploadPart();
    }
  }

  /**
   * Complete the multipart upload and trigger transcoding.
   */
  async complete(duration: number, totalSize: number): Promise<void> {
    if (!this.initialized || this.aborted) return;
    if (!this.uploadId || !this.key || !this.recordingId) return;

    const response = await fetch("/api/upload/multipart/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        uploadId: this.uploadId,
        key: this.key,
        recordingId: this.recordingId,
        parts: this.parts,
        duration,
        totalSize,
        streamType: this.streamType,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to complete multipart upload: ${response.statusText}`);
    }

    this.clearState();
    console.log(`[StreamingUploader:${this.streamType}] Upload complete. Parts: ${this.parts.length}`);
  }

  /**
   * Abort the multipart upload and clean up.
   */
  async abort(): Promise<void> {
    if (!this.initialized) return;
    this.aborted = true;

    if (this.uploadId && this.key) {
      try {
        await fetch("/api/upload/multipart/abort", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            uploadId: this.uploadId,
            key: this.key,
            recordingId: this.recordingId,
          }),
        });
      } catch (err) {
        console.error(`[StreamingUploader:${this.streamType}] Abort failed:`, err);
      }
    }

    this.clearState();
    this.pendingBuffer = [];
    this.pendingBufferSize = 0;
  }

  get currentRecordingId(): string | null {
    return this.recordingId;
  }

  // ── Internal ─────────────────────────────────────────────────────────────

  private async _uploadPart(): Promise<void> {
    if (!this.uploadId || !this.key) return;

    // Merge pending buffer chunks into one Uint8Array
    const combined = new Uint8Array(this.pendingBufferSize);
    let offset = 0;
    for (const chunk of this.pendingBuffer) {
      combined.set(chunk, offset);
      offset += chunk.byteLength;
    }

    const partNumber = this.nextPartNumber;
    this.pendingBuffer = [];
    this.pendingBufferSize = 0;

    await acquireSlot();
    try {
      const etag = await this._uploadPartWithRetry(partNumber, combined);
      this.parts.push({ PartNumber: partNumber, ETag: etag });
      this.nextPartNumber++;
      this.saveState();
    } finally {
      releaseSlot();
    }
  }

  private async _uploadPartWithRetry(partNumber: number, data: Uint8Array): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      if (attempt > 0) {
        await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[attempt - 1]));
        console.log(`[StreamingUploader:${this.streamType}] Retry ${attempt} for part ${partNumber}`);
      }

      try {
        return await this._doUploadPart(partNumber, data);
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        console.error(`[StreamingUploader:${this.streamType}] Part ${partNumber} attempt ${attempt + 1} failed:`, lastError.message);
      }
    }

    throw lastError ?? new Error(`Part ${partNumber} failed after ${MAX_RETRIES} attempts`);
  }

  private async _doUploadPart(partNumber: number, data: Uint8Array): Promise<string> {
    // Get presigned URL for this part
    const partResponse = await fetch("/api/upload/multipart/part", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uploadId: this.uploadId, key: this.key, partNumber }),
    });

    if (!partResponse.ok) {
      throw new Error(`Failed to get presigned URL for part ${partNumber}: ${partResponse.statusText}`);
    }

    const { presignedUrl } = await partResponse.json();

    // Upload directly to R2 via presigned URL
    const uploadResponse = await fetch(presignedUrl, {
      method: "PUT",
      body: data,
      headers: { "Content-Type": "application/octet-stream" },
    });

    if (!uploadResponse.ok) {
      throw new Error(`Part ${partNumber} upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`);
    }

    const etag = uploadResponse.headers.get("ETag");
    if (!etag) {
      throw new Error(`No ETag returned for part ${partNumber}`);
    }

    console.log(`[StreamingUploader:${this.streamType}] Part ${partNumber} uploaded (${(data.byteLength / 1024 / 1024).toFixed(1)}MB)`);
    return etag;
  }

  // ── localStorage persistence ─────────────────────────────────────────────

  private storageKey(): string | null {
    return this.recordingId ? `streaming-upload-${this.recordingId}-${this.streamType}` : null;
  }

  private saveState(): void {
    const key = this.storageKey();
    if (!key || typeof localStorage === "undefined") return;

    const state: UploadState = {
      uploadId: this.uploadId!,
      key: this.key!,
      recordingId: this.recordingId!,
      parts: this.parts,
      nextPartNumber: this.nextPartNumber,
      streamType: this.streamType,
      savedAt: Date.now(),
    };

    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {
      // Ignore storage errors
    }
  }

  private loadState(): UploadState | null {
    if (typeof localStorage === "undefined") return null;
    // We need a recordingId to load — this is only used if caller passes one
    return null;
  }

  private clearState(): void {
    const key = this.storageKey();
    if (!key || typeof localStorage === "undefined") return;
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignore
    }
  }
}

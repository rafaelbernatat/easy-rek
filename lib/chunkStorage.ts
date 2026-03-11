/**
 * chunkStorage.ts
 *
 * Manages recording chunks via IndexedDB to prevent memory overflow
 * during long recordings. Chunks are periodically flushed from RAM
 * to IndexedDB, then assembled into a single Blob when recording stops.
 */

const DB_NAME = 'easy-rek-chunks';
const DB_VERSION = 1;
const STORE_NAME = 'chunks';

interface ChunkEntry {
  key: string; // e.g. "screen-0", "camera-1"
  streamName: string;
  chunkIndex: number;
  blob: Blob;
  timestamp: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'key' });
        store.createIndex('streamName', 'streamName', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Save a chunk blob to IndexedDB for the given stream.
 */
export async function saveChunk(
  streamName: string,
  chunkIndex: number,
  blob: Blob,
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const entry: ChunkEntry = {
      key: `${streamName}-${chunkIndex}`,
      streamName,
      chunkIndex,
      blob,
      timestamp: Date.now(),
    };
    const req = store.put(entry);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

/**
 * Assemble all saved chunks for a stream into a single Blob.
 * Returns the assembled blob (or undefined if no chunks exist).
 */
export async function assembleStream(
  streamName: string,
  mimeType: string = 'video/webm',
): Promise<Blob | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('streamName');
    const range = IDBKeyRange.only(streamName);
    const req = index.getAll(range);

    req.onsuccess = () => {
      const entries = req.result as ChunkEntry[];
      if (entries.length === 0) {
        resolve(undefined);
        return;
      }
      // Sort by chunkIndex to ensure correct order
      entries.sort((a, b) => a.chunkIndex - b.chunkIndex);
      const blob = new Blob(
        entries.map((e) => e.blob),
        { type: mimeType },
      );
      resolve(blob);
    };

    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

/**
 * Clear all chunks for a specific stream.
 */
export async function clearStream(streamName: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('streamName');
    const range = IDBKeyRange.only(streamName);
    const cursorReq = index.openCursor(range);

    cursorReq.onsuccess = () => {
      const cursor = cursorReq.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };

    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Clear ALL chunks from all streams.
 */
export async function clearAllChunks(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.clear();
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}

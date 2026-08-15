import { openDB } from 'idb';
import type { DBSchema, IDBPDatabase } from 'idb';

export interface FileMetadata {
  id: string;
  name: string;
  type: 'file' | 'folder' | 'album';
  mime?: string;
  size?: number;
  modified: string;
  starred: boolean;
  encrypted: boolean;
  items?: number; // for folders/albums
  isTrash?: boolean;
  chunkCount?: number;
  albumIds?: string[];
  coverId?: string;
}

export interface FileChunk {
  id: string; // usually chunk_id
  fileId: string;
  chunkIndex: number;
  data: Blob;
}

interface ChuChuduDB extends DBSchema {
  files: {
    key: string;
    value: FileMetadata;
    indexes: { 'by-date': string };
  };
  chunks: {
    key: string;
    value: FileChunk;
    indexes: { 'by-fileId': string; 'by-fileId-index': [string, number] };
  };
}

let dbPromise: Promise<IDBPDatabase<ChuChuduDB>> | null = null;

export async function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<ChuChuduDB>('chuchudu-local-db', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('files')) {
          const filesStore = db.createObjectStore('files', { keyPath: 'id' });
          filesStore.createIndex('by-date', 'modified');
        }
        if (!db.objectStoreNames.contains('chunks')) {
          const chunksStore = db.createObjectStore('chunks', { keyPath: 'id' });
          chunksStore.createIndex('by-fileId', 'fileId');
          chunksStore.createIndex('by-fileId-index', ['fileId', 'chunkIndex']);
        }
      },
    });
  }
  return dbPromise;
}

export async function saveFileMetadata(metadata: FileMetadata) {
  const db = await getDB();
  await db.put('files', metadata);
}

export async function getFileMetadata(id: string) {
  const db = await getDB();
  return db.get('files', id);
}

export async function getAllFiles() {
  const db = await getDB();
  return db.getAllFromIndex('files', 'by-date');
}

export async function deleteFileMetadata(id: string) {
  const db = await getDB();
  await db.delete('files', id);
}

export async function saveFileChunk(chunk: FileChunk) {
  const db = await getDB();
  await db.put('chunks', chunk);
}

export async function getFileChunks(fileId: string) {
  const db = await getDB();
  // Fetch chunks and sort by index
  const chunks = await db.getAllFromIndex('chunks', 'by-fileId', fileId);
  return chunks.sort((a, b) => a.chunkIndex - b.chunkIndex);
}

export async function deleteFileChunks(fileId: string) {
  const db = await getDB();
  const tx = db.transaction('chunks', 'readwrite');
  const index = tx.store.index('by-fileId');
  
  let cursor = await index.openCursor(fileId);
  while (cursor) {
    await cursor.delete();
    cursor = await cursor.continue();
  }
  await tx.done;
}

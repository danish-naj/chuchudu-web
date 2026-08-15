import { db } from '../config/firebase';
import { collection, doc, setDoc, deleteDoc, getDoc, getDocs } from 'firebase/firestore';
import type { FileMetadata } from './indexedDB';

// Convert ArrayBuffer to Base64 to store in Firestore safely
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Convert Base64 back to ArrayBuffer
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary_string = window.atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes.buffer;
}

export async function syncMetadataToFirestore(uid: string, metadata: FileMetadata & { wrappedKey?: ArrayBuffer | string }) {
  const docRef = doc(db, `users/${uid}/files/${metadata.id}`);
  
  // Clone to avoid mutating local IndexedDB copy
  const payload = { ...metadata };
  if (payload.wrappedKey && payload.wrappedKey instanceof ArrayBuffer) {
    payload.wrappedKey = arrayBufferToBase64(payload.wrappedKey);
  }
  
  await setDoc(docRef, payload);
}

export async function deleteMetadataFromFirestore(uid: string, fileId: string) {
  const docRef = doc(db, `users/${uid}/files/${fileId}`);
  await deleteDoc(docRef);
}

export async function uploadChunkToStorage(uid: string, fileId: string, chunkIndex: number, data: Blob) {
  const arrayBuffer = await data.arrayBuffer();
  const base64Data = arrayBufferToBase64(arrayBuffer);
  
  // Save chunk to Firestore instead of Firebase Storage to avoid CORS & Billing limits
  const chunkDocRef = doc(db, `users/${uid}/chunks/${fileId}_${chunkIndex}`);
  await setDoc(chunkDocRef, {
    fileId,
    chunkIndex,
    data: base64Data
  });
}

export async function downloadChunkFromStorage(uid: string, fileId: string, chunkIndex: number): Promise<Blob> {
  const chunkDocRef = doc(db, `users/${uid}/chunks/${fileId}_${chunkIndex}`);
  const snap = await getDoc(chunkDocRef);
  
  if (!snap.exists()) {
    throw new Error(`Chunk ${chunkIndex} not found in Firestore for file ${fileId}`);
  }
  
  const base64Data = snap.data().data;
  const arrayBuffer = base64ToArrayBuffer(base64Data);
  return new Blob([arrayBuffer]);
}

export async function deleteChunksFromStorage(uid: string, fileId: string) {
  try {
    // Note: Since Firestore doesn't support deleting multiple docs easily without a batch query
    // and we might not know how many chunks exist exactly if the metadata is deleted,
    // we should ideally query the chunks collection for fileId and delete them in a batch.
    // For now, we will query all chunks in the user's chunk collection and delete matching ones.
    const chunksRef = collection(db, `users/${uid}/chunks`);
    const querySnapshot = await getDocs(chunksRef);
    
    const deletePromises: Promise<void>[] = [];
    querySnapshot.forEach((docSnap) => {
      if (docSnap.data().fileId === fileId) {
        deletePromises.push(deleteDoc(docSnap.ref));
      }
    });
    
    await Promise.all(deletePromises);
  } catch (err) {
    console.error("Error deleting chunks from Firestore", err);
  }
}

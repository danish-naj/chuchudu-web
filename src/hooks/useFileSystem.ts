import { useState, useCallback, useEffect } from 'react';

import {
  saveFileMetadata,
  getFileMetadata,
  getAllFiles,
  deleteFileMetadata,
  saveFileChunk,
  getFileChunks,
  deleteFileChunks
} from '../db/indexedDB';
import type { FileMetadata } from '../db/indexedDB';
import {
  generateFileKey,
  encryptFile,
  decryptFile,
} from '../crypto/encryption';
import { 
  setupMasterKey, 
  unlockMasterKey, 
  getMasterKey, 
  wrapFileKey, 
  unwrapFileKey, 
  isVaultUnlocked,
  getStoredSalt,
  clearKeyStore
} from '../crypto/keyManager';
import { useTransfers } from '../context/TransferContext';
import { useAuth } from '../context/AuthContext';
import { db } from '../config/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { 
  syncMetadataToFirestore, 
  uploadChunkToStorage, 
  downloadChunkFromStorage, 
  deleteMetadataFromFirestore, 
  deleteChunksFromStorage,
  base64ToArrayBuffer
} from '../db/firebaseSync';
import { p2pClient } from '../services/p2pClient';
import { useDrive } from '../context/DriveContext';

export function useFileSystem() {
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { addTransfer, updateTransferProgress, updateTransferStatus } = useTransfers();
  const { currentUser } = useAuth();
  const { driveClient } = useDrive();

  const refreshFiles = useCallback(async () => {
    try {
      setLoading(true);
      const allFiles = await getAllFiles();
      allFiles.sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime());
      setFiles(allFiles);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initVault = async () => {
      try {
        const unlocked = await isVaultUnlocked();
        if (!unlocked || currentUser) {
          const tempPassphrase = "dev-default-passphrase";
          
          let deterministicSalt: Uint8Array | undefined = undefined;
          if (currentUser) {
             const encoder = new TextEncoder();
             const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(currentUser.uid));
             // Salt must be 32 bytes as defined in keyManager
             deterministicSalt = new Uint8Array(hashBuffer).slice(0, 32);
             
             const storedSalt = await getStoredSalt();
             let needsReset = false;
             
             if (storedSalt) {
                const storedHex = Array.from(new Uint8Array(storedSalt)).map(b => b.toString(16).padStart(2, '0')).join('');
                const newHex = Array.from(deterministicSalt).map(b => b.toString(16).padStart(2, '0')).join('');
                if (storedHex !== newHex) needsReset = true;
             } else {
                needsReset = true;
             }
             
             if (needsReset) {
                await clearKeyStore();
                await setupMasterKey(tempPassphrase, deterministicSalt);
                await refreshFiles();
                return;
             }
          }
          
          if (!unlocked) {
             try {
               await setupMasterKey(tempPassphrase, deterministicSalt);
             } catch(e) {
               const salt = await getStoredSalt();
               if (salt) {
                 await unlockMasterKey(tempPassphrase, salt);
               }
             }
          }
        }
        await refreshFiles();
      } catch (err: any) {
        setError(err.message);
      }
    };
    initVault();
  }, [currentUser, refreshFiles]);

  // Firestore Metadata Sync Listener
  useEffect(() => {
    if (!currentUser) return;
    
    const unsubscribe = onSnapshot(collection(db, `users/${currentUser.uid}/files`), async (snapshot) => {
      let changed = false;
      
      for (const change of snapshot.docChanges()) {
        const data = change.doc.data() as FileMetadata;
        if (change.type === 'added' || change.type === 'modified') {
          await saveFileMetadata(data);
          changed = true;
        }
        if (change.type === 'removed') {
          await deleteFileMetadata(change.doc.id);
          changed = true;
        }
      }
      
      if (changed) {
        await refreshFiles();
        window.dispatchEvent(new Event('chuchudu-refresh'));
      }
    });

    return () => unsubscribe();
  }, [currentUser, refreshFiles]);



  useEffect(() => {
    const handleRefresh = () => refreshFiles();
    window.addEventListener('chuchudu-refresh', handleRefresh);
    return () => window.removeEventListener('chuchudu-refresh', handleRefresh);
  }, [refreshFiles]);

  const [p2pConnected, setP2pConnected] = useState(false);

  // P2P Sync Listener
  useEffect(() => {
    if (!currentUser) return;
    
    p2pClient.onConnect(async () => {
      setP2pConnected(true);
      try {
        const remoteFiles = await p2pClient.getFileList();
        const remoteMetadataList = Object.values(remoteFiles).map(f => ({
          ...f,
          type: 'file',
          encrypted: true
        })) as FileMetadata[];
        
        setFiles(remoteMetadataList);
      } catch (e) {
        console.error("Failed to fetch remote file list via P2P", e);
      }
    });
    
    p2pClient.onDisconnect(() => {
      setP2pConnected(false);
      refreshFiles(); // Fall back to local if disconnected
    });
    
    p2pClient.connect().catch(console.error);
    
  }, [currentUser, refreshFiles]);

  const uploadFile = useCallback(async (file: File) => {
    const fileId = crypto.randomUUID();
    try {
      addTransfer({
        id: fileId,
        name: file.name,
        type: 'upload',
        status: 'uploading',
        progress: 0,
        total: file.size
      });

      const masterKey = await getMasterKey();
      if (!masterKey) throw new Error("Vault is locked");

      const fileKey = await generateFileKey();
      const encryptedChunks = await encryptFile(file, fileKey);

      let uploadedBytes = 0;
      let totalEncryptedData = new Uint8Array(0);
      
      for (let i = 0; i < encryptedChunks.length; i++) {
        // Collect chunks if we're going to send via P2P (for simplicity we merge them first)
        const oldLen = totalEncryptedData.length;
        const newArr = new Uint8Array(oldLen + encryptedChunks[i].size);
        newArr.set(totalEncryptedData, 0);
        const chunkBuf = await encryptedChunks[i].arrayBuffer();
        newArr.set(new Uint8Array(chunkBuf), oldLen);
        totalEncryptedData = newArr;
        
        if (!p2pClient.isConnected()) {
          await saveFileChunk({
            id: `${fileId}-chunk-${i}`,
            fileId,
            chunkIndex: i,
            data: encryptedChunks[i]
          });
          
          if (currentUser) {
            if (driveClient) {
               driveClient.getOrCreateBufferFolder().then(folderId => {
                  const chunkName = `${fileId}-chunk-${i}`;
                  return driveClient.uploadFile(encryptedChunks[i], chunkName, folderId);
               }).catch(err => {
                 console.error("Google Drive sync failed for chunk", i, err);
               });
            } else {
               uploadChunkToStorage(currentUser.uid, fileId, i, encryptedChunks[i]).catch(err => {
                 console.error("Cloud sync failed for chunk", i, err);
               });
            }
          }
        }
        
        uploadedBytes += encryptedChunks[i].size || 0;
        updateTransferProgress(fileId, Math.min(uploadedBytes, file.size));
      }

      if (p2pClient.isConnected()) {
         await p2pClient.uploadFile(fileId, file.name, file.type, file.size, totalEncryptedData.buffer, (pct) => {
           // We could update progress here but we already did it during chunking
         });
      }
      
      const wrappedKeyBuffer = await wrapFileKey(fileKey, masterKey);
      
      const metadata: FileMetadata & { wrappedKey?: ArrayBuffer } = {
        id: fileId,
        name: file.name,
        type: 'file',
        mime: file.type || 'application/octet-stream',
        size: file.size,
        modified: new Date().toISOString(),
        starred: false,
        encrypted: true,
        wrappedKey: wrappedKeyBuffer,
        chunkCount: encryptedChunks.length
      };

      await saveFileMetadata(metadata);
      
      // Sync metadata to cloud in the background (don't await)
      if (currentUser) {
        syncMetadataToFirestore(currentUser.uid, metadata).catch(err => {
          console.error("Cloud sync failed for metadata", err);
        });
      }
      
      await refreshFiles();
      window.dispatchEvent(new Event('chuchudu-refresh'));
      
      updateTransferStatus(fileId, 'completed');
      return metadata;
    } catch (err: any) {
      console.error("Upload failed", err);
      setError(err.message);
      updateTransferStatus(fileId, 'error', err.message);
      throw err;
    }
  }, [refreshFiles, addTransfer, updateTransferStatus, currentUser, driveClient]);

  const getFile = useCallback(async (fileId: string, setStatus?: (msg: string) => void) => {
    try {
      if (setStatus) setStatus('Getting master key...');
      const masterKey = await getMasterKey();
      if (!masterKey) throw new Error("Vault is locked");

      if (setStatus) setStatus('Getting file metadata...');
      const metadata = await getFileMetadata(fileId) as any;
      if (!metadata) throw new Error("File not found");

      if (metadata.wrappedKey) {
         if (setStatus) setStatus('Unwrapping file key...');
         const fileKey = await unwrapFileKey(metadata.wrappedKey, masterKey);
         
         if (setStatus) setStatus('Fetching local chunks...');
         let chunks = await getFileChunks(fileId);
         
         // If missing locally and connected to P2P, fetch from agent
         if (chunks.length === 0 && p2pClient.isConnected()) {
            if (setStatus) setStatus('Streaming from Desktop Agent...');
            const p2pData = await p2pClient.getFile(fileId, (pct) => {
              if (setStatus) setStatus(`Streaming... ${pct}%`);
            });
            chunks = [{
              id: `${fileId}-chunk-p2p`,
              fileId,
              chunkIndex: 0,
              data: new Blob([p2pData as any])
            }];
         }
         
         // If missing locally, fetch from Firebase
         if (chunks.length === 0 && currentUser && !p2pClient.isConnected()) {
            if (setStatus) setStatus('Downloading from cloud...');
            let i = 0;
            const targetCount = metadata.chunkCount || 999; // Fallback loop if missing
            while (i < targetCount) {
               try {
                 if (setStatus) setStatus(`Downloading chunk ${i+1}/${targetCount}...`);
                 const chunkBlob = await downloadChunkFromStorage(currentUser.uid, fileId, i);
                 await saveFileChunk({
                   id: `${fileId}-chunk-${i}`,
                   fileId,
                   chunkIndex: i,
                   data: chunkBlob
                 });
                 i++;
               } catch (err: any) {
                 if (i === 0) {
                   throw new Error("File is still syncing from the other device. Please try again in a few seconds.");
                 }
                 // If we successfully downloaded at least 1 chunk and there's no chunkCount, assume we hit the end
                 if (!metadata.chunkCount) break; 
                 throw new Error("File is still syncing or is corrupted. Please try again.");
               }
            }
            if (setStatus) setStatus('Re-fetching downloaded chunks...');
            chunks = await getFileChunks(fileId);
         }
         
         if (chunks.length === 0) throw new Error("File chunks not found locally or in cloud");
         
         if (setStatus) setStatus('Sorting chunks...');
         // Sort chunks by index to ensure proper decryption order
         chunks.sort((a, b) => a.chunkIndex - b.chunkIndex);

         if (setStatus) setStatus('Starting decryption...');
         const blobs = chunks.map(c => c.data);
         return await decryptFile(blobs, fileKey, metadata.name, metadata.mime || 'application/octet-stream', (pct) => {
            if (setStatus) setStatus(`Decrypting (${pct}%)...`);
         });
      } else {
         throw new Error("No encryption key found for this file");
      }
    } catch (err: any) {
      console.error("Get file failed", err);
      setError(err.message);
      throw err;
    }
  }, [currentUser]);

  const downloadFile = useCallback(async (fileId: string) => {
    try {
      const decryptedFile = await getFile(fileId);
      const url = URL.createObjectURL(decryptedFile);
      const a = document.createElement('a');
      a.href = url;
      a.download = decryptedFile.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      // error is handled by getFile
    }
  }, [getFile]);

  const deleteFile = useCallback(async (id: string) => {
    try {
      if (p2pClient.isConnected()) {
        // We'll just optimistically delete locally and send request
        p2pClient.peer?.send(JSON.stringify({ type: 'DELETE_REQUEST', fileId: id }));
      }
      
      await deleteFileChunks(id);
      await deleteFileMetadata(id);
      
      if (currentUser && !p2pClient.isConnected()) {
        deleteChunksFromStorage(currentUser.uid, id).catch(console.error);
        deleteMetadataFromFirestore(currentUser.uid, id).catch(console.error);
      }
      
      await refreshFiles();
      window.dispatchEvent(new Event('chuchudu-refresh'));
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [refreshFiles, currentUser]);

  const trashFile = useCallback(async (id: string) => {
    try {
      const metadata = await getFileMetadata(id);
      if (metadata) {
        metadata.isTrash = true;
        await saveFileMetadata(metadata);
        
        if (currentUser) {
          await syncMetadataToFirestore(currentUser.uid, metadata);
        }
        
        await refreshFiles();
        window.dispatchEvent(new Event('chuchudu-refresh'));
      }
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [refreshFiles, currentUser]);

  const restoreFile = useCallback(async (id: string) => {
    try {
      const metadata = await getFileMetadata(id);
      if (metadata) {
        metadata.isTrash = false;
        await saveFileMetadata(metadata);
        
        if (currentUser) {
          await syncMetadataToFirestore(currentUser.uid, metadata);
        }
        
        await refreshFiles();
        window.dispatchEvent(new Event('chuchudu-refresh'));
      }
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [refreshFiles, currentUser]);

  const getStorageStats = useCallback(async () => {
    const allFiles = await getAllFiles();
    return allFiles.reduce((acc, f) => acc + (f.size || 0), 0);
  }, []);

  const createAlbum = useCallback(async (name: string, coverId?: string) => {
    const albumId = crypto.randomUUID();
    const metadata: FileMetadata = {
      id: albumId,
      name,
      type: 'album',
      modified: new Date().toISOString(),
      starred: false,
      encrypted: false, // Standard metadata encryption hides the name
      coverId
    };
    
    try {
      await saveFileMetadata(metadata);
      if (currentUser) {
        syncMetadataToFirestore(currentUser.uid, metadata).catch(console.error);
      }
      await refreshFiles();
      window.dispatchEvent(new Event('chuchudu-refresh'));
      return metadata;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [refreshFiles, currentUser]);

  const addFileToAlbum = useCallback(async (fileId: string, albumId: string) => {
    try {
      const metadata = await getFileMetadata(fileId);
      if (metadata) {
        if (!metadata.albumIds) metadata.albumIds = [];
        if (!metadata.albumIds.includes(albumId)) {
          metadata.albumIds.push(albumId);
          await saveFileMetadata(metadata);
          if (currentUser) {
            await syncMetadataToFirestore(currentUser.uid, metadata);
          }
          await refreshFiles();
          window.dispatchEvent(new Event('chuchudu-refresh'));
        }
      }
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [refreshFiles, currentUser]);

  const removeFileFromAlbum = useCallback(async (fileId: string, albumId: string) => {
    try {
      const metadata = await getFileMetadata(fileId);
      if (metadata && metadata.albumIds) {
        metadata.albumIds = metadata.albumIds.filter(id => id !== albumId);
        await saveFileMetadata(metadata);
        if (currentUser) {
          await syncMetadataToFirestore(currentUser.uid, metadata);
        }
        await refreshFiles();
        window.dispatchEvent(new Event('chuchudu-refresh'));
      }
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [refreshFiles, currentUser]);

  const updateAlbumCover = useCallback(async (albumId: string, coverId: string) => {
    try {
      const metadata = await getFileMetadata(albumId);
      if (metadata && metadata.type === 'album') {
        metadata.coverId = coverId;
        await saveFileMetadata(metadata);
        if (currentUser) {
          await syncMetadataToFirestore(currentUser.uid, metadata);
        }
        await refreshFiles();
        window.dispatchEvent(new Event('chuchudu-refresh'));
      }
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [refreshFiles, currentUser]);

  return {
    files,
    loading,
    error,
    uploadFile,
    getFile,
    downloadFile,
    deleteFile,
    trashFile,
    restoreFile,
    getStorageStats,
    refreshFiles,
    createAlbum,
    addFileToAlbum,
    removeFileFromAlbum,
    updateAlbumCover,
    p2pConnected
  };
}

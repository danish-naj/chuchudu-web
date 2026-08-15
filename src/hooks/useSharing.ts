import { useState } from 'react';
import { useTransfers } from '../context/TransferContext';
import { getFileMetadata, getFileChunks } from '../db/indexedDB';
import { getMasterKey, unwrapFileKey } from '../crypto/keyManager';
import { useDrive } from '../context/DriveContext';

export function useSharing() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { addTransfer, updateTransferStatus, updateTransferProgress } = useTransfers();
  const { driveClient, isConnected } = useDrive();

  const shareFile = async (fileId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      if (!isConnected || !driveClient) {
        throw new Error("Please connect your Google Drive in Settings to share files for free.");
      }
      
      const metadata = await getFileMetadata(fileId) as any;
      if (!metadata) throw new Error("File not found");
      if (metadata.type === 'folder') throw new Error("Sharing folders is not supported yet.");
      if (!metadata.wrappedKey) throw new Error("This file was uploaded before Secure Sharing was enabled.");
      
      const masterKey = await getMasterKey();
      if (!masterKey) throw new Error("Vault is locked");

      const chunks = await getFileChunks(fileId);
      chunks.sort((a, b) => a.chunkIndex - b.chunkIndex);
      
      const fileKey = await unwrapFileKey(metadata.wrappedKey, masterKey, true);
      const rawKey = await crypto.subtle.exportKey('raw', fileKey);
      const base64Key = btoa(String.fromCharCode(...new Uint8Array(rawKey)));

      const combinedChunks = await Promise.all(chunks.map(async c => {
        const buffer = await c.data.arrayBuffer();
        return {
          index: c.chunkIndex,
          data: Array.from(new Uint8Array(buffer))
        };
      }));
      
      const payloadObj = {
        chunks: combinedChunks,
        name: metadata.name,
        mime: metadata.mime,
        size: metadata.size
      };

      const payloadBlob = new Blob([JSON.stringify(payloadObj)], { type: 'application/json' });
      
      const transferId = crypto.randomUUID();
      addTransfer({
        id: transferId,
        name: `Sharing ${metadata.name}`,
        type: 'share',
        status: 'uploading',
        progress: 0,
        total: payloadBlob.size
      });

      // Upload payload to Google Drive
      const folderId = await driveClient.getOrCreateBufferFolder();
      const driveFileId = await driveClient.uploadFile(payloadBlob, `shared_${metadata.name}.json`, folderId);
      updateTransferProgress(transferId, payloadBlob.size);
      
      // Make it public
      const publicId = await driveClient.makePublicAndGetLink(driveFileId);

      // Save metadata to RTDB for the download page
      const { ref, set } = await import('firebase/database');
      const { rtdb } = await import('../config/firebase');
      await set(ref(rtdb, `shares/${publicId}`), {
        file_name: metadata.name,
        mime_type: metadata.mime,
        size: metadata.size,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      });

      updateTransferStatus(transferId, 'completed');
      
      // Generate link (pointing to the frontend route with the Drive ID)
      const shareUrl = `${window.location.origin}/t/${publicId}#key=${base64Key}`;
      return shareUrl;

    } catch (err: any) {
      console.error(err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { shareFile, loading, error };
}

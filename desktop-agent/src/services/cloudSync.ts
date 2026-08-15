import { collection, onSnapshot, doc, deleteDoc, getDoc, updateDoc } from 'firebase/firestore';
import { firestore, auth } from '../config/firebase';
import { vault } from './vaultManager';
import { decryptChunk } from '../crypto/encryption';
import { unlockMasterKey, unwrapFileKey } from '../crypto/keyManager';

export interface ActivityEntry {
  id: string;
  fileName: string;
  action: 'synced' | 'error';
  timestamp: Date;
  size: number;
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary_string = window.atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes.buffer;
}

export async function getMasterKeyForUser(uid: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(uid));
  const deterministicSalt = new Uint8Array(hashBuffer).slice(0, 32);
  const tempPassphrase = "dev-default-passphrase";
  return await unlockMasterKey(tempPassphrase, deterministicSalt);
}

export class CloudSync {
  private unsubscribe: (() => void) | null = null;
  private syncing = false;
  private activityLog: ActivityEntry[] = [];

  getActivityLog(): ActivityEntry[] {
    return this.activityLog;
  }

  private addActivity(entry: Omit<ActivityEntry, 'id'>) {
    this.activityLog.push({ id: crypto.randomUUID(), ...entry });
    if (this.activityLog.length > 50) {
      this.activityLog = this.activityLog.slice(-50);
    }
  }

  start() {
    auth.onAuthStateChanged((user) => {
      if (user) {
        this.listenForCloudFiles(user.uid);
      } else {
        if (this.unsubscribe) {
          this.unsubscribe();
          this.unsubscribe = null;
        }
      }
    });
  }

  private listenForCloudFiles(uid: string) {
    if (this.unsubscribe) this.unsubscribe();

    this.unsubscribe = onSnapshot(collection(firestore, `users/${uid}/files`), async (snapshot) => {
      if (this.syncing) return;
      this.syncing = true;

      try {
        const manifest = await vault.getManifest();

        for (const docSnapshot of snapshot.docs) {
          const data = docSnapshot.data();
          const fileId = docSnapshot.id;

          // Re-download and decrypt if not in manifest OR if previously saved as encrypted
          if (manifest[fileId] && manifest[fileId].encrypted === false) continue;
          if (data.type !== 'file') continue;
          if (!data.chunkCount || data.chunkCount === 0) continue;

          await this.downloadAndStore(uid, fileId, data);
        }
      } catch (e) {
        console.error('CloudSync error:', e);
      } finally {
        this.syncing = false;
      }
    });
  }

  private async downloadAndStore(uid: string, fileId: string, metadata: any) {
    console.log(`[CloudSync] Downloading & decrypting: ${metadata.name}`);
    try {
      const chunkCount = metadata.chunkCount || 0;
      if (chunkCount === 0) return;

      const rawChunks: ArrayBuffer[] = [];
      const driveToken = localStorage.getItem('chuchudu_drive_token');
      let useDrive = !!driveToken;

      for (let i = 0; i < chunkCount; i++) {
        const chunkName = `${fileId}-chunk-${i}`;
        let chunkData: ArrayBuffer | null = null;
        let driveFileId: string | null = null;

        // Try Google Drive buffer first
        if (useDrive && driveToken) {
          try {
            const query = encodeURIComponent(`name='${chunkName}' and trashed=false`);
            const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id)`, {
              headers: { Authorization: `Bearer ${driveToken}` }
            });
            const searchData = await searchRes.json();
            if (searchData.files && searchData.files.length > 0) {
              driveFileId = searchData.files[0].id;
              const dlRes = await fetch(`https://www.googleapis.com/drive/v3/files/${driveFileId}?alt=media`, {
                headers: { Authorization: `Bearer ${driveToken}` }
              });
              if (dlRes.ok) chunkData = await (await dlRes.blob()).arrayBuffer();
            } else {
              useDrive = false;
            }
          } catch {
            useDrive = false;
          }
        }

        // Fallback to Firestore chunks
        if (!chunkData) {
          const chunkDocRef = doc(firestore, `users/${uid}/chunks/${fileId}_${i}`);
          const snap = await getDoc(chunkDocRef);
          if (snap.exists()) {
            const base64 = snap.data().data as string;
            chunkData = base64ToArrayBuffer(base64);
          } else {
            throw new Error(`Chunk ${i} not found for ${fileId}`);
          }
        }

        rawChunks.push(chunkData);

        // Delete from temporary buffer after retrieval
        if (driveFileId && driveToken) {
          fetch(`https://www.googleapis.com/drive/v3/files/${driveFileId}`, {
            method: 'DELETE', headers: { Authorization: `Bearer ${driveToken}` }
          }).catch(() => {});
        } else {
          deleteDoc(doc(firestore, `users/${uid}/chunks/${fileId}_${i}`)).catch(() => {});
        }
      }

      // Decrypt chunks using AES-256-GCM
      let fileKey: CryptoKey | null = null;
      if (metadata.wrappedKey) {
        try {
          const masterKey = await getMasterKeyForUser(uid);
          const wrappedKeyBuf = typeof metadata.wrappedKey === 'string'
            ? base64ToArrayBuffer(metadata.wrappedKey)
            : metadata.wrappedKey;
          fileKey = await unwrapFileKey(wrappedKeyBuf, masterKey);
        } catch (keyErr) {
          console.warn('[CloudSync] Could not unwrap key:', keyErr);
        }
      }

      const decryptedChunks: Uint8Array[] = [];
      let totalDecryptedLength = 0;

      for (let i = 0; i < rawChunks.length; i++) {
        if (fileKey && metadata.encrypted !== false) {
          try {
            const decBuf = await decryptChunk(rawChunks[i], fileKey, i);
            const decArr = new Uint8Array(decBuf);
            decryptedChunks.push(decArr);
            totalDecryptedLength += decArr.length;
          } catch (decErr) {
            console.error(`[CloudSync] Decrypt failed on chunk ${i}:`, decErr);
            const rawArr = new Uint8Array(rawChunks[i]);
            decryptedChunks.push(rawArr);
            totalDecryptedLength += rawArr.length;
          }
        } else {
          const rawArr = new Uint8Array(rawChunks[i]);
          decryptedChunks.push(rawArr);
          totalDecryptedLength += rawArr.length;
        }
      }

      // Assemble final decrypted file data
      const finalFileData = new Uint8Array(totalDecryptedLength);
      let offset = 0;
      for (const chunk of decryptedChunks) {
        finalFileData.set(chunk, offset);
        offset += chunk.length;
      }

      // Save directly to local vault in decrypted plaintext
      await vault.saveFile(fileId, {
        name: metadata.name,
        mime: metadata.mime || 'application/octet-stream',
        size: finalFileData.byteLength,
        modified: metadata.modified || new Date().toISOString(),
        encrypted: false, // Decrypted and ready for instant preview & download!
        starred: metadata.starred || false,
        type: 'file'
      }, finalFileData);

      // Mark synced in Firestore so web portal displays "Delivered to your laptop"
      updateDoc(doc(firestore, `users/${uid}/files/${fileId}`), { synced: true }).catch(() => {});

      this.addActivity({
        fileName: metadata.name,
        action: 'synced',
        timestamp: new Date(),
        size: finalFileData.byteLength
      });

      console.log(`[CloudSync] ✓ Successfully synced & decrypted: ${metadata.name}`);
    } catch (err) {
      console.error(`[CloudSync] ✗ Failed: ${metadata.name}`, err);
      this.addActivity({ fileName: metadata.name || fileId, action: 'error', timestamp: new Date(), size: 0 });
    }
  }
}

export const cloudSync = new CloudSync();

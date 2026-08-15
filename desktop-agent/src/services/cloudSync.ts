import { collection, onSnapshot, doc, deleteDoc, getDoc, updateDoc } from 'firebase/firestore';
import { firestore, auth } from '../config/firebase';
import { vault } from './vaultManager';

export interface ActivityEntry {
  id: string;
  fileName: string;
  action: 'synced' | 'error';
  timestamp: Date;
  size: number;
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

          if (manifest[fileId]) continue;
          if (data.type !== 'file') continue;
          if (data.synced === true) continue;
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
    console.log(`[CloudSync] Downloading: ${metadata.name}`);
    try {
      const chunkCount = metadata.chunkCount || 0;
      if (chunkCount === 0) return;

      const chunks: Uint8Array[] = [];
      let totalLength = 0;

      const driveToken = localStorage.getItem('chuchudu_drive_token');
      let useDrive = !!driveToken;

      for (let i = 0; i < chunkCount; i++) {
        const chunkName = `${fileId}-chunk-${i}`;
        let chunkData: ArrayBuffer | null = null;
        let driveFileId: string | null = null;

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

        if (!chunkData) {
          const chunkDocRef = doc(firestore, `users/${uid}/chunks/${fileId}_${i}`);
          const snap = await getDoc(chunkDocRef);
          if (snap.exists()) {
            const base64 = snap.data().data as string;
            const bin = window.atob(base64);
            const bytes = new Uint8Array(bin.length);
            for (let j = 0; j < bin.length; j++) bytes[j] = bin.charCodeAt(j);
            chunkData = bytes.buffer;
          } else {
            throw new Error(`Chunk ${i} not found for ${fileId}`);
          }
        }

        const arr = new Uint8Array(chunkData);
        chunks.push(arr);
        totalLength += arr.length;

        if (driveFileId && driveToken) {
          fetch(`https://www.googleapis.com/drive/v3/files/${driveFileId}`, {
            method: 'DELETE', headers: { Authorization: `Bearer ${driveToken}` }
          }).catch(() => {});
        } else {
          deleteDoc(doc(firestore, `users/${uid}/chunks/${fileId}_${i}`)).catch(() => {});
        }
      }

      const fileData = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) { fileData.set(chunk, offset); offset += chunk.length; }

      await vault.saveFile(fileId, {
        name: metadata.name,
        mime: metadata.mime || 'application/octet-stream',
        size: metadata.size || totalLength,
        modified: metadata.modified || new Date().toISOString(),
        encrypted: true,
        starred: metadata.starred || false,
        type: 'file'
      }, fileData);

      // Mark synced so web portal shows "Delivered to your laptop"
      updateDoc(doc(firestore, `users/${uid}/files/${fileId}`), { synced: true }).catch(() => {});

      this.addActivity({ fileName: metadata.name, action: 'synced', timestamp: new Date(), size: metadata.size || totalLength });
      console.log(`[CloudSync] ✓ Synced: ${metadata.name}`);
    } catch (err) {
      console.error(`[CloudSync] ✗ Failed: ${metadata.name}`, err);
      this.addActivity({ fileName: metadata.name || fileId, action: 'error', timestamp: new Date(), size: 0 });
    }
  }
}

export const cloudSync = new CloudSync();



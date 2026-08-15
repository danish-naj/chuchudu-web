import Peer from 'simple-peer';
import { rtdb, auth } from '../config/firebase';
import { ref, onValue, set, remove, onChildAdded, get } from 'firebase/database';
import { v4 as uuidv4 } from 'uuid';

export interface RemoteFile {
  id: string;
  name: string;
  mime: string;
  size: number;
  modified: string;
  encrypted: boolean;
}

export class P2PClient {
  public peer: Peer.Instance | null = null;
  private sessionId: string;
  private connected: boolean = false;
  private onConnectCallbacks: (() => void)[] = [];
  private onDisconnectCallbacks: (() => void)[] = [];
  private currentRequests: Map<string, { resolve: (val: any) => void, reject: (err: any) => void }> = new Map();

  constructor() {
    this.sessionId = uuidv4();
  }

  async connect(): Promise<void> {
    if (this.connected) return;
    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');

    return new Promise((resolve, reject) => {
      this.peer = new Peer({ initiator: true, trickle: true });

      // Handle signaling
      this.peer.on('signal', (data) => {
        if (data.type === 'offer') {
          set(ref(rtdb, `signaling/${user.uid}/sessions/${this.sessionId}/offer`), data);
        } else if ((data as any).candidate) {
          const cid = uuidv4();
          set(ref(rtdb, `signaling/${user.uid}/sessions/${this.sessionId}/candidates/client_${cid}`), data);
        }
      });

      // Listen for answer
      const answerRef = ref(rtdb, `signaling/${user.uid}/sessions/${this.sessionId}/answer`);
      onValue(answerRef, (snap) => {
        const val = snap.val();
        if (val && this.peer && !this.connected) {
          this.peer.signal(val);
        }
      });

      // Listen for agent candidates
      const agentCandidatesRef = ref(rtdb, `signaling/${user.uid}/sessions/${this.sessionId}/candidates`);
      onChildAdded(agentCandidatesRef, (snap) => {
        if (snap.key?.startsWith('agent_') && this.peer) {
          this.peer.signal(snap.val());
        }
      });

      this.peer.on('connect', () => {
        this.connected = true;
        this.onConnectCallbacks.forEach(cb => cb());
        resolve();
      });

      this.peer.on('close', () => {
        this.connected = false;
        this.peer = null;
        this.onDisconnectCallbacks.forEach(cb => cb());
      });

      this.peer.on('error', (err) => {
        console.error('P2P Client error:', err);
        reject(err);
      });

      this.peer.on('data', (data) => {
        this.handleData(data);
      });
    });
  }

  private downloadBuffers: Map<string, Uint8Array[]> = new Map();

  private handleData(data: Uint8Array | Buffer | string) {
    if (typeof data === 'string') {
      try {
        const msg = JSON.parse(data);
        if (msg.type === 'FILE_LIST_RESPONSE') {
          const req = this.currentRequests.get('FILE_LIST');
          if (req) {
            req.resolve(msg.manifest);
            this.currentRequests.delete('FILE_LIST');
          }
        }
        else if (msg.type === 'ACK') {
          const req = this.currentRequests.get(`UPLOAD_${msg.fileId}`);
          if (req) {
            req.resolve(true);
            this.currentRequests.delete(`UPLOAD_${msg.fileId}`);
          }
        }
        else if (msg.type === 'FILE_RESPONSE_HEADER') {
          this.downloadBuffers.set(msg.fileId, []);
        }
        else if (msg.type === 'FILE_RESPONSE_EOF') {
          const req = this.currentRequests.get(`DOWNLOAD_${msg.fileId}`);
          const chunks = this.downloadBuffers.get(msg.fileId);
          if (req && chunks) {
             const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
             const result = new Uint8Array(totalLength);
             let offset = 0;
             for (const chunk of chunks) {
               result.set(chunk, offset);
               offset += chunk.length;
             }
             req.resolve(result);
             this.currentRequests.delete(`DOWNLOAD_${msg.fileId}`);
             this.downloadBuffers.delete(msg.fileId);
          }
        }
      } catch (e) {
        console.error('Parse error from agent:', e);
      }
    } else {
       // Binary data chunk (currently only downloads)
       // simple-peer data can be Buffer in Node or Uint8Array in browser.
       // We'll append it to the only active download (for now assuming 1 download at a time is safe)
       // A robust implementation would interleave fileId or use separate data channels.
       const activeDownloadId = Array.from(this.downloadBuffers.keys())[0];
       if (activeDownloadId) {
          const chunks = this.downloadBuffers.get(activeDownloadId);
          if (chunks) chunks.push(new Uint8Array(data as Uint8Array));
       }
    }
  }

  async getFileList(): Promise<Record<string, RemoteFile>> {
    if (!this.connected || !this.peer) throw new Error('Not connected to agent');
    
    return new Promise((resolve, reject) => {
      this.currentRequests.set('FILE_LIST', { resolve, reject });
      this.peer!.send(JSON.stringify({ type: 'FILE_LIST_REQUEST' }));
      
      setTimeout(() => {
        if (this.currentRequests.has('FILE_LIST')) {
          this.currentRequests.delete('FILE_LIST');
          reject(new Error('Timeout fetching file list from agent'));
        }
      }, 5000);
    });
  }

  async uploadFile(fileId: string, name: string, mime: string, size: number, data: ArrayBuffer, onProgress?: (pct: number) => void): Promise<void> {
    if (!this.connected || !this.peer) throw new Error('Not connected to agent');
    
    return new Promise((resolve, reject) => {
      this.currentRequests.set(`UPLOAD_${fileId}`, { resolve, reject });
      
      this.peer!.send(JSON.stringify({
        type: 'FILE_HEADER',
        id: fileId,
        name,
        mime,
        size
      }));
      
      // Send chunks
      const CHUNK_SIZE = 65536;
      let offset = 0;
      
      const sendNextChunk = () => {
        if (offset < data.byteLength) {
          const end = Math.min(offset + CHUNK_SIZE, data.byteLength);
          this.peer!.send(data.slice(offset, end));
          offset = end;
          if (onProgress) onProgress(Math.floor((offset / data.byteLength) * 100));
          
          // Use setTimeout to avoid blocking event loop and let simple-peer buffer drain if needed
          setTimeout(sendNextChunk, 0);
        } else {
          this.peer!.send(JSON.stringify({
            type: 'FILE_EOF',
            id: fileId
          }));
        }
      };
      
      sendNextChunk();
    });
  }

  async getFile(fileId: string, onProgress?: (pct: number) => void): Promise<Uint8Array> {
    if (!this.connected || !this.peer) throw new Error('Not connected to agent');
    
    return new Promise((resolve, reject) => {
      let chunks: Uint8Array[] = [];
      
      this.currentRequests.set(`DOWNLOAD_${fileId}`, { 
        resolve: (data) => resolve(data), 
        reject 
      });
      
      this.peer!.send(JSON.stringify({
        type: 'FILE_REQUEST',
        fileId
      }));
    });
  }

  onConnect(cb: () => void) {
    this.onConnectCallbacks.push(cb);
  }

  onDisconnect(cb: () => void) {
    this.onDisconnectCallbacks.push(cb);
  }

  isConnected() {
    return this.connected;
  }
}

export const p2pClient = new P2PClient();

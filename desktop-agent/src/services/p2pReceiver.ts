import Peer from 'simple-peer';
import { signaling } from './signaling';
import { vault } from './vaultManager';

export class P2PReceiver {
  private peers: Map<string, Peer.Instance> = new Map();

  start() {
    signaling.start((sessionId, offer) => {
      this.handleIncomingSession(sessionId, offer);
    });
  }

  private handleIncomingSession(sessionId: string, offer: any) {
    if (this.peers.has(sessionId)) return;

    const peer = new Peer({ initiator: false, trickle: true });
    this.peers.set(sessionId, peer);

    peer.on('signal', (data) => {
      if (data.type === 'answer') {
        signaling.sendAnswer(sessionId, data);
      } else if ((data as any).candidate) {
        signaling.sendCandidate(sessionId, data);
      }
    });

    signaling.listenForCandidates(sessionId, (candidate) => {
      peer.signal(candidate);
    });

    peer.signal(offer);

    peer.on('connect', () => {
      console.log(`[P2P] Peer connected: ${sessionId}`);
    });

    let currentFileHeader: any = null;
    let currentFileChunks: Uint8Array[] = [];

    peer.on('data', async (data: Buffer | Uint8Array | string) => {
      try {
        if (typeof data === 'string') {
          const msg = JSON.parse(data);
          
          if (msg.type === 'FILE_HEADER') {
            currentFileHeader = msg;
            currentFileChunks = [];
            console.log(`[P2P] Receiving file: ${msg.name}`);
          } 
          else if (msg.type === 'FILE_EOF') {
            if (currentFileHeader) {
              const fileData = new Uint8Array(currentFileChunks.reduce((acc, chunk) => acc + chunk.length, 0));
              let offset = 0;
              for (const chunk of currentFileChunks) {
                fileData.set(chunk, offset);
                offset += chunk.length;
              }
              
              await vault.saveFile(currentFileHeader.id, {
                name: currentFileHeader.name,
                mime: currentFileHeader.mime,
                size: currentFileHeader.size,
                modified: new Date().toISOString(),
                encrypted: true,
                starred: false,
                type: 'file'
              }, fileData);

              console.log(`[P2P] File saved: ${currentFileHeader.name}`);
              peer.send(JSON.stringify({ type: 'ACK', fileId: currentFileHeader.id }));
              
              currentFileHeader = null;
              currentFileChunks = [];
            }
          }
          else if (msg.type === 'FILE_LIST_REQUEST') {
            const manifest = await vault.getManifest();
            peer.send(JSON.stringify({ type: 'FILE_LIST_RESPONSE', manifest }));
          }
          else if (msg.type === 'FILE_REQUEST') {
            const fileData = await vault.readFile(msg.fileId);
            if (fileData) {
              peer.send(JSON.stringify({ type: 'FILE_RESPONSE_HEADER', fileId: msg.fileId }));
              // Send chunks
              const CHUNK_SIZE = 16384;
              for (let i = 0; i < fileData.length; i += CHUNK_SIZE) {
                const chunk = fileData.slice(i, i + CHUNK_SIZE);
                peer.send(chunk);
              }
              peer.send(JSON.stringify({ type: 'FILE_RESPONSE_EOF', fileId: msg.fileId }));
            } else {
              peer.send(JSON.stringify({ type: 'ERROR', message: 'File not found' }));
            }
          }
          else if (msg.type === 'DELETE_REQUEST') {
            await vault.deleteFile(msg.fileId);
            peer.send(JSON.stringify({ type: 'DELETE_ACK', fileId: msg.fileId }));
          }
        } else {
          // Binary chunk
          if (currentFileHeader) {
            currentFileChunks.push(new Uint8Array(data));
          }
        }
      } catch (e) {
        console.error('[P2P] Data error:', e);
      }
    });

    peer.on('error', (err) => {
      console.error(`[P2P] Peer error (${sessionId}):`, err);
      this.peers.delete(sessionId);
    });

    peer.on('close', () => {
      console.log(`[P2P] Peer disconnected: ${sessionId}`);
      this.peers.delete(sessionId);
    });
  }
}

export const p2pReceiver = new P2PReceiver();

import { ref, set, onDisconnect, onChildAdded, onChildRemoved, DataSnapshot, DatabaseReference, onValue } from 'firebase/database';
import { db, auth } from '../config/firebase';

export interface DeviceInfo {
  id: string;
  name: string;
  platform: string;
  lastSeen: number;
  isVault: boolean;
}

export class SignalingService {
  private deviceId: string;
  private presenceRef: DatabaseReference | null = null;
  private incomingRef: DatabaseReference | null = null;

  constructor() {
    // Generate a unique device ID for this vault session
    this.deviceId = 'vault-' + Math.random().toString(36).substring(2, 10);
  }

  async start(onIncomingSession: (sessionId: string, offer: any) => void) {
    const user = auth.currentUser;
    if (!user) return;

    // 1. Announce Presence
    this.presenceRef = ref(db, `nodes/${user.uid}/${this.deviceId}`);
    const deviceInfo: DeviceInfo = {
      id: this.deviceId,
      name: 'My Laptop (Vault)',
      platform: 'desktop',
      lastSeen: Date.now(),
      isVault: true
    };

    await set(this.presenceRef, deviceInfo);
    onDisconnect(this.presenceRef).remove();

    // 2. Listen for incoming signaling sessions
    this.incomingRef = ref(db, `signaling/${user.uid}/incoming_${this.deviceId}`);
    onChildAdded(this.incomingRef, (snapshot: DataSnapshot) => {
      const sessionId = snapshot.key;
      const data = snapshot.val();
      
      if (sessionId && data && data.offer) {
        onIncomingSession(sessionId, data.offer);
      }
    });

    // Keep presence alive
    setInterval(() => {
      if (this.presenceRef) {
        set(this.presenceRef, { ...deviceInfo, lastSeen: Date.now() });
      }
    }, 60000);
  }

  async sendAnswer(sessionId: string, answer: any) {
    const user = auth.currentUser;
    if (!user) return;
    const answerRef = ref(db, `signaling/${user.uid}/answers_${this.deviceId}/${sessionId}`);
    await set(answerRef, answer);
  }

  listenForCandidates(sessionId: string, onCandidate: (candidate: any) => void) {
    const user = auth.currentUser;
    if (!user) return;
    
    // Listen for sender's candidates
    const candidatesRef = ref(db, `signaling/${user.uid}/candidates/${sessionId}/sender`);
    onChildAdded(candidatesRef, (snapshot) => {
      onCandidate(snapshot.val());
    });
  }

  async sendCandidate(sessionId: string, candidate: any) {
    const user = auth.currentUser;
    if (!user) return;
    
    // Send receiver's (vault's) candidates
    const newCandidateRef = ref(db, `signaling/${user.uid}/candidates/${sessionId}/receiver/${Date.now()}_${Math.random().toString(36).substring(2, 7)}`);
    await set(newCandidateRef, candidate);
  }
}

export const signaling = new SignalingService();

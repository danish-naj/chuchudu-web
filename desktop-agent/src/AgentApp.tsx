import React, { useEffect, useState, useRef, useCallback } from 'react';
import { vault } from './services/vaultManager';
import { p2pReceiver } from './services/p2pReceiver';
import { auth, firestore } from './config/firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, setDoc, onSnapshot, deleteDoc } from 'firebase/firestore';
import { enable, disable, isEnabled } from '@tauri-apps/plugin-autostart';
import { open as openDialog, save as saveDialog } from '@tauri-apps/plugin-dialog';
import { open as openUrl } from '@tauri-apps/plugin-shell';
import { writeFile, BaseDirectory } from '@tauri-apps/plugin-fs';
import { type VaultFile } from './services/vaultManager';
import { cloudSync, type ActivityEntry } from './services/cloudSync';

type Section = 'all' | 'photos' | 'videos' | 'documents' | 'starred' | 'activity' | 'settings';
type ViewMode = 'grid' | 'list';

const SECTION_INFO: Record<Section, { label: string; icon: string }> = {
  all: { label: 'All Files', icon: 'folder' },
  photos: { label: 'Photos', icon: 'photo_library' },
  videos: { label: 'Videos', icon: 'video_library' },
  documents: { label: 'Documents', icon: 'description' },
  starred: { label: 'Starred', icon: 'star' },
  activity: { label: 'Transfer Activity', icon: 'sync' },
  settings: { label: 'Settings', icon: 'settings' },
};

function getFileIcon(mime: string): string {
  if (!mime) return 'insert_drive_file';
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'movie';
  if (mime.startsWith('audio/')) return 'audio_file';
  if (mime === 'application/pdf') return 'picture_as_pdf';
  if (mime.includes('word') || mime.includes('document')) return 'description';
  if (mime.includes('sheet') || mime.includes('excel')) return 'table_chart';
  if (mime.includes('presentation') || mime.includes('powerpoint')) return 'slideshow';
  if (mime.includes('zip') || mime.includes('archive') || mime.includes('tar')) return 'folder_zip';
  if (mime.startsWith('text/')) return 'article';
  return 'insert_drive_file';
}

function fmtSize(bytes: number): string {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
  return `${(bytes / 1073741824).toFixed(1)} GB`;
}

function fmtDate(d: string): string {
  try { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
  catch { return '—'; }
}

const isTauri = () => typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

// ─── Logo Component — matches real Chuchudu brand logo ───────────────────────
function ChuchuduLogo({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
      {/* Green rounded-square background */}
      <rect width="512" height="512" rx="90" ry="90" fill="#8DB83A"/>

      {/* 3D shadow of the ticket badge (offset down-right) */}
      <g transform="rotate(-8, 256, 256)">
        <g transform="translate(18, 18)">
          {/* Shadow shape — ticket with notch top-right */}
          <path d="M72,148 L440,148 L440,198 L468,198 L468,228 L440,228 L440,364 L72,364 Z" fill="#111"/>
        </g>
        {/* White ticket badge with notch cut from top-right corner */}
        <path d="M72,148 L440,148 L440,198 L468,198 L468,228 L440,228 L440,364 L72,364 Z" fill="white" stroke="#111" strokeWidth="10"/>

        {/* "CHU" text */}
        <text x="256" y="262" textAnchor="middle"
          fontFamily="'Arial Black','Impact',sans-serif" fontWeight="900"
          fontSize="108" fill="#111" letterSpacing="-2">
          CHU
        </text>
        {/* "CHUDU" text */}
        <text x="248" y="350" textAnchor="middle"
          fontFamily="'Arial Black','Impact',sans-serif" fontWeight="900"
          fontSize="108" fill="#111" letterSpacing="-2">
          CHUDU
        </text>
        {/* ® symbol */}
        <circle cx="444" cy="336" r="18" fill="none" stroke="#111" strokeWidth="6"/>
        <text x="444" y="342" textAnchor="middle"
          fontFamily="Arial,sans-serif" fontWeight="bold"
          fontSize="20" fill="#111">R</text>
      </g>
    </svg>
  );
}

// ─── First-Time Onboarding Modal ─────────────────────────────────────────────
function DriveOnboardingModal({ onConnect, onSkip }: { onConnect: () => void; onSkip: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] p-4">
      <div className="bg-background border-4 border-on-background max-w-md w-full flex flex-col"
        style={{ boxShadow: '12px 12px 0 #1a1c1c' }}>
        {/* Header */}
        <div className="bg-primary-container border-b-4 border-on-background p-6 flex items-center gap-4">
          <ChuchuduLogo size={48} />
          <div>
            <h2 className="font-black text-xl uppercase tracking-tight text-on-background">Welcome to Chuchudu!</h2>
            <p className="text-sm text-on-surface-variant font-medium mt-0.5">Your personal encrypted vault is ready.</p>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 flex flex-col gap-5">
          <div className="border-2 border-on-background bg-surface-container p-4 flex flex-col gap-2"
            style={{ boxShadow: '4px 4px 0 #1a1c1c' }}>
            <div className="flex items-center gap-2 font-black text-sm uppercase tracking-wide">
              <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>cloud</span>
              Connect Google Drive Buffer
            </div>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              When your laptop is <strong>turned off</strong>, files uploaded from your phone are held in Google Drive temporarily.
              The agent downloads them automatically the next time you're online.
            </p>
            <p className="text-xs text-on-surface-variant mt-1 italic">
              You can skip this and connect later from Settings.
            </p>
          </div>

          <div className="flex gap-3">
            <button onClick={onConnect}
              className="flex-1 flex items-center justify-center gap-2 bg-primary-container text-on-primary-container border-2 border-on-background py-3 font-black text-sm uppercase"
              style={{ boxShadow: '4px 4px 0 #1a1c1c' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translate(2px,2px)'; e.currentTarget.style.boxShadow = '2px 2px 0 #1a1c1c'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '4px 4px 0 #1a1c1c'; }}>
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Connect Google Drive
            </button>
            <button onClick={onSkip}
              className="px-4 py-3 border-2 border-on-background bg-surface-container text-on-surface font-bold text-sm uppercase hover:bg-surface-dim transition-colors">
              Skip for now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── File Preview Modal ────────────────────────────────────────────────────────
function FilePreviewModal({ file, onClose, onDownload, onStar, onDelete }: {
  file: VaultFile;
  onClose: () => void;
  onDownload: (f: VaultFile) => void;
  onStar: (f: VaultFile) => void;
  onDelete: (f: VaultFile) => void;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let objectUrl: string | null = null;
    setLoading(true);

    const load = async () => {
      try {
        const data = await vault.readFile(file.id);
        if (!data) { setLoading(false); return; }

        // Text preview
        if (file.mime?.startsWith('text/') || file.mime === 'application/json') {
          const decoder = new TextDecoder('utf-8');
          setTextContent(decoder.decode(data));
        } else {
          objectUrl = URL.createObjectURL(new Blob([data.buffer as ArrayBuffer], { type: file.mime }));
          setPreviewUrl(objectUrl);
        }
      } catch (e) {
        console.error('Preview error:', e);
      } finally {
        setLoading(false);
      }
    };
    load();

    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [file.id, file.mime]);

  const isImage = file.mime?.startsWith('image/');
  const isVideo = file.mime?.startsWith('video/');
  const isAudio = file.mime?.startsWith('audio/');
  const isPdf = file.mime === 'application/pdf';

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-surface-container-lowest border-2 border-on-background w-full max-w-2xl flex flex-col max-h-[90vh]"
        style={{ boxShadow: '10px 10px 0 #1a1c1c' }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b-2 border-on-background bg-surface-container flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="material-symbols-outlined text-primary flex-shrink-0">{getFileIcon(file.mime || '')}</span>
            <h3 className="font-bold uppercase truncate text-sm">{file.name}</h3>
          </div>
          <button onClick={onClose} className="flex-shrink-0 p-1.5 hover:bg-surface-dim border-2 border-transparent hover:border-on-background transition-colors">
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Preview Area */}
        <div className="flex-grow overflow-auto bg-surface-container flex items-center justify-center min-h-48 border-b-2 border-on-background">
          {loading ? (
            <div className="flex flex-col items-center gap-3 py-10">
              <span className="material-symbols-outlined text-4xl text-on-surface-variant animate-spin">progress_activity</span>
              <p className="text-sm text-on-surface-variant">Loading preview...</p>
            </div>
          ) : !previewUrl && !textContent ? (
            <div className="flex flex-col items-center gap-3 py-10">
              <span className="material-symbols-outlined text-7xl text-on-surface-variant">{getFileIcon(file.mime || '')}</span>
              <p className="text-sm text-on-surface-variant">Preview not supported for this file type — click Download to open.</p>
            </div>
          ) : isImage && previewUrl ? (
            <img src={previewUrl} alt={file.name} className="max-w-full max-h-[50vh] object-contain p-4" />
          ) : isVideo && previewUrl ? (
            <video src={previewUrl} controls className="max-w-full max-h-[50vh]" />
          ) : isAudio && previewUrl ? (
            <div className="p-8 flex flex-col items-center gap-4 w-full">
              <span className="material-symbols-outlined text-6xl text-primary">audio_file</span>
              <audio src={previewUrl} controls className="w-full" />
            </div>
          ) : isPdf && previewUrl ? (
            <iframe src={previewUrl} title={file.name} className="w-full h-[50vh] border-0" />
          ) : textContent !== null ? (
            <pre className="w-full p-4 text-xs text-on-background font-mono overflow-auto max-h-[50vh] whitespace-pre-wrap">{textContent.slice(0, 5000)}{textContent.length > 5000 ? '\n...(truncated)' : ''}</pre>
          ) : null}
        </div>

        {/* Metadata */}
        <div className="px-4 py-3 border-b-2 border-on-background flex flex-wrap gap-4 text-xs flex-shrink-0">
          {[
            ['Size', fmtSize(file.size || 0)],
            ['Modified', fmtDate(file.modified || '')],
            ['Type', file.mime || 'Unknown'],
          ].map(([k, v]) => (
            <div key={k} className="flex gap-1.5">
              <span className="text-on-surface-variant uppercase font-bold">{k}:</span>
              <span className="text-on-background truncate max-w-40">{v}</span>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-2 p-4 flex-shrink-0">
          <button onClick={() => onDownload(file)}
            className="flex-1 flex items-center justify-center gap-2 bg-primary-fixed text-on-primary-fixed border-2 border-on-background py-2.5 font-bold text-sm uppercase"
            style={{ boxShadow: '3px 3px 0 #1a1c1c' }}>
            <span className="material-symbols-outlined text-xl">download</span>Download
          </button>
          <button onClick={() => onStar(file)}
            className={`flex items-center justify-center border-2 border-on-background py-2.5 px-4 transition-colors ${file.starred ? 'bg-primary-fixed text-on-primary-fixed' : 'bg-surface-container hover:bg-surface-dim'}`}>
            <span className="material-symbols-outlined text-xl" style={file.starred ? { fontVariationSettings: "'FILL' 1" } : {}}>star</span>
          </button>
          <button onClick={() => onDelete(file)}
            className="flex items-center justify-center bg-error-container text-on-error-container border-2 border-on-background py-2.5 px-4 hover:brightness-95">
            <span className="material-symbols-outlined text-xl">delete</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export function AgentApp() {
  const [user, setUser] = useState(auth.currentUser);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  const [section, setSection] = useState<Section>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [files, setFiles] = useState<Record<string, VaultFile>>({});
  const [search, setSearch] = useState('');
  const [selectedFile, setSelectedFile] = useState<VaultFile | null>(null);
  const [activityLog, setActivityLog] = useState<ActivityEntry[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [autostart, setAutostart] = useState(false);
  const [vaultPath, setVaultPath] = useState(localStorage.getItem('chuchudu_vault_path') || '~/Chuchudu_Vault');
  const [driveConnected, setDriveConnected] = useState(false);
  const [driveEmail, setDriveEmail] = useState<string | null>(null);
  const [driveConnecting, setDriveConnecting] = useState(false);

  // Onboarding: show drive connect popup on first login
  const [showOnboarding, setShowOnboarding] = useState(false);

  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load Drive token from storage
  useEffect(() => {
    const t = localStorage.getItem('chuchudu_drive_token');
    const em = localStorage.getItem('chuchudu_drive_email');
    if (t) { setDriveConnected(true); setDriveEmail(em); }
  }, []);

  // Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) {
        vault.init().then(() => vault.getManifest().then(setFiles));
        p2pReceiver.start();
        cloudSync.start();

        // Show onboarding if first time login
        const onboarded = localStorage.getItem('chuchudu_onboarded');
        const hasDrive = localStorage.getItem('chuchudu_drive_token');
        if (!onboarded && !hasDrive) {
          setShowOnboarding(true);
        }
      }
    });
    const refresh = () => {
      vault.getManifest().then(setFiles);
      setActivityLog([...cloudSync.getActivityLog()]);
    };
    window.addEventListener('vault-updated', refresh);
    return () => { unsub(); window.removeEventListener('vault-updated', refresh); };
  }, []);

  useEffect(() => {
    if (isTauri()) isEnabled().then(setAutostart).catch(() => {});
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setActivityLog([...cloudSync.getActivityLog()]), 3000);
    return () => clearInterval(interval);
  }, []);

  // Thumbnail generation — for all image files
  useEffect(() => {
    const loadThumbs = async () => {
      const imgs = Object.values(files)
        .filter(f => f.mime?.startsWith('image/') && !thumbnails[f.id])
        .slice(0, 50);
      for (const file of imgs) {
        try {
          const data = await vault.readFile(file.id);
          if (data) {
            const url = URL.createObjectURL(new Blob([data.buffer as ArrayBuffer], { type: file.mime }));
            setThumbnails(prev => ({ ...prev, [file.id]: url }));
          }
        } catch {}
      }
    };
    if (Object.keys(files).length > 0) loadThumbs();
  }, [files]);

  const getFiltered = useCallback(() => {
    let result = Object.values(files);
    switch (section) {
      case 'photos': result = result.filter(f => f.mime?.startsWith('image/')); break;
      case 'videos': result = result.filter(f => f.mime?.startsWith('video/')); break;
      case 'documents': result = result.filter(f => f.mime?.startsWith('application/') || f.mime?.startsWith('text/')); break;
      case 'starred': result = result.filter(f => f.starred); break;
      default: break;
    }
    if (search.trim()) result = result.filter(f => f.name.toLowerCase().includes(search.toLowerCase()));
    return result.sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime());
  }, [files, section, search]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setLoginError(''); setLoggingIn(true);
    try { await signInWithEmailAndPassword(auth, email, password); }
    catch { setLoginError('Invalid email or password. Try again.'); }
    finally { setLoggingIn(false); }
  };

  const handleUpload = async (fl: FileList) => {
    setUploading(true); setUploadProgress(0);
    for (let i = 0; i < fl.length; i++) {
      const file = fl[i];
      try {
        const buf = await file.arrayBuffer();
        const id = crypto.randomUUID();
        await vault.saveFile(id, {
          name: file.name, mime: file.type || 'application/octet-stream',
          size: file.size, modified: new Date().toISOString(),
          encrypted: false, starred: false, type: 'file'
        }, new Uint8Array(buf));
        setUploadProgress(Math.round(((i + 1) / fl.length) * 100));
      } catch (e) { console.error(e); }
    }
    vault.getManifest().then(setFiles);
    setUploading(false);
  };

  const handleDownload = async (file: VaultFile) => {
    const data = await vault.readFile(file.id);
    if (!data) { alert('File data not found in vault.'); return; }

    if (isTauri()) {
      try {
        // Ask user where to save the file
        const savePath = await saveDialog({
          defaultPath: file.name,
          title: 'Save File',
        });
        if (!savePath) return; // user cancelled
        await writeFile(savePath, data, { baseDir: BaseDirectory.Home });
        // Open the saved file with the system default app
        await openUrl(savePath);
      } catch (e) {
        console.error('Download error:', e);
        alert('Failed to save file: ' + String(e));
      }
    } else {
      // Dev mode fallback
      const url = URL.createObjectURL(new Blob([data.buffer as ArrayBuffer], { type: file.mime }));
      const a = document.createElement('a'); a.href = url; a.download = file.name; a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleStar = async (file: VaultFile) => {
    const m = await vault.getManifest();
    if (m[file.id]) { m[file.id].starred = !m[file.id].starred; await vault.saveManifest(m); setFiles({ ...m }); }
  };

  const handleDelete = async (file: VaultFile) => {
    if (!confirm(`Delete "${file.name}"?`)) return;
    await vault.deleteFile(file.id);
    vault.getManifest().then(setFiles);
    if (selectedFile?.id === file.id) setSelectedFile(null);
  };

  const toggleAutostart = async () => {
    if (autostart) { await disable(); setAutostart(false); }
    else { await enable(); setAutostart(true); }
  };

  const handlePickFolder = async () => {
    try {
      const sel = await openDialog({ directory: true, multiple: false, title: 'Select Vault Folder' });
      if (sel && typeof sel === 'string') { localStorage.setItem('chuchudu_vault_path', sel); setVaultPath(sel); }
    } catch {}
  };

  // ── Google Drive OAuth — open chuchudu.in/oauth in system browser, poll Firestore for token ──
  const handleConnectDrive = async () => {
    const cid = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!cid) { alert('VITE_GOOGLE_CLIENT_ID is not set in .env.local'); return; }
    if (!auth.currentUser) return;

    setDriveConnecting(true);
    const uid = auth.currentUser.uid;

    try {
      // Write a pending OAuth request to Firestore so the web page knows who's connecting
      const pendingRef = doc(firestore, `users/${uid}/oauth/drive_pending`);
      await setDoc(pendingRef, { requested: new Date().toISOString(), status: 'pending' });

      // Build the OAuth URL — redirect goes to our web page which captures the token
      const scope = encodeURIComponent('https://www.googleapis.com/auth/drive.file email profile');
      const redirectUri = encodeURIComponent('https://chuchudu.in/oauth');
      const oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${cid}&redirect_uri=${redirectUri}&response_type=token&scope=${scope}&state=${uid}`;

      // Open in system browser (works in both dev and production Tauri)
      if (isTauri()) {
        await openUrl(oauthUrl);
      } else {
        window.open(oauthUrl, '_blank');
      }

      // Poll Firestore for the token — the /oauth page on chuchudu.in will write it
      const tokenRef = doc(firestore, `users/${uid}/oauth/drive_token`);
      const unsubscribe = onSnapshot(tokenRef, (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (data?.access_token) {
            const token = data.access_token;
            localStorage.setItem('chuchudu_drive_token', token);
            setDriveConnected(true);
            if (data.email) {
              localStorage.setItem('chuchudu_drive_email', data.email);
              setDriveEmail(data.email);
            }
            // Clean up Firestore docs
            deleteDoc(tokenRef).catch(() => {});
            deleteDoc(pendingRef).catch(() => {});
            unsubscribe();
            setDriveConnecting(false);
          }
        }
      });

      // Timeout after 5 minutes
      setTimeout(() => {
        unsubscribe();
        setDriveConnecting(false);
      }, 5 * 60 * 1000);

    } catch (e) {
      console.error('OAuth error:', e);
      setDriveConnecting(false);
      alert('Failed to open browser. Check your internet connection.');
    }
  };

  const handleDisconnectDrive = () => {
    localStorage.removeItem('chuchudu_drive_token'); localStorage.removeItem('chuchudu_drive_email');
    setDriveConnected(false); setDriveEmail(null);
  };

  const handleOnboardingConnect = () => {
    setShowOnboarding(false);
    localStorage.setItem('chuchudu_onboarded', '1');
    setSection('settings');
    handleConnectDrive();
  };

  const handleOnboardingSkip = () => {
    setShowOnboarding(false);
    localStorage.setItem('chuchudu_onboarded', '1');
  };

  const filtered = getFiltered();
  const totalFiles = Object.keys(files).length;
  const totalSize = Object.values(files).reduce((a, f) => a + (f.size || 0), 0);
  const navItems: Section[] = ['all', 'photos', 'videos', 'documents', 'starred'];
  const bottomItems: Section[] = ['activity', 'settings'];

  // ── Login Screen ──────────────────────────────────────────────────────────
  if (!user) return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm flex flex-col gap-6">
        <div className="flex flex-col items-center gap-4 mb-2">
          <div style={{ transform: 'rotate(-4deg)' }}>
            <ChuchuduLogo size={64} />
          </div>
          <div className="text-center">
            <h1 className="font-black text-2xl uppercase tracking-tight border-b-4 border-on-background pb-2">
              Chuchudu Vault
            </h1>
            <p className="text-xs text-on-surface-variant mt-1 uppercase tracking-widest">Desktop Agent v1.0</p>
          </div>
        </div>

        <div className="bg-surface-container-lowest border-2 border-on-background p-8"
          style={{ boxShadow: '8px 8px 0 #1a1c1c' }}>
          <p className="font-bold text-xs uppercase tracking-widest text-on-surface-variant mb-6">
            Sign in with your chuchudu.in account
          </p>
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <input type="email" placeholder="Email address" value={email}
              onChange={e => setEmail(e.target.value)} required
              className="bg-surface-container-low border-2 border-on-background px-4 py-3 text-sm text-on-background focus:outline-none focus:border-primary w-full" />
            <div className="relative">
              <input type={showPass ? 'text' : 'password'} placeholder="Password" value={password}
                onChange={e => setPassword(e.target.value)} required
                className="bg-surface-container-low border-2 border-on-background px-4 py-3 text-sm text-on-background focus:outline-none focus:border-primary w-full pr-12" />
              <button type="button" onClick={() => setShowPass(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-background">
                <span className="material-symbols-outlined text-xl">{showPass ? 'visibility_off' : 'visibility'}</span>
              </button>
            </div>
            {loginError && <p className="text-xs text-error font-bold">{loginError}</p>}
            <button type="submit" disabled={loggingIn}
              className="bg-primary-fixed text-on-primary-fixed border-2 border-on-background px-6 py-3 font-black text-sm uppercase mt-2 disabled:opacity-60"
              style={{ boxShadow: '4px 4px 0 #1a1c1c' }}>
              {loggingIn ? 'Connecting...' : 'Connect Vault'}
            </button>
          </form>
        </div>
        <p className="text-xs text-on-surface-variant text-center uppercase tracking-widest">
          Files encrypted end-to-end with AES-256-GCM
        </p>
      </div>
    </div>
  );

  // ── Main Dashboard ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background text-on-background flex">
      {/* Onboarding Modal */}
      {showOnboarding && (
        <DriveOnboardingModal onConnect={handleOnboardingConnect} onSkip={handleOnboardingSkip} />
      )}

      {/* Sidebar */}
      <aside className="w-64 min-h-screen bg-surface-container-lowest border-r-2 border-on-background flex flex-col flex-shrink-0"
        style={{ boxShadow: '4px 0 0 #1a1c1c' }}>
        <div className="px-5 py-4 border-b-2 border-on-background flex items-center gap-3">
          <ChuchuduLogo size={32} />
          <span className="font-black text-lg uppercase tracking-tight">Chuchudu</span>
        </div>

        <nav className="flex-grow px-3 py-4 flex flex-col gap-1">
          {navItems.map(s => (
            <button key={s} onClick={() => setSection(s)}
              className={`flex items-center gap-3 px-3 py-2.5 w-full text-left transition-colors ${section === s ? 'bg-primary-fixed text-on-primary-fixed border-2 border-on-background font-bold' : 'text-on-surface hover:bg-surface-container border-2 border-transparent'}`}>
              <span className="material-symbols-outlined text-xl" style={section === s ? { fontVariationSettings: "'FILL' 1" } : {}}>{SECTION_INFO[s].icon}</span>
              <span className="font-bold text-sm uppercase">{SECTION_INFO[s].label}</span>
            </button>
          ))}
          <div className="border-t-2 border-on-background my-2" />
          {bottomItems.map(s => (
            <button key={s} onClick={() => setSection(s)}
              className={`flex items-center gap-3 px-3 py-2.5 w-full text-left transition-colors ${section === s ? 'bg-primary-fixed text-on-primary-fixed border-2 border-on-background font-bold' : 'text-on-surface hover:bg-surface-container border-2 border-transparent'}`}>
              <span className="material-symbols-outlined text-xl">{SECTION_INFO[s].icon}</span>
              <span className="font-bold text-sm uppercase">{SECTION_INFO[s].label}</span>
            </button>
          ))}
        </nav>

        {/* Storage bar */}
        <div className="border-t-2 border-on-background p-4 flex flex-col gap-1.5">
          <div className="flex justify-between text-xs font-bold">
            <span className="text-on-surface-variant uppercase">Files</span><span>{totalFiles}</span>
          </div>
          <div className="flex justify-between text-xs font-bold">
            <span className="text-on-surface-variant uppercase">Storage</span><span>{fmtSize(totalSize)}</span>
          </div>
          <div className="w-full h-1.5 bg-surface-container mt-1 border border-on-background">
            <div className="h-full bg-primary transition-all" style={{ width: `${Math.min((totalSize / 1073741824) * 100, 100)}%` }} />
          </div>
        </div>

        {/* User footer */}
        <div className="border-t-2 border-on-background p-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 bg-primary-fixed border-2 border-on-background flex items-center justify-center flex-shrink-0">
              <span className="font-black text-xs text-on-primary-fixed">{user.email?.charAt(0).toUpperCase()}</span>
            </div>
            <span className="text-xs text-on-surface-variant truncate">{user.email}</span>
          </div>
          <button onClick={() => signOut(auth)} title="Sign Out"
            className="flex-shrink-0 border-2 border-transparent hover:border-on-background p-1 hover:bg-surface-container transition-colors">
            <span className="material-symbols-outlined text-lg">logout</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-grow flex flex-col min-w-0">
        <header className="border-b-2 border-on-background bg-background px-6 py-3 flex items-center gap-4 flex-shrink-0">
          <h1 className="font-black text-lg uppercase border-b-2 border-on-background pb-1 mr-2 flex-shrink-0">{SECTION_INFO[section].label}</h1>
          {!['activity', 'settings'].includes(section) && (
            <div className="flex-grow max-w-sm">
              <div className="flex items-center gap-2 bg-surface-container-low border-2 border-on-background px-3 py-2">
                <span className="material-symbols-outlined text-on-surface-variant text-xl">search</span>
                <input type="text" placeholder="Search files..." value={search} onChange={e => setSearch(e.target.value)}
                  className="bg-transparent text-sm text-on-background placeholder-on-surface-variant focus:outline-none w-full" />
                {search && <button onClick={() => setSearch('')}><span className="material-symbols-outlined text-sm">close</span></button>}
              </div>
            </div>
          )}
          <div className="flex items-center gap-2 ml-auto">
            {!['activity', 'settings'].includes(section) && (
              <div className="flex border-2 border-on-background">
                {(['grid', 'list'] as ViewMode[]).map((m, i) => (
                  <button key={m} onClick={() => setViewMode(m)}
                    className={`p-2 transition-colors ${i > 0 ? 'border-l-2 border-on-background' : ''} ${viewMode === m ? 'bg-primary-fixed text-on-primary-fixed' : 'hover:bg-surface-container'}`}>
                    <span className="material-symbols-outlined text-xl">{m === 'grid' ? 'grid_view' : 'view_list'}</span>
                  </button>
                ))}
              </div>
            )}
            <button onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 bg-primary-fixed text-on-primary-fixed border-2 border-on-background px-4 py-2 font-bold text-sm uppercase"
              style={{ boxShadow: '3px 3px 0 #1a1c1c' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translate(3px,3px)'; e.currentTarget.style.boxShadow = 'none'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '3px 3px 0 #1a1c1c'; }}>
              <span className="material-symbols-outlined text-xl">upload</span>Upload
            </button>
            <input ref={fileInputRef} type="file" multiple className="hidden" onChange={e => e.target.files && handleUpload(e.target.files)} />
          </div>
        </header>

        {uploading && (
          <div className="border-b-2 border-on-background bg-primary-container px-6 py-2 flex items-center gap-3">
            <span className="material-symbols-outlined text-on-primary-container text-xl">progress_activity</span>
            <span className="font-bold text-xs uppercase text-on-primary-container">Uploading... {uploadProgress}%</span>
            <div className="flex-grow h-1.5 bg-primary-fixed/30 border border-on-background">
              <div className="h-full bg-primary transition-all" style={{ width: `${uploadProgress}%` }} />
            </div>
          </div>
        )}

        <main className="flex-grow overflow-y-auto p-6">
          {/* File Grid / List */}
          {!['activity', 'settings'].includes(section) && (
            filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 gap-4">
                <span className="material-symbols-outlined text-6xl text-on-surface-variant">
                  {section === 'starred' ? 'star' : 'folder_open'}
                </span>
                <p className="text-on-surface-variant text-center text-sm">
                  {search ? 'No files match your search' : section === 'starred' ? 'No starred files yet' : 'No files here yet — upload something!'}
                </p>
                {!search && section === 'all' && (
                  <button onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 bg-on-background text-background border-2 border-on-background px-6 py-3 font-bold text-sm uppercase"
                    style={{ boxShadow: '4px 4px 0 #444' }}>
                    <span className="material-symbols-outlined">upload</span>Upload Files
                  </button>
                )}
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))' }}>
                {filtered.map(file => (
                  <div key={file.id} className="group border-2 border-on-background bg-surface-container-lowest flex flex-col cursor-pointer hover:border-primary transition-colors relative overflow-hidden"
                    style={{ boxShadow: '4px 4px 0 #1a1c1c' }} onClick={() => setSelectedFile(file)}>
                    <div className="aspect-square bg-surface-container flex items-center justify-center overflow-hidden border-b-2 border-on-background">
                      {thumbnails[file.id]
                        ? <img src={thumbnails[file.id]} alt={file.name} className="w-full h-full object-cover" />
                        : <span className="material-symbols-outlined text-5xl text-on-surface-variant">{getFileIcon(file.mime || '')}</span>
                      }
                    </div>
                    <div className="p-2">
                      <p className="text-xs font-bold truncate" title={file.name}>{file.name}</p>
                      <p className="text-on-surface-variant text-xs mt-0.5">{fmtSize(file.size || 0)}</p>
                    </div>
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-background/85 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={e => { e.stopPropagation(); setSelectedFile(file); }} className="border-2 border-on-background bg-background p-1.5 hover:bg-surface-container" title="Preview">
                        <span className="material-symbols-outlined text-sm">visibility</span>
                      </button>
                      <button onClick={e => { e.stopPropagation(); handleDownload(file); }} className="border-2 border-on-background bg-background p-1.5 hover:bg-surface-container" title="Download">
                        <span className="material-symbols-outlined text-sm">download</span>
                      </button>
                      <button onClick={e => { e.stopPropagation(); handleDelete(file); }} className="border-2 border-on-background bg-background p-1.5 hover:bg-error-container" title="Delete">
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>
                    </div>
                    {file.starred && (
                      <div className="absolute top-1 right-1 bg-primary-fixed border border-on-background w-5 h-5 flex items-center justify-center">
                        <span className="material-symbols-outlined text-xs text-on-primary-fixed" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                      </div>
                    )}
                    {file.encrypted && (
                      <div className="absolute top-1 left-1 bg-surface-dim border border-on-background w-5 h-5 flex items-center justify-center">
                        <span className="material-symbols-outlined text-xs text-on-surface-variant">lock</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col divide-y-2 divide-outline-variant border-2 border-on-background" style={{ boxShadow: '4px 4px 0 #1a1c1c' }}>
                <div className="grid grid-cols-12 gap-4 px-4 py-2 bg-surface-container text-xs font-bold text-on-surface-variant uppercase">
                  <div className="col-span-5">Name</div><div className="col-span-2">Size</div>
                  <div className="col-span-3">Modified</div><div className="col-span-2 text-right">Actions</div>
                </div>
                {filtered.map(file => (
                  <div key={file.id} className="grid grid-cols-12 gap-4 px-4 py-3 items-center hover:bg-surface-container-low cursor-pointer" onClick={() => setSelectedFile(file)}>
                    <div className="col-span-5 flex items-center gap-3 min-w-0">
                      <span className="material-symbols-outlined text-primary flex-shrink-0">{getFileIcon(file.mime || '')}</span>
                      <span className="text-sm text-on-background truncate">{file.name}</span>
                      {file.encrypted && <span className="material-symbols-outlined text-xs text-on-surface-variant flex-shrink-0">lock</span>}
                    </div>
                    <div className="col-span-2 text-xs text-on-surface-variant">{fmtSize(file.size || 0)}</div>
                    <div className="col-span-3 text-xs text-on-surface-variant">{fmtDate(file.modified || '')}</div>
                    <div className="col-span-2 flex items-center justify-end gap-1">
                      <button onClick={e => { e.stopPropagation(); handleDownload(file); }} className="p-1 hover:bg-surface-container border border-transparent hover:border-on-background transition-colors">
                        <span className="material-symbols-outlined text-sm">download</span>
                      </button>
                      <button onClick={e => { e.stopPropagation(); handleStar(file); }} className="p-1 hover:bg-surface-container border border-transparent hover:border-on-background transition-colors">
                        <span className="material-symbols-outlined text-sm" style={file.starred ? { fontVariationSettings: "'FILL' 1", color: 'var(--md-sys-color-primary)' } : {}}>star</span>
                      </button>
                      <button onClick={e => { e.stopPropagation(); handleDelete(file); }} className="p-1 hover:bg-error-container border border-transparent hover:border-on-background transition-colors">
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* Activity Log */}
          {section === 'activity' && (
            <div className="flex flex-col gap-4">
              <div className="border-2 border-on-background bg-surface-container-lowest" style={{ boxShadow: '4px 4px 0 #1a1c1c' }}>
                <div className="border-b-2 border-on-background px-4 py-3 bg-surface-container flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary">sync</span>
                  <h2 className="font-bold text-xs uppercase tracking-widest">Recent Transfers</h2>
                </div>
                {activityLog.length === 0 ? (
                  <div className="p-10 flex flex-col items-center gap-3 text-center">
                    <span className="material-symbols-outlined text-5xl text-on-surface-variant">cloud_sync</span>
                    <p className="text-sm text-on-surface-variant max-w-xs">No transfers yet. Files synced from your phone will appear here.</p>
                  </div>
                ) : (
                  <div className="divide-y-2 divide-outline-variant">
                    {[...activityLog].reverse().map(entry => (
                      <div key={entry.id} className="flex items-center gap-4 px-4 py-3 hover:bg-surface-container-low transition-colors">
                        <div className={`w-9 h-9 border-2 border-on-background flex items-center justify-center flex-shrink-0 ${entry.action === 'synced' ? 'bg-primary-container' : 'bg-error-container'}`}>
                          <span className="material-symbols-outlined text-sm">{entry.action === 'synced' ? 'cloud_download' : 'error'}</span>
                        </div>
                        <div className="flex-grow min-w-0">
                          <p className="text-sm text-on-background truncate">{entry.fileName}</p>
                          <p className="text-xs text-on-surface-variant">
                            {entry.action === 'synced' ? 'Synced from cloud' : 'Sync failed'} · {fmtSize(entry.size)} · {entry.timestamp.toLocaleTimeString()}
                          </p>
                        </div>
                        <span className={`text-xs font-bold uppercase border-2 border-on-background px-2 py-0.5 flex-shrink-0 ${entry.action === 'synced' ? 'bg-primary-fixed text-on-primary-fixed' : 'bg-error-container text-on-error-container'}`}>
                          {entry.action}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'P2P Receiver', value: 'Listening', icon: 'sensors', ok: true },
                  { label: 'Cloud Sync', value: 'Active', icon: 'cloud_sync', ok: true },
                  { label: 'Google Drive', value: driveConnected ? driveEmail || 'Connected' : 'Not Connected', icon: 'cloud', ok: driveConnected },
                ].map(item => (
                  <div key={item.label} className="border-2 border-on-background bg-surface-container-lowest p-4 flex flex-col gap-2" style={{ boxShadow: '3px 3px 0 #1a1c1c' }}>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-xl">{item.icon}</span>
                      <span className="text-xs font-bold text-on-surface-variant uppercase">{item.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${item.ok ? 'bg-primary animate-pulse' : 'bg-error'}`} />
                      <span className="text-sm text-on-background truncate">{item.value}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Settings */}
          {section === 'settings' && (
            <div className="flex flex-col gap-6 max-w-2xl">
              {/* Account */}
              <section className="border-2 border-on-background bg-surface-container-lowest p-6 flex flex-col gap-4" style={{ boxShadow: '4px 4px 0 #1a1c1c' }}>
                <h2 className="font-black text-base uppercase border-b-2 border-on-background pb-2">Account</h2>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary-fixed border-2 border-on-background flex items-center justify-center">
                    <span className="font-black text-xl text-on-primary-fixed">{user.email?.charAt(0).toUpperCase()}</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-on-background">{user.email}</p>
                    <p className="text-xs text-on-surface-variant uppercase tracking-wide">Chuchudu Account</p>
                  </div>
                </div>
                <button onClick={() => signOut(auth)}
                  className="self-start flex items-center gap-2 border-2 border-on-background bg-error-container text-on-error-container px-4 py-2 font-bold text-sm uppercase"
                  style={{ boxShadow: '3px 3px 0 #1a1c1c' }}>
                  <span className="material-symbols-outlined text-xl">logout</span>Sign Out
                </button>
              </section>

              {/* Vault Folder */}
              <section className="border-2 border-on-background bg-surface-container-lowest p-6 flex flex-col gap-4" style={{ boxShadow: '4px 4px 0 #1a1c1c' }}>
                <h2 className="font-black text-base uppercase border-b-2 border-on-background pb-2">Vault Folder</h2>
                <p className="text-sm text-on-surface-variant">All your files are stored and encrypted here on your local machine.</p>
                <div className="flex items-center gap-3">
                  <div className="flex-grow flex items-center gap-2 bg-surface-container-low border-2 border-on-background px-4 py-3">
                    <span className="material-symbols-outlined text-primary">folder_open</span>
                    <code className="text-xs text-on-background truncate">{vaultPath}</code>
                  </div>
                  <button onClick={handlePickFolder}
                    className="bg-on-background text-background border-2 border-on-background px-4 py-3 font-bold text-sm uppercase whitespace-nowrap"
                    style={{ boxShadow: '3px 3px 0 #444' }}>Change</button>
                </div>
              </section>

              {/* Autostart */}
              <section className="border-2 border-on-background bg-surface-container-lowest p-6 flex items-center justify-between gap-4" style={{ boxShadow: '4px 4px 0 #1a1c1c' }}>
                <div>
                  <h2 className="font-black text-base uppercase">Autostart on Windows Boot</h2>
                  <p className="text-sm text-on-surface-variant mt-1">Start vault automatically when Windows starts.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer" onClick={toggleAutostart}>
                  <input type="checkbox" checked={autostart} readOnly className="sr-only peer" />
                  <div className="w-14 h-8 bg-surface-container-high border-2 border-on-background peer-checked:bg-primary-fixed peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-on-background after:h-6 after:w-6 after:transition-all rounded-none" />
                </label>
              </section>

              {/* Google Drive */}
              <section className="border-2 border-on-background bg-surface-container-lowest p-6 flex flex-col gap-4" style={{ boxShadow: '4px 4px 0 #1a1c1c' }}>
                <h2 className="font-black text-base uppercase border-b-2 border-on-background pb-2">Google Drive Buffer</h2>
                <p className="text-sm text-on-surface-variant">When your laptop is <strong>OFF</strong>, uploaded files buffer here temporarily. The agent downloads them automatically when you're back online.</p>
                {driveConnected ? (
                  <div className="flex items-center justify-between bg-primary-container border-2 border-on-background p-4">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-on-primary-container" style={{ fontVariationSettings: "'FILL' 1" }}>cloud_done</span>
                      <div>
                        <div className="text-xs font-bold uppercase text-on-primary-container">Connected</div>
                        <div className="text-sm text-on-primary-container">{driveEmail}</div>
                      </div>
                    </div>
                    <button onClick={handleDisconnectDrive}
                      className="border-2 border-on-background bg-error-container text-on-error-container px-4 py-2 font-bold text-sm uppercase">
                      Disconnect
                    </button>
                  </div>
                ) : (
                  <button onClick={handleConnectDrive} disabled={driveConnecting}
                    className="self-start flex items-center gap-3 bg-primary-container text-on-primary-container border-2 border-on-background px-6 py-3 font-bold text-sm uppercase disabled:opacity-60"
                    style={{ boxShadow: '3px 3px 0 #1a1c1c' }}>
                    {driveConnecting ? (
                      <><span className="material-symbols-outlined text-xl animate-spin">progress_activity</span>Opening browser...</>
                    ) : (
                      <><svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M15.203 5.454h-6.406L5.602 11h6.406l3.195-5.546zM20.203 14h-6.406l-3.195-5.546 3.195-5.545h6.406l3.195 5.545-3.195 5.546zM11.992 19.546l-3.195-5.546h-6.406l3.195 5.546h6.406z" fill="currentColor" /></svg>Connect Google Drive</>
                    )}
                  </button>
                )}
              </section>

              <div className="border-2 border-on-background bg-primary-fixed p-4 flex items-start gap-3" style={{ boxShadow: '3px 3px 0 #1a1c1c' }}>
                <span className="material-symbols-outlined text-on-primary-fixed">lightbulb</span>
                <p className="text-xs font-bold text-on-primary-fixed">Closing this window keeps the vault running silently in the system tray. All transfers continue in the background.</p>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* File Preview Modal */}
      {selectedFile && (
        <FilePreviewModal
          file={selectedFile}
          onClose={() => setSelectedFile(null)}
          onDownload={f => { handleDownload(f); setSelectedFile(null); }}
          onStar={f => { handleStar(f); setSelectedFile({ ...f, starred: !f.starred }); }}
          onDelete={f => { handleDelete(f); setSelectedFile(null); }}
        />
      )}
    </div>
  );
}

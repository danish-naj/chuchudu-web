import React, { useEffect, useState, useRef, useCallback } from 'react';
import { vault } from './services/vaultManager';
import { p2pReceiver } from './services/p2pReceiver';
import { auth } from './config/firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { enable, disable, isEnabled } from '@tauri-apps/plugin-autostart';
import { open } from '@tauri-apps/plugin-dialog';
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
  catch { return '\u2014'; }
}

export function AgentApp() {
  const [user, setUser] = useState(auth.currentUser);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

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
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes('access_token=')) {
      const params = new URLSearchParams(hash.replace('#', ''));
      const token = params.get('access_token');
      if (token) {
        localStorage.setItem('chuchudu_drive_token', token);
        setDriveConnected(true);
        fetch('https://www.googleapis.com/oauth2/v3/userinfo', { headers: { Authorization: `Bearer ${token}` } })
          .then(r => r.json()).then(data => { localStorage.setItem('chuchudu_drive_email', data.email); setDriveEmail(data.email); });
        window.location.hash = '';
        setSection('settings');
      }
    } else {
      const t = localStorage.getItem('chuchudu_drive_token');
      const em = localStorage.getItem('chuchudu_drive_email');
      if (t) { setDriveConnected(true); setDriveEmail(em); }
    }
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) {
        vault.init().then(() => vault.getManifest().then(setFiles));
        p2pReceiver.start();
        cloudSync.start();
      }
    });
    const refresh = () => { vault.getManifest().then(setFiles); setActivityLog([...cloudSync.getActivityLog()]); };
    window.addEventListener('vault-updated', refresh);
    return () => { unsub(); window.removeEventListener('vault-updated', refresh); };
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
      isEnabled().then(setAutostart).catch(() => {});
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setActivityLog([...cloudSync.getActivityLog()]), 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const loadThumbs = async () => {
      const imgs = Object.values(files).filter(f => !f.encrypted && f.mime?.startsWith('image/') && !thumbnails[f.id]).slice(0, 30);
      for (const file of imgs) {
        try {
          const data = await vault.readFile(file.id);
          if (data) {
            const url = URL.createObjectURL(new Blob([data], { type: file.mime }));
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
    e.preventDefault(); setLoginError('');
    try { await signInWithEmailAndPassword(auth, email, password); }
    catch { setLoginError('Invalid email or password.'); }
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
    if (file.encrypted) { alert('This file was synced from mobile (encrypted). Desktop decryption coming soon!'); return; }
    const data = await vault.readFile(file.id);
    if (!data) return;
    const url = URL.createObjectURL(new Blob([data], { type: file.mime }));
    const a = document.createElement('a'); a.href = url; a.download = file.name; a.click();
    URL.revokeObjectURL(url);
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

  const toggleAutostart = async () => { if (autostart) { await disable(); setAutostart(false); } else { await enable(); setAutostart(true); } };

  const handlePickFolder = async () => {
    try {
      const sel = await open({ directory: true, multiple: false, title: 'Select Vault Folder' });
      if (sel && typeof sel === 'string') { localStorage.setItem('chuchudu_vault_path', sel); setVaultPath(sel); }
    } catch {}
  };

  const handleConnectDrive = () => {
    const cid = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!cid) { alert('Add VITE_GOOGLE_CLIENT_ID to desktop-agent/.env.local'); return; }
    const scope = encodeURIComponent('https://www.googleapis.com/auth/drive.file email profile');
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${cid}&redirect_uri=http://localhost:1420&response_type=token&scope=${scope}`;
  };

  const handleDisconnectDrive = () => {
    localStorage.removeItem('chuchudu_drive_token'); localStorage.removeItem('chuchudu_drive_email');
    setDriveConnected(false); setDriveEmail(null);
  };

  const filtered = getFiltered();
  const totalFiles = Object.keys(files).length;
  const totalSize = Object.values(files).reduce((a, f) => a + (f.size || 0), 0);
  const navItems: Section[] = ['all', 'photos', 'videos', 'documents', 'starred'];
  const bottomItems: Section[] = ['activity', 'settings'];

  if (!user) return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm flex flex-col gap-6">
        <div className="flex flex-col items-center gap-3 mb-2">
          <div style={{ transform: 'rotate(-5deg)' }}>
            <div className="bg-on-background text-background px-5 py-2 font-black text-2xl tracking-tight" style={{ fontFamily: 'Outfit,sans-serif' }}>Chuchudu</div>
          </div>
          <h1 className="font-headline-lg text-headline-lg uppercase border-b-4 border-on-background pb-2">Vault Login</h1>
        </div>
        <div className="bg-surface-container-lowest border-2 border-on-background p-8" style={{ boxShadow: '8px 8px 0 #1a1c1c' }}>
          <p className="font-label-caps text-label-caps uppercase tracking-widest text-on-surface-variant mb-6">Sign in to your vault</p>
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required
              className="bg-surface-container-low border-2 border-on-background px-4 py-3 font-body-md text-on-background focus:outline-none focus:border-primary w-full" />
            <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required
              className="bg-surface-container-low border-2 border-on-background px-4 py-3 font-body-md text-on-background focus:outline-none focus:border-primary w-full" />
            {loginError && <p className="font-label-caps text-label-caps text-error">{loginError}</p>}
            <button type="submit" className="bg-primary-fixed text-on-primary-fixed border-2 border-on-background px-6 py-3 font-button-text text-button-text uppercase mt-2"
              style={{ boxShadow: '4px 4px 0 #1a1c1c' }}>Connect Vault</button>
          </form>
        </div>
        <p className="font-label-caps text-label-caps text-on-surface-variant text-center uppercase tracking-widest">Use your chuchudu.in account</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-on-background flex" style={{ fontFamily: 'Inter,sans-serif' }}>
      <aside className="w-64 min-h-screen bg-surface-container-lowest border-r-2 border-on-background flex flex-col flex-shrink-0" style={{ boxShadow: '4px 0 0 #1a1c1c' }}>
        <div className="px-6 py-5 border-b-2 border-on-background">
          <div style={{ transform: 'rotate(-4deg)', display: 'inline-block' }}>
            <div className="bg-on-background text-background px-4 py-1.5 font-black text-xl tracking-tight" style={{ fontFamily: 'Outfit,sans-serif' }}>Chuchudu</div>
          </div>
        </div>
        <nav className="flex-grow px-3 py-4 flex flex-col gap-1">
          {navItems.map(s => (
            <button key={s} onClick={() => setSection(s)}
              className={`flex items-center gap-3 px-3 py-2.5 w-full text-left transition-colors ${section === s ? 'bg-primary-fixed text-on-primary-fixed border-2 border-on-background font-bold' : 'text-on-surface hover:bg-surface-container border-2 border-transparent'}`}>
              <span className="material-symbols-outlined text-xl" style={section === s ? { fontVariationSettings: "'FILL' 1" } : {}}>{SECTION_INFO[s].icon}</span>
              <span className="font-button-text text-button-text uppercase text-sm">{SECTION_INFO[s].label}</span>
            </button>
          ))}
          <div className="border-t-2 border-on-background my-2" />
          {bottomItems.map(s => (
            <button key={s} onClick={() => setSection(s)}
              className={`flex items-center gap-3 px-3 py-2.5 w-full text-left transition-colors ${section === s ? 'bg-primary-fixed text-on-primary-fixed border-2 border-on-background font-bold' : 'text-on-surface hover:bg-surface-container border-2 border-transparent'}`}>
              <span className="material-symbols-outlined text-xl">{SECTION_INFO[s].icon}</span>
              <span className="font-button-text text-button-text uppercase text-sm">{SECTION_INFO[s].label}</span>
            </button>
          ))}
        </nav>
        <div className="border-t-2 border-on-background p-4 flex flex-col gap-1.5">
          <div className="flex justify-between font-label-caps text-label-caps text-xs">
            <span className="text-on-surface-variant">Files</span><span>{totalFiles}</span>
          </div>
          <div className="flex justify-between font-label-caps text-label-caps text-xs">
            <span className="text-on-surface-variant">Storage</span><span>{fmtSize(totalSize)}</span>
          </div>
          <div className="w-full h-1 bg-surface-container mt-1">
            <div className="h-full bg-primary transition-all" style={{ width: `${Math.min((totalSize / 1073741824) * 100, 100)}%` }} />
          </div>
        </div>
        <div className="border-t-2 border-on-background p-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 bg-primary-fixed border-2 border-on-background flex items-center justify-center flex-shrink-0">
              <span className="font-black text-xs text-on-primary-fixed">{user.email?.charAt(0).toUpperCase()}</span>
            </div>
            <span className="font-label-caps text-label-caps text-on-surface-variant truncate text-xs">{user.email}</span>
          </div>
          <button onClick={() => signOut(auth)} title="Sign Out" className="flex-shrink-0 border-2 border-transparent hover:border-on-background p-1 hover:bg-surface-container transition-colors">
            <span className="material-symbols-outlined text-lg">logout</span>
          </button>
        </div>
      </aside>

      <div className="flex-grow flex flex-col min-w-0">
        <header className="border-b-2 border-on-background bg-background px-6 py-3 flex items-center gap-4 flex-shrink-0">
          <h1 className="font-headline-md text-headline-md uppercase border-b-2 border-on-background pb-1 mr-2 flex-shrink-0">{SECTION_INFO[section].label}</h1>
          {!['activity', 'settings'].includes(section) && (
            <div className="flex-grow max-w-sm">
              <div className="flex items-center gap-2 bg-surface-container-low border-2 border-on-background px-3 py-2">
                <span className="material-symbols-outlined text-on-surface-variant text-xl">search</span>
                <input type="text" placeholder="Search files..." value={search} onChange={e => setSearch(e.target.value)}
                  className="bg-transparent font-body-md text-on-background placeholder-on-surface-variant focus:outline-none w-full text-sm" />
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
              className="flex items-center gap-2 bg-primary-fixed text-on-primary-fixed border-2 border-on-background px-4 py-2 font-button-text text-button-text uppercase transition-all"
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
            <span className="font-label-caps text-label-caps text-on-primary-container">Uploading... {uploadProgress}%</span>
            <div className="flex-grow h-1 bg-primary-fixed/30"><div className="h-full bg-primary transition-all" style={{ width: `${uploadProgress}%` }} /></div>
          </div>
        )}

        <main className="flex-grow overflow-y-auto p-6">
          {!['activity', 'settings'].includes(section) && (
            filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 gap-4">
                <span className="material-symbols-outlined text-6xl text-on-surface-variant">
                  {section === 'starred' ? 'star' : 'folder_open'}
                </span>
                <p className="font-body-lg text-on-surface-variant text-center">
                  {search ? 'No files match your search' : section === 'starred' ? 'No starred files yet' : 'No files here yet. Upload something!'}
                </p>
                {!search && section === 'all' && (
                  <button onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 bg-on-background text-background border-2 border-on-background px-6 py-3 font-button-text text-button-text uppercase"
                    style={{ boxShadow: '4px 4px 0 #444' }}>
                    <span className="material-symbols-outlined">upload</span>Upload Files
                  </button>
                )}
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))' }}>
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
                      <p className="font-label-caps text-label-caps text-xs truncate" title={file.name}>{file.name}</p>
                      <p className="text-on-surface-variant font-label-caps text-label-caps text-xs mt-0.5">{fmtSize(file.size || 0)}</p>
                    </div>
                    <div className="absolute inset-0 bg-background/85 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={e => { e.stopPropagation(); handleDownload(file); }} className="border-2 border-on-background bg-background p-1.5 hover:bg-surface-container" title="Download">
                        <span className="material-symbols-outlined text-sm">download</span>
                      </button>
                      <button onClick={e => { e.stopPropagation(); handleStar(file); }} className="border-2 border-on-background bg-background p-1.5 hover:bg-surface-container" title="Star">
                        <span className="material-symbols-outlined text-sm" style={file.starred ? { fontVariationSettings: "'FILL' 1", color: 'var(--md-sys-color-primary)' } : {}}>star</span>
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
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col divide-y-2 divide-outline-variant border-2 border-on-background" style={{ boxShadow: '4px 4px 0 #1a1c1c' }}>
                <div className="grid grid-cols-12 gap-4 px-4 py-2 bg-surface-container font-label-caps text-label-caps text-on-surface-variant uppercase text-xs">
                  <div className="col-span-5">Name</div><div className="col-span-2">Size</div>
                  <div className="col-span-3">Modified</div><div className="col-span-2 text-right">Actions</div>
                </div>
                {filtered.map(file => (
                  <div key={file.id} className="grid grid-cols-12 gap-4 px-4 py-3 items-center hover:bg-surface-container-low cursor-pointer" onClick={() => setSelectedFile(file)}>
                    <div className="col-span-5 flex items-center gap-3 min-w-0">
                      <span className="material-symbols-outlined text-primary flex-shrink-0">{getFileIcon(file.mime || '')}</span>
                      <span className="font-body-md text-on-background truncate">{file.name}</span>
                      {file.encrypted && <span className="material-symbols-outlined text-xs text-on-surface-variant flex-shrink-0">lock</span>}
                    </div>
                    <div className="col-span-2 font-label-caps text-label-caps text-on-surface-variant text-xs">{fmtSize(file.size || 0)}</div>
                    <div className="col-span-3 font-label-caps text-label-caps text-on-surface-variant text-xs">{fmtDate(file.modified || '')}</div>
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

          {section === 'activity' && (
            <div className="flex flex-col gap-4">
              <div className="border-2 border-on-background bg-surface-container-lowest" style={{ boxShadow: '4px 4px 0 #1a1c1c' }}>
                <div className="border-b-2 border-on-background px-4 py-3 bg-surface-container flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary">sync</span>
                  <h2 className="font-label-caps text-label-caps uppercase tracking-widest">Recent Transfers</h2>
                </div>
                {activityLog.length === 0 ? (
                  <div className="p-10 flex flex-col items-center gap-3 text-center">
                    <span className="material-symbols-outlined text-5xl text-on-surface-variant">cloud_sync</span>
                    <p className="font-body-md text-on-surface-variant max-w-xs">No transfers yet. Files synced from your phone will appear here.</p>
                  </div>
                ) : (
                  <div className="divide-y-2 divide-outline-variant">
                    {[...activityLog].reverse().map(entry => (
                      <div key={entry.id} className="flex items-center gap-4 px-4 py-3 hover:bg-surface-container-low transition-colors">
                        <div className={`w-9 h-9 border-2 border-on-background flex items-center justify-center flex-shrink-0 ${entry.action === 'synced' ? 'bg-primary-container' : 'bg-error-container'}`}>
                          <span className="material-symbols-outlined text-sm">{entry.action === 'synced' ? 'cloud_download' : 'error'}</span>
                        </div>
                        <div className="flex-grow min-w-0">
                          <p className="font-body-md text-on-background truncate">{entry.fileName}</p>
                          <p className="font-label-caps text-label-caps text-on-surface-variant text-xs">
                            {entry.action === 'synced' ? 'Synced from cloud' : 'Sync failed'} • {fmtSize(entry.size)} • {entry.timestamp.toLocaleTimeString()}
                          </p>
                        </div>
                        <span className={`font-label-caps text-label-caps uppercase border-2 border-on-background px-2 py-0.5 text-xs flex-shrink-0 ${entry.action === 'synced' ? 'bg-primary-fixed text-on-primary-fixed' : 'bg-error-container text-on-error-container'}`}>
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
                      <span className="font-label-caps text-label-caps text-on-surface-variant uppercase text-xs">{item.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${item.ok ? 'bg-primary animate-pulse' : 'bg-error'}`} />
                      <span className="font-body-md text-on-background text-sm truncate">{item.value}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {section === 'settings' && (
            <div className="flex flex-col gap-6 max-w-2xl">
              <section className="border-2 border-on-background bg-surface-container-lowest p-6 flex flex-col gap-4" style={{ boxShadow: '4px 4px 0 #1a1c1c' }}>
                <h2 className="font-headline-md text-headline-md uppercase border-b-2 border-on-background pb-2">Account</h2>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary-fixed border-2 border-on-background flex items-center justify-center">
                    <span className="font-black text-xl text-on-primary-fixed">{user.email?.charAt(0).toUpperCase()}</span>
                  </div>
                  <div>
                    <p className="font-body-md text-on-background">{user.email}</p>
                    <p className="font-label-caps text-label-caps text-on-surface-variant">ChuChudu Account</p>
                  </div>
                </div>
                <button onClick={() => signOut(auth)}
                  className="self-start flex items-center gap-2 border-2 border-on-background bg-error-container text-on-error-container px-4 py-2 font-button-text text-button-text uppercase"
                  style={{ boxShadow: '3px 3px 0 #1a1c1c' }}>
                  <span className="material-symbols-outlined text-xl">logout</span>Sign Out
                </button>
              </section>

              <section className="border-2 border-on-background bg-surface-container-lowest p-6 flex flex-col gap-4" style={{ boxShadow: '4px 4px 0 #1a1c1c' }}>
                <h2 className="font-headline-md text-headline-md uppercase border-b-2 border-on-background pb-2">Vault Folder</h2>
                <p className="font-body-md text-on-surface-variant">Files are stored and encrypted here on your local machine.</p>
                <div className="flex items-center gap-3">
                  <div className="flex-grow flex items-center gap-2 bg-surface-container-low border-2 border-on-background px-4 py-3">
                    <span className="material-symbols-outlined text-primary">folder_open</span>
                    <code className="font-label-caps text-label-caps text-on-background truncate text-sm">{vaultPath}</code>
                  </div>
                  <button onClick={handlePickFolder}
                    className="bg-on-background text-background border-2 border-on-background px-4 py-3 font-button-text text-button-text uppercase whitespace-nowrap"
                    style={{ boxShadow: '3px 3px 0 #444' }}>Change</button>
                </div>
              </section>

              <section className="border-2 border-on-background bg-surface-container-lowest p-6 flex items-center justify-between gap-4" style={{ boxShadow: '4px 4px 0 #1a1c1c' }}>
                <div>
                  <h2 className="font-headline-md text-headline-md uppercase">Autostart</h2>
                  <p className="font-body-md text-on-surface-variant mt-1">Start vault automatically when Windows starts.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer" onClick={toggleAutostart}>
                  <input type="checkbox" checked={autostart} readOnly className="sr-only peer" />
                  <div className="w-14 h-8 bg-surface-container-high border-2 border-on-background peer-checked:bg-primary-fixed peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-on-background after:h-6 after:w-6 after:transition-all rounded-none" />
                </label>
              </section>

              <section className="border-2 border-on-background bg-surface-container-lowest p-6 flex flex-col gap-4" style={{ boxShadow: '4px 4px 0 #1a1c1c' }}>
                <h2 className="font-headline-md text-headline-md uppercase border-b-2 border-on-background pb-2">Google Drive Buffer</h2>
                <p className="font-body-md text-on-surface-variant">When your laptop is OFF, files from your phone go here temporarily. The agent downloads them automatically.</p>
                {driveConnected ? (
                  <div className="flex items-center justify-between bg-primary-container border-2 border-on-background p-4">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-on-primary-container" style={{ fontVariationSettings: "'FILL' 1" }}>cloud_done</span>
                      <div>
                        <div className="font-label-caps text-label-caps uppercase text-on-primary-container">Connected</div>
                        <div className="font-body-md text-on-primary-container">{driveEmail}</div>
                      </div>
                    </div>
                    <button onClick={handleDisconnectDrive}
                      className="border-2 border-on-background bg-error-container text-on-error-container px-4 py-2 font-button-text text-button-text uppercase">
                      Disconnect
                    </button>
                  </div>
                ) : (
                  <button onClick={handleConnectDrive}
                    className="self-start flex items-center gap-3 bg-primary-container text-on-primary-container border-2 border-on-background px-6 py-3 font-button-text text-button-text uppercase"
                    style={{ boxShadow: '3px 3px 0 #1a1c1c' }}>
                    <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M15.203 5.454h-6.406L5.602 11h6.406l3.195-5.546zM20.203 14h-6.406l-3.195-5.546 3.195-5.545h6.406l3.195 5.545-3.195 5.546zM11.992 19.546l-3.195-5.546h-6.406l3.195 5.546h6.406z" fill="currentColor" /></svg>
                    Connect Google Drive
                  </button>
                )}
              </section>

              <div className="border-2 border-on-background bg-primary-fixed p-4 flex items-start gap-3" style={{ boxShadow: '3px 3px 0 #1a1c1c' }}>
                <span className="material-symbols-outlined text-on-primary-fixed">lightbulb</span>
                <p className="font-label-caps text-label-caps text-on-primary-fixed">This window can be closed safely - the vault keeps running and all file transfers continue in the background.</p>
              </div>
            </div>
          )}
        </main>
      </div>

      {selectedFile && (
        <div className="fixed inset-0 bg-background/90 flex items-center justify-center z-50 p-4" onClick={() => setSelectedFile(null)}>
          <div className="bg-surface-container-lowest border-2 border-on-background w-full max-w-md flex flex-col"
            style={{ boxShadow: '8px 8px 0 #1a1c1c' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b-2 border-on-background bg-surface-container">
              <div className="flex items-center gap-2 min-w-0">
                <span className="material-symbols-outlined text-primary">{getFileIcon(selectedFile.mime || '')}</span>
                <h3 className="font-button-text text-button-text uppercase truncate">{selectedFile.name}</h3>
              </div>
              <button onClick={() => setSelectedFile(null)} className="flex-shrink-0 p-1 hover:bg-surface-dim">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="flex items-center justify-center bg-surface-container min-h-48 p-4 border-b-2 border-on-background">
              {thumbnails[selectedFile.id]
                ? <img src={thumbnails[selectedFile.id]} alt={selectedFile.name} className="max-h-56 max-w-full object-contain" />
                : <div className="flex flex-col items-center gap-2">
                    <span className="material-symbols-outlined text-8xl text-on-surface-variant">{getFileIcon(selectedFile.mime || '')}</span>
                    {selectedFile.encrypted && <div className="flex items-center gap-2 font-label-caps text-label-caps text-on-surface-variant text-xs"><span className="material-symbols-outlined text-sm">lock</span>Encrypted</div>}
                  </div>
              }
            </div>
            <div className="px-4 py-3 border-b-2 border-on-background flex flex-col gap-1.5">
              {[['Size', fmtSize(selectedFile.size || 0)], ['Modified', fmtDate(selectedFile.modified || '')], ['Type', selectedFile.mime || 'Unknown']].map(([k, v]) => (
                <div key={k} className="flex justify-between font-label-caps text-label-caps text-xs">
                  <span className="text-on-surface-variant">{k}</span><span className="truncate max-w-48 text-right">{v}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-2 p-4">
              <button onClick={() => handleDownload(selectedFile)}
                className="flex-1 flex items-center justify-center gap-2 bg-primary-fixed text-on-primary-fixed border-2 border-on-background py-2.5 font-button-text text-button-text uppercase"
                style={{ boxShadow: '3px 3px 0 #1a1c1c' }}>
                <span className="material-symbols-outlined text-xl">download</span>Download
              </button>
              <button onClick={() => { handleStar(selectedFile); setSelectedFile({ ...selectedFile, starred: !selectedFile.starred }); }}
                className={`flex items-center justify-center border-2 border-on-background py-2.5 px-4 ${selectedFile.starred ? 'bg-primary-fixed text-on-primary-fixed' : 'bg-surface-container'}`}>
                <span className="material-symbols-outlined text-xl" style={selectedFile.starred ? { fontVariationSettings: "'FILL' 1" } : {}}>star</span>
              </button>
              <button onClick={() => handleDelete(selectedFile)}
                className="flex items-center justify-center bg-error-container text-on-error-container border-2 border-on-background py-2.5 px-4">
                <span className="material-symbols-outlined text-xl">delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

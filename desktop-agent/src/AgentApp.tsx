import React, { useEffect, useState, useRef, useCallback } from 'react';
import { vault, type VaultFile, type Album } from './services/vaultManager';
import { p2pReceiver } from './services/p2pReceiver';
import { auth, firestore } from './config/firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, setDoc, onSnapshot, deleteDoc } from 'firebase/firestore';
import { enable, disable, isEnabled } from '@tauri-apps/plugin-autostart';
import { open as openDialog, save as saveDialog } from '@tauri-apps/plugin-dialog';
import { open as openUrl } from '@tauri-apps/plugin-shell';
import { writeFile, BaseDirectory } from '@tauri-apps/plugin-fs';
import { cloudSync, type ActivityEntry } from './services/cloudSync';

type Section = 'all' | 'photos' | 'videos' | 'documents' | 'albums' | 'starred' | 'activity' | 'settings';
type ViewMode = 'grid' | 'list';

const SECTION_INFO: Record<Section, { label: string; icon: string }> = {
  all: { label: 'All Files', icon: 'folder' },
  photos: { label: 'Photos', icon: 'photo_library' },
  videos: { label: 'Videos', icon: 'video_library' },
  documents: { label: 'Documents', icon: 'description' },
  albums: { label: 'Albums', icon: 'photo_album' },
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

import chuchuduLogo from './assets/chuchudu_logo.jpg';

const isTauri = () => typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

// ─── Real Brand Logo Component ───────────────────────────────────────────────
function ChuchuduLogo({ size = 40, className = "" }: { size?: number; className?: string }) {
  return (
    <img
      src={chuchuduLogo}
      alt="Chuchudu"
      className={`rounded-xl object-contain select-none pointer-events-none border-2 border-on-background ${className}`}
      style={{
        width: size,
        height: size,
        boxShadow: '3px 3px 0 #1a1c1c'
      }}
    />
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
              style={{ boxShadow: '4px 4px 0 #1a1c1c' }}>
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
function FilePreviewModal({
  file,
  onClose,
  onDownload,
  onStar,
  onDelete,
  onAddToAlbum,
  onSetAsCover,
  activeAlbum,
  onRemoveFromAlbum,
}: {
  file: VaultFile;
  onClose: () => void;
  onDownload: (f: VaultFile) => void;
  onStar: (f: VaultFile) => void;
  onDelete: (f: VaultFile) => void;
  onAddToAlbum?: (f: VaultFile) => void;
  onSetAsCover?: (f: VaultFile) => void;
  activeAlbum?: Album | null;
  onRemoveFromAlbum?: (f: VaultFile) => void;
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
            {activeAlbum && activeAlbum.coverFileId === file.id && (
              <span className="bg-primary-container text-on-primary-container text-[10px] font-bold uppercase px-2 py-0.5 border border-on-background">
                Album Cover
              </span>
            )}
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
        <div className="flex flex-wrap gap-2 p-4 flex-shrink-0">
          <button onClick={() => onDownload(file)}
            className="flex-1 flex items-center justify-center gap-1.5 bg-primary-fixed text-on-primary-fixed border-2 border-on-background py-2 px-3 font-bold text-xs uppercase"
            style={{ boxShadow: '3px 3px 0 #1a1c1c' }}>
            <span className="material-symbols-outlined text-lg">download</span>Download
          </button>

          {/* Add to Album Action */}
          {onAddToAlbum && (
            <button onClick={() => onAddToAlbum(file)}
              className="flex items-center justify-center gap-1.5 bg-surface-container-high border-2 border-on-background py-2 px-3 hover:bg-surface-dim font-bold text-xs uppercase transition-colors"
              title="Add to Album">
              <span className="material-symbols-outlined text-lg text-primary">photo_album</span>
              <span>Add to Album</span>
            </button>
          )}

          {/* Set as Album Cover (if in album view and file is an image) */}
          {isImage && onSetAsCover && activeAlbum && (
            <button onClick={() => onSetAsCover(file)}
              className={`flex items-center justify-center gap-1.5 border-2 border-on-background py-2 px-3 font-bold text-xs uppercase transition-colors ${activeAlbum.coverFileId === file.id ? 'bg-primary text-on-primary' : 'bg-surface-container hover:bg-surface-dim'}`}
              title="Set as Album Cover">
              <span className="material-symbols-outlined text-lg">wallpaper</span>
              <span>{activeAlbum.coverFileId === file.id ? 'Current Cover' : 'Set as Cover'}</span>
            </button>
          )}

          {/* Remove from Album */}
          {activeAlbum && onRemoveFromAlbum && (
            <button onClick={() => onRemoveFromAlbum(file)}
              className="flex items-center justify-center gap-1 bg-surface-container border-2 border-on-background py-2 px-3 hover:bg-error-container text-xs font-bold uppercase transition-colors"
              title="Remove from this album">
              <span className="material-symbols-outlined text-lg">folder_delete</span>
              <span>Remove</span>
            </button>
          )}

          <button onClick={() => onStar(file)}
            className={`flex items-center justify-center border-2 border-on-background py-2 px-3 transition-colors ${file.starred ? 'bg-primary-fixed text-on-primary-fixed' : 'bg-surface-container hover:bg-surface-dim'}`}>
            <span className="material-symbols-outlined text-lg" style={file.starred ? { fontVariationSettings: "'FILL' 1" } : {}}>star</span>
          </button>

          <button onClick={() => onDelete(file)}
            className="flex items-center justify-center bg-error-container text-on-error-container border-2 border-on-background py-2 px-3 hover:brightness-95">
            <span className="material-symbols-outlined text-lg">delete</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Create Album Modal ───────────────────────────────────────────────────────
function CreateAlbumModal({
  files,
  thumbnails,
  onClose,
  onCreate,
}: {
  files: Record<string, VaultFile>;
  thumbnails: Record<string, string>;
  onClose: () => void;
  onCreate: (name: string, description: string, coverFileId?: string, fileIds?: string[]) => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const [coverFileId, setCoverFileId] = useState<string | undefined>(undefined);

  const imageFiles = Object.values(files).filter(f => f.mime?.startsWith('image/'));

  const toggleSelectFile = (id: string) => {
    setSelectedFileIds(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      if (!coverFileId && next.length > 0) setCoverFileId(next[0]);
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate(name.trim(), description.trim(), coverFileId, selectedFileIds);
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-surface-container-lowest border-4 border-on-background w-full max-w-xl flex flex-col max-h-[90vh]"
        style={{ boxShadow: '10px 10px 0 #1a1c1c' }} onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="bg-primary-container border-b-4 border-on-background p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-2xl text-on-background font-black">photo_album</span>
            <h2 className="font-black text-lg uppercase tracking-tight text-on-background">Create New Album</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-primary/20 border-2 border-transparent hover:border-on-background">
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex flex-col gap-5">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1">
              Album Title *
            </label>
            <input
              type="text"
              placeholder="e.g. Summer Vacation, Road Trip, Work Archive"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              autoFocus
              className="w-full bg-surface-container-low border-2 border-on-background px-4 py-2.5 text-sm font-bold text-on-background focus:outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1">
              Description (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Photos and memories from our trip"
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full bg-surface-container-low border-2 border-on-background px-4 py-2 text-sm text-on-background focus:outline-none focus:border-primary"
            />
          </div>

          {/* Photo & Cover Selector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                Select Initial Photos &amp; Choose Cover
              </label>
              <span className="text-xs text-on-surface-variant">
                {selectedFileIds.length} selected
              </span>
            </div>

            {imageFiles.length === 0 ? (
              <div className="border-2 border-dashed border-on-background p-6 text-center bg-surface-container-low">
                <span className="material-symbols-outlined text-3xl text-on-surface-variant mb-1">add_photo_alternate</span>
                <p className="text-xs text-on-surface-variant">No photos in vault yet. You can still create the album and add photos later!</p>
              </div>
            ) : (
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-48 overflow-y-auto p-2 border-2 border-on-background bg-surface-container-low">
                {imageFiles.map(file => {
                  const isSelected = selectedFileIds.includes(file.id);
                  const isCover = coverFileId === file.id;
                  return (
                    <div
                      key={file.id}
                      onClick={() => {
                        toggleSelectFile(file.id);
                      }}
                      className={`relative aspect-square border-2 cursor-pointer overflow-hidden transition-all group ${
                        isSelected ? 'border-primary ring-2 ring-primary' : 'border-on-background hover:border-primary'
                      }`}
                    >
                      {thumbnails[file.id] ? (
                        <img src={thumbnails[file.id]} alt={file.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-surface-container flex items-center justify-center">
                          <span className="material-symbols-outlined text-xl">image</span>
                        </div>
                      )}

                      {/* Checkbox badge */}
                      <div className={`absolute top-1 left-1 w-5 h-5 border border-on-background flex items-center justify-center ${isSelected ? 'bg-primary text-on-primary' : 'bg-background/80'}`}>
                        {isSelected && <span className="material-symbols-outlined text-xs">check</span>}
                      </div>

                      {/* Cover selection badge */}
                      {isSelected && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCoverFileId(file.id);
                          }}
                          className={`absolute bottom-1 right-1 text-[9px] px-1 py-0.5 uppercase font-bold border border-on-background ${isCover ? 'bg-primary-fixed text-on-primary-fixed' : 'bg-surface/90 text-on-surface hover:bg-primary-fixed'}`}
                          title="Set as Album Cover"
                        >
                          {isCover ? '★ Cover' : 'Make Cover'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={!name.trim()}
              className="flex-1 bg-primary text-on-primary border-2 border-on-background py-3 font-black text-sm uppercase brutal-shadow hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all disabled:opacity-60"
            >
              Create Album
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 border-2 border-on-background bg-surface-container font-bold text-sm uppercase hover:bg-surface-dim"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Select Album Cover Modal ────────────────────────────────────────────────
function SelectCoverModal({
  album,
  files,
  thumbnails,
  onClose,
  onSelectCover,
}: {
  album: Album;
  files: Record<string, VaultFile>;
  thumbnails: Record<string, string>;
  onClose: () => void;
  onSelectCover: (coverFileId: string) => void;
}) {
  // Show all files in album first, or all vault images if album is empty
  const albumImages = album.fileIds
    .map(id => files[id])
    .filter(f => f && f.mime?.startsWith('image/'));

  const candidateImages = albumImages.length > 0 
    ? albumImages 
    : Object.values(files).filter(f => f.mime?.startsWith('image/'));

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-surface-container-lowest border-4 border-on-background w-full max-w-xl flex flex-col max-h-[90vh]"
        style={{ boxShadow: '10px 10px 0 #1a1c1c' }} onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="bg-primary-container border-b-4 border-on-background p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-2xl text-on-background font-black">wallpaper</span>
            <h2 className="font-black text-lg uppercase tracking-tight text-on-background">
              Select Cover for "{album.name}"
            </h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-primary/20 border-2 border-transparent hover:border-on-background">
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto">
          <p className="text-xs text-on-surface-variant font-bold uppercase tracking-wider mb-4">
            Click any photo below to set it as the cover image:
          </p>

          {candidateImages.length === 0 ? (
            <div className="p-8 text-center border-2 border-dashed border-on-background bg-surface-container-low">
              <span className="material-symbols-outlined text-4xl text-on-surface-variant mb-2">image_not_supported</span>
              <p className="text-sm text-on-surface-variant font-bold">No photos found to use as cover.</p>
              <p className="text-xs text-on-surface-variant mt-1">Upload some photos to your vault first!</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-80 overflow-y-auto p-1">
              {candidateImages.map(file => {
                const isCurrent = album.coverFileId === file.id;
                return (
                  <div
                    key={file.id}
                    onClick={() => {
                      onSelectCover(file.id);
                      onClose();
                    }}
                    className={`group relative aspect-square border-2 cursor-pointer overflow-hidden transition-all ${
                      isCurrent ? 'border-primary ring-4 ring-primary' : 'border-on-background hover:scale-102 hover:border-primary'
                    }`}
                  >
                    {thumbnails[file.id] ? (
                      <img src={thumbnails[file.id]} alt={file.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-surface-container flex items-center justify-center">
                        <span className="material-symbols-outlined text-2xl">image</span>
                      </div>
                    )}
                    {isCurrent && (
                      <div className="absolute inset-0 bg-primary/30 flex items-center justify-center">
                        <span className="bg-primary-fixed text-on-primary-fixed border border-on-background px-2 py-0.5 text-xs font-black uppercase">
                          Current Cover
                        </span>
                      </div>
                    )}
                    <div className="absolute bottom-0 inset-x-0 bg-black/75 p-1 text-[10px] text-white truncate opacity-0 group-hover:opacity-100 transition-opacity">
                      {file.name}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-4 border-t-2 border-on-background bg-surface-container flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 border-2 border-on-background bg-surface-container-lowest font-bold text-xs uppercase hover:bg-surface-dim"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Add Photos to Album Modal ───────────────────────────────────────────────
function AddPhotosToAlbumModal({
  album,
  files,
  thumbnails,
  onClose,
  onAdd,
}: {
  album: Album;
  files: Record<string, VaultFile>;
  thumbnails: Record<string, string>;
  onClose: () => void;
  onAdd: (fileIds: string[]) => void;
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Files not yet in the album
  const availableFiles = Object.values(files).filter(f => !album.fileIds.includes(f.id));

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleConfirm = () => {
    if (selectedIds.length === 0) return;
    onAdd(selectedIds);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-surface-container-lowest border-4 border-on-background w-full max-w-xl flex flex-col max-h-[90vh]"
        style={{ boxShadow: '10px 10px 0 #1a1c1c' }} onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="bg-primary-container border-b-4 border-on-background p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-2xl text-on-background font-black">add_photo_alternate</span>
            <h2 className="font-black text-lg uppercase tracking-tight text-on-background">
              Add Files to "{album.name}"
            </h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-primary/20 border-2 border-transparent hover:border-on-background">
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-on-surface-variant font-bold uppercase tracking-wider">
              Select files from your vault:
            </p>
            <span className="text-xs font-bold text-primary">
              {selectedIds.length} files selected
            </span>
          </div>

          {availableFiles.length === 0 ? (
            <div className="p-8 text-center border-2 border-dashed border-on-background bg-surface-container-low">
              <span className="material-symbols-outlined text-4xl text-on-surface-variant mb-2">done_all</span>
              <p className="text-sm text-on-surface-variant font-bold">All vault files are already in this album!</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-72 overflow-y-auto p-1 border-2 border-on-background bg-surface-container-low">
              {availableFiles.map(file => {
                const isSelected = selectedIds.includes(file.id);
                return (
                  <div
                    key={file.id}
                    onClick={() => toggleSelect(file.id)}
                    className={`relative aspect-square border-2 cursor-pointer overflow-hidden transition-all ${
                      isSelected ? 'border-primary ring-2 ring-primary' : 'border-on-background hover:border-primary'
                    }`}
                  >
                    {thumbnails[file.id] ? (
                      <img src={thumbnails[file.id]} alt={file.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-surface-container flex flex-col items-center justify-center p-2 text-center">
                        <span className="material-symbols-outlined text-2xl text-on-surface-variant">{getFileIcon(file.mime || '')}</span>
                        <span className="text-[9px] truncate max-w-full mt-1">{file.name}</span>
                      </div>
                    )}

                    <div className={`absolute top-1 left-1 w-5 h-5 border border-on-background flex items-center justify-center ${isSelected ? 'bg-primary text-on-primary' : 'bg-background/85'}`}>
                      {isSelected && <span className="material-symbols-outlined text-xs">check</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t-2 border-on-background bg-surface-container flex gap-3">
          <button
            onClick={handleConfirm}
            disabled={selectedIds.length === 0}
            className="flex-1 bg-primary text-on-primary border-2 border-on-background py-2.5 font-bold text-xs uppercase brutal-shadow hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all disabled:opacity-60"
          >
            Add Selected ({selectedIds.length})
          </button>
          <button
            onClick={onClose}
            className="px-6 py-2.5 border-2 border-on-background bg-surface-container-lowest font-bold text-xs uppercase hover:bg-surface-dim"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Assign File to Album Modal ──────────────────────────────────────────────
function AssignFileToAlbumModal({
  file,
  albums,
  onClose,
  onToggleAlbum,
  onCreateNew,
}: {
  file: VaultFile;
  albums: Record<string, Album>;
  onClose: () => void;
  onToggleAlbum: (albumId: string, isInAlbum: boolean) => void;
  onCreateNew: () => void;
}) {
  const albumList = Object.values(albums);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-surface-container-lowest border-4 border-on-background w-full max-w-md flex flex-col max-h-[90vh]"
        style={{ boxShadow: '10px 10px 0 #1a1c1c' }} onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="bg-primary-container border-b-4 border-on-background p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-2xl text-on-background font-black">photo_album</span>
            <h2 className="font-black text-base uppercase tracking-tight text-on-background">
              Add to Album
            </h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-primary/20 border-2 border-transparent hover:border-on-background">
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto flex flex-col gap-4">
          <div className="flex items-center gap-3 p-3 border-2 border-on-background bg-surface-container-low">
            <span className="material-symbols-outlined text-primary text-2xl">{getFileIcon(file.mime || '')}</span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold truncate">{file.name}</p>
              <p className="text-[10px] text-on-surface-variant uppercase">{fmtSize(file.size || 0)}</p>
            </div>
          </div>

          <p className="text-xs font-bold uppercase text-on-surface-variant tracking-wider">
            Select albums to include this file in:
          </p>

          {albumList.length === 0 ? (
            <div className="p-6 text-center border-2 border-dashed border-on-background bg-surface-container-low">
              <p className="text-xs text-on-surface-variant font-bold mb-3">No albums created yet.</p>
              <button
                onClick={() => {
                  onClose();
                  onCreateNew();
                }}
                className="bg-primary text-on-primary border-2 border-on-background px-4 py-2 text-xs font-bold uppercase brutal-shadow"
              >
                + Create First Album
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
              {albumList.map(alb => {
                const isIn = alb.fileIds.includes(file.id);
                return (
                  <div
                    key={alb.id}
                    onClick={() => onToggleAlbum(alb.id, isIn)}
                    className={`flex items-center justify-between p-3 border-2 border-on-background cursor-pointer transition-all ${
                      isIn ? 'bg-primary-container brutal-shadow' : 'bg-surface-container hover:bg-surface-dim'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="material-symbols-outlined text-lg">{isIn ? 'folder_open' : 'folder'}</span>
                      <div className="min-w-0">
                        <p className="text-xs font-bold truncate">{alb.name}</p>
                        <p className="text-[10px] text-on-surface-variant">{alb.fileIds.length} items</p>
                      </div>
                    </div>
                    <div className={`w-5 h-5 border-2 border-on-background flex items-center justify-center ${isIn ? 'bg-primary text-on-primary' : 'bg-surface'}`}>
                      {isIn && <span className="material-symbols-outlined text-xs">check</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t-2 border-on-background bg-surface-container flex justify-between items-center">
          <button
            onClick={() => {
              onClose();
              onCreateNew();
            }}
            className="text-xs font-bold uppercase text-primary hover:underline flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-sm">add</span>+ New Album
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-on-background text-background border-2 border-on-background text-xs font-bold uppercase"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

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
  const [albums, setAlbums] = useState<Record<string, Album>>({});
  const [activeAlbumId, setActiveAlbumId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedFile, setSelectedFile] = useState<VaultFile | null>(null);
  const [activityLog, setActivityLog] = useState<ActivityEntry[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Modals state
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showCreateAlbumModal, setShowCreateAlbumModal] = useState(false);
  const [showSelectCoverModal, setShowSelectCoverModal] = useState<Album | null>(null);
  const [showAddPhotosModal, setShowAddPhotosModal] = useState<Album | null>(null);
  const [showAssignFileModal, setShowAssignFileModal] = useState<VaultFile | null>(null);

  const [autostart, setAutostart] = useState(false);
  const [vaultPath, setVaultPath] = useState('');
  const [driveConnected, setDriveConnected] = useState(false);
  const [driveEmail, setDriveEmail] = useState<string | null>(null);
  const [driveConnecting, setDriveConnecting] = useState(false);
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = localStorage.getItem('chuchudu_drive_token');
    const em = localStorage.getItem('chuchudu_drive_email');
    if (t) { setDriveConnected(true); setDriveEmail(em); }
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) {
        vault.init().then(() => {
          vault.getManifest().then(setFiles);
          vault.getAlbums().then(setAlbums);
        });
        p2pReceiver.start();
        cloudSync.start();

        const onboarded = localStorage.getItem('chuchudu_onboarded');
        const hasDrive = localStorage.getItem('chuchudu_drive_token');
        if (!onboarded && !hasDrive) {
          setShowOnboarding(true);
        }
      }
    });

    const refreshFiles = () => {
      vault.getManifest().then(setFiles);
      setActivityLog([...cloudSync.getActivityLog()]);
    };
    const refreshAlbums = () => {
      vault.getAlbums().then(setAlbums);
    };

    window.addEventListener('vault-updated', refreshFiles);
    window.addEventListener('albums-updated', refreshAlbums);

    return () => {
      unsub();
      window.removeEventListener('vault-updated', refreshFiles);
      window.removeEventListener('albums-updated', refreshAlbums);
    };
  }, []);

  useEffect(() => {
    vault.getVaultDir().then(setVaultPath);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setActivityLog([...cloudSync.getActivityLog()]), 3000);
    return () => clearInterval(interval);
  }, []);

  // Thumbnail generation for all image files
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
    
    // If inside an active album
    if (section === 'albums' && activeAlbumId && albums[activeAlbumId]) {
      const albumFileIds = new Set(albums[activeAlbumId].fileIds);
      result = result.filter(f => albumFileIds.has(f.id));
    } else {
      switch (section) {
        case 'photos': result = result.filter(f => f.mime?.startsWith('image/')); break;
        case 'videos': result = result.filter(f => f.mime?.startsWith('video/')); break;
        case 'documents': result = result.filter(f => f.mime?.startsWith('application/') || f.mime?.startsWith('text/')); break;
        case 'starred': result = result.filter(f => f.starred); break;
        default: break;
      }
    }

    if (search.trim()) result = result.filter(f => f.name.toLowerCase().includes(search.toLowerCase()));
    return result.sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime());
  }, [files, section, activeAlbumId, albums, search]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setLoginError(''); setLoggingIn(true);
    try { await signInWithEmailAndPassword(auth, email, password); }
    catch { setLoginError('Invalid email or password. Try again.'); }
    finally { setLoggingIn(false); }
  };

  const handleUpload = async (fl: FileList) => {
    setUploading(true); setUploadProgress(0);
    const addedIds: string[] = [];
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
        addedIds.push(id);
        setUploadProgress(Math.round(((i + 1) / fl.length) * 100));
      } catch (e) { console.error(e); }
    }

    // If uploading while inside an album, automatically add files to this album!
    if (section === 'albums' && activeAlbumId && addedIds.length > 0) {
      await vault.addFilesToAlbum(activeAlbumId, addedIds);
      vault.getAlbums().then(setAlbums);
    }

    vault.getManifest().then(setFiles);
    setUploading(false);
  };

  const handleDownload = async (file: VaultFile) => {
    const data = await vault.readFile(file.id);
    if (!data) { alert('File data not found in vault.'); return; }

    if (isTauri()) {
      try {
        const savePath = await saveDialog({
          defaultPath: file.name,
          title: 'Save File',
        });
        if (!savePath) return;
        await writeFile(savePath, data, { baseDir: BaseDirectory.Home });
        await openUrl(savePath);
      } catch (e) {
        console.error('Download error:', e);
        alert('Failed to save file: ' + String(e));
      }
    } else {
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
    vault.getAlbums().then(setAlbums);
    if (selectedFile?.id === file.id) setSelectedFile(null);
  };

  // ── Album Handlers ────────────────────────────────────────────────────────
  const handleCreateAlbum = async (name: string, description: string, coverFileId?: string, fileIds: string[] = []) => {
    const newAlb = await vault.createAlbum(name, description, coverFileId, fileIds);
    vault.getAlbums().then(setAlbums);
    setShowCreateAlbumModal(false);
    setActiveAlbumId(newAlb.id);
    setSection('albums');
  };

  const handleDeleteAlbum = async (albumId: string) => {
    const alb = albums[albumId];
    if (!alb) return;
    if (!confirm(`Delete album "${alb.name}"? (Files will remain safely in your vault)`)) return;
    await vault.deleteAlbum(albumId);
    vault.getAlbums().then(setAlbums);
    if (activeAlbumId === albumId) setActiveAlbumId(null);
  };

  const handleSetCover = async (albumId: string, fileId: string) => {
    await vault.setAlbumCover(albumId, fileId);
    vault.getAlbums().then(setAlbums);
  };

  const handleAddFilesToAlbum = async (albumId: string, fileIds: string[]) => {
    await vault.addFilesToAlbum(albumId, fileIds);
    vault.getAlbums().then(setAlbums);
  };

  const handleRemoveFileFromAlbum = async (albumId: string, fileId: string) => {
    await vault.removeFileFromAlbum(albumId, fileId);
    vault.getAlbums().then(setAlbums);
    if (selectedFile?.id === fileId) setSelectedFile(null);
  };

  const handleToggleFileInAlbum = async (albumId: string, isInAlbum: boolean) => {
    if (!showAssignFileModal) return;
    if (isInAlbum) {
      await vault.removeFileFromAlbum(albumId, showAssignFileModal.id);
    } else {
      await vault.addFilesToAlbum(albumId, [showAssignFileModal.id]);
    }
    vault.getAlbums().then(setAlbums);
  };

  const toggleAutostart = async () => {
    if (autostart) { await disable(); setAutostart(false); }
    else { await enable(); setAutostart(true); }
  };

  const handlePickFolder = async () => {
    try {
      const sel = await openDialog({ directory: true, multiple: false, title: 'Choose Storage Folder' });
      if (sel && typeof sel === 'string') {
        await vault.setVaultDir(sel);
        setVaultPath(sel);
        vault.getManifest().then(setFiles);
      }
    } catch (e) {
      console.error('Error selecting folder:', e);
    }
  };

  const handleOpenInExplorer = async () => {
    try {
      const dir = await vault.getVaultDir();
      if (isTauri()) {
        await openUrl(dir);
      }
    } catch (e) {
      console.error('Error opening explorer:', e);
    }
  };

  const handleConnectDrive = async () => {
    const cid = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!cid) { alert('VITE_GOOGLE_CLIENT_ID is not set in .env.local'); return; }
    if (!auth.currentUser) return;

    setDriveConnecting(true);
    const uid = auth.currentUser.uid;

    try {
      const pendingRef = doc(firestore, `users/${uid}/oauth/drive_pending`);
      await setDoc(pendingRef, { requested: new Date().toISOString(), status: 'pending' });

      const scope = encodeURIComponent('https://www.googleapis.com/auth/drive.file email profile');
      const redirectUri = encodeURIComponent('https://chuchudu.in/oauth');
      const oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${cid}&redirect_uri=${redirectUri}&response_type=token&scope=${scope}&state=${uid}`;

      if (isTauri()) {
        await openUrl(oauthUrl);
      } else {
        window.open(oauthUrl, '_blank');
      }

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
            deleteDoc(tokenRef).catch(() => {});
            deleteDoc(pendingRef).catch(() => {});
            unsubscribe();
            setDriveConnecting(false);
          }
        }
      });

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
  const navItems: Section[] = ['all', 'photos', 'videos', 'documents', 'albums', 'starred'];
  const bottomItems: Section[] = ['activity', 'settings'];

  const activeAlbum = activeAlbumId ? albums[activeAlbumId] : null;

  // ── Login Screen ──────────────────────────────────────────────────────────
  if (!user) return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm flex flex-col gap-6">
        <div className="flex flex-col items-center gap-4 mb-2">
          <div style={{ transform: 'rotate(-3deg)' }}>
            <ChuchuduLogo size={108} />
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

      {/* Create Album Modal */}
      {showCreateAlbumModal && (
        <CreateAlbumModal
          files={files}
          thumbnails={thumbnails}
          onClose={() => setShowCreateAlbumModal(false)}
          onCreate={handleCreateAlbum}
        />
      )}

      {/* Select Cover Modal */}
      {showSelectCoverModal && (
        <SelectCoverModal
          album={showSelectCoverModal}
          files={files}
          thumbnails={thumbnails}
          onClose={() => setShowSelectCoverModal(null)}
          onSelectCover={(fileId) => handleSetCover(showSelectCoverModal.id, fileId)}
        />
      )}

      {/* Add Photos to Album Modal */}
      {showAddPhotosModal && (
        <AddPhotosToAlbumModal
          album={showAddPhotosModal}
          files={files}
          thumbnails={thumbnails}
          onClose={() => setShowAddPhotosModal(null)}
          onAdd={(fileIds) => handleAddFilesToAlbum(showAddPhotosModal.id, fileIds)}
        />
      )}

      {/* Assign File to Album Modal */}
      {showAssignFileModal && (
        <AssignFileToAlbumModal
          file={showAssignFileModal}
          albums={albums}
          onClose={() => setShowAssignFileModal(null)}
          onToggleAlbum={handleToggleFileInAlbum}
          onCreateNew={() => setShowCreateAlbumModal(true)}
        />
      )}

      {/* Sidebar */}
      <aside className="w-64 min-h-screen bg-surface-container-lowest border-r-2 border-on-background flex flex-col flex-shrink-0"
        style={{ boxShadow: '4px 0 0 #1a1c1c' }}>
        <div className="px-5 py-4 border-b-2 border-on-background flex items-center gap-3">
          <ChuchuduLogo size={32} />
          <span className="font-black text-lg uppercase tracking-tight">Chuchudu</span>
        </div>

        <nav className="flex-grow px-3 py-4 flex flex-col gap-1">
          {navItems.map(s => {
            const isCurrent = section === s;
            return (
              <button key={s} onClick={() => {
                setSection(s);
                if (s !== 'albums') setActiveAlbumId(null);
              }}
                className={`flex items-center gap-3 px-3 py-2.5 w-full text-left transition-colors ${isCurrent ? 'bg-primary-fixed text-on-primary-fixed border-2 border-on-background font-bold' : 'text-on-surface hover:bg-surface-container border-2 border-transparent'}`}>
                <span className="material-symbols-outlined text-xl" style={isCurrent ? { fontVariationSettings: "'FILL' 1" } : {}}>{SECTION_INFO[s].icon}</span>
                <span className="font-bold text-sm uppercase">{SECTION_INFO[s].label}</span>
              </button>
            );
          })}
          <div className="border-t-2 border-on-background my-2" />
          {bottomItems.map(s => (
            <button key={s} onClick={() => {
              setSection(s);
              setActiveAlbumId(null);
            }}
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
          
          {/* Header Title / Breadcrumb */}
          {section === 'albums' && activeAlbum ? (
            <div className="flex items-center gap-2 min-w-0 flex-shrink-0">
              <button
                onClick={() => setActiveAlbumId(null)}
                className="flex items-center gap-1 font-bold text-xs uppercase text-on-surface-variant hover:text-on-background border-2 border-on-background px-2 py-1 bg-surface-container hover:bg-surface-dim"
              >
                <span className="material-symbols-outlined text-sm">arrow_back</span>
                Albums
              </button>
              <span className="text-on-surface-variant">/</span>
              <h1 className="font-black text-lg uppercase truncate">{activeAlbum.name}</h1>
            </div>
          ) : (
            <h1 className="font-black text-lg uppercase border-b-2 border-on-background pb-1 mr-2 flex-shrink-0">
              {SECTION_INFO[section].label}
            </h1>
          )}

          {!['activity', 'settings'].includes(section) && (
            <div className="flex-grow max-w-sm">
              <div className="flex items-center gap-2 bg-surface-container-low border-2 border-on-background px-3 py-2">
                <span className="material-symbols-outlined text-on-surface-variant text-xl">search</span>
                <input
                  type="text"
                  placeholder={section === 'albums' && !activeAlbum ? 'Search albums...' : 'Search files...'}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="bg-transparent text-sm text-on-background placeholder-on-surface-variant focus:outline-none w-full"
                />
                {search && <button onClick={() => setSearch('')}><span className="material-symbols-outlined text-sm">close</span></button>}
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 ml-auto">
            {/* View Mode Switcher */}
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

            {/* Album Creation Action */}
            {section === 'albums' && !activeAlbum && (
              <button
                onClick={() => setShowCreateAlbumModal(true)}
                className="flex items-center gap-2 bg-primary-container text-on-primary-container border-2 border-on-background px-4 py-2 font-bold text-sm uppercase transition-all"
                style={{ boxShadow: '3px 3px 0 #1a1c1c' }}
              >
                <span className="material-symbols-outlined text-xl">add_photo_alternate</span>+ New Album
              </button>
            )}

            {/* Upload Action */}
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
          
          {/* ── Albums Overview (All Albums Grid) ── */}
          {section === 'albums' && !activeAlbum && (
            <div>
              {Object.keys(albums).length === 0 ? (
                <div className="flex flex-col items-center justify-center h-80 gap-4 border-4 border-dashed border-on-background bg-surface-container-low p-8 text-center">
                  <span className="material-symbols-outlined text-6xl text-primary">photo_album</span>
                  <div>
                    <h3 className="font-black text-lg uppercase mb-1">No Albums Created Yet</h3>
                    <p className="text-sm text-on-surface-variant max-w-sm">
                      Create custom photo &amp; media albums, choose custom covers, and organize your files.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowCreateAlbumModal(true)}
                    className="flex items-center gap-2 bg-primary text-on-primary border-2 border-on-background px-6 py-3 font-bold text-sm uppercase brutal-shadow hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
                  >
                    <span className="material-symbols-outlined">add</span>Create Your First Album
                  </button>
                </div>
              ) : (
                <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))' }}>
                  
                  {/* Create New Album Card */}
                  <div
                    onClick={() => setShowCreateAlbumModal(true)}
                    className="border-2 border-dashed border-on-background bg-surface-container-lowest flex flex-col items-center justify-center p-6 cursor-pointer hover:bg-primary-container/20 hover:border-primary transition-colors text-center aspect-square"
                    style={{ boxShadow: '4px 4px 0 #1a1c1c' }}
                  >
                    <div className="w-12 h-12 rounded-full border-2 border-on-background bg-primary-container flex items-center justify-center mb-3">
                      <span className="material-symbols-outlined text-2xl text-on-background font-bold">add</span>
                    </div>
                    <span className="font-black text-sm uppercase">Create Album</span>
                    <span className="text-xs text-on-surface-variant mt-1">Organize photos &amp; files</span>
                  </div>

                  {/* Album Cards */}
                  {Object.values(albums)
                    .filter(alb => !search.trim() || alb.name.toLowerCase().includes(search.toLowerCase()))
                    .map(alb => {
                      const coverFile = alb.coverFileId ? files[alb.coverFileId] : null;
                      const coverThumbnail = alb.coverFileId ? thumbnails[alb.coverFileId] : null;
                      const itemCount = alb.fileIds.length;

                      return (
                        <div
                          key={alb.id}
                          onClick={() => setActiveAlbumId(alb.id)}
                          className="group border-2 border-on-background bg-surface-container-lowest flex flex-col cursor-pointer hover:border-primary transition-all relative overflow-hidden"
                          style={{ boxShadow: '4px 4px 0 #1a1c1c' }}
                        >
                          {/* Album Cover Art */}
                          <div className="aspect-square bg-surface-container flex items-center justify-center overflow-hidden border-b-2 border-on-background relative">
                            {coverThumbnail ? (
                              <img src={coverThumbnail} alt={alb.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                            ) : coverFile ? (
                              <div className="flex flex-col items-center gap-1 text-on-surface-variant">
                                <span className="material-symbols-outlined text-5xl">{getFileIcon(coverFile.mime)}</span>
                                <span className="text-xs font-bold uppercase">{coverFile.name}</span>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center gap-1 text-on-surface-variant">
                                <span className="material-symbols-outlined text-5xl">photo_library</span>
                                <span className="text-xs font-bold uppercase">Empty Album</span>
                              </div>
                            )}

                            {/* Item Count Pill */}
                            <div className="absolute top-2 right-2 bg-on-background text-background border border-on-background px-2.5 py-0.5 text-[11px] font-black uppercase">
                              {itemCount} {itemCount === 1 ? 'item' : 'items'}
                            </div>

                            {/* Cover Badge */}
                            {coverThumbnail && (
                              <div className="absolute bottom-2 left-2 bg-primary-fixed/90 text-on-primary-fixed border border-on-background px-2 py-0.5 text-[9px] font-black uppercase tracking-wider">
                                Cover
                              </div>
                            )}
                          </div>

                          {/* Album Details */}
                          <div className="p-3.5 flex flex-col flex-grow">
                            <h3 className="font-black text-sm uppercase truncate" title={alb.name}>{alb.name}</h3>
                            {alb.description && (
                              <p className="text-xs text-on-surface-variant truncate mt-0.5">{alb.description}</p>
                            )}
                            <p className="text-[10px] text-on-surface-variant uppercase mt-auto pt-2">
                              Updated {fmtDate(alb.modified)}
                            </p>
                          </div>

                          {/* Quick Action Overlay on Hover */}
                          <div className="absolute inset-0 bg-background/90 flex flex-col items-center justify-center gap-2 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveAlbumId(alb.id);
                              }}
                              className="w-full bg-primary text-on-primary border-2 border-on-background py-2 text-xs font-bold uppercase brutal-shadow"
                            >
                              Open Album
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowSelectCoverModal(alb);
                              }}
                              className="w-full bg-surface-container border-2 border-on-background py-1.5 text-xs font-bold uppercase hover:bg-surface-dim"
                            >
                              Change Cover
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowAddPhotosModal(alb);
                              }}
                              className="w-full bg-surface-container border-2 border-on-background py-1.5 text-xs font-bold uppercase hover:bg-surface-dim"
                            >
                              + Add Photos
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteAlbum(alb.id);
                              }}
                              className="text-[10px] text-error font-bold uppercase hover:underline mt-1"
                            >
                              Delete Album
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}

          {/* ── Active Album Details View ── */}
          {section === 'albums' && activeAlbum && (
            <div className="flex flex-col gap-6">
              
              {/* Album Header Banner */}
              <div className="border-4 border-on-background bg-surface-container-lowest p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
                style={{ boxShadow: '6px 6px 0 #1a1c1c' }}>
                
                <div className="flex items-center gap-4 min-w-0">
                  {/* Cover Preview Thumbnail */}
                  <div
                    onClick={() => setShowSelectCoverModal(activeAlbum)}
                    className="w-20 h-20 sm:w-24 sm:h-24 bg-surface-container border-2 border-on-background flex-shrink-0 overflow-hidden relative group cursor-pointer"
                    title="Click to change cover"
                  >
                    {activeAlbum.coverFileId && thumbnails[activeAlbum.coverFileId] ? (
                      <img src={thumbnails[activeAlbum.coverFileId]} alt="Cover" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="material-symbols-outlined text-3xl text-on-surface-variant">photo_album</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-bold uppercase text-center p-1">
                      <span className="material-symbols-outlined text-sm">wallpaper</span>
                      Change Cover
                    </div>
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="bg-primary-fixed text-on-primary-fixed text-[10px] font-black uppercase px-2 py-0.5 border border-on-background">
                        ALBUM
                      </span>
                      <span className="text-xs text-on-surface-variant font-bold">
                        {activeAlbum.fileIds.length} {activeAlbum.fileIds.length === 1 ? 'file' : 'files'}
                      </span>
                    </div>
                    <h2 className="font-black text-xl sm:text-2xl uppercase tracking-tight truncate">{activeAlbum.name}</h2>
                    {activeAlbum.description && (
                      <p className="text-xs sm:text-sm text-on-surface-variant mt-0.5">{activeAlbum.description}</p>
                    )}
                    <p className="text-[10px] text-on-surface-variant uppercase mt-1">
                      Created {fmtDate(activeAlbum.created)}
                    </p>
                  </div>
                </div>

                {/* Album Action Buttons */}
                <div className="flex flex-wrap items-center gap-2 self-stretch md:self-auto">
                  <button
                    onClick={() => setShowAddPhotosModal(activeAlbum)}
                    className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 bg-primary text-on-primary border-2 border-on-background px-4 py-2.5 font-bold text-xs uppercase brutal-shadow"
                  >
                    <span className="material-symbols-outlined text-sm">add_photo_alternate</span>
                    + Add Files
                  </button>
                  <button
                    onClick={() => setShowSelectCoverModal(activeAlbum)}
                    className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 bg-surface-container border-2 border-on-background px-3 py-2.5 font-bold text-xs uppercase hover:bg-surface-dim"
                  >
                    <span className="material-symbols-outlined text-sm">wallpaper</span>
                    Change Cover
                  </button>
                  <button
                    onClick={() => handleDeleteAlbum(activeAlbum.id)}
                    className="p-2.5 bg-error-container text-on-error-container border-2 border-on-background hover:brightness-95"
                    title="Delete Album"
                  >
                    <span className="material-symbols-outlined text-sm">delete</span>
                  </button>
                </div>
              </div>

              {/* Album Files Content */}
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 gap-4 border-2 border-dashed border-on-background bg-surface-container-low p-8 text-center">
                  <span className="material-symbols-outlined text-5xl text-on-surface-variant">photo_library</span>
                  <div>
                    <h3 className="font-bold text-base uppercase mb-1">This album is empty</h3>
                    <p className="text-xs text-on-surface-variant">Add photos from your vault or drag files into the window to upload.</p>
                  </div>
                  <button
                    onClick={() => setShowAddPhotosModal(activeAlbum)}
                    className="flex items-center gap-2 bg-primary text-on-primary border-2 border-on-background px-5 py-2.5 font-bold text-xs uppercase brutal-shadow"
                  >
                    <span className="material-symbols-outlined text-sm">add</span>Add Photos Now
                  </button>
                </div>
              ) : viewMode === 'grid' ? (
                <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))' }}>
                  {filtered.map(file => (
                    <div key={file.id} className="group border-2 border-on-background bg-surface-container-lowest flex flex-col cursor-pointer hover:border-primary transition-colors relative overflow-hidden"
                      style={{ boxShadow: '4px 4px 0 #1a1c1c' }} onClick={() => setSelectedFile(file)}>
                      
                      <div className="aspect-square bg-surface-container flex items-center justify-center overflow-hidden border-b-2 border-on-background relative">
                        {thumbnails[file.id]
                          ? <img src={thumbnails[file.id]} alt={file.name} className="w-full h-full object-cover" />
                          : <span className="material-symbols-outlined text-5xl text-on-surface-variant">{getFileIcon(file.mime || '')}</span>
                        }

                        {activeAlbum.coverFileId === file.id && (
                          <div className="absolute top-1 left-1 bg-primary-fixed text-on-primary-fixed border border-on-background px-1.5 py-0.5 text-[9px] font-black uppercase">
                            ★ Cover
                          </div>
                        )}
                      </div>

                      <div className="p-2">
                        <p className="text-xs font-bold truncate" title={file.name}>{file.name}</p>
                        <p className="text-on-surface-variant text-xs mt-0.5">{fmtSize(file.size || 0)}</p>
                      </div>

                      {/* Hover Actions */}
                      <div className="absolute inset-0 bg-background/85 flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity p-2">
                        <button onClick={e => { e.stopPropagation(); setSelectedFile(file); }} className="border-2 border-on-background bg-background p-1.5 hover:bg-surface-container" title="Preview">
                          <span className="material-symbols-outlined text-sm">visibility</span>
                        </button>
                        {file.mime?.startsWith('image/') && (
                          <button onClick={e => { e.stopPropagation(); handleSetCover(activeAlbum.id, file.id); }} className="border-2 border-on-background bg-background p-1.5 hover:bg-primary-container" title="Set as Cover">
                            <span className="material-symbols-outlined text-sm">wallpaper</span>
                          </button>
                        )}
                        <button onClick={e => { e.stopPropagation(); handleRemoveFileFromAlbum(activeAlbum.id, file.id); }} className="border-2 border-on-background bg-background p-1.5 hover:bg-error-container" title="Remove from Album">
                          <span className="material-symbols-outlined text-sm">folder_delete</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="border-2 border-on-background bg-surface-container-lowest overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b-2 border-on-background bg-surface-container font-bold uppercase">
                        <th className="p-3">Name</th>
                        <th className="p-3">Size</th>
                        <th className="p-3">Modified</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y border-on-background">
                      {filtered.map(file => (
                        <tr key={file.id} onClick={() => setSelectedFile(file)} className="hover:bg-surface-container-low cursor-pointer">
                          <td className="p-3 flex items-center gap-2 min-w-0">
                            <span className="material-symbols-outlined text-primary">{getFileIcon(file.mime)}</span>
                            <span className="font-bold truncate">{file.name}</span>
                            {activeAlbum.coverFileId === file.id && (
                              <span className="text-[9px] bg-primary-fixed px-1.5 py-0.5 border font-bold uppercase">Cover</span>
                            )}
                          </td>
                          <td className="p-3 text-on-surface-variant whitespace-nowrap">{fmtSize(file.size)}</td>
                          <td className="p-3 text-on-surface-variant whitespace-nowrap">{fmtDate(file.modified)}</td>
                          <td className="p-3 text-right whitespace-nowrap" onClick={e => e.stopPropagation()}>
                            <button onClick={() => handleSetCover(activeAlbum.id, file.id)} className="p-1 hover:text-primary font-bold text-xs uppercase mr-2" title="Set as Cover">Cover</button>
                            <button onClick={() => handleRemoveFileFromAlbum(activeAlbum.id, file.id)} className="p-1 text-error hover:underline font-bold text-xs uppercase">Remove</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── Standard File Grid / List (For All, Photos, Videos, Documents, Starred) ── */}
          {!['activity', 'settings', 'albums'].includes(section) && (
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
                    
                    {/* Hover Actions */}
                    <div className="absolute inset-0 bg-background/85 flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={e => { e.stopPropagation(); setSelectedFile(file); }} className="border-2 border-on-background bg-background p-1.5 hover:bg-surface-container" title="Preview">
                        <span className="material-symbols-outlined text-sm">visibility</span>
                      </button>
                      <button onClick={e => { e.stopPropagation(); setShowAssignFileModal(file); }} className="border-2 border-on-background bg-background p-1.5 hover:bg-primary-container" title="Add to Album">
                        <span className="material-symbols-outlined text-sm">photo_album</span>
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
              <div className="border-2 border-on-background bg-surface-container-lowest overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b-2 border-on-background bg-surface-container font-bold uppercase">
                      <th className="p-3">Name</th>
                      <th className="p-3">Size</th>
                      <th className="p-3">Modified</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y border-on-background">
                    {filtered.map(file => (
                      <tr key={file.id} onClick={() => setSelectedFile(file)} className="hover:bg-surface-container-low cursor-pointer">
                        <td className="p-3 flex items-center gap-2 min-w-0">
                          <span className="material-symbols-outlined text-primary">{getFileIcon(file.mime)}</span>
                          <span className="font-bold truncate">{file.name}</span>
                        </td>
                        <td className="p-3 text-on-surface-variant whitespace-nowrap">{fmtSize(file.size)}</td>
                        <td className="p-3 text-on-surface-variant whitespace-nowrap">{fmtDate(file.modified)}</td>
                        <td className="p-3 text-right whitespace-nowrap" onClick={e => e.stopPropagation()}>
                          <button onClick={() => setShowAssignFileModal(file)} className="p-1 hover:text-primary mr-1" title="Add to Album">
                            <span className="material-symbols-outlined text-base">photo_album</span>
                          </button>
                          <button onClick={() => handleDownload(file)} className="p-1 hover:text-primary mr-1" title="Download">
                            <span className="material-symbols-outlined text-base">download</span>
                          </button>
                          <button onClick={() => handleDelete(file)} className="p-1 hover:text-error" title="Delete">
                            <span className="material-symbols-outlined text-base">delete</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}

          {/* Activity Section */}
          {section === 'activity' && (
            <div className="flex flex-col gap-6 max-w-2xl">
              <div className="border-2 border-on-background bg-surface-container-lowest p-6" style={{ boxShadow: '4px 4px 0 #1a1c1c' }}>
                <div className="flex items-center justify-between border-b-2 border-on-background pb-3 mb-4">
                  <h2 className="font-black text-base uppercase">Real-Time Ingestion Feed</h2>
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
                    <span className="text-xs font-bold text-primary uppercase">Listening</span>
                  </div>
                </div>
                {activityLog.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3 text-on-surface-variant">
                    <span className="material-symbols-outlined text-5xl">sync</span>
                    <p className="text-sm">No activity recorded yet.</p>
                  </div>
                ) : (
                  <div className="flex flex-col divide-y-2 border-on-background max-h-96 overflow-y-auto">
                    {activityLog.map(entry => (
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

              {/* Storage Folder */}
              <section className="border-2 border-on-background bg-surface-container-lowest p-6 flex flex-col gap-4" style={{ boxShadow: '4px 4px 0 #1a1c1c' }}>
                <div className="flex items-center justify-between border-b-2 border-on-background pb-2">
                  <h2 className="font-black text-base uppercase">Storage Folder</h2>
                  <span className="text-xs font-bold uppercase bg-primary-fixed text-on-primary-fixed border border-on-background px-2 py-0.5">Active</span>
                </div>
                <p className="text-sm text-on-surface-variant leading-relaxed">
                  Choose any folder on your laptop or external drive where your photos and files will be stored. Files are saved directly with their original names so you can view and use them anytime in Windows File Explorer.
                </p>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <div className="flex-grow flex items-center gap-2 bg-surface-container-low border-2 border-on-background px-4 py-3 min-w-0">
                    <span className="material-symbols-outlined text-primary flex-shrink-0">folder_open</span>
                    <code className="text-xs text-on-background truncate font-mono">{vaultPath}</code>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={handlePickFolder}
                      className="bg-primary-fixed text-on-primary-fixed border-2 border-on-background px-4 py-3 font-bold text-sm uppercase whitespace-nowrap"
                      style={{ boxShadow: '3px 3px 0 #1a1c1c' }}>
                      Choose Folder
                    </button>
                    <button onClick={handleOpenInExplorer}
                      title="Open this folder in Windows File Explorer"
                      className="bg-on-background text-background border-2 border-on-background px-4 py-3 font-bold text-sm uppercase whitespace-nowrap flex items-center gap-1.5"
                      style={{ boxShadow: '3px 3px 0 #444' }}>
                      <span className="material-symbols-outlined text-lg">folder</span>
                      Open in Explorer
                    </button>
                  </div>
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
          onAddToAlbum={f => { setSelectedFile(null); setShowAssignFileModal(f); }}
          onSetAsCover={activeAlbum ? (f => handleSetCover(activeAlbum.id, f.id)) : undefined}
          activeAlbum={activeAlbum}
          onRemoveFromAlbum={activeAlbum ? (f => handleRemoveFileFromAlbum(activeAlbum.id, f.id)) : undefined}
        />
      )}
    </div>
  );
}

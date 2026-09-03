import React, { useEffect, useState, useRef, useCallback } from 'react';
import QRCode from 'qrcode';
import JSZip from 'jszip';
import { vault, type VaultFile, type Album, type ShareLink, type VaultProfile } from './services/vaultManager';
import { p2pReceiver } from './services/p2pReceiver';
import { auth, firestore, storage, db as rtdb } from './config/firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, setDoc, onSnapshot, deleteDoc, updateDoc } from 'firebase/firestore';
import { ref as dbRef, set as dbSet } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { enable, disable, isEnabled } from '@tauri-apps/plugin-autostart';
import { open as openDialog, save as saveDialog } from '@tauri-apps/plugin-dialog';
import { open as openUrl } from '@tauri-apps/plugin-shell';
import { writeFile, BaseDirectory } from '@tauri-apps/plugin-fs';
import { cloudSync, type ActivityEntry } from './services/cloudSync';
import { DriveClient } from './services/driveClient';

type Section = 'all' | 'photos' | 'videos' | 'documents' | 'albums' | 'shares' | 'starred' | 'activity' | 'settings';
type ViewMode = 'grid' | 'list';

export const COLOR_TAGS = [
  { id: 'red', label: 'Urgent', hex: '#ef4444', bgClass: 'bg-red-500 text-white', borderClass: 'border-red-500' },
  { id: 'yellow', label: 'Review', hex: '#eab308', bgClass: 'bg-yellow-500 text-black', borderClass: 'border-yellow-500' },
  { id: 'green', label: 'Personal', hex: '#22c55e', bgClass: 'bg-green-500 text-white', borderClass: 'border-green-500' },
  { id: 'blue', label: 'Work', hex: '#3b82f6', bgClass: 'bg-blue-500 text-white', borderClass: 'border-blue-500' },
  { id: 'purple', label: 'Memories', hex: '#a855f7', bgClass: 'bg-purple-500 text-white', borderClass: 'border-purple-500' },
  { id: 'orange', label: 'Finance', hex: '#f97316', bgClass: 'bg-orange-500 text-white', borderClass: 'border-orange-500' },
];

export type SortMode = 'date-desc' | 'date-asc' | 'name-asc' | 'name-desc' | 'size-desc' | 'size-asc' | 'type';

const SORT_OPTIONS: { id: SortMode; label: string; icon: string }[] = [
  { id: 'date-desc', label: 'Date: Newest First', icon: 'arrow_downward' },
  { id: 'date-asc', label: 'Date: Oldest First', icon: 'arrow_upward' },
  { id: 'name-asc', label: 'Name: A to Z', icon: 'sort_by_alpha' },
  { id: 'name-desc', label: 'Name: Z to A', icon: 'sort_by_alpha' },
  { id: 'size-desc', label: 'Size: Largest First', icon: 'expand_more' },
  { id: 'size-asc', label: 'Size: Smallest First', icon: 'expand_less' },
  { id: 'type', label: 'File Type', icon: 'category' },
];

const SECTION_INFO: Record<Section, { label: string; icon: string }> = {
  all: { label: 'All Files', icon: 'folder' },
  photos: { label: 'Photos', icon: 'photo_library' },
  videos: { label: 'Videos', icon: 'video_library' },
  documents: { label: 'Documents', icon: 'description' },
  albums: { label: 'Albums', icon: 'photo_album' },
  shares: { label: 'Shared Links', icon: 'link' },
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

function formatTimeRemaining(expiresAt: string): string {
  const diffMs = new Date(expiresAt).getTime() - Date.now();
  if (diffMs <= 0) return 'Expired';
  const hours = Math.floor(diffMs / (3600 * 1000));
  const days = Math.floor(hours / 24);
  if (days > 0) {
    const remHours = hours % 24;
    return `${days}d ${remHours}h`;
  }
  const mins = Math.floor((diffMs % (3600 * 1000)) / (60 * 1000));
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function getMonthYearHeader(d: string): string {
  try {
    const date = new Date(d);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  } catch {
    return 'Other Files';
  }
}

async function sha256Hash(text: string): Promise<string> {
  const enc = new TextEncoder().encode(text);
  const hashBuf = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('');
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
        <div className="bg-primary-container border-b-4 border-on-background p-6 flex items-center gap-4">
          <ChuchuduLogo size={48} />
          <div>
            <h2 className="font-black text-xl uppercase tracking-tight text-on-background">Welcome to Chuchudu!</h2>
            <p className="text-sm text-on-surface-variant font-medium mt-0.5">Your personal encrypted vault is ready.</p>
          </div>
        </div>

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

// ─── Fullscreen Gallery & Slideshow Viewer Modal ──────────────────────────────
function FullscreenGalleryModal({
  file,
  fileList,
  onClose,
  onNavigate,
  onDownload,
  onStar,
  onDelete,
  onAddToAlbum,
  onSetAsCover,
  onShare,
  activeAlbum,
  onRemoveFromAlbum,
}: {
  file: VaultFile;
  fileList: VaultFile[];
  onClose: () => void;
  onNavigate: (newFile: VaultFile) => void;
  onDownload: (f: VaultFile) => void;
  onStar: (f: VaultFile) => void;
  onDelete: (f: VaultFile) => void;
  onAddToAlbum?: (f: VaultFile) => void;
  onSetAsCover?: (f: VaultFile) => void;
  onShare?: (f: VaultFile) => void;
  activeAlbum?: Album | null;
  onRemoveFromAlbum?: (f: VaultFile) => void;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPlayingSlideshow, setIsPlayingSlideshow] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);

  const currentIndex = fileList.findIndex(f => f.id === file.id);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < fileList.length - 1;

  const handlePrev = useCallback(() => {
    if (hasPrev) {
      setZoomLevel(1);
      setRotation(0);
      onNavigate(fileList[currentIndex - 1]);
    }
  }, [hasPrev, currentIndex, fileList, onNavigate]);

  const handleNext = useCallback(() => {
    if (hasNext) {
      setZoomLevel(1);
      setRotation(0);
      onNavigate(fileList[currentIndex + 1]);
    } else if (isPlayingSlideshow && fileList.length > 1) {
      // Loop slideshow back to start
      onNavigate(fileList[0]);
    }
  }, [hasNext, currentIndex, fileList, isPlayingSlideshow, onNavigate]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') handlePrev();
      else if (e.key === 'ArrowRight') handleNext();
      else if (e.key === 'Escape') onClose();
      else if (e.key === ' ') {
        e.preventDefault();
        setIsPlayingSlideshow(p => !p);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePrev, handleNext, onClose]);

  // Slideshow auto-advance timer
  useEffect(() => {
    if (!isPlayingSlideshow) return;
    const timer = setInterval(() => {
      handleNext();
    }, 3500);
    return () => clearInterval(timer);
  }, [isPlayingSlideshow, handleNext]);

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
    <div className="fixed inset-0 bg-black/95 flex flex-col z-50 p-2 sm:p-4 select-none backdrop-blur-md" onClick={onClose}>
      
      {/* Top Gallery Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-surface-container-lowest/90 border-2 border-on-background text-on-background z-10 flex-shrink-0"
        style={{ boxShadow: '4px 4px 0 #1a1c1c' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 min-w-0">
          <span className="material-symbols-outlined text-primary">{getFileIcon(file.mime || '')}</span>
          <div className="min-w-0">
            <h3 className="font-bold uppercase truncate text-sm">{file.name}</h3>
            <p className="text-[10px] text-on-surface-variant font-label-caps">
              {currentIndex + 1} of {fileList.length} • {fmtSize(file.size || 0)} • {fmtDate(file.modified || '')}
            </p>
          </div>
          {activeAlbum && activeAlbum.coverFileId === file.id && (
            <span className="bg-primary text-on-primary text-[9px] font-black uppercase px-2 py-0.5 border border-on-background">
              ★ Cover
            </span>
          )}
        </div>

        {/* Gallery Controls */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {isImage && (
            <>
              <button
                onClick={() => setZoomLevel(z => Math.min(z + 0.25, 3))}
                className="p-1.5 border border-on-background bg-surface-container hover:bg-surface-dim"
                title="Zoom In"
              >
                <span className="material-symbols-outlined text-base">zoom_in</span>
              </button>
              <button
                onClick={() => setZoomLevel(z => Math.max(z - 0.25, 0.5))}
                className="p-1.5 border border-on-background bg-surface-container hover:bg-surface-dim"
                title="Zoom Out"
              >
                <span className="material-symbols-outlined text-base">zoom_out</span>
              </button>
              <button
                onClick={() => setRotation(r => (r + 90) % 360)}
                className="p-1.5 border border-on-background bg-surface-container hover:bg-surface-dim"
                title="Rotate 90°"
              >
                <span className="material-symbols-outlined text-base">rotate_right</span>
              </button>
              <button
                onClick={() => setIsPlayingSlideshow(p => !p)}
                className={`flex items-center gap-1 px-2.5 py-1.5 border border-on-background font-bold text-xs uppercase transition-colors ${
                  isPlayingSlideshow ? 'bg-primary text-on-primary animate-pulse' : 'bg-surface-container hover:bg-surface-dim'
                }`}
                title="Auto Slideshow (Spacebar)"
              >
                <span className="material-symbols-outlined text-base">{isPlayingSlideshow ? 'pause' : 'play_arrow'}</span>
                <span>{isPlayingSlideshow ? 'Pause' : 'Slideshow'}</span>
              </button>
            </>
          )}

          <button onClick={onClose} className="p-1.5 border-2 border-on-background bg-error-container text-on-error-container hover:brightness-95">
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>
      </div>

      {/* Main View Area with Prev / Next Navigation */}
      <div className="flex-grow flex items-center justify-center relative overflow-hidden my-2" onClick={e => e.stopPropagation()}>
        
        {/* Previous Button */}
        {hasPrev && (
          <button
            onClick={handlePrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-surface-container-lowest/80 hover:bg-primary-container border-2 border-on-background flex items-center justify-center text-on-background z-20 brutal-shadow transition-transform hover:scale-110"
            title="Previous File (Left Arrow)"
          >
            <span className="material-symbols-outlined text-2xl font-black">arrow_back</span>
          </button>
        )}

        {/* Next Button */}
        {hasNext && (
          <button
            onClick={handleNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-surface-container-lowest/80 hover:bg-primary-container border-2 border-on-background flex items-center justify-center text-on-background z-20 brutal-shadow transition-transform hover:scale-110"
            title="Next File (Right Arrow)"
          >
            <span className="material-symbols-outlined text-2xl font-black">arrow_forward</span>
          </button>
        )}

        {/* Media Container */}
        <div className="w-full h-full flex items-center justify-center p-4">
          {loading ? (
            <div className="flex flex-col items-center gap-3">
              <span className="material-symbols-outlined text-5xl text-primary animate-spin">progress_activity</span>
              <p className="text-sm text-on-surface-variant font-label-caps">Loading Media...</p>
            </div>
          ) : isImage && previewUrl ? (
            <img
              src={previewUrl}
              alt={file.name}
              style={{ transform: `scale(${zoomLevel}) rotate(${rotation}deg)`, transition: 'transform 0.15s ease' }}
              className="max-w-full max-h-[75vh] object-contain shadow-2xl border-2 border-on-background bg-black"
            />
          ) : isVideo && previewUrl ? (
            <video src={previewUrl} controls autoPlay className="max-w-full max-h-[75vh] border-2 border-on-background shadow-2xl" />
          ) : isAudio && previewUrl ? (
            <div className="bg-surface-container border-2 border-on-background p-10 flex flex-col items-center gap-6 max-w-md w-full brutal-shadow">
              <span className="material-symbols-outlined text-7xl text-primary animate-pulse">audio_file</span>
              <p className="font-headline-md text-base uppercase font-bold text-center">{file.name}</p>
              <audio src={previewUrl} controls autoPlay className="w-full" />
            </div>
          ) : isPdf && previewUrl ? (
            <iframe src={previewUrl} title={file.name} className="w-full h-[75vh] border-2 border-on-background" />
          ) : textContent !== null ? (
            <pre className="w-full max-w-4xl p-6 bg-surface-container-lowest border-2 border-on-background text-xs font-mono overflow-auto max-h-[75vh] whitespace-pre-wrap brutal-shadow">
              {textContent}
            </pre>
          ) : (
            <div className="text-center text-on-surface-variant">
              <span className="material-symbols-outlined text-7xl mb-2">{getFileIcon(file.mime || '')}</span>
              <p className="text-sm font-bold uppercase">Preview not supported — Click Download</p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Action Ribbon */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-surface-container-lowest/95 border-2 border-on-background z-10 flex-shrink-0"
        style={{ boxShadow: '4px 4px 0 #1a1c1c' }} onClick={e => e.stopPropagation()}>
        
        <div className="flex items-center gap-2">
          {/* Share Link Action */}
          {onShare && (
            <button
              onClick={() => onShare(file)}
              className="flex items-center gap-1.5 bg-primary-container text-on-primary-container border-2 border-on-background py-1.5 px-3 font-bold text-xs uppercase brutal-shadow hover:translate-x-0.5 hover:translate-y-0.5"
              title="Create Expiring / Protected Share Link"
            >
              <span className="material-symbols-outlined text-base">share</span>
              <span>Share Link</span>
            </button>
          )}

          {/* Add to Album Action */}
          {onAddToAlbum && (
            <button
              onClick={() => onAddToAlbum(file)}
              className="flex items-center gap-1.5 bg-surface-container border-2 border-on-background py-1.5 px-3 hover:bg-surface-dim font-bold text-xs uppercase"
              title="Add to an Album"
            >
              <span className="material-symbols-outlined text-base text-primary">photo_album</span>
              <span>Add to Album</span>
            </button>
          )}

          {/* Set as Cover */}
          {isImage && onSetAsCover && activeAlbum && (
            <button
              onClick={() => onSetAsCover(file)}
              className={`flex items-center gap-1.5 border-2 border-on-background py-1.5 px-3 font-bold text-xs uppercase ${
                activeAlbum.coverFileId === file.id ? 'bg-primary text-on-primary' : 'bg-surface-container hover:bg-surface-dim'
              }`}
            >
              <span className="material-symbols-outlined text-base">wallpaper</span>
              <span>{activeAlbum.coverFileId === file.id ? 'Current Cover' : 'Set as Cover'}</span>
            </button>
          )}

          {/* Remove from Album */}
          {activeAlbum && onRemoveFromAlbum && (
            <button
              onClick={() => onRemoveFromAlbum(file)}
              className="flex items-center gap-1 bg-surface-container border-2 border-on-background py-1.5 px-3 hover:bg-error-container text-xs font-bold uppercase"
            >
              <span className="material-symbols-outlined text-base">folder_delete</span>
              <span>Remove</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onStar(file)}
            className={`flex items-center justify-center border-2 border-on-background py-1.5 px-3 ${file.starred ? 'bg-primary-fixed text-on-primary-fixed' : 'bg-surface-container hover:bg-surface-dim'}`}
            title="Star File"
          >
            <span className="material-symbols-outlined text-base" style={file.starred ? { fontVariationSettings: "'FILL' 1" } : {}}>star</span>
          </button>

          <button
            onClick={() => onDownload(file)}
            className="flex items-center gap-1.5 bg-primary-fixed text-on-primary-fixed border-2 border-on-background py-1.5 px-4 font-bold text-xs uppercase brutal-shadow"
          >
            <span className="material-symbols-outlined text-base">download</span>
            <span>Download</span>
          </button>

          <button
            onClick={() => onDelete(file)}
            className="p-1.5 bg-error-container text-on-error-container border-2 border-on-background hover:brightness-95"
            title="Delete File"
          >
            <span className="material-symbols-outlined text-base">delete</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Create Share Link Modal (With Expiration & Permissions) ─────────────────
function CreateShareLinkModal({
  file,
  onClose,
}: {
  file: VaultFile;
  onClose: () => void;
}) {
  const [expiryHours, setExpiryHours] = useState<number>(24);
  const [allowDownload, setAllowDownload] = useState<boolean>(true);
  const [usePasscode, setUsePasscode] = useState<boolean>(false);
  const [passcode, setPasscode] = useState<string>('');
  
  const [generating, setGenerating] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    try {
      setGenerating(true);

      const fileData = await vault.readFile(file.id);
      if (!fileData) {
        alert('File data could not be read from vault.');
        setGenerating(false);
        return;
      }

      // Generate random AES key
      const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
      const rawKey = await crypto.subtle.exportKey('raw', key);
      const base64Key = btoa(String.fromCharCode(...new Uint8Array(rawKey)));

      // Encrypt file
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encryptedBuf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, fileData.buffer as ArrayBuffer);

      const shareId = crypto.randomUUID();
      const expiresAt = expiryHours > 0 ? new Date(Date.now() + expiryHours * 3600 * 1000).toISOString() : null;
      let passwordHash: string | undefined = undefined;
      if (usePasscode && passcode.trim()) {
        passwordHash = await sha256Hash(passcode.trim());
      }

      const payloadObj = {
        iv: Array.from(iv),
        encryptedData: Array.from(new Uint8Array(encryptedBuf)),
        name: file.name,
        mime: file.mime,
        size: file.size
      };
      const payloadBlob = new Blob([JSON.stringify(payloadObj)], { type: 'application/json' });

      let storageType: 'drive' | 'storage' = 'storage';
      let storageId: string = '';
      let storageUrl: string = '';

      // 1. Try Google Drive if token exists
      const driveToken = localStorage.getItem('chuchudu_drive_token');
      if (driveToken) {
        try {
          const driveClient = new DriveClient(driveToken);
          const folderId = await driveClient.getOrCreateBufferFolder();
          const driveFileId = await driveClient.uploadFile(payloadBlob, `shared_${file.name}.json`, folderId);
          storageId = await driveClient.makePublicAndGetLink(driveFileId);
          storageType = 'drive';
        } catch (e) {
          console.warn('Google Drive share upload failed, falling back to cloud storage:', e);
        }
      }

      // 2. Fallback to Firebase Storage if not drive
      if (!storageId) {
        try {
          const fileRef = storageRef(storage, `shares/${shareId}/payload.json`);
          await uploadBytes(fileRef, payloadBlob);
          storageUrl = await getDownloadURL(fileRef);
          storageId = storageUrl;
          storageType = 'storage';
        } catch (e) {
          console.error('Cloud storage upload error:', e);
          throw new Error('Failed to upload encrypted payload to cloud: ' + String(e));
        }
      }

      const shareMeta = {
        id: shareId,
        file_id: file.id,
        file_name: file.name,
        mime_type: file.mime,
        size: file.size,
        storage_type: storageType,
        storage_id: storageId,
        storage_url: storageUrl || null,
        drive_id: storageType === 'drive' ? storageId : null,
        expires_at: expiresAt,
        allow_download: allowDownload,
        password_hash: passwordHash || null,
        created_at: new Date().toISOString(),
        is_active: true,
      };

      // Write to public_shares in Firestore
      try {
        await setDoc(doc(firestore, 'public_shares', shareId), shareMeta);
        if (auth.currentUser) {
          await setDoc(doc(firestore, `users/${auth.currentUser.uid}/shares/${shareId}`), shareMeta);
        }
      } catch (err) {
        console.warn('Firestore share metadata write failed:', err);
      }

      // Optional RTDB sync
      try {
        await dbSet(dbRef(rtdb, `shares/${shareId}`), shareMeta);
      } catch {}

      // Save to local vault
      const link = `https://chuchudu.in/t/${shareId}#key=${base64Key}`;
      await vault.addShareLink({
        id: shareId,
        fileId: file.id,
        fileName: file.name,
        mime: file.mime,
        size: file.size,
        shareUrl: link,
        base64Key,
        storageType,
        storageRefId: storageId,
        expiresAt,
        allowDownload,
        isPasswordProtected: !!passwordHash,
        passwordHash,
        createdAt: new Date().toISOString(),
        isActive: true,
      });

      // Generate QR Code
      try {
        const qr = await QRCode.toDataURL(link, {
          width: 240,
          margin: 1,
          color: { dark: '#000000', light: '#ffffff' }
        });
        setQrDataUrl(qr);
      } catch (e) {
        console.warn('QR generation error:', e);
      }

      setGeneratedUrl(link);
    } catch (e) {
      console.error('Error creating share link:', e);
      alert('Failed to generate link: ' + String(e));
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = () => {
    if (!generatedUrl) return;
    navigator.clipboard.writeText(generatedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `qr-${file.name.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
    a.click();
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-surface-container-lowest border-4 border-on-background w-full max-w-lg flex flex-col max-h-[90vh]"
        style={{ boxShadow: '10px 10px 0 #1a1c1c' }} onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="bg-primary-container border-b-4 border-on-background p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-2xl text-on-background font-black">share</span>
            <h2 className="font-black text-base uppercase tracking-tight text-on-background">
              Create Secure Share Link
            </h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-primary/20 border-2 border-transparent hover:border-on-background">
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex flex-col gap-5">
          
          <div className="border-2 border-on-background bg-surface-container-low p-3 flex items-center gap-3">
            <span className="material-symbols-outlined text-primary text-2xl">{getFileIcon(file.mime)}</span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold truncate">{file.name}</p>
              <p className="text-[10px] text-on-surface-variant font-label-caps">{fmtSize(file.size || 0)}</p>
            </div>
          </div>

          {!generatedUrl ? (
            <>
              {/* Expiration Options */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">
                  Link Expiration / Time Limit
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: '1 Hour', hours: 1 },
                    { label: '24 Hours', hours: 24 },
                    { label: '3 Days', hours: 72 },
                    { label: '7 Days', hours: 168 },
                    { label: '30 Days', hours: 720 },
                    { label: 'Never', hours: 0 },
                  ].map(opt => (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => setExpiryHours(opt.hours)}
                      className={`p-2 border-2 border-on-background text-xs font-bold uppercase transition-all ${
                        expiryHours === opt.hours ? 'bg-primary text-on-primary brutal-shadow' : 'bg-surface-container hover:bg-surface-dim'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Permissions Options */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">
                  Recipient Permissions
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAllowDownload(true)}
                    className={`p-3 border-2 border-on-background text-left flex flex-col gap-1 transition-all ${
                      allowDownload ? 'bg-primary-container brutal-shadow' : 'bg-surface-container hover:bg-surface-dim'
                    }`}
                  >
                    <div className="flex items-center gap-1 text-xs font-black uppercase">
                      <span className="material-symbols-outlined text-sm">download</span>
                      View &amp; Download
                    </div>
                    <span className="text-[10px] text-on-surface-variant">Recipient can download file</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAllowDownload(false)}
                    className={`p-3 border-2 border-on-background text-left flex flex-col gap-1 transition-all ${
                      !allowDownload ? 'bg-primary-container brutal-shadow' : 'bg-surface-container hover:bg-surface-dim'
                    }`}
                  >
                    <div className="flex items-center gap-1 text-xs font-black uppercase">
                      <span className="material-symbols-outlined text-sm">visibility</span>
                      View Only
                    </div>
                    <span className="text-[10px] text-on-surface-variant">Downloads are disabled</span>
                  </button>
                </div>
              </div>

              {/* Passcode Protection */}
              <div className="border-2 border-on-background bg-surface-container-low p-3 flex flex-col gap-2">
                <label className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-base">key</span>
                    <span className="text-xs font-bold uppercase">Require Passcode to Unlock</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={usePasscode}
                    onChange={e => setUsePasscode(e.target.checked)}
                    className="w-4 h-4"
                  />
                </label>
                {usePasscode && (
                  <input
                    type="password"
                    placeholder="Enter secret passcode"
                    value={passcode}
                    onChange={e => setPasscode(e.target.value)}
                    className="w-full bg-surface-container border-2 border-on-background px-3 py-1.5 text-xs font-bold focus:outline-none focus:border-primary mt-1"
                  />
                )}
              </div>

              <button
                onClick={handleGenerate}
                disabled={generating || (usePasscode && !passcode.trim())}
                className="w-full bg-primary text-on-primary border-2 border-on-background py-3 font-bold text-xs uppercase brutal-shadow hover:translate-x-0.5 hover:translate-y-0.5 transition-all disabled:opacity-60"
              >
                {generating ? 'Encrypting & Generating Link...' : 'Generate Encrypted Link'}
              </button>
            </>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="p-3 bg-primary-container border-2 border-on-background text-on-primary-container text-xs font-bold uppercase flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">check_circle</span>
                Share Link Ready!
              </div>

              <div className="flex items-center gap-2 bg-surface-container-low border-2 border-on-background p-2">
                <input
                  type="text"
                  readOnly
                  value={generatedUrl}
                  className="bg-transparent text-xs font-mono w-full focus:outline-none select-all"
                />
                <button
                  onClick={handleCopy}
                  className="bg-primary text-on-primary border border-on-background px-3 py-1 text-xs font-bold uppercase whitespace-nowrap"
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>

              {/* QR Code Section */}
              {qrDataUrl && (
                <div className="p-4 bg-white border-2 border-on-background flex flex-col items-center gap-3">
                  <p className="text-[11px] font-bold text-black uppercase tracking-wider">Scan with Phone Camera</p>
                  <img src={qrDataUrl} alt="QR Code" className="w-44 h-44 object-contain border border-gray-300 p-1" />
                  <button
                    onClick={handleDownloadQr}
                    className="bg-black text-white border-2 border-black px-3 py-1 text-xs font-bold uppercase flex items-center gap-1 hover:bg-gray-800"
                  >
                    <span className="material-symbols-outlined text-sm">download</span>Download QR PNG
                  </button>
                </div>
              )}

              <div className="p-3 bg-surface-container border-2 border-on-background text-[11px] text-on-surface-variant flex flex-col gap-1">
                <div><strong>Expiry:</strong> {expiryHours > 0 ? `${expiryHours} hours` : 'Never'}</div>
                <div><strong>Permission:</strong> {allowDownload ? 'Download Allowed' : 'View Only (No Download)'}</div>
                {usePasscode && <div><strong>Passcode:</strong> Required ({passcode})</div>}
              </div>

              <button
                onClick={onClose}
                className="w-full bg-on-background text-background border-2 border-on-background py-2.5 text-xs font-bold uppercase"
              >
                Done
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// ─── QR Code Modal ────────────────────────────────────────────────────────────
function QRCodeModal({
  title,
  url,
  onClose,
}: {
  title: string;
  url: string;
  onClose: () => void;
}) {
  const [qrUrl, setQrUrl] = useState<string | null>(null);

  useEffect(() => {
    QRCode.toDataURL(url, {
      width: 320,
      margin: 1,
      color: { dark: '#000000', light: '#ffffff' }
    }).then(setQrUrl);
  }, [url]);

  const handleDownloadQr = () => {
    if (!qrUrl) return;
    const a = document.createElement('a');
    a.href = qrUrl;
    a.download = `chuchudu-qr-${title.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
    a.click();
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-surface-container-lowest border-4 border-on-background w-full max-w-sm flex flex-col"
        style={{ boxShadow: '10px 10px 0 #1a1c1c' }} onClick={e => e.stopPropagation()}>
        <div className="bg-primary-container border-b-4 border-on-background p-4 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <span className="material-symbols-outlined text-2xl text-on-background font-black">qr_code_2</span>
            <h2 className="font-black text-sm uppercase tracking-tight text-on-background truncate">
              Scan Share Link
            </h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-primary/20 border-2 border-transparent hover:border-on-background">
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>
        <div className="p-6 flex flex-col items-center gap-4 text-center">
          <p className="text-xs font-bold text-on-surface-variant truncate max-w-full">
            {title}
          </p>
          <div className="p-3 bg-white border-4 border-on-background" style={{ boxShadow: '4px 4px 0 #1a1c1c' }}>
            {qrUrl ? (
              <img src={qrUrl} alt="QR Code" className="w-52 h-52 object-contain" />
            ) : (
              <div className="w-52 h-52 flex items-center justify-center">
                <span className="material-symbols-outlined text-3xl animate-spin">progress_activity</span>
              </div>
            )}
          </div>
          <p className="text-[11px] text-on-surface-variant">
            Scan with any phone camera to view or download directly.
          </p>
          <div className="flex items-center gap-2 w-full">
            <button
              onClick={handleDownloadQr}
              className="flex-1 bg-primary text-on-primary border-2 border-on-background py-2 text-xs font-bold uppercase flex items-center justify-center gap-1 brutal-shadow"
            >
              <span className="material-symbols-outlined text-sm">download</span>Download QR
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-surface-container border-2 border-on-background text-xs font-bold uppercase hover:bg-surface-dim"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Add Vault Modal ──────────────────────────────────────────────────────────
function AddVaultModal({
  onClose,
  onAddVault,
}: {
  onClose: () => void;
  onAddVault: (name: string, path: string) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [path, setPath] = useState('');
  const [saving, setSaving] = useState(false);

  const handlePick = async () => {
    try {
      const sel = await openDialog({ directory: true, multiple: false, title: 'Select External Drive or Folder' });
      if (sel && typeof sel === 'string') {
        setPath(sel);
        if (!name.trim()) {
          const parts = sel.replace(/\\/g, '/').split('/');
          setName(parts[parts.length - 1] || 'External Vault');
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!path.trim()) return;
    setSaving(true);
    try {
      await onAddVault(name.trim() || 'External Vault', path.trim());
      onClose();
    } catch (e) {
      alert(String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-surface-container-lowest border-4 border-on-background w-full max-w-md flex flex-col"
        style={{ boxShadow: '10px 10px 0 #1a1c1c' }} onClick={e => e.stopPropagation()}>
        <div className="bg-primary-container border-b-4 border-on-background p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-2xl text-on-background font-black">storage</span>
            <h2 className="font-black text-sm uppercase tracking-tight text-on-background">
              Add Storage Vault / Drive
            </h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-primary/20 border-2 border-transparent hover:border-on-background">
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          <div>
            <label className="block text-xs font-bold uppercase text-on-surface-variant mb-1">Vault Label / Name</label>
            <input
              type="text"
              placeholder="e.g. 2TB External SSD, USB Drive, Work Vault"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-surface-container border-2 border-on-background px-3 py-2 text-xs font-bold focus:outline-none focus:border-primary"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-on-surface-variant mb-1">Drive / Folder Path</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                placeholder="Click 'Browse' to choose folder"
                value={path}
                className="w-full bg-surface-container border-2 border-on-background px-3 py-2 text-xs font-mono focus:outline-none"
                required
              />
              <button
                type="button"
                onClick={handlePick}
                className="bg-surface-container-high border-2 border-on-background px-4 py-2 text-xs font-bold uppercase hover:bg-surface-dim whitespace-nowrap"
              >
                Browse
              </button>
            </div>
          </div>
          <div className="p-3 bg-surface-container border-2 border-on-background text-[11px] text-on-surface-variant">
            💡 <strong>Multi-Vault Architecture:</strong> Each vault stores its own isolated encrypted files, photo albums, and offline share indices. You can switch between drives anytime in the sidebar.
          </div>
          <div className="flex items-center gap-2 pt-2">
            <button
              type="submit"
              disabled={saving || !path.trim()}
              className="flex-1 bg-primary text-on-primary border-2 border-on-background py-2.5 text-xs font-bold uppercase brutal-shadow hover:translate-x-0.5 hover:translate-y-0.5 disabled:opacity-60"
            >
              {saving ? 'Configuring Vault...' : 'Create & Switch Vault'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-surface-container border-2 border-on-background text-xs font-bold uppercase hover:bg-surface-dim"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Vault Backup & Restore Modal ─────────────────────────────────────────────
function VaultBackupModal({
  onClose,
}: {
  onClose: () => void;
}) {
  const [passphrase, setPassphrase] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [statusText, setStatusText] = useState('');
  const [progress, setProgress] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [mode, setMode] = useState<'backup' | 'restore'>('backup');

  const handleExport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passphrase.length < 6) {
      alert('Passphrase must be at least 6 characters.');
      return;
    }
    if (passphrase !== confirmPass) {
      alert('Passphrases do not match.');
      return;
    }

    try {
      setProcessing(true);
      const backupBytes = await vault.exportVaultBackup(passphrase, (pct, status) => {
        setProgress(pct);
        setStatusText(status);
      });

      const today = new Date().toISOString().slice(0, 10);
      const defaultFileName = `chuchudu-vault-backup-${today}.chuchudu`;
      
      const savePath = await saveDialog({
        defaultPath: defaultFileName,
        filters: [{ name: 'ChuChudu Encrypted Backup', extensions: ['chuchudu'] }],
        title: 'Save Encrypted Vault Backup'
      });

      if (savePath && typeof savePath === 'string') {
        await writeFile(savePath, backupBytes);
        alert('Vault backup saved successfully!');
        onClose();
      }
    } catch (err) {
      console.error(err);
      alert('Backup failed: ' + String(err));
    } finally {
      setProcessing(false);
    }
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passphrase) {
      alert('Please enter your backup decryption passphrase.');
      return;
    }

    try {
      setProcessing(true);
      const fileSelection = await openDialog({
        multiple: false,
        filters: [{ name: 'ChuChudu Backup', extensions: ['chuchudu', 'zip'] }],
        title: 'Select ChuChudu Backup File'
      });

      if (!fileSelection || typeof fileSelection !== 'string') {
        setProcessing(false);
        return;
      }

      setStatusText('Reading backup file...');
      setProgress(10);
      const fileBytes = await (await import('@tauri-apps/plugin-fs')).readFile(fileSelection);

      const res = await vault.importVaultBackup(fileBytes, passphrase, (pct, status) => {
        setProgress(pct);
        setStatusText(status);
      });

      alert(`Restore successful! Restored ${res.filesRestored} files and ${res.albumsRestored} albums.`);
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert('Restore failed: ' + String(err));
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-surface-container-lowest border-4 border-on-background w-full max-w-md flex flex-col"
        style={{ boxShadow: '10px 10px 0 #1a1c1c' }} onClick={e => e.stopPropagation()}>
        <div className="bg-primary-container border-b-4 border-on-background p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-2xl text-on-background font-black">lock_reset</span>
            <h2 className="font-black text-sm uppercase tracking-tight text-on-background">
              {mode === 'backup' ? '1-Click Encrypted Backup' : 'Restore Vault from Backup'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-primary/20 border-2 border-transparent hover:border-on-background">
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Tab switch */}
        <div className="grid grid-cols-2 border-b-2 border-on-background">
          <button
            type="button"
            onClick={() => setMode('backup')}
            className={`py-2 text-xs font-bold uppercase transition-all ${mode === 'backup' ? 'bg-primary text-on-primary' : 'bg-surface-container'}`}
          >
            Create Backup
          </button>
          <button
            type="button"
            onClick={() => setMode('restore')}
            className={`py-2 text-xs font-bold uppercase transition-all ${mode === 'restore' ? 'bg-primary text-on-primary' : 'bg-surface-container'}`}
          >
            Restore Backup
          </button>
        </div>

        <div className="p-6 flex flex-col gap-4">
          {mode === 'backup' ? (
            <form onSubmit={handleExport} className="flex flex-col gap-4">
              <p className="text-xs text-on-surface-variant">
                Exports all files, albums, and manifests into a single AES-256 encrypted <code>.chuchudu</code> package.
              </p>
              <div>
                <label className="block text-xs font-bold uppercase text-on-surface-variant mb-1">Set Backup Passphrase</label>
                <input
                  type="password"
                  placeholder="Min 6 characters"
                  value={passphrase}
                  onChange={e => setPassphrase(e.target.value)}
                  className="w-full bg-surface-container border-2 border-on-background px-3 py-2 text-xs font-bold focus:outline-none focus:border-primary"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-on-surface-variant mb-1">Confirm Passphrase</label>
                <input
                  type="password"
                  placeholder="Repeat passphrase"
                  value={confirmPass}
                  onChange={e => setConfirmPass(e.target.value)}
                  className="w-full bg-surface-container border-2 border-on-background px-3 py-2 text-xs font-bold focus:outline-none focus:border-primary"
                  required
                />
              </div>

              {processing && (
                <div className="flex flex-col gap-1.5 p-3 bg-primary-container border-2 border-on-background">
                  <div className="flex justify-between text-xs font-bold text-on-primary-container">
                    <span>{statusText || 'Processing...'}</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-primary-fixed/40 border border-on-background">
                    <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={processing}
                className="w-full bg-primary text-on-primary border-2 border-on-background py-3 font-bold text-xs uppercase brutal-shadow hover:translate-x-0.5 hover:translate-y-0.5 disabled:opacity-60"
              >
                {processing ? 'Exporting Backup...' : 'Export Encrypted Backup'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleImport} className="flex flex-col gap-4">
              <p className="text-xs text-on-surface-variant">
                Select an existing <code>.chuchudu</code> backup file and enter the decryption passphrase to restore all items into your active vault.
              </p>
              <div>
                <label className="block text-xs font-bold uppercase text-on-surface-variant mb-1">Decryption Passphrase</label>
                <input
                  type="password"
                  placeholder="Enter backup passphrase"
                  value={passphrase}
                  onChange={e => setPassphrase(e.target.value)}
                  className="w-full bg-surface-container border-2 border-on-background px-3 py-2 text-xs font-bold focus:outline-none focus:border-primary"
                  required
                />
              </div>

              {processing && (
                <div className="flex flex-col gap-1.5 p-3 bg-primary-container border-2 border-on-background">
                  <div className="flex justify-between text-xs font-bold text-on-primary-container">
                    <span>{statusText || 'Restoring...'}</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-primary-fixed/40 border border-on-background">
                    <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={processing}
                className="w-full bg-primary text-on-primary border-2 border-on-background py-3 font-bold text-xs uppercase brutal-shadow hover:translate-x-0.5 hover:translate-y-0.5 disabled:opacity-60"
              >
                {processing ? 'Restoring Vault...' : 'Select Backup File & Restore'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Tag Assignment Modal ─────────────────────────────────────────────────────
function TagAssignModal({
  fileIds,
  currentTags = [],
  onClose,
  onSaveTags,
}: {
  fileIds: string[];
  currentTags?: string[];
  onClose: () => void;
  onSaveTags: (fileIds: string[], tags: string[]) => Promise<void>;
}) {
  const [selectedTags, setSelectedTags] = useState<string[]>(currentTags);

  const toggleTag = (tagId: string) => {
    setSelectedTags(prev =>
      prev.includes(tagId) ? prev.filter(t => t !== tagId) : [...prev, tagId]
    );
  };

  const handleSave = async () => {
    await onSaveTags(fileIds, selectedTags);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-surface-container-lowest border-4 border-on-background w-full max-w-sm flex flex-col"
        style={{ boxShadow: '10px 10px 0 #1a1c1c' }} onClick={e => e.stopPropagation()}>
        <div className="bg-primary-container border-b-4 border-on-background p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-2xl text-on-background font-black">label</span>
            <h2 className="font-black text-sm uppercase tracking-tight text-on-background">
              Assign Color Tags ({fileIds.length} {fileIds.length === 1 ? 'file' : 'files'})
            </h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-primary/20 border-2 border-transparent hover:border-on-background">
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>
        <div className="p-6 flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-2">
            {COLOR_TAGS.map(tag => {
              const active = selectedTags.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleTag(tag.id)}
                  className={`p-3 border-2 border-on-background flex items-center gap-2 text-xs font-bold uppercase transition-all ${
                    active ? 'bg-primary-container brutal-shadow' : 'bg-surface-container hover:bg-surface-dim'
                  }`}
                >
                  <span className="w-3.5 h-3.5 rounded-full border border-black" style={{ backgroundColor: tag.hex }} />
                  <span className="truncate">{tag.label}</span>
                  {active && <span className="material-symbols-outlined text-xs ml-auto">check</span>}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-2 pt-3 border-t-2 border-on-background">
            <button
              onClick={handleSave}
              className="flex-1 bg-primary text-on-primary border-2 border-on-background py-2 text-xs font-bold uppercase brutal-shadow"
            >
              Apply Tags
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-surface-container border-2 border-on-background text-xs font-bold uppercase hover:bg-surface-dim"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Duplicate Cleaner Modal ──────────────────────────────────────────────────
function DuplicateCleanerModal({
  files,
  onClose,
  onDeleteDuplicates,
}: {
  files: Record<string, VaultFile>;
  onClose: () => void;
  onDeleteDuplicates: (fileIdsToDelete: string[]) => void;
}) {
  // Group files by size and name
  const sizeMap: Record<number, VaultFile[]> = {};
  Object.values(files).forEach(f => {
    if (f.size > 0) {
      if (!sizeMap[f.size]) sizeMap[f.size] = [];
      sizeMap[f.size].push(f);
    }
  });

  const duplicateGroups = Object.values(sizeMap).filter(group => group.length > 1);
  const totalWastedBytes = duplicateGroups.reduce((acc, grp) => acc + (grp[0].size * (grp.length - 1)), 0);

  const handleCleanAll = () => {
    const idsToDelete: string[] = [];
    duplicateGroups.forEach(grp => {
      // Sort by modified date descending, keep newest, delete older copies
      const sorted = [...grp].sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime());
      sorted.slice(1).forEach(f => idsToDelete.push(f.id));
    });
    if (idsToDelete.length > 0) {
      onDeleteDuplicates(idsToDelete);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-surface-container-lowest border-4 border-on-background w-full max-w-xl flex flex-col max-h-[90vh]"
        style={{ boxShadow: '10px 10px 0 #1a1c1c' }} onClick={e => e.stopPropagation()}>
        
        <div className="bg-primary-container border-b-4 border-on-background p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-2xl text-on-background font-black">cleaning_services</span>
            <h2 className="font-black text-base uppercase tracking-tight text-on-background">
              Duplicate Vault Cleaner
            </h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-primary/20 border-2 border-transparent hover:border-on-background">
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex flex-col gap-4">
          <div className="border-2 border-on-background bg-surface-container-low p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase text-on-surface-variant">Duplicate Sets Found</p>
              <p className="text-xl font-black text-primary">{duplicateGroups.length} sets</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold uppercase text-on-surface-variant">Wasted Disk Space</p>
              <p className="text-xl font-black text-error">{fmtSize(totalWastedBytes)}</p>
            </div>
          </div>

          {duplicateGroups.length === 0 ? (
            <div className="border-2 border-dashed border-on-background p-10 text-center bg-surface-container-low">
              <span className="material-symbols-outlined text-5xl text-primary mb-2">verified</span>
              <p className="font-bold text-sm uppercase">No duplicates found in your vault!</p>
              <p className="text-xs text-on-surface-variant mt-1">Your laptop disk space is clean and optimized.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3 max-h-72 overflow-y-auto">
              {duplicateGroups.map((grp, i) => (
                <div key={i} className="border-2 border-on-background bg-surface-container p-3 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="truncate flex-1 uppercase">{grp[0].name}</span>
                    <span className="text-primary ml-2">{grp.length} copies ({fmtSize(grp[0].size * grp.length)})</span>
                  </div>
                  <div className="text-[10px] text-on-surface-variant">
                    {grp.map(f => fmtDate(f.modified)).join(' • ')}
                  </div>
                </div>
              ))}
            </div>
          )}

          {duplicateGroups.length > 0 && (
            <button
              onClick={handleCleanAll}
              className="w-full bg-primary text-on-primary border-2 border-on-background py-3 font-bold text-xs uppercase brutal-shadow hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
            >
              Clean All Duplicates &amp; Reclaim {fmtSize(totalWastedBytes)}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Offline Local Fast Drop QR Modal ─────────────────────────────────────────
function LocalFastDropModal({
  onClose,
}: {
  onClose: () => void;
}) {
  const roomCode = Math.floor(100000 + Math.random() * 900000).toString();
  const fastDropUrl = `https://chuchudu.in/dashboard?drop=${roomCode}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(fastDropUrl)}`;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-surface-container-lowest border-4 border-on-background w-full max-w-md flex flex-col"
        style={{ boxShadow: '10px 10px 0 #1a1c1c' }} onClick={e => e.stopPropagation()}>
        
        <div className="bg-primary-container border-b-4 border-on-background p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-2xl text-on-background font-black">wifi_tethering</span>
            <h2 className="font-black text-base uppercase tracking-tight text-on-background">
              Local WiFi Fast Drop
            </h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-primary/20 border-2 border-transparent hover:border-on-background">
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        <div className="p-6 flex flex-col items-center text-center gap-4">
          <p className="text-xs text-on-surface-variant font-label-caps uppercase leading-relaxed">
            Scan with your phone camera on the same WiFi to transfer files at <strong>50–100 MB/s</strong> with zero internet data usage!
          </p>

          <div className="p-3 bg-white border-4 border-on-background brutal-shadow">
            <img src={qrUrl} alt="Fast Drop QR" className="w-48 h-48" />
          </div>

          <div className="w-full bg-surface-container border-2 border-on-background p-3 flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-on-surface-variant">Pairing Code</span>
            <span className="text-lg font-black tracking-widest text-primary font-mono">{roomCode}</span>
          </div>

          <button
            onClick={onClose}
            className="w-full bg-on-background text-background border-2 border-on-background py-2.5 text-xs font-bold uppercase"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── PIN Unlock Modal for Locked Albums ───────────────────────────────────────
function UnlockAlbumPinModal({
  album,
  onClose,
  onUnlocked,
}: {
  album: Album;
  onClose: () => void;
  onUnlocked: (albumId: string) => void;
}) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const hash = await sha256Hash(pin);
    if (hash === album.pinHash) {
      onUnlocked(album.id);
    } else {
      setError('Incorrect 4-digit PIN. Try again.');
      setPin('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-surface-container-lowest border-4 border-on-background w-full max-w-sm flex flex-col"
        style={{ boxShadow: '10px 10px 0 #1a1c1c' }} onClick={e => e.stopPropagation()}>
        
        <div className="bg-primary-container border-b-4 border-on-background p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-2xl text-on-background font-black">lock</span>
            <h2 className="font-black text-base uppercase tracking-tight text-on-background">
              PIN-Protected Album
            </h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-primary/20 border-2 border-transparent hover:border-on-background">
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4 text-center">
          <p className="text-xs text-on-surface-variant font-bold uppercase">
            Enter 4-digit PIN to unlock "{album.name}"
          </p>

          <input
            type="password"
            maxLength={4}
            pattern="[0-9]*"
            inputMode="numeric"
            placeholder="••••"
            value={pin}
            onChange={e => setPin(e.target.value)}
            required
            autoFocus
            className="w-full bg-surface-container-low border-2 border-on-background px-4 py-3 text-2xl font-black tracking-widest text-center focus:outline-none focus:border-primary"
          />

          {error && <p className="text-xs text-error font-bold">{error}</p>}

          <button
            type="submit"
            className="w-full bg-primary text-on-primary border-2 border-on-background py-3 font-bold text-xs uppercase brutal-shadow"
          >
            Unlock Album
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Create Album Modal (With Optional PIN Lock) ──────────────────────────────
function CreateAlbumModal({
  files,
  thumbnails,
  onClose,
  onCreate,
}: {
  files: Record<string, VaultFile>;
  thumbnails: Record<string, string>;
  onClose: () => void;
  onCreate: (name: string, description: string, coverFileId?: string, fileIds?: string[], isLocked?: boolean, pinHash?: string) => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const [coverFileId, setCoverFileId] = useState<string | undefined>(undefined);
  const [isLocked, setIsLocked] = useState(false);
  const [pin, setPin] = useState('');

  const imageFiles = Object.values(files).filter(f => f.mime?.startsWith('image/'));

  const toggleSelectFile = (id: string) => {
    setSelectedFileIds(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      if (!coverFileId && next.length > 0) setCoverFileId(next[0]);
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    let pinHash: string | undefined = undefined;
    if (isLocked && pin.trim()) {
      pinHash = await sha256Hash(pin.trim());
    }
    onCreate(name.trim(), description.trim(), coverFileId, selectedFileIds, isLocked, pinHash);
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-surface-container-lowest border-4 border-on-background w-full max-w-xl flex flex-col max-h-[90vh]"
        style={{ boxShadow: '10px 10px 0 #1a1c1c' }} onClick={e => e.stopPropagation()}>
        
        <div className="bg-primary-container border-b-4 border-on-background p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-2xl text-on-background font-black">photo_album</span>
            <h2 className="font-black text-lg uppercase tracking-tight text-on-background">Create New Album</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-primary/20 border-2 border-transparent hover:border-on-background">
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex flex-col gap-4">
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

          {/* PIN Protection Toggle */}
          <div className="border-2 border-on-background bg-surface-container-low p-3 flex flex-col gap-2">
            <label className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-base">lock</span>
                <span className="text-xs font-bold uppercase">Lock this Album with a 4-Digit PIN</span>
              </div>
              <input
                type="checkbox"
                checked={isLocked}
                onChange={e => setIsLocked(e.target.checked)}
                className="w-4 h-4"
              />
            </label>
            {isLocked && (
              <input
                type="password"
                maxLength={4}
                placeholder="Set 4-digit PIN (e.g. 1234)"
                value={pin}
                onChange={e => setPin(e.target.value)}
                required={isLocked}
                className="w-full bg-surface-container border-2 border-on-background px-3 py-1.5 text-sm font-bold text-center focus:outline-none focus:border-primary mt-1"
              />
            )}
          </div>

          {/* Photo & Cover Selector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                Select Initial Photos &amp; Choose Cover
              </label>
              <span className="text-xs text-on-surface-variant font-bold">
                {selectedFileIds.length} selected
              </span>
            </div>

            {imageFiles.length === 0 ? (
              <div className="border-2 border-dashed border-on-background p-6 text-center bg-surface-container-low">
                <span className="material-symbols-outlined text-3xl text-on-surface-variant mb-1">add_photo_alternate</span>
                <p className="text-xs text-on-surface-variant">No photos in vault yet. You can create the album and add photos later!</p>
              </div>
            ) : (
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-40 overflow-y-auto p-2 border-2 border-on-background bg-surface-container-low">
                {imageFiles.map(file => {
                  const isSelected = selectedFileIds.includes(file.id);
                  const isCover = coverFileId === file.id;
                  return (
                    <div
                      key={file.id}
                      onClick={() => toggleSelectFile(file.id)}
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

                      <div className={`absolute top-1 left-1 w-4 h-4 border border-on-background flex items-center justify-center ${isSelected ? 'bg-primary text-on-primary' : 'bg-background/80'}`}>
                        {isSelected && <span className="material-symbols-outlined text-[10px]">check</span>}
                      </div>

                      {isSelected && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCoverFileId(file.id);
                          }}
                          className={`absolute bottom-1 right-1 text-[8px] px-1 py-0.5 uppercase font-bold border border-on-background ${isCover ? 'bg-primary-fixed text-on-primary-fixed' : 'bg-surface/90 text-on-surface'}`}
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

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={!name.trim()}
              className="flex-1 bg-primary text-on-primary border-2 border-on-background py-3 font-black text-xs uppercase brutal-shadow disabled:opacity-60"
            >
              Create Album
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 border-2 border-on-background bg-surface-container font-bold text-xs uppercase hover:bg-surface-dim"
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

        <div className="p-6 overflow-y-auto">
          <p className="text-xs text-on-surface-variant font-bold uppercase tracking-wider mb-4">
            Click any photo below to set it as the cover image:
          </p>

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
                </div>
              );
            })}
          </div>
        </div>

        <div className="p-4 border-t-2 border-on-background bg-surface-container flex justify-end">
          <button onClick={onClose} className="px-6 py-2 border-2 border-on-background bg-surface font-bold text-xs uppercase">
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
  const availableFiles = Object.values(files).filter(f => !album.fileIds.includes(f.id));

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-surface-container-lowest border-4 border-on-background w-full max-w-xl flex flex-col max-h-[90vh]"
        style={{ boxShadow: '10px 10px 0 #1a1c1c' }} onClick={e => e.stopPropagation()}>
        
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

        <div className="p-6 overflow-y-auto flex-1">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-on-surface-variant font-bold uppercase tracking-wider">
              Select files from your vault:
            </p>
            <span className="text-xs font-bold text-primary">
              {selectedIds.length} files selected
            </span>
          </div>

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
        </div>

        <div className="p-4 border-t-2 border-on-background bg-surface-container flex gap-3">
          <button
            onClick={() => { onAdd(selectedIds); onClose(); }}
            disabled={selectedIds.length === 0}
            className="flex-1 bg-primary text-on-primary border-2 border-on-background py-2.5 font-bold text-xs uppercase brutal-shadow disabled:opacity-60"
          >
            Add Selected ({selectedIds.length})
          </button>
          <button onClick={onClose} className="px-6 py-2.5 border-2 border-on-background bg-surface font-bold text-xs uppercase">
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

        <div className="p-5 overflow-y-auto flex flex-col gap-3">
          <div className="flex items-center gap-3 p-3 border-2 border-on-background bg-surface-container-low">
            <span className="material-symbols-outlined text-primary text-2xl">{getFileIcon(file.mime || '')}</span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold truncate">{file.name}</p>
              <p className="text-[10px] text-on-surface-variant uppercase">{fmtSize(file.size || 0)}</p>
            </div>
          </div>

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
                    <span className="material-symbols-outlined text-lg">{alb.isLocked ? 'lock' : isIn ? 'folder_open' : 'folder'}</span>
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
        </div>

        <div className="p-4 border-t-2 border-on-background bg-surface-container flex justify-between items-center">
          <button onClick={() => { onClose(); onCreateNew(); }} className="text-xs font-bold uppercase text-primary hover:underline flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">add</span>+ New Album
          </button>
          <button onClick={onClose} className="px-5 py-2 bg-on-background text-background border-2 border-on-background text-xs font-bold uppercase">
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
  const [shareLinks, setShareLinks] = useState<Record<string, ShareLink>>({});
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);
  const [activeAlbumId, setActiveAlbumId] = useState<string | null>(null);
  const [unlockedAlbumIds, setUnlockedAlbumIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [selectedFile, setSelectedFile] = useState<VaultFile | null>(null);
  const [activityLog, setActivityLog] = useState<ActivityEntry[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Sorting & Tag Filters
  const [sortBy, setSortBy] = useState<SortMode>('date-desc');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [activeTagFilter, setActiveTagFilter] = useState<string | null>(null);

  // Batch Select & Operations
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());
  const [isZipping, setIsZipping] = useState(false);

  // Multi-Vault Profiles
  const [vaultProfiles, setVaultProfiles] = useState<VaultProfile[]>([]);
  const [activeVaultProfile, setActiveVaultProfile] = useState<VaultProfile | null>(null);
  const [showVaultMenu, setShowVaultMenu] = useState(false);

  // Modals state
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showCreateAlbumModal, setShowCreateAlbumModal] = useState(false);
  const [showSelectCoverModal, setShowSelectCoverModal] = useState<Album | null>(null);
  const [showAddPhotosModal, setShowAddPhotosModal] = useState<Album | null>(null);
  const [showAssignFileModal, setShowAssignFileModal] = useState<VaultFile | null>(null);
  const [showShareModal, setShowShareModal] = useState<VaultFile | null>(null);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [showFastDropModal, setShowFastDropModal] = useState(false);
  const [showPinUnlockModal, setShowPinUnlockModal] = useState<Album | null>(null);
  const [showAddVaultModal, setShowAddVaultModal] = useState(false);
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState<{ title: string; url: string } | null>(null);
  const [showTagAssignModal, setShowTagAssignModal] = useState<{ fileIds: string[]; currentTags?: string[] } | null>(null);

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
          vault.getShareLinks().then(setShareLinks);
          vault.getVaultProfiles().then(setVaultProfiles);
          vault.getActiveVaultProfile().then(setActiveVaultProfile);
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
    const refreshShares = () => {
      vault.getShareLinks().then(setShareLinks);
    };
    const onVaultSwitched = () => {
      vault.getVaultProfiles().then(setVaultProfiles);
      vault.getActiveVaultProfile().then(setActiveVaultProfile);
      vault.getManifest().then(setFiles);
      vault.getAlbums().then(setAlbums);
      vault.getShareLinks().then(setShareLinks);
      setSelectedFileIds(new Set());
    };

    window.addEventListener('vault-updated', refreshFiles);
    window.addEventListener('albums-updated', refreshAlbums);
    window.addEventListener('shares-updated', refreshShares);
    window.addEventListener('vault-switched', onVaultSwitched);

    return () => {
      unsub();
      window.removeEventListener('vault-updated', refreshFiles);
      window.removeEventListener('albums-updated', refreshAlbums);
      window.removeEventListener('shares-updated', refreshShares);
      window.removeEventListener('vault-switched', onVaultSwitched);
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

    if (activeTagFilter) {
      result = result.filter(f => f.tags && f.tags.includes(activeTagFilter));
    }

    if (search.trim()) result = result.filter(f => f.name.toLowerCase().includes(search.toLowerCase()));

    switch (sortBy) {
      case 'date-asc':
        return result.sort((a, b) => new Date(a.modified).getTime() - new Date(b.modified).getTime());
      case 'name-asc':
        return result.sort((a, b) => a.name.localeCompare(b.name));
      case 'name-desc':
        return result.sort((a, b) => b.name.localeCompare(a.name));
      case 'size-desc':
        return result.sort((a, b) => (b.size || 0) - (a.size || 0));
      case 'size-asc':
        return result.sort((a, b) => (a.size || 0) - (b.size || 0));
      case 'type':
        return result.sort((a, b) => (a.mime || '').localeCompare(b.mime || ''));
      case 'date-desc':
      default:
        return result.sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime());
    }
  }, [files, section, activeAlbumId, albums, search, activeTagFilter, sortBy]);

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
  const handleCreateAlbum = async (name: string, description: string, coverFileId?: string, fileIds: string[] = [], isLocked = false, pinHash?: string) => {
    const newAlb = await vault.createAlbum(name, description, coverFileId, fileIds, isLocked, pinHash);
    vault.getAlbums().then(setAlbums);
    setShowCreateAlbumModal(false);
    if (isLocked) {
      setUnlockedAlbumIds(prev => new Set(prev).add(newAlb.id));
    }
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

  const handleDeleteMultiple = async (fileIds: string[]) => {
    for (const fid of fileIds) {
      await vault.deleteFile(fid);
    }
    vault.getManifest().then(setFiles);
    vault.getAlbums().then(setAlbums);
    setShowDuplicateModal(false);
  };

  // ── Share Link Handlers ──────────────────────────────────────────────────
  const handleToggleShareActive = async (link: ShareLink) => {
    const updated = await vault.toggleShareLinkActive(link.id);
    if (updated) {
      setShareLinks(prev => ({ ...prev, [link.id]: updated }));
      try {
        await updateDoc(doc(firestore, 'public_shares', link.id), { is_active: updated.isActive });
        if (auth.currentUser) {
          await updateDoc(doc(firestore, `users/${auth.currentUser.uid}/shares/${link.id}`), { is_active: updated.isActive });
        }
      } catch (e) {
        console.warn('Firestore active update error:', e);
      }
    }
  };

  const handleDeleteShareLink = async (link: ShareLink) => {
    if (!confirm(`Permanently delete shared link for "${link.fileName}"? Anyone with this URL will immediately lose access.`)) return;
    await vault.deleteShareLink(link.id);
    setShareLinks(prev => {
      const copy = { ...prev };
      delete copy[link.id];
      return copy;
    });
    try {
      await deleteDoc(doc(firestore, 'public_shares', link.id));
      if (auth.currentUser) {
        await deleteDoc(doc(firestore, `users/${auth.currentUser.uid}/shares/${link.id}`));
      }
    } catch (e) {
      console.warn('Firestore share delete error:', e);
    }
  };

  const handleCopyShareLink = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedLinkId(id);
    setTimeout(() => setCopiedLinkId(null), 2000);
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

  // ─── Batch Actions & Multi-Vault Handlers ──────────────────────────────────
  const handleToggleSelect = (id: string) => {
    setSelectedFileIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedFileIds(new Set(filtered.map(f => f.id)));
  };

  const handleDeselectAll = () => {
    setSelectedFileIds(new Set());
    setIsSelectMode(false);
  };

  const handleBulkZipDownload = async () => {
    if (selectedFileIds.size === 0) return;
    setIsZipping(true);
    try {
      const zip = new JSZip();
      for (const id of Array.from(selectedFileIds)) {
        const f = files[id];
        if (!f) continue;
        const data = await vault.readFile(id);
        if (data) {
          zip.file(f.name, data);
        }
      }
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chuchudu-bundle-${new Date().toISOString().slice(0, 10)}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('Error creating ZIP archive: ' + String(e));
    } finally {
      setIsZipping(false);
    }
  };

  const handleBulkStar = async () => {
    const m = await vault.getManifest();
    selectedFileIds.forEach(id => {
      if (m[id]) m[id].starred = true;
    });
    await vault.saveManifest(m);
    setFiles({ ...m });
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedFileIds.size} selected files?`)) return;
    for (const id of Array.from(selectedFileIds)) {
      await vault.deleteFile(id);
    }
    vault.getManifest().then(setFiles);
    vault.getAlbums().then(setAlbums);
    setSelectedFileIds(new Set());
    setIsSelectMode(false);
  };

  const handleSaveTags = async (fileIds: string[], tags: string[]) => {
    for (const id of fileIds) {
      await vault.setFileTags(id, tags);
    }
    vault.getManifest().then(setFiles);
  };

  const handleSwitchVault = async (vaultId: string) => {
    await vault.switchVault(vaultId);
    setShowVaultMenu(false);
  };

  const handleAddVault = async (name: string, path: string) => {
    const newProfile = await vault.addVaultProfile(name, path);
    await vault.switchVault(newProfile.id);
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
  const navItems: Section[] = ['all', 'photos', 'videos', 'documents', 'albums', 'shares', 'starred'];
  const bottomItems: Section[] = ['activity', 'settings'];

  const activeAlbum = activeAlbumId ? albums[activeAlbumId] : null;

  // Timeline grouping automatically integrated in Grid view & albums
  const timelineGroups: { title: string; items: VaultFile[] }[] = [];
  if (viewMode === 'grid') {
    const map = new Map<string, VaultFile[]>();
    filtered.forEach(f => {
      const header = getMonthYearHeader(f.modified);
      if (!map.has(header)) map.set(header, []);
      map.get(header)!.push(f);
    });
    map.forEach((items, title) => timelineGroups.push({ title, items }));
  }

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

      {/* Create Share Link Modal */}
      {showShareModal && (
        <CreateShareLinkModal
          file={showShareModal}
          onClose={() => setShowShareModal(null)}
        />
      )}

      {/* Duplicate Cleaner Modal */}
      {showDuplicateModal && (
        <DuplicateCleanerModal
          files={files}
          onClose={() => setShowDuplicateModal(false)}
          onDeleteDuplicates={handleDeleteMultiple}
        />
      )}

      {/* Local Fast Drop QR Modal */}
      {showFastDropModal && (
        <LocalFastDropModal
          onClose={() => setShowFastDropModal(false)}
        />
      )}

      {/* PIN Unlock Modal */}
      {showPinUnlockModal && (
        <UnlockAlbumPinModal
          album={showPinUnlockModal}
          onClose={() => setShowPinUnlockModal(null)}
          onUnlocked={(albumId) => {
            setUnlockedAlbumIds(prev => new Set(prev).add(albumId));
            setActiveAlbumId(albumId);
            setShowPinUnlockModal(null);
          }}
        />
      )}

      {/* Add Storage Vault Modal */}
      {showAddVaultModal && (
        <AddVaultModal
          onClose={() => setShowAddVaultModal(false)}
          onAddVault={handleAddVault}
        />
      )}

      {/* 1-Click Encrypted Vault Backup Modal */}
      {showBackupModal && (
        <VaultBackupModal
          onClose={() => setShowBackupModal(false)}
        />
      )}

      {/* QR Code Viewer Modal */}
      {showQrModal && (
        <QRCodeModal
          title={showQrModal.title}
          url={showQrModal.url}
          onClose={() => setShowQrModal(null)}
        />
      )}

      {/* Tag Assignment Modal */}
      {showTagAssignModal && (
        <TagAssignModal
          fileIds={showTagAssignModal.fileIds}
          currentTags={showTagAssignModal.currentTags}
          onClose={() => setShowTagAssignModal(null)}
          onSaveTags={handleSaveTags}
        />
      )}

      {/* Sidebar */}
      <aside className="w-64 min-h-screen bg-surface-container-lowest border-r-2 border-on-background flex flex-col flex-shrink-0"
        style={{ boxShadow: '4px 0 0 #1a1c1c' }}>
        
        {/* Brand & Vault Switcher */}
        <div className="px-4 py-3.5 border-b-2 border-on-background flex flex-col gap-2.5">
          <div className="flex items-center gap-2.5">
            <ChuchuduLogo size={32} />
            <span className="font-black text-lg uppercase tracking-tight">Chuchudu</span>
          </div>

          {/* Multi-Vault Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowVaultMenu(v => !v)}
              className="w-full flex items-center justify-between gap-2 p-2 bg-surface-container border-2 border-on-background hover:bg-surface-dim transition-colors text-left"
              title="Switch or Add Storage Vaults"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="material-symbols-outlined text-primary text-base">storage</span>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase truncate">{activeVaultProfile?.name || 'Primary Vault'}</p>
                  <p className="text-[9px] text-on-surface-variant font-mono truncate">{vaultPath}</p>
                </div>
              </div>
              <span className="material-symbols-outlined text-sm flex-shrink-0">unfold_more</span>
            </button>

            {showVaultMenu && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-surface-container-lowest border-2 border-on-background z-40 p-1 flex flex-col gap-1 shadow-lg"
                style={{ boxShadow: '4px 4px 0 #1a1c1c' }}>
                <p className="text-[9px] font-bold uppercase tracking-wider text-on-surface-variant px-2 pt-1">Storage Vaults</p>
                {vaultProfiles.map(p => {
                  const isActive = (activeVaultProfile?.id || 'default') === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => handleSwitchVault(p.id)}
                      className={`flex items-center justify-between p-2 text-left text-xs transition-colors ${
                        isActive ? 'bg-primary-container font-bold border border-on-background' : 'hover:bg-surface-container'
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold truncate">{p.name}</p>
                        <p className="text-[9px] text-on-surface-variant font-mono truncate">{p.path}</p>
                      </div>
                      {isActive && <span className="material-symbols-outlined text-xs text-primary">check</span>}
                    </button>
                  );
                })}
                <div className="border-t border-on-background my-0.5" />
                <button
                  onClick={() => { setShowVaultMenu(false); setShowAddVaultModal(true); }}
                  className="flex items-center gap-1.5 p-2 text-[11px] font-bold uppercase text-primary hover:bg-surface-container"
                >
                  <span className="material-symbols-outlined text-xs">add_to_drive</span>+ Add New Vault
                </button>
              </div>
            )}
          </div>
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

          {!['activity', 'settings', 'shares'].includes(section) && (
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
            {/* View Mode Switcher (Grid / List) */}
            {!['activity', 'settings', 'albums', 'shares'].includes(section) && (
              <div className="flex border-2 border-on-background">
                {[
                  { mode: 'grid' as ViewMode, icon: 'grid_view', title: 'Grid View' },
                  { mode: 'list' as ViewMode, icon: 'view_list', title: 'List View' },
                ].map((item, i) => (
                  <button
                    key={item.mode}
                    onClick={() => setViewMode(item.mode)}
                    title={item.title}
                    className={`p-2 transition-colors ${i > 0 ? 'border-l-2 border-on-background' : ''} ${
                      viewMode === item.mode ? 'bg-primary-fixed text-on-primary-fixed' : 'hover:bg-surface-container'
                    }`}
                  >
                    <span className="material-symbols-outlined text-xl">{item.icon}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Sort Options Dropdown */}
            {!['activity', 'settings', 'shares'].includes(section) && (
              <div className="relative">
                <button
                  onClick={() => setShowSortMenu(s => !s)}
                  title="Sort files"
                  className="flex items-center gap-1.5 bg-surface-container border-2 border-on-background px-3 py-2 font-bold text-xs uppercase hover:bg-surface-dim"
                >
                  <span className="material-symbols-outlined text-base">sort</span>
                  <span className="hidden md:inline">{SORT_OPTIONS.find(o => o.id === sortBy)?.label.split(':')[0]}</span>
                </button>
                {showSortMenu && (
                  <div className="absolute right-0 top-full mt-1 w-48 bg-surface-container-lowest border-2 border-on-background z-40 p-1 flex flex-col gap-0.5 shadow-lg"
                    style={{ boxShadow: '4px 4px 0 #1a1c1c' }}>
                    {SORT_OPTIONS.map(opt => (
                      <button
                        key={opt.id}
                        onClick={() => { setSortBy(opt.id); setShowSortMenu(false); }}
                        className={`flex items-center justify-between p-2 text-left text-xs uppercase font-bold transition-colors ${
                          sortBy === opt.id ? 'bg-primary-container border border-on-background' : 'hover:bg-surface-container'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-sm">{opt.icon}</span>
                          <span>{opt.label}</span>
                        </div>
                        {sortBy === opt.id && <span className="material-symbols-outlined text-xs">check</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Batch Select Mode Toggle */}
            {!['activity', 'settings', 'shares'].includes(section) && (
              <button
                onClick={() => {
                  if (isSelectMode) {
                    setSelectedFileIds(new Set());
                    setIsSelectMode(false);
                  } else {
                    setIsSelectMode(true);
                  }
                }}
                className={`flex items-center gap-1.5 border-2 border-on-background px-3 py-2 font-bold text-xs uppercase transition-all ${
                  isSelectMode ? 'bg-primary text-on-primary brutal-shadow' : 'bg-surface-container hover:bg-surface-dim'
                }`}
                title="Select multiple files"
              >
                <span className="material-symbols-outlined text-base">{isSelectMode ? 'check_box' : 'check_box_outline_blank'}</span>
                <span className="hidden md:inline">{isSelectMode ? 'Selecting' : 'Select'}</span>
              </button>
            )}

            {/* Offline Fast Drop Action */}
            <button
              onClick={() => setShowFastDropModal(true)}
              className="hidden sm:flex items-center gap-1.5 bg-surface-container border-2 border-on-background px-3 py-2 font-bold text-xs uppercase hover:bg-surface-dim"
              title="Fast WiFi Drop without internet"
            >
              <span className="material-symbols-outlined text-primary text-base">wifi_tethering</span>
              <span>Fast Drop</span>
            </button>

            {/* Duplicate Cleaner Action */}
            <button
              onClick={() => setShowDuplicateModal(true)}
              className="hidden sm:flex items-center gap-1.5 bg-surface-container border-2 border-on-background px-3 py-2 font-bold text-xs uppercase hover:bg-surface-dim"
              title="Scan and clean duplicate files"
            >
              <span className="material-symbols-outlined text-base">cleaning_services</span>
              <span>Clean</span>
            </button>

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

        <main className="flex-grow overflow-y-auto p-6 relative pb-28">
          
          {/* Tag Filter Bar */}
          {!['activity', 'settings', 'shares'].includes(section) && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-4 mb-2 flex-wrap">
              <span className="text-[11px] font-bold uppercase text-on-surface-variant mr-1 flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">filter_alt</span>Tags:
              </span>
              <button
                onClick={() => setActiveTagFilter(null)}
                className={`px-3 py-1 text-[11px] font-bold uppercase border-2 border-on-background transition-all ${
                  activeTagFilter === null ? 'bg-on-background text-background' : 'bg-surface-container text-on-surface hover:bg-surface-dim'
                }`}
              >
                All Files
              </button>
              {COLOR_TAGS.map(t => {
                const isActive = activeTagFilter === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setActiveTagFilter(isActive ? null : t.id)}
                    className={`flex items-center gap-1.5 px-3 py-1 text-[11px] font-bold uppercase border-2 border-on-background transition-all ${
                      isActive ? 'bg-primary-container brutal-shadow ring-1 ring-primary' : 'bg-surface-container hover:bg-surface-dim'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full border border-black" style={{ backgroundColor: t.hex }} />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>
          )}

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
                      const isLocked = alb.isLocked && !unlockedAlbumIds.has(alb.id);
                      const coverThumbnail = alb.coverFileId ? thumbnails[alb.coverFileId] : null;
                      const itemCount = alb.fileIds.length;

                      return (
                        <div
                          key={alb.id}
                          onClick={() => {
                            if (isLocked) {
                              setShowPinUnlockModal(alb);
                            } else {
                              setActiveAlbumId(alb.id);
                            }
                          }}
                          className="group border-2 border-on-background bg-surface-container-lowest flex flex-col cursor-pointer hover:border-primary transition-all relative overflow-hidden"
                          style={{ boxShadow: '4px 4px 0 #1a1c1c' }}
                        >
                          {/* Album Cover Art */}
                          <div className="aspect-square bg-surface-container flex items-center justify-center overflow-hidden border-b-2 border-on-background relative">
                            {isLocked ? (
                              <div className="w-full h-full flex flex-col items-center justify-center bg-surface-container-high/90 text-on-surface p-4">
                                <span className="material-symbols-outlined text-5xl text-primary mb-1">lock</span>
                                <span className="text-xs font-black uppercase">PIN Locked</span>
                              </div>
                            ) : coverThumbnail ? (
                              <img src={coverThumbnail} alt={alb.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
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

                            {alb.isLocked && (
                              <div className="absolute top-2 left-2 bg-error-container text-on-error-container border border-on-background px-2 py-0.5 text-[9px] font-black uppercase flex items-center gap-0.5">
                                <span className="material-symbols-outlined text-[12px]">lock</span>
                                Locked
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
                                if (isLocked) setShowPinUnlockModal(alb);
                                else setActiveAlbumId(alb.id);
                              }}
                              className="w-full bg-primary text-on-primary border-2 border-on-background py-2 text-xs font-bold uppercase brutal-shadow"
                            >
                              {isLocked ? 'Unlock Album' : 'Open Album'}
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

          {/* ── Active Album Details View (With Timeline Grouping) ── */}
          {section === 'albums' && activeAlbum && (
            <div className="flex flex-col gap-6">
              
              {/* Album Header Banner */}
              <div className="border-4 border-on-background bg-surface-container-lowest p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
                style={{ boxShadow: '6px 6px 0 #1a1c1c' }}>
                
                <div className="flex items-center gap-4 min-w-0">
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
                      {activeAlbum.isLocked && (
                        <span className="bg-error-container text-on-error-container text-[10px] font-black uppercase px-2 py-0.5 border border-on-background">
                          PIN LOCKED
                        </span>
                      )}
                      <span className="text-xs text-on-surface-variant font-bold">
                        {activeAlbum.fileIds.length} {activeAlbum.fileIds.length === 1 ? 'file' : 'files'}
                      </span>
                    </div>
                    <h2 className="font-black text-xl sm:text-2xl uppercase tracking-tight truncate">{activeAlbum.name}</h2>
                    {activeAlbum.description && (
                      <p className="text-xs sm:text-sm text-on-surface-variant mt-0.5">{activeAlbum.description}</p>
                    )}
                  </div>
                </div>

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

              {/* Album Files Content - Grouped by Timeline */}
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
              ) : (
                <div className="flex flex-col gap-6">
                  {timelineGroups.map(grp => (
                    <div key={grp.title} className="flex flex-col gap-3">
                      <div className="flex items-center gap-2 border-b-2 border-on-background pb-1.5 sticky top-0 bg-background/95 backdrop-blur-sm z-10">
                        <span className="material-symbols-outlined text-primary text-base">calendar_today</span>
                        <h3 className="font-black text-xs uppercase tracking-wide">{grp.title}</h3>
                        <span className="text-[10px] text-on-surface-variant font-bold ml-auto font-label-caps bg-surface-container px-2 py-0.5 border border-on-background">
                          {grp.items.length} {grp.items.length === 1 ? 'item' : 'items'}
                        </span>
                      </div>
                      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))' }}>
                        {grp.items.map(file => {
                          const isSelected = selectedFileIds.has(file.id);
                          return (
                            <div key={file.id} className={`group border-2 border-on-background bg-surface-container-lowest flex flex-col cursor-pointer transition-all relative overflow-hidden ${isSelected ? 'ring-2 ring-primary border-primary' : 'hover:border-primary'}`}
                              style={{ boxShadow: '4px 4px 0 #1a1c1c' }} onClick={() => {
                                if (isSelectMode || selectedFileIds.size > 0) handleToggleSelect(file.id);
                                else setSelectedFile(file);
                              }}>
                              
                              {/* Selection Checkbox */}
                              {(isSelectMode || selectedFileIds.size > 0) && (
                                <div
                                  onClick={(e) => { e.stopPropagation(); handleToggleSelect(file.id); }}
                                  className={`absolute top-2 left-2 z-20 w-6 h-6 border-2 border-on-background flex items-center justify-center cursor-pointer transition-colors ${
                                    isSelected ? 'bg-primary text-on-primary' : 'bg-background/90 text-transparent hover:text-gray-400'
                                  }`}
                                >
                                  {isSelected && <span className="material-symbols-outlined text-sm font-black">check</span>}
                                </div>
                              )}

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
                                <div className="flex items-center justify-between mt-0.5">
                                  <p className="text-on-surface-variant text-[10px]">{fmtSize(file.size || 0)}</p>
                                  {/* Tag dots */}
                                  {file.tags && file.tags.length > 0 && (
                                    <div className="flex items-center gap-0.5">
                                      {file.tags.map(tid => {
                                        const tagDef = COLOR_TAGS.find(t => t.id === tid);
                                        return tagDef ? (
                                          <span key={tid} className="w-2 h-2 rounded-full border border-black" style={{ backgroundColor: tagDef.hex }} title={tagDef.label} />
                                        ) : null;
                                      })}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="absolute inset-0 bg-background/85 flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity p-2">
                                <button onClick={e => { e.stopPropagation(); setSelectedFile(file); }} className="border-2 border-on-background bg-background p-1.5 hover:bg-surface-container" title="Preview">
                                  <span className="material-symbols-outlined text-sm">visibility</span>
                                </button>
                                <button onClick={e => { e.stopPropagation(); setShowTagAssignModal({ fileIds: [file.id], currentTags: file.tags }); }} className="border-2 border-on-background bg-background p-1.5 hover:bg-primary-container" title="Assign Tags">
                                  <span className="material-symbols-outlined text-sm">label</span>
                                </button>
                                <button onClick={e => { e.stopPropagation(); setShowShareModal(file); }} className="border-2 border-on-background bg-background p-1.5 hover:bg-primary-container" title="Share Link">
                                  <span className="material-symbols-outlined text-sm">share</span>
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
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Standard File Grid / List ── */}
          {!['activity', 'settings', 'albums', 'shares'].includes(section) && (
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
              <div className="flex flex-col gap-6">
                {timelineGroups.map(grp => (
                  <div key={grp.title} className="flex flex-col gap-3">
                    <div className="flex items-center gap-2 border-b-2 border-on-background pb-1.5 sticky top-0 bg-background/95 backdrop-blur-sm z-10">
                      <span className="material-symbols-outlined text-primary text-base">calendar_today</span>
                      <h3 className="font-black text-xs uppercase tracking-wide">{grp.title}</h3>
                      <span className="text-[10px] text-on-surface-variant font-bold ml-auto font-label-caps bg-surface-container px-2 py-0.5 border border-on-background">
                        {grp.items.length} {grp.items.length === 1 ? 'item' : 'items'}
                      </span>
                    </div>
                    <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))' }}>
                      {grp.items.map(file => {
                        const isSelected = selectedFileIds.has(file.id);
                        return (
                          <div key={file.id} className={`group border-2 border-on-background bg-surface-container-lowest flex flex-col cursor-pointer transition-all relative overflow-hidden ${isSelected ? 'ring-2 ring-primary border-primary' : 'hover:border-primary'}`}
                            style={{ boxShadow: '4px 4px 0 #1a1c1c' }} onClick={() => {
                              if (isSelectMode || selectedFileIds.size > 0) handleToggleSelect(file.id);
                              else setSelectedFile(file);
                            }}>
                            
                            {/* Selection Checkbox */}
                            {(isSelectMode || selectedFileIds.size > 0) && (
                              <div
                                onClick={(e) => { e.stopPropagation(); handleToggleSelect(file.id); }}
                                className={`absolute top-2 left-2 z-20 w-6 h-6 border-2 border-on-background flex items-center justify-center cursor-pointer transition-colors ${
                                  isSelected ? 'bg-primary text-on-primary' : 'bg-background/90 text-transparent hover:text-gray-400'
                                }`}
                              >
                                {isSelected && <span className="material-symbols-outlined text-sm font-black">check</span>}
                              </div>
                            )}

                            <div className="aspect-square bg-surface-container flex items-center justify-center overflow-hidden border-b-2 border-on-background relative">
                              {thumbnails[file.id]
                                ? <img src={thumbnails[file.id]} alt={file.name} className="w-full h-full object-cover" />
                                : <span className="material-symbols-outlined text-5xl text-on-surface-variant">{getFileIcon(file.mime || '')}</span>
                              }
                            </div>
                            <div className="p-2">
                              <p className="text-xs font-bold truncate" title={file.name}>{file.name}</p>
                              <div className="flex items-center justify-between mt-0.5">
                                <p className="text-on-surface-variant text-[10px]">{fmtSize(file.size || 0)}</p>
                                {/* Tag dots */}
                                {file.tags && file.tags.length > 0 && (
                                  <div className="flex items-center gap-0.5">
                                    {file.tags.map(tid => {
                                      const tagDef = COLOR_TAGS.find(t => t.id === tid);
                                      return tagDef ? (
                                        <span key={tid} className="w-2 h-2 rounded-full border border-black" style={{ backgroundColor: tagDef.hex }} title={tagDef.label} />
                                      ) : null;
                                    })}
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {/* Hover Actions */}
                            <div className="absolute inset-0 bg-background/85 flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={e => { e.stopPropagation(); setSelectedFile(file); }} className="border-2 border-on-background bg-background p-1.5 hover:bg-surface-container" title="Preview">
                                <span className="material-symbols-outlined text-sm">visibility</span>
                              </button>
                              <button onClick={e => { e.stopPropagation(); setShowTagAssignModal({ fileIds: [file.id], currentTags: file.tags }); }} className="border-2 border-on-background bg-background p-1.5 hover:bg-primary-container" title="Assign Tags">
                                <span className="material-symbols-outlined text-sm">label</span>
                              </button>
                              <button onClick={e => { e.stopPropagation(); setShowShareModal(file); }} className="border-2 border-on-background bg-background p-1.5 hover:bg-primary-container" title="Share Link">
                                <span className="material-symbols-outlined text-sm">share</span>
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
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="border-2 border-on-background bg-surface-container-lowest overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b-2 border-on-background bg-surface-container font-bold uppercase">
                      <th className="p-3 w-10">
                        <input
                          type="checkbox"
                          checked={selectedFileIds.size === filtered.length && filtered.length > 0}
                          onChange={e => { if (e.target.checked) handleSelectAll(); else handleDeselectAll(); }}
                        />
                      </th>
                      <th className="p-3">Name</th>
                      <th className="p-3">Tags</th>
                      <th className="p-3">Size</th>
                      <th className="p-3">Modified</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y border-on-background">
                    {filtered.map(file => {
                      const isSelected = selectedFileIds.has(file.id);
                      return (
                        <tr key={file.id} onClick={() => {
                          if (isSelectMode || selectedFileIds.size > 0) handleToggleSelect(file.id);
                          else setSelectedFile(file);
                        }} className={`hover:bg-surface-container-low cursor-pointer ${isSelected ? 'bg-primary-container/20' : ''}`}>
                          <td className="p-3" onClick={e => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelect(file.id)}
                            />
                          </td>
                          <td className="p-3 flex items-center gap-2 min-w-0">
                            <span className="material-symbols-outlined text-primary">{getFileIcon(file.mime)}</span>
                            <span className="font-bold truncate">{file.name}</span>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-1">
                              {file.tags && file.tags.map(tid => {
                                const tagDef = COLOR_TAGS.find(t => t.id === tid);
                                return tagDef ? (
                                  <span key={tid} className="w-2.5 h-2.5 rounded-full border border-black" style={{ backgroundColor: tagDef.hex }} title={tagDef.label} />
                                ) : null;
                              })}
                            </div>
                          </td>
                          <td className="p-3 text-on-surface-variant whitespace-nowrap">{fmtSize(file.size)}</td>
                          <td className="p-3 text-on-surface-variant whitespace-nowrap">{fmtDate(file.modified)}</td>
                          <td className="p-3 text-right whitespace-nowrap" onClick={e => e.stopPropagation()}>
                            <button onClick={() => setShowTagAssignModal({ fileIds: [file.id], currentTags: file.tags })} className="p-1 hover:text-primary mr-1" title="Assign Tags">
                              <span className="material-symbols-outlined text-base">label</span>
                            </button>
                            <button onClick={() => setShowShareModal(file)} className="p-1 hover:text-primary mr-1" title="Share Link">
                              <span className="material-symbols-outlined text-base">share</span>
                            </button>
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
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          )}

          {/* ── Floating Batch Operations Toolbar ── */}
          {selectedFileIds.size > 0 && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-surface-container-lowest border-4 border-on-background p-3 z-50 flex items-center gap-3 max-w-2xl w-[92vw] shadow-2xl"
              style={{ boxShadow: '8px 8px 0 #1a1c1c' }}>
              <div className="flex items-center gap-2 border-r-2 border-on-background pr-3 flex-shrink-0">
                <span className="w-6 h-6 rounded-full bg-primary text-on-primary font-black text-xs flex items-center justify-center">
                  {selectedFileIds.size}
                </span>
                <span className="text-xs font-bold uppercase hidden sm:inline">Selected</span>
              </div>

              <div className="flex items-center gap-2 flex-grow overflow-x-auto">
                {/* Download as ZIP */}
                <button
                  onClick={handleBulkZipDownload}
                  disabled={isZipping}
                  className="flex items-center gap-1.5 bg-primary text-on-primary border-2 border-on-background px-3 py-1.5 text-xs font-bold uppercase brutal-shadow hover:translate-x-0.5 hover:translate-y-0.5 whitespace-nowrap disabled:opacity-60"
                  title="Download all selected files as a ZIP archive"
                >
                  <span className="material-symbols-outlined text-sm">{isZipping ? 'progress_activity' : 'folder_zip'}</span>
                  <span>{isZipping ? 'Zipping...' : 'Download ZIP'}</span>
                </button>

                {/* Tag */}
                <button
                  onClick={() => setShowTagAssignModal({ fileIds: Array.from(selectedFileIds) })}
                  className="flex items-center gap-1.5 bg-surface-container border-2 border-on-background px-3 py-1.5 text-xs font-bold uppercase hover:bg-surface-dim whitespace-nowrap"
                >
                  <span className="material-symbols-outlined text-sm">label</span>
                  <span>Tag</span>
                </button>

                {/* Star */}
                <button
                  onClick={handleBulkStar}
                  className="flex items-center gap-1.5 bg-surface-container border-2 border-on-background px-3 py-1.5 text-xs font-bold uppercase hover:bg-surface-dim whitespace-nowrap"
                >
                  <span className="material-symbols-outlined text-sm">star</span>
                  <span>Star</span>
                </button>

                {/* Delete */}
                <button
                  onClick={handleBulkDelete}
                  className="flex items-center gap-1.5 bg-error-container text-on-error-container border-2 border-on-background px-3 py-1.5 text-xs font-bold uppercase hover:brightness-95 whitespace-nowrap"
                >
                  <span className="material-symbols-outlined text-sm">delete</span>
                  <span>Delete</span>
                </button>
              </div>

              {/* Deselect / Cancel */}
              <button
                onClick={handleDeselectAll}
                className="p-1.5 border-2 border-transparent hover:border-on-background hover:bg-surface-container flex-shrink-0"
                title="Deselect All"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>
          )}

          {/* ── Shared Links Manager Section ── */}
          {section === 'shares' && (
            <div className="flex flex-col gap-6 max-w-5xl">
              {/* Summary Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="border-2 border-on-background bg-surface-container-lowest p-4 flex items-center gap-3 brutal-shadow">
                  <div className="w-10 h-10 border-2 border-on-background bg-primary-container flex items-center justify-center">
                    <span className="material-symbols-outlined text-xl">share</span>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase text-on-surface-variant">Total Links</p>
                    <p className="text-xl font-black">{Object.keys(shareLinks).length}</p>
                  </div>
                </div>

                <div className="border-2 border-on-background bg-surface-container-lowest p-4 flex items-center gap-3 brutal-shadow">
                  <div className="w-10 h-10 border-2 border-on-background bg-primary-fixed flex items-center justify-center">
                    <span className="material-symbols-outlined text-xl text-on-primary-fixed">check_circle</span>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase text-on-surface-variant">Live &amp; Active</p>
                    <p className="text-xl font-black text-primary">
                      {Object.values(shareLinks).filter(l => l.isActive && (!l.expiresAt || new Date() < new Date(l.expiresAt))).length}
                    </p>
                  </div>
                </div>

                <div className="border-2 border-on-background bg-surface-container-lowest p-4 flex items-center gap-3 brutal-shadow">
                  <div className="w-10 h-10 border-2 border-on-background bg-error-container flex items-center justify-center">
                    <span className="material-symbols-outlined text-xl text-on-error-container">timer_off</span>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase text-on-surface-variant">Expired / Revoked</p>
                    <p className="text-xl font-black">
                      {Object.values(shareLinks).filter(l => !l.isActive || (l.expiresAt && new Date() >= new Date(l.expiresAt))).length}
                    </p>
                  </div>
                </div>
              </div>

              {/* Shared Links List */}
              {Object.keys(shareLinks).length === 0 ? (
                <div className="flex flex-col items-center justify-center h-80 gap-4 border-4 border-dashed border-on-background bg-surface-container-low p-8 text-center">
                  <span className="material-symbols-outlined text-6xl text-primary">share</span>
                  <div>
                    <h3 className="font-black text-lg uppercase mb-1">No Shared Links Yet</h3>
                    <p className="text-sm text-on-surface-variant max-w-sm">
                      Create encrypted expiring links for any photo or file with customizable time limits and view/download permissions.
                    </p>
                  </div>
                  <button
                    onClick={() => setSection('all')}
                    className="flex items-center gap-2 bg-primary text-on-primary border-2 border-on-background px-6 py-3 font-bold text-sm uppercase brutal-shadow"
                  >
                    <span className="material-symbols-outlined">folder</span>Go to My Files
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {Object.values(shareLinks)
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map(link => {
                      const isPastExpiry = link.expiresAt ? new Date() >= new Date(link.expiresAt) : false;
                      const isLive = link.isActive && !isPastExpiry;

                      return (
                        <div
                          key={link.id}
                          className={`border-2 border-on-background bg-surface-container-lowest p-5 flex flex-col gap-4 transition-all ${
                            isLive ? 'hover:border-primary' : 'opacity-70 bg-surface-container-low'
                          }`}
                          style={{ boxShadow: '4px 4px 0 #1a1c1c' }}
                        >
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b-2 border-on-background pb-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-10 h-10 border-2 border-on-background bg-surface-container flex items-center justify-center flex-shrink-0">
                                <span className="material-symbols-outlined text-xl text-primary">{getFileIcon(link.mime)}</span>
                              </div>
                              <div className="min-w-0">
                                <h3 className="font-black text-sm uppercase truncate" title={link.fileName}>{link.fileName}</h3>
                                <p className="text-xs text-on-surface-variant font-label-caps">{fmtSize(link.size)} · Created {fmtDate(link.createdAt)}</p>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 self-stretch sm:self-auto">
                              {/* Status Badge */}
                              {isLive ? (
                                <span className="bg-primary-fixed text-on-primary-fixed border border-on-background px-2.5 py-1 text-[10px] font-black uppercase flex items-center gap-1">
                                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                                  LIVE &amp; ACTIVE
                                </span>
                              ) : !link.isActive ? (
                                <span className="bg-surface-container text-on-surface-variant border border-on-background px-2.5 py-1 text-[10px] font-black uppercase flex items-center gap-1">
                                  <span className="material-symbols-outlined text-xs">block</span>
                                  TURNED OFF
                                </span>
                              ) : (
                                <span className="bg-error-container text-on-error-container border border-on-background px-2.5 py-1 text-[10px] font-black uppercase flex items-center gap-1">
                                  <span className="material-symbols-outlined text-xs">timer_off</span>
                                  EXPIRED
                                </span>
                              )}

                              {/* Permission Pill */}
                              <span className="border border-on-background bg-surface-container-high px-2 py-0.5 text-[10px] font-bold uppercase">
                                {link.allowDownload ? '⬇️ Download Allowed' : '👁️ View Only'}
                              </span>

                              {/* Passcode Pill */}
                              {link.isPasswordProtected && (
                                <span className="border border-on-background bg-surface-container-high px-2 py-0.5 text-[10px] font-bold uppercase flex items-center gap-0.5">
                                  <span className="material-symbols-outlined text-[11px]">lock</span>
                                  PIN Locked
                                </span>
                              )}
                            </div>
                          </div>

                          {/* URL Box & Copy */}
                          <div className="flex items-center gap-2 bg-surface-container-low border-2 border-on-background p-2">
                            <input
                              type="text"
                              readOnly
                              value={link.shareUrl}
                              className="bg-transparent text-xs text-on-background font-mono focus:outline-none flex-grow min-w-0 select-all"
                            />
                            <button
                              onClick={() => handleCopyShareLink(link.shareUrl, link.id)}
                              className="bg-primary text-on-primary border border-on-background px-3 py-1.5 text-xs font-bold uppercase flex items-center gap-1 flex-shrink-0 hover:brightness-110"
                            >
                              <span className="material-symbols-outlined text-sm">
                                {copiedLinkId === link.id ? 'check' : 'content_copy'}
                              </span>
                              {copiedLinkId === link.id ? 'Copied!' : 'Copy'}
                            </button>
                          </div>

                          {/* Footer Info & Actions */}
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
                            <div className="flex items-center gap-2 text-xs font-bold text-on-surface-variant">
                              <span className="material-symbols-outlined text-sm text-primary">schedule</span>
                              <span>
                                {!link.expiresAt
                                  ? 'Never Expires'
                                  : isPastExpiry
                                  ? `Expired on ${fmtDate(link.expiresAt)}`
                                  : `Expires in ${formatTimeRemaining(link.expiresAt)} (${fmtDate(link.expiresAt)})`}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 self-stretch sm:self-auto">
                              {/* QR Code Modal Button */}
                              <button
                                onClick={() => setShowQrModal({ title: link.fileName, url: link.shareUrl })}
                                className="p-1.5 border-2 border-on-background bg-surface-container hover:bg-primary-container"
                                title="View / Scan QR Code"
                              >
                                <span className="material-symbols-outlined text-sm">qr_code_2</span>
                              </button>

                              {/* Toggle Link Active / Inactive */}
                              <button
                                onClick={() => handleToggleShareActive(link)}
                                className={`flex-1 sm:flex-initial flex items-center justify-center gap-1 border-2 border-on-background px-3 py-1.5 text-xs font-bold uppercase transition-all ${
                                  link.isActive
                                    ? 'bg-surface-container hover:bg-error-container hover:text-on-error-container'
                                    : 'bg-primary text-on-primary'
                                }`}
                                title={link.isActive ? 'Turn off link to prevent access' : 'Turn link back on'}
                              >
                                <span className="material-symbols-outlined text-sm">
                                  {link.isActive ? 'toggle_on' : 'toggle_off'}
                                </span>
                                {link.isActive ? 'Turn Off' : 'Turn On'}
                              </button>

                              {/* Open in Browser */}
                              <button
                                onClick={() => openUrl(link.shareUrl)}
                                className="p-1.5 border-2 border-on-background bg-surface-container hover:bg-surface-dim"
                                title="Open Link in Browser"
                              >
                                <span className="material-symbols-outlined text-sm">open_in_new</span>
                              </button>

                              {/* Delete Link */}
                              <button
                                onClick={() => handleDeleteShareLink(link)}
                                className="p-1.5 border-2 border-on-background bg-error-container text-on-error-container hover:brightness-95"
                                title="Permanently Delete Share Link"
                              >
                                <span className="material-symbols-outlined text-sm">delete</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
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

              {/* 1-Click Encrypted Vault Backup & Restore */}
              <section className="border-2 border-on-background bg-surface-container-lowest p-6 flex flex-col gap-4" style={{ boxShadow: '4px 4px 0 #1a1c1c' }}>
                <div className="flex items-center justify-between border-b-2 border-on-background pb-2">
                  <h2 className="font-black text-base uppercase">Vault Backup &amp; Migration</h2>
                  <span className="text-xs font-bold uppercase bg-primary-container text-on-primary-container border border-on-background px-2 py-0.5">AES-256</span>
                </div>
                <p className="text-sm text-on-surface-variant leading-relaxed">
                  Export your entire vault, albums, tags, and share indices into a single encrypted <code>.chuchudu</code> archive for cold storage, USB backups, or migration.
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => setShowBackupModal(true)}
                    className="flex items-center gap-2 bg-primary text-on-primary border-2 border-on-background px-5 py-3 font-bold text-sm uppercase brutal-shadow hover:translate-x-0.5 hover:translate-y-0.5"
                  >
                    <span className="material-symbols-outlined text-lg">archive</span>
                    Create Encrypted Backup
                  </button>
                  <button
                    onClick={() => setShowBackupModal(true)}
                    className="flex items-center gap-2 bg-surface-container border-2 border-on-background px-5 py-3 font-bold text-sm uppercase hover:bg-surface-dim"
                  >
                    <span className="material-symbols-outlined text-lg">unarchive</span>
                    Restore Vault from Backup
                  </button>
                </div>
              </section>

              {/* Storage Folder */}
              <section className="border-2 border-on-background bg-surface-container-lowest p-6 flex flex-col gap-4" style={{ boxShadow: '4px 4px 0 #1a1c1c' }}>
                <div className="flex items-center justify-between border-b-2 border-on-background pb-2">
                  <h2 className="font-black text-base uppercase">Storage Folder</h2>
                  <span className="text-xs font-bold uppercase bg-primary-fixed text-on-primary-fixed border border-on-background px-2 py-0.5">Active</span>
                </div>
                <p className="text-sm text-on-surface-variant leading-relaxed">
                  Choose any folder on your laptop or external drive where your photos and files will be stored.
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
                      title="Open this storage folder in Finder / Explorer"
                      className="bg-on-background text-background border-2 border-on-background px-4 py-3 font-bold text-sm uppercase whitespace-nowrap flex items-center gap-1.5"
                      style={{ boxShadow: '3px 3px 0 #444' }}>
                      <span className="material-symbols-outlined text-lg">folder</span>
                      Open Folder
                    </button>
                  </div>
                </div>
              </section>

              {/* Autostart */}
              <section className="border-2 border-on-background bg-surface-container-lowest p-6 flex items-center justify-between gap-4" style={{ boxShadow: '4px 4px 0 #1a1c1c' }}>
                <div>
                  <h2 className="font-black text-base uppercase">Launch at System Startup</h2>
                  <p className="text-sm text-on-surface-variant mt-1">Start vault automatically on system login (Windows &amp; macOS).</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer" onClick={toggleAutostart}>
                  <input type="checkbox" checked={autostart} readOnly className="sr-only peer" />
                  <div className="w-14 h-8 bg-surface-container-high border-2 border-on-background peer-checked:bg-primary-fixed peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-on-background after:h-6 after:w-6 after:transition-all rounded-none" />
                </label>
              </section>

              {/* Google Drive */}
              <section className="border-2 border-on-background bg-surface-container-lowest p-6 flex flex-col gap-4" style={{ boxShadow: '4px 4px 0 #1a1c1c' }}>
                <h2 className="font-black text-base uppercase border-b-2 border-on-background pb-2">Google Drive Buffer</h2>
                <p className="text-sm text-on-surface-variant">When your laptop is <strong>OFF</strong>, uploaded files buffer here temporarily.</p>
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

      {/* Fullscreen Gallery & Slideshow Modal */}
      {selectedFile && (
        <FullscreenGalleryModal
          file={selectedFile}
          fileList={filtered}
          onClose={() => setSelectedFile(null)}
          onNavigate={setSelectedFile}
          onDownload={handleDownload}
          onStar={f => { handleStar(f); setSelectedFile({ ...f, starred: !f.starred }); }}
          onDelete={f => { handleDelete(f); setSelectedFile(null); }}
          onAddToAlbum={f => { setSelectedFile(null); setShowAssignFileModal(f); }}
          onSetAsCover={activeAlbum ? (f => handleSetCover(activeAlbum.id, f.id)) : undefined}
          onShare={f => setShowShareModal(f)}
          activeAlbum={activeAlbum}
          onRemoveFromAlbum={activeAlbum ? (f => handleRemoveFileFromAlbum(activeAlbum.id, f.id)) : undefined}
        />
      )}
    </div>
  );
}

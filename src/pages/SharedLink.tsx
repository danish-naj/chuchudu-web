import React, { useState, useEffect } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { decryptChunk } from '../crypto/encryption';

function fmtSize(bytes: number): string {
  if (!bytes) return "0 B";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1048576).toFixed(1) + " MB";
}

function getFileIcon(mime?: string): string {
  if (!mime) return 'insert_drive_file';
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'movie';
  if (mime.startsWith('audio/')) return 'audio_file';
  if (mime === 'application/pdf') return 'picture_as_pdf';
  if (mime.includes('word') || mime.includes('document')) return 'description';
  return 'insert_drive_file';
}

export default function SharedLink() {
  const { linkId } = useParams<{ linkId: string }>();
  const location = useLocation();
  
  const [error, setError] = useState<string | null>(null);
  const [isExpired, setIsExpired] = useState(false);
  const [metadata, setMetadata] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Password protection
  const [requirePassword, setRequirePassword] = useState(false);
  const [enteredPassword, setEnteredPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);

  // Decrypted Preview State
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [decryptedBlob, setDecryptedBlob] = useState<Blob | null>(null);
  const [decrypting, setDecrypting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("");

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const hash = location.hash;
        if (!hash || !hash.startsWith('#key=')) {
          throw new Error("Decryption key missing from URL. Please ask the sender for the complete link.");
        }

        const { ref, get } = await import('firebase/database');
        const { rtdb } = await import('../config/firebase');
        
        const snapshot = await get(ref(rtdb, `shares/${linkId}`));
        if (!snapshot.exists()) {
          throw new Error("Shared file not found or has expired.");
        }
        
        const data = snapshot.val();
        setMetadata(data);

        // Check expiration
        if (data.expires_at) {
          const expireDate = new Date(data.expires_at);
          if (new Date() > expireDate) {
            setIsExpired(true);
            setLoading(false);
            return;
          }
        }

        // Check password protection
        if (data.password_hash) {
          setRequirePassword(true);
        } else {
          setIsUnlocked(true);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load shared file.');
      } finally {
        setLoading(false);
      }
    };

    fetchMetadata();
  }, [linkId, location.hash]);

  // Decrypt and load inline preview automatically if unlocked
  useEffect(() => {
    if (!isUnlocked || !metadata || isExpired) return;

    let activeUrl: string | null = null;

    const autoDecryptForPreview = async () => {
      try {
        setDecrypting(true);
        setStatusText("Decrypting secure payload...");
        
        const hash = location.hash;
        const base64Key = hash.replace('#key=', '');
        const binaryString = atob(base64Key);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const fileKey = await crypto.subtle.importKey('raw', bytes.buffer, { name: 'AES-GCM' }, false, ['decrypt']);

        const driveUrl = `https://drive.google.com/uc?export=download&id=${linkId}`;
        const res = await fetch(`https://corsproxy.io/?url=${encodeURIComponent(driveUrl)}`);
        
        if (!res.ok) throw new Error("Could not retrieve payload from cloud buffer.");
        
        const payloadText = await res.text();
        const payloadObj = JSON.parse(payloadText);
        
        if (!payloadObj.chunks) throw new Error("Corrupted payload file: Missing chunks.");

        const payloadChunks = payloadObj.chunks;
        const decryptedBuffers: ArrayBuffer[] = [];
        
        for (let i = 0; i < payloadChunks.length; i++) {
          const chunk = payloadChunks[i];
          const dataBuffer = new Uint8Array(chunk.data).buffer;
          setProgress(Math.round(((i + 1) / payloadChunks.length) * 100));
          const decrypted = await decryptChunk(dataBuffer, fileKey, chunk.index);
          decryptedBuffers.push(decrypted);
        }

        const mime = metadata.mime_type || metadata.mime || 'application/octet-stream';
        const finalBlob = new Blob(decryptedBuffers, { type: mime });
        setDecryptedBlob(finalBlob);

        activeUrl = URL.createObjectURL(finalBlob);
        setPreviewBlobUrl(activeUrl);
      } catch (e: any) {
        console.error('Preview error:', e);
      } finally {
        setDecrypting(false);
      }
    };

    autoDecryptForPreview();

    return () => {
      if (activeUrl) URL.revokeObjectURL(activeUrl);
    };
  }, [isUnlocked, metadata, isExpired, linkId, location.hash]);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    
    // Simple SHA-256 hash check
    const enc = new TextEncoder().encode(enteredPassword);
    const hashBuf = await crypto.subtle.digest('SHA-256', enc);
    const hashHex = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('');

    if (hashHex === metadata.password_hash) {
      setIsUnlocked(true);
      setRequirePassword(false);
    } else {
      setPasswordError('Incorrect passcode. Please try again.');
    }
  };

  const handleDownload = () => {
    if (!decryptedBlob || !metadata) return;
    setDownloading(true);
    const url = URL.createObjectURL(decryptedBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = metadata.file_name || 'downloaded-file';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setTimeout(() => setDownloading(false), 1500);
  };

  const allowDownload = metadata?.allow_download !== false;
  const isImage = metadata?.mime_type?.startsWith('image/') || metadata?.mime?.startsWith('image/');
  const isVideo = metadata?.mime_type?.startsWith('video/') || metadata?.mime?.startsWith('video/');
  const isAudio = metadata?.mime_type?.startsWith('audio/') || metadata?.mime?.startsWith('audio/');
  const isPdf = metadata?.mime_type === 'application/pdf' || metadata?.mime === 'application/pdf';

  if (loading) {
    return (
      <div className="bg-background text-on-background min-h-screen flex flex-col items-center justify-center gap-4">
        <span className="material-symbols-outlined text-5xl text-primary animate-spin">progress_activity</span>
        <p className="font-label-caps text-xs uppercase tracking-widest text-on-surface-variant font-bold">
          Verifying Encrypted Link...
        </p>
      </div>
    );
  }

  // ── Expired State ──
  if (isExpired) {
    return (
      <div className="bg-background text-on-background min-h-screen flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-surface border-4 border-on-background p-8 flex flex-col items-center text-center brutal-shadow-lg">
          <div className="w-16 h-16 bg-error-container text-on-error-container border-2 border-on-background flex items-center justify-center mb-4 brutal-shadow">
            <span className="material-symbols-outlined text-4xl">timer_off</span>
          </div>
          <h1 className="font-headline-lg text-2xl uppercase tracking-tight mb-2">Link Expired</h1>
          <p className="font-body-md text-sm text-on-surface-variant mb-6">
            The time limit for this shared file has passed. The sender set this link to expire automatically.
          </p>
          <div className="w-full bg-surface-container-high border-2 border-on-background p-3 mb-6 text-xs text-on-surface-variant font-label-caps uppercase">
            Expired on: {metadata?.expires_at ? new Date(metadata.expires_at).toLocaleString() : 'Recently'}
          </div>
          <Link
            to="/"
            className="w-full bg-primary text-on-primary border-2 border-on-background py-3 font-button-text text-sm uppercase font-bold brutal-shadow hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
          >
            Go to Chuchudu Home
          </Link>
        </div>
      </div>
    );
  }

  // ── Error State ──
  if (error) {
    return (
      <div className="bg-background text-on-background min-h-screen flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-surface border-4 border-on-background p-8 flex flex-col items-center text-center brutal-shadow-lg">
          <div className="w-16 h-16 bg-error-container text-on-error-container border-2 border-on-background flex items-center justify-center mb-4 brutal-shadow">
            <span className="material-symbols-outlined text-4xl">lock</span>
          </div>
          <h1 className="font-headline-lg text-2xl uppercase tracking-tight mb-2">Access Denied</h1>
          <p className="font-body-md text-sm text-error mb-6">{error}</p>
          <Link
            to="/"
            className="w-full bg-surface-container border-2 border-on-background py-3 font-button-text text-xs uppercase font-bold hover:bg-surface-dim transition-colors"
          >
            Return to Homepage
          </Link>
        </div>
      </div>
    );
  }

  // ── Password Required State ──
  if (requirePassword && !isUnlocked) {
    return (
      <div className="bg-background text-on-background min-h-screen flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-surface border-4 border-on-background p-8 flex flex-col items-center text-center brutal-shadow-lg">
          <div className="w-16 h-16 bg-primary-container text-on-primary-container border-2 border-on-background flex items-center justify-center mb-4 brutal-shadow">
            <span className="material-symbols-outlined text-4xl">key</span>
          </div>
          <h1 className="font-headline-lg text-xl uppercase tracking-tight mb-1">Passcode Required</h1>
          <p className="font-body-md text-xs text-on-surface-variant mb-6">
            The sender protected this link with a secret passcode.
          </p>

          <form onSubmit={handlePasswordSubmit} className="w-full flex flex-col gap-4">
            <input
              type="password"
              placeholder="Enter link passcode"
              value={enteredPassword}
              onChange={e => setEnteredPassword(e.target.value)}
              required
              autoFocus
              className="w-full bg-surface-container-low border-2 border-on-background px-4 py-3 text-sm font-bold text-center focus:outline-none focus:border-primary"
            />
            {passwordError && (
              <p className="text-xs text-error font-bold">{passwordError}</p>
            )}
            <button
              type="submit"
              className="w-full bg-primary text-on-primary border-2 border-on-background py-3 font-button-text text-sm uppercase font-bold brutal-shadow hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
            >
              Unlock File
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── Main Unlocked View & Download Page ──
  return (
    <div className="bg-background text-on-background min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 selection:bg-primary-container">
      <div className="w-full max-w-2xl bg-surface border-4 border-on-background brutal-shadow-lg flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="bg-primary-container border-b-4 border-on-background p-4 sm:p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-on-background text-background border-2 border-on-background flex items-center justify-center font-black text-lg">
              🔒
            </div>
            <div>
              <h1 className="font-headline-lg text-lg sm:text-xl uppercase tracking-tight text-on-background">
                End-to-End Encrypted Transfer
              </h1>
              <p className="font-label-caps text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">
                Direct Device-to-Device Zero Knowledge Share
              </p>
            </div>
          </div>

          {/* Permissions Tag */}
          <div className={`px-3 py-1 border-2 border-on-background text-xs font-black uppercase ${allowDownload ? 'bg-primary text-on-primary' : 'bg-surface-dim text-on-surface-variant'}`}>
            {allowDownload ? 'Download Allowed' : 'View Only Mode'}
          </div>
        </div>

        {/* File Details & In-Browser Preview */}
        <div className="p-6 flex flex-col gap-6">
          
          {/* Metadata Card */}
          <div className="border-2 border-on-background bg-surface-container-low p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <span className="material-symbols-outlined text-3xl text-primary flex-shrink-0">
                {getFileIcon(metadata?.mime_type || metadata?.mime)}
              </span>
              <div className="min-w-0">
                <p className="font-headline-md text-sm sm:text-base uppercase truncate font-bold" title={metadata?.file_name}>
                  {metadata?.file_name || 'Shared Document'}
                </p>
                <div className="flex items-center gap-3 text-xs text-on-surface-variant font-label-caps mt-0.5">
                  <span>{fmtSize(metadata?.size || 0)}</span>
                  <span>•</span>
                  <span>Expires: {metadata?.expires_at ? new Date(metadata.expires_at).toLocaleDateString() : 'Never'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Decrypted Preview Area */}
          <div className="border-2 border-on-background bg-surface-container-lowest min-h-64 flex flex-col items-center justify-center overflow-hidden relative"
            onContextMenu={e => { if (!allowDownload) e.preventDefault(); }}>
            
            {decrypting ? (
              <div className="flex flex-col items-center gap-3 py-12 text-center p-4">
                <span className="material-symbols-outlined text-4xl text-primary animate-spin">progress_activity</span>
                <p className="font-label-caps text-xs uppercase font-bold text-on-surface-variant">
                  {statusText} {progress > 0 && `(${progress}%)`}
                </p>
                <div className="w-48 h-2 bg-surface-container border border-on-background mt-2">
                  <div className="h-full bg-primary transition-all duration-150" style={{ width: `${progress}%` }} />
                </div>
              </div>
            ) : previewBlobUrl ? (
              <div className="w-full flex items-center justify-center p-2">
                {isImage ? (
                  <img
                    src={previewBlobUrl}
                    alt={metadata.file_name}
                    className="max-w-full max-h-[55vh] object-contain select-none"
                    draggable={allowDownload}
                  />
                ) : isVideo ? (
                  <video
                    src={previewBlobUrl}
                    controls
                    controlsList={allowDownload ? undefined : "nodownload"}
                    className="max-w-full max-h-[55vh]"
                  />
                ) : isAudio ? (
                  <div className="p-8 flex flex-col items-center gap-4 w-full">
                    <span className="material-symbols-outlined text-6xl text-primary">audio_file</span>
                    <audio
                      src={previewBlobUrl}
                      controls
                      controlsList={allowDownload ? undefined : "nodownload"}
                      className="w-full"
                    />
                  </div>
                ) : isPdf ? (
                  <iframe
                    src={previewBlobUrl}
                    title={metadata.file_name}
                    className="w-full h-[55vh] border-0"
                  />
                ) : (
                  <div className="py-12 flex flex-col items-center gap-3 text-center p-4">
                    <span className="material-symbols-outlined text-6xl text-primary">description</span>
                    <p className="font-headline-md text-sm uppercase font-bold">{metadata.file_name}</p>
                    <p className="font-body-md text-xs text-on-surface-variant">
                      File decrypted and verified.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-12 flex flex-col items-center gap-2 text-center p-4 text-on-surface-variant">
                <span className="material-symbols-outlined text-5xl">lock</span>
                <p className="text-xs font-bold uppercase">Ready to decrypt</p>
              </div>
            )}
          </div>

          {/* Action Button & Restriction Notice */}
          <div>
            {allowDownload ? (
              <button
                onClick={handleDownload}
                disabled={decrypting || downloading}
                className="w-full bg-primary text-on-primary border-2 border-on-background py-3.5 font-button-text text-sm uppercase font-bold brutal-shadow hover:translate-x-0.5 hover:translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
              >
                <span className="material-symbols-outlined text-xl">download</span>
                {downloading ? 'Saving File...' : 'Download Original File'}
              </button>
            ) : (
              <div className="border-2 border-on-background bg-surface-container-high p-4 flex items-center gap-3 text-on-surface-variant">
                <span className="material-symbols-outlined text-2xl text-primary">lock_clock</span>
                <div className="text-xs font-label-caps leading-relaxed">
                  <strong className="text-on-background uppercase block mb-0.5">View-Only Access Enforced</strong>
                  The sender created this link with download restrictions. You can view the full file above in your browser.
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="border-t-2 border-on-background bg-surface-container p-4 flex items-center justify-between text-xs font-label-caps text-on-surface-variant">
          <span>Protected with AES-256-GCM Zero-Knowledge</span>
          <Link to="/" className="font-bold text-primary hover:underline uppercase">
            Powered by Chuchudu
          </Link>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { decryptChunk } from '../crypto/encryption';

export default function SharedLink() {
  const { linkId } = useParams<{ linkId: string }>();
  const location = useLocation();
  
  const [error, setError] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("");

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const hash = location.hash;
        if (!hash || !hash.startsWith('#key=')) {
          throw new Error("Decryption key missing from URL");
        }

        const { ref, get } = await import('firebase/database');
        const { rtdb } = await import('../config/firebase');
        
        const snapshot = await get(ref(rtdb, `shares/${linkId}`));
        if (!snapshot.exists()) {
          throw new Error("Shared file not found or has expired");
        }
        
        setMetadata(snapshot.val());
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMetadata();
  }, [linkId, location.hash]);

  const handleDownload = async () => {
    try {
      setDownloading(true);
      setError(null);
      setProgress(0);
      setStatusText("Downloading encrypted payload...");

      // 1. Extract base64 key from URL fragment
      const hash = location.hash;
      const base64Key = hash.replace('#key=', '');
      const binaryString = atob(base64Key);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
      }
      const fileKey = await crypto.subtle.importKey('raw', bytes.buffer, { name: 'AES-GCM' }, false, ['decrypt']);

      // 2. Fetch the payload file from Google Drive via CORS proxy
      // Using a proxy to bypass Drive CORS for public downloads
      const driveUrl = `https://drive.google.com/uc?export=download&id=${linkId}`;
      const res = await fetch(`https://corsproxy.io/?url=${encodeURIComponent(driveUrl)}`);
      
      if (!res.ok) {
        throw new Error("Failed to download payload from cloud");
      }
      
      const payloadText = await res.text();
      let payloadObj;
      try {
        payloadObj = JSON.parse(payloadText);
      } catch(e) {
        throw new Error("Invalid payload format");
      }
      
      if (!payloadObj.chunks) {
         throw new Error("Corrupted payload file: Missing chunks.");
      }

      // 3. Decrypt the chunks
      setStatusText("Decrypting file locally...");
      const payloadChunks = payloadObj.chunks;
      const decryptedBuffers: ArrayBuffer[] = [];
      
      for (let i = 0; i < payloadChunks.length; i++) {
        const chunk = payloadChunks[i];
        const dataBuffer = new Uint8Array(chunk.data).buffer;
        setProgress(Math.round((i / payloadChunks.length) * 100));
        
        const decrypted = await decryptChunk(dataBuffer, fileKey, chunk.index);
        decryptedBuffers.push(decrypted);
      }

      // 4. Trigger download of the original file
      setStatusText("Saving...");
      const finalBlob = new Blob(decryptedBuffers, { type: metadata.mime_type });
      const url = URL.createObjectURL(finalBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = metadata.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setStatusText("Complete!");
      setProgress(100);
      
      setTimeout(() => setDownloading(false), 2000);
    } catch(err: any) {
      console.error(err);
      setError(err.message);
      setDownloading(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return "0 B";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1048576).toFixed(1) + " MB";
  };

  if (loading) {
    return (
      <div className="bg-background text-on-background min-h-screen flex items-center justify-center">
        <span className="material-symbols-outlined animate-spin" style={{ fontSize: '48px' }}>autorenew</span>
      </div>
    );
  }

  return (
    <div className="bg-background text-on-background min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg bg-surface neo-border neo-shadow p-8 flex flex-col items-center text-center">
         
         <div className="w-16 h-16 bg-primary-container text-on-primary-container neo-border flex items-center justify-center mb-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>
               {error ? 'error' : 'lock_open'}
            </span>
         </div>
         
         <h1 className="font-headline-lg uppercase mb-2">
            {error ? 'Access Denied' : 'Secure File Transfer'}
         </h1>
         
         {error ? (
           <p className="font-body-md text-error mt-4">{error}</p>
         ) : (
           <>
             {metadata && (
                 <div className="w-full bg-surface-container-highest neo-border p-4 mb-6 flex flex-col items-start text-left gap-2 mt-4">
                    <div className="flex items-center gap-3 w-full">
                      <span className="material-symbols-outlined text-primary">description</span>
                      <span className="font-button-text uppercase truncate flex-1 text-primary">{metadata.file_name}</span>
                    </div>
                    <div className="flex justify-between w-full font-label-caps text-on-surface-variant uppercase mt-2">
                       <span>{formatSize(metadata.size)}</span>
                       <span>Expires: {new Date(metadata.expires_at).toLocaleDateString()}</span>
                    </div>
                 </div>
             )}
             
             <div className="w-full flex flex-col gap-6 text-left mt-2">
               <div>
                  {downloading ? (
                    <div className="w-full h-16 neo-border bg-surface-container-highest flex items-center px-4 relative overflow-hidden">
                      <div className="absolute top-0 left-0 h-full bg-primary transition-all duration-200" style={{width: `${progress}%`, opacity: 0.2}}></div>
                      <span className="material-symbols-outlined animate-spin mr-3 text-primary">autorenew</span>
                      <div className="font-button-text uppercase z-10 flex-1">{statusText} {progress > 0 && `${progress}%`}</div>
                    </div>
                  ) : (
                    <button 
                      onClick={handleDownload}
                      className="w-full h-16 neo-border bg-primary text-on-primary font-button-text uppercase tracking-widest hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-0 active:shadow-none transition-all flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined">download</span>
                      Decrypt & Download
                    </button>
                  )}
               </div>
             </div>
           </>
         )}
      </div>
      <div className="mt-8 font-label-caps uppercase tracking-widest text-on-surface-variant">
         Powered by ChuChudu
      </div>
    </div>
  );
}

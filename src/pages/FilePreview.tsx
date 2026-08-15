import React, { useEffect, useState } from 'react';
import Header from '../components/Header';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useFileSystem } from '../hooks/useFileSystem';
import { useSharing } from '../hooks/useSharing';
import { getFileMetadata } from '../db/indexedDB';

export default function FilePreview() {
  const [searchParams] = useSearchParams();
  const fileId = searchParams.get('id');
  const navigate = useNavigate();
  
  const { getFile, downloadFile, deleteFile, files, addFileToAlbum, removeFileFromAlbum, updateAlbumCover } = useFileSystem();
  const { shareFile } = useSharing();
  
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('Initializing preview...');
  const [error, setError] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<any>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState<number>(1);
  const imgRef = React.useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (!fileId) return;

    let objectUrl: string | null = null;
    
    const loadPreview = async () => {
      try {
        setLoading(true);
        setStatus('Loading file metadata...');
        // Load fast metadata first
        const meta = await getFileMetadata(fileId);
        if (!meta) throw new Error("File not found in local database.");
        setMetadata(meta);

        // Load and decrypt file for preview if it's media
        if (meta.mime?.startsWith('image/') || meta.mime?.startsWith('video/')) {
           const decrypted = await getFile(fileId, setStatus);
           setStatus('Generating view...');
           objectUrl = URL.createObjectURL(decrypted);
           setPreviewUrl(objectUrl);
        } else {
           setStatus('File is not a supported media type.');
        }
      } catch (err: any) {
        console.error("loadPreview error", err);
        setError(err.message || 'Unknown error occurred.');
      } finally {
        setLoading(false);
      }
    };
    
    loadPreview();
    
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [fileId, getFile]);

  const handleZoom = (factor: number) => {
    if (imgRef.current) {
      setZoom((prev: number) => prev * factor);
    }
  };

  const handleResetZoom = () => {
    setZoom(1);
  };

  const handleDelete = async () => {
    if (fileId && window.confirm("Permanently delete this file?")) {
       await deleteFile(fileId);
       navigate('/dashboard');
    }
  };

  const handleDownload = () => {
    if (fileId) downloadFile(fileId);
  };

  const handleShare = async () => {
    if (!fileId) return;
    try {
      const url = await shareFile(fileId);
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
        alert('Secure share link copied to clipboard!\n\n' + url);
      } else {
        alert('Secure share link generated! Please copy it manually:\n\n' + url);
      }
    } catch (err: any) {
      alert('Error sharing file: ' + err.message);
    }
  };

  if (!fileId) return <div className="p-8 text-center">No file ID provided.</div>;

  const getExt = (name: string) => {
    const parts = name.split('.');
    return parts.length > 1 ? parts.pop()!.toUpperCase() : 'FILE';
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return 'Unknown';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="bg-surface text-on-surface font-body-md min-h-screen w-full flex flex-col selection:bg-primary-container selection:text-on-primary-container">
      <Header />
      
      <main className="flex-1 w-full max-w-container-max mx-auto p-margin-mobile md:p-margin-desktop flex items-center justify-center relative">
        <div className="bg-surface w-full max-w-6xl h-[80vh] flex flex-col border-4 border-on-background shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden">
          
          <div className="flex items-center justify-between p-4 border-b-4 border-on-background bg-surface-container-lowest shrink-0">
            <div className="flex items-center gap-4">
              <span className="font-label-caps text-label-caps bg-background border-2 border-on-background px-2 py-1 uppercase">{metadata ? getExt(metadata.name) : '...'}</span>
              <h2 className="font-headline-md text-headline-md truncate max-w-xl">{metadata ? metadata.name : 'Loading...'}</h2>
            </div>
            <Link to="/dashboard" aria-label="Close" className="w-10 h-10 flex items-center justify-center bg-background border-2 border-on-background shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all group">
              <span className="material-symbols-outlined text-on-background group-hover:text-error transition-colors">close</span>
            </Link>
          </div>

          <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
            <div className="flex-1 bg-surface-container-highest flex items-center justify-center p-8 overflow-hidden relative group border-b-4 md:border-b-0 md:border-r-4 border-on-background">
              <div className="absolute inset-0 p-8 flex items-center justify-center">
                {loading ? (
                   <div className="flex flex-col items-center gap-4">
                     <span className="material-symbols-outlined text-display-lg animate-spin" style={{ fontSize: '64px' }}>autorenew</span>
                     <span className="font-label-caps uppercase text-on-surface-variant tracking-widest">{status}</span>
                   </div>
                ) : error ? (
                   <div className="text-error font-body-lg">Error: {error}</div>
                ) : previewUrl ? (
                   metadata?.mime?.startsWith('video/') ? (
                      <video className="max-w-full max-h-full border-4 border-on-background shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]" controls src={previewUrl} />
                   ) : (
                      <img className="max-w-full max-h-full object-contain border-4 border-on-background shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] transition-transform duration-300 group-hover:scale-[1.02]" alt={metadata.name} src={previewUrl} />
                   )
                ) : (
                   <span className="material-symbols-outlined text-display-lg" style={{ fontSize: '120px' }}>description</span>
                )}
              </div>
            </div>

            <div className="w-full md:w-96 bg-surface flex flex-col shrink-0 overflow-y-auto">
              <div className="p-6 flex-1 flex flex-col gap-8">
                <div className="flex flex-col gap-4">
                  <h3 className="font-headline-md text-headline-md uppercase border-b-4 border-on-background pb-2 inline-block self-start">Details</h3>
                  {metadata && (
                    <div className="grid grid-cols-2 gap-y-4 gap-x-2">
                      <div className="flex flex-col">
                        <span className="font-label-caps text-label-caps text-on-surface-variant mb-1">Size</span>
                        <span className="font-body-lg text-body-lg font-bold">{formatSize(metadata.size)}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="font-label-caps text-label-caps text-on-surface-variant mb-1">Type</span>
                        <span className="font-body-lg text-body-lg font-bold truncate">{metadata.mime || 'Unknown'}</span>
                      </div>
                      <div className="flex flex-col col-span-2">
                        <span className="font-label-caps text-label-caps text-on-surface-variant mb-1">Modified</span>
                        <span className="font-body-lg text-body-lg font-bold">{new Date(metadata.modified).toLocaleString()}</span>
                      </div>
                      <div className="flex flex-col col-span-2">
                        <span className="font-label-caps text-label-caps text-on-surface-variant mb-1">Encrypted</span>
                        <span className="font-body-lg text-body-lg font-bold text-primary flex items-center gap-1">
                          <span className="material-symbols-outlined text-[18px]">lock</span> Yes (AES-256-GCM)
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="flex flex-col gap-4 mt-6">
                  <h3 className="font-headline-md text-headline-md uppercase border-b-4 border-on-background pb-2 inline-block self-start">Albums</h3>
                  <div className="flex flex-col gap-2">
                    {files.filter(f => f.type === 'album' && !f.isTrash).map(album => {
                      const inAlbum = metadata?.albumIds?.includes(album.id);
                      const isCover = album.coverId === fileId;
                      const isImage = metadata?.mime?.startsWith('image/');
                      return (
                        <div key={album.id} className="flex flex-col gap-2 bg-background border-2 border-on-background p-3">
                          <div className="flex justify-between items-center">
                            <span className="font-label-caps uppercase truncate flex-1 pr-2">{album.name}</span>
                            <button 
                              onClick={async () => {
                                if (inAlbum) {
                                  await removeFileFromAlbum(fileId!, album.id);
                                  setMetadata((prev: any) => ({...prev, albumIds: (prev.albumIds || []).filter((id: string) => id !== album.id)}));
                                } else {
                                  await addFileToAlbum(fileId!, album.id);
                                  setMetadata((prev: any) => ({...prev, albumIds: [...(prev.albumIds || []), album.id]}));
                                }
                              }} 
                              className={`font-label-caps uppercase px-3 py-1 border-2 border-black transition-colors ${inAlbum ? 'bg-error-container text-on-error-container hover:bg-error hover:text-error-on' : 'bg-primary text-on-primary hover:bg-primary-container hover:text-on-primary-container'}`}>
                              {inAlbum ? 'Remove' : 'Add'}
                            </button>
                          </div>
                          {inAlbum && isImage && (
                            <div className="flex justify-end mt-1">
                              <button 
                                onClick={async () => {
                                  await updateAlbumCover(album.id, fileId!);
                                  // State update is handled by the hook refresh, but we don't have album state here locally except via files
                                }}
                                disabled={isCover}
                                className={`font-label-caps uppercase text-[10px] px-2 py-1 border-2 border-black ${isCover ? 'bg-surface-container-highest opacity-50' : 'bg-white text-black hover:bg-black hover:text-white transition-colors'}`}>
                                {isCover ? 'Current Cover' : 'Set as Cover'}
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {files.filter(f => f.type === 'album' && !f.isTrash).length === 0 && (
                      <span className="text-on-surface-variant font-label-caps uppercase text-sm">No albums created yet. Create one from the Dashboard.</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-6 border-t-4 border-on-background bg-surface-container-lowest flex flex-col gap-3 mt-auto">
                <button onClick={handleDownload} className="w-full bg-primary text-on-primary font-button-text text-button-text uppercase py-4 border-2 border-on-background shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all flex items-center justify-center gap-2 tracking-wide cursor-pointer">
                  <span className="material-symbols-outlined">download</span> Download
                </button>
                <button onClick={handleShare} className="w-full bg-background text-on-surface font-button-text text-button-text uppercase py-3 border-2 border-on-background shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all flex items-center justify-center gap-2 cursor-pointer">
                  <span className="material-symbols-outlined">link</span> Share Link
                </button>
                <button onClick={handleDelete} className="w-full bg-error-container text-on-error-container font-button-text text-button-text uppercase py-3 border-2 border-on-background shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all flex items-center justify-center gap-2 mt-2 cursor-pointer">
                  <span className="material-symbols-outlined">delete</span> Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

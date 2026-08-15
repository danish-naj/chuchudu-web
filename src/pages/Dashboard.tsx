import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useFileSystem } from '../hooks/useFileSystem';
import { db } from '../config/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import PortalSidebar from '../components/PortalSidebar';

function fmtSize(bytes: number): string {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
  return `${(bytes / 1073741824).toFixed(1)} GB`;
}

function timeAgo(dateStr: string): string {
  if (!dateStr) return 'Just now';
  try {
    const now = new Date();
    const date = new Date(dateStr);
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} mins ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hrs ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
    return date.toLocaleDateString();
  } catch {
    return 'Recently';
  }
}

interface CloudFile {
  id: string;
  name: string;
  size: number;
  mime: string;
  modified: string;
  synced?: boolean;
  chunkCount?: number;
}

export default function Dashboard() {
  const { currentUser } = useAuth();
  const { uploadFile } = useFileSystem();

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [cloudFiles, setCloudFiles] = useState<CloudFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Listen to Firestore for files uploaded from this web portal
  useEffect(() => {
    if (!currentUser) return;
    const unsubscribe = onSnapshot(
      collection(db, `users/${currentUser.uid}/files`),
      (snapshot) => {
        const items: CloudFile[] = [];
        snapshot.forEach((doc) => {
          const d = doc.data();
          if (d.type === 'file' && d.chunkCount && d.chunkCount > 0) {
            items.push({
              id: doc.id,
              name: d.name,
              size: d.size || 0,
              mime: d.mime || '',
              modified: d.modified || '',
              synced: !!d.synced,
              chunkCount: d.chunkCount,
            });
          }
        });
        items.sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime());
        setCloudFiles(items);
      }
    );
    return () => unsubscribe();
  }, [currentUser]);

  const handleFiles = async (fileList: FileList) => {
    setUploading(true);
    setUploadProgress(0);
    const files = Array.from(fileList);
    for (let i = 0; i < files.length; i++) {
      setUploadedFileName(files[i].name);
      try {
        await uploadFile(files[i]);
      } catch (e) {
        console.error('Upload failed for', files[i].name, e);
      }
      setUploadProgress(Math.round(((i + 1) / files.length) * 100));
    }
    setUploading(false);
    setUploadedFileName('');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-background text-on-background font-body-md selection:bg-primary-container selection:text-on-background">
      {/* Fixed Left Sidebar */}
      <PortalSidebar />

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto bg-surface p-6 md:p-12 pb-24 md:pb-12">
        <div className="max-w-[1100px] mx-auto space-y-12">
          {/* Header */}
          <header className="space-y-3">
            <h1 className="font-headline-lg text-[32px] md:text-headline-lg uppercase text-on-background tracking-tight">
              Upload to Your Vault
            </h1>
            <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl">
              Files are encrypted and sent to your laptop. Open the Desktop Agent to view your files.
            </p>
          </header>

          {/* Hidden File Input */}
          <input
            type="file"
            multiple
            ref={fileInputRef}
            className="hidden"
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
          />

          {/* Upload Zone */}
          <section
            onClick={() => !uploading && fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed border-on-background bg-surface-container-lowest p-10 md:p-14 flex flex-col items-center justify-center text-center space-y-6 transition-all cursor-pointer group ${
              dragOver
                ? 'bg-primary-container/20 border-primary scale-[1.01]'
                : 'hover:bg-surface-container-low hover:border-on-background'
            }`}
          >
            {uploading ? (
              <div className="w-full max-w-md flex flex-col items-center gap-4">
                <div className="p-4 bg-primary-container rounded-full border-2 border-on-background brutal-shadow animate-bounce">
                  <span className="material-symbols-outlined text-5xl text-on-background">
                    cloud_upload
                  </span>
                </div>
                <div className="w-full">
                  <p className="font-label-caps text-label-caps text-on-surface-variant mb-2 truncate">
                    Uploading: {uploadedFileName}
                  </p>
                  <div className="w-full h-3 bg-surface-container border-2 border-on-background">
                    <div
                      className="h-full bg-primary transition-all duration-200"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="font-label-caps text-xs text-on-surface-variant mt-2">
                    {uploadProgress}% Encrypted &amp; Buffered
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="p-4 bg-primary-container rounded-full border-2 border-on-background brutal-shadow group-hover:scale-105 transition-transform">
                  <span className="material-symbols-outlined text-5xl md:text-6xl text-on-background">
                    cloud_upload
                  </span>
                </div>
                <div className="space-y-2">
                  <h2 className="font-headline-md text-headline-md text-on-background">
                    Drop files here or click to browse
                  </h2>
                  <p className="font-label-caps text-label-caps text-outline uppercase tracking-wider">
                    Supports any file type • AES-256 encrypted on upload
                  </p>
                </div>
                <button
                  type="button"
                  className="bg-primary-container text-on-background font-button-text text-button-text uppercase px-8 py-4 border-2 border-on-background brutal-shadow brutal-hover transition-all mt-4 font-bold"
                >
                  Browse Files
                </button>
              </>
            )}
          </section>

          {/* Pending Delivery Section */}
          <section className="space-y-6">
            <h2 className="font-headline-md text-headline-md text-on-background flex items-center gap-2">
              <span className="material-symbols-outlined">schedule</span>
              Pending Delivery
            </h2>
            <div className="bg-surface-container-lowest border-2 border-on-background brutal-shadow overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[550px]">
                <thead className="bg-surface-container border-b-2 border-on-background font-label-caps text-label-caps uppercase text-on-surface-variant">
                  <tr>
                    <th className="p-4 border-r-2 border-on-background">File Name</th>
                    <th className="p-4 border-r-2 border-on-background">Size</th>
                    <th className="p-4 border-r-2 border-on-background">Time</th>
                    <th className="p-4">Status</th>
                  </tr>
                </thead>
                <tbody className="font-body-md text-body-md text-on-background">
                  {cloudFiles.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-on-surface-variant font-label-caps">
                        <span className="material-symbols-outlined text-4xl block mb-2 text-outline">
                          check_circle
                        </span>
                        No pending uploads. Your desktop agent is up to date!
                      </td>
                    </tr>
                  ) : (
                    cloudFiles.map((file) => (
                      <tr
                        key={file.id}
                        className="border-b-2 border-on-background last:border-b-0 hover:bg-surface-container-low transition-colors"
                      >
                        <td className="p-4 border-r-2 border-on-background font-medium truncate max-w-[280px]">
                          {file.name}
                        </td>
                        <td className="p-4 border-r-2 border-on-background text-on-surface-variant">
                          {fmtSize(file.size)}
                        </td>
                        <td className="p-4 border-r-2 border-on-background text-on-surface-variant">
                          {timeAgo(file.modified)}
                        </td>
                        <td className="p-4">
                          {file.synced ? (
                            <span className="inline-block bg-primary-container text-on-background font-label-caps text-label-caps px-3 py-1 border-2 border-on-background">
                              Delivered
                            </span>
                          ) : (
                            <span className="inline-block bg-[#ffc107] text-black font-label-caps text-label-caps px-3 py-1 border-2 border-on-background">
                              Pending
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Info Cards (Bento style grid) */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
            {/* Card 1 */}
            <div className="bg-surface-container-lowest p-6 border-2 border-on-background brutal-shadow hover:-translate-y-1 transition-transform h-full flex flex-col">
              <span className="material-symbols-outlined text-4xl text-primary mb-4 block">lock</span>
              <h3 className="font-button-text text-button-text text-on-background mb-2">
                Zero-Knowledge Encryption
              </h3>
              <p className="font-body-md text-body-md text-on-surface-variant mt-auto">
                Files encrypted before leaving your browser.
              </p>
            </div>
            {/* Card 2 */}
            <div className="bg-primary-container p-6 border-2 border-on-background brutal-shadow hover:-translate-y-1 transition-transform h-full flex flex-col">
              <span className="material-symbols-outlined text-4xl text-on-background mb-4 block">
                laptop_mac
              </span>
              <h3 className="font-button-text text-button-text text-on-background mb-2">
                Stored on Your Laptop
              </h3>
              <p className="font-body-md text-body-md text-on-background mt-auto">
                Your PC hard drive is the final destination.
              </p>
            </div>
            {/* Card 3 */}
            <div className="bg-surface-container-lowest p-6 border-2 border-on-background brutal-shadow hover:-translate-y-1 transition-transform h-full flex flex-col">
              <span className="material-symbols-outlined text-4xl text-primary mb-4 block">
                delete_sweep
              </span>
              <h3 className="font-button-text text-button-text text-on-background mb-2">
                Auto-Purged Cloud Buffer
              </h3>
              <p className="font-body-md text-body-md text-on-surface-variant mt-auto">
                Temporary cloud storage deleted after desktop sync.
              </p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

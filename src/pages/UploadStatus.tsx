import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
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

function getFileIcon(mime: string, name: string): { icon: string; bg: string } {
  const m = (mime || '').toLowerCase();
  const n = (name || '').toLowerCase();

  if (m.startsWith('video/') || n.endsWith('.mp4') || n.endsWith('.mov') || n.endsWith('.mkv')) {
    return { icon: 'video_file', bg: 'bg-[#FFB300]' };
  }
  if (m.startsWith('image/') || n.endsWith('.jpg') || n.endsWith('.png') || n.endsWith('.webp') || n.endsWith('.gif')) {
    return { icon: 'image', bg: 'bg-primary-container' };
  }
  if (m.includes('pdf') || m.includes('document') || m.includes('text') || n.endsWith('.pdf') || n.endsWith('.docx') || n.endsWith('.txt')) {
    return { icon: 'description', bg: 'bg-surface-container-high' };
  }
  if (m.includes('zip') || m.includes('tar') || m.includes('rar') || n.endsWith('.zip') || n.endsWith('.tar')) {
    return { icon: 'folder_zip', bg: 'bg-primary-fixed' };
  }
  return { icon: 'insert_drive_file', bg: 'bg-surface-variant' };
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

export default function UploadStatus() {
  const { currentUser } = useAuth();
  const [cloudFiles, setCloudFiles] = useState<CloudFile[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'delivered'>('all');

  // Real-time Firestore sync
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

  const filteredFiles = cloudFiles.filter((file) => {
    if (filter === 'pending') return !file.synced;
    if (filter === 'delivered') return file.synced;
    return true;
  });

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-background text-on-background font-body-md selection:bg-primary-container selection:text-on-background">
      {/* Fixed Left Sidebar */}
      <PortalSidebar />

      {/* Main Content Area */}
      <main className="flex-1 w-full bg-surface relative min-h-screen p-4 sm:p-6 md:p-12 pb-28 md:pb-12">
        <div className="max-w-[1000px] mx-auto w-full flex flex-col gap-6 sm:gap-10">
          {/* Page Header */}
          <section className="flex flex-col gap-3">
            <h2 className="font-headline-lg text-2xl sm:text-3xl md:text-headline-lg uppercase border-b-4 border-on-background pb-2 sm:pb-3 w-fit pr-4 sm:pr-8 bg-surface-container-lowest font-black tracking-tight brutal-shadow">
              Upload Status
            </h2>
            <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl bg-surface-container-lowest border-2 border-on-background p-4 brutal-shadow rounded-none">
              Track files you&apos;ve sent to your vault. Files are removed from the cloud buffer once your Desktop Agent syncs.
            </p>
          </section>

          {/* Status Filter Tabs */}
          <section className="flex flex-wrap gap-4">
            <button
              onClick={() => setFilter('all')}
              className={`px-6 py-3 border-2 border-on-background font-button-text text-button-text uppercase transition-all rounded-full cursor-pointer ${
                filter === 'all'
                  ? 'bg-primary-container text-on-primary-container font-bold translate-x-[2px] translate-y-[2px] shadow-none'
                  : 'bg-surface-container-lowest text-on-surface hover:bg-surface-container-highest brutal-shadow hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none'
              }`}
            >
              All ({cloudFiles.length})
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-6 py-3 border-2 border-on-background font-button-text text-button-text uppercase transition-all rounded-full cursor-pointer ${
                filter === 'pending'
                  ? 'bg-primary-container text-on-primary-container font-bold translate-x-[2px] translate-y-[2px] shadow-none'
                  : 'bg-surface-container-lowest text-on-surface hover:bg-surface-container-highest brutal-shadow hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none'
              }`}
            >
              Pending ({cloudFiles.filter((f) => !f.synced).length})
            </button>
            <button
              onClick={() => setFilter('delivered')}
              className={`px-6 py-3 border-2 border-on-background font-button-text text-button-text uppercase transition-all rounded-full cursor-pointer ${
                filter === 'delivered'
                  ? 'bg-primary-container text-on-primary-container font-bold translate-x-[2px] translate-y-[2px] shadow-none'
                  : 'bg-surface-container-lowest text-on-surface hover:bg-surface-container-highest brutal-shadow hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none'
              }`}
            >
              Delivered ({cloudFiles.filter((f) => f.synced).length})
            </button>
          </section>

          {/* File Status Table / List */}
          <section className="flex flex-col border-4 border-on-background bg-surface-container-lowest brutal-shadow-lg rounded-none overflow-hidden">
            {/* Table Header (Desktop Only) */}
            <div className="hidden md:grid grid-cols-12 gap-4 border-b-4 border-on-background bg-surface-container-high p-4 font-label-caps text-label-caps uppercase text-on-surface font-bold tracking-wider">
              <div className="col-span-6">File Details</div>
              <div className="col-span-2 text-right">Size</div>
              <div className="col-span-2 text-right">Uploaded</div>
              <div className="col-span-2 text-center">Status</div>
            </div>

            {filteredFiles.length === 0 ? (
              <div className="p-12 text-center text-on-surface-variant flex flex-col items-center justify-center gap-3">
                <span className="material-symbols-outlined text-5xl text-outline" style={{ fontVariationSettings: "'FILL' 1" }}>
                  task_alt
                </span>
                <p className="font-headline-md text-headline-md uppercase text-on-background">
                  No files found
                </p>
                <p className="font-body-md text-sm text-on-surface-variant">
                  {filter === 'all'
                    ? 'You have not uploaded any files yet. Head to Upload Files to get started!'
                    : `No files currently marked as ${filter}.`}
                </p>
              </div>
            ) : (
              filteredFiles.map((file) => {
                const { icon, bg } = getFileIcon(file.mime, file.name);
                return (
                  <div
                    key={file.id}
                    className="grid grid-cols-1 md:grid-cols-12 gap-4 border-b-2 border-on-background last:border-b-0 p-4 md:items-center hover:bg-surface-container transition-colors group"
                  >
                    {/* File Icon & Name */}
                    <div className="col-span-1 md:col-span-6 flex items-center gap-4 min-w-0">
                      <div
                        className={`w-12 h-12 ${bg} border-2 border-on-background flex flex-shrink-0 items-center justify-center brutal-shadow group-hover:rotate-6 transition-transform`}
                      >
                        <span
                          className="material-symbols-outlined text-on-background"
                          style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                          {icon}
                        </span>
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-body-lg text-body-lg font-bold text-on-background truncate">
                          {file.name}
                        </span>
                        <span className="font-label-caps text-xs text-on-surface-variant md:hidden">
                          {fmtSize(file.size)} • {timeAgo(file.modified)}
                        </span>
                      </div>
                    </div>

                    {/* Size */}
                    <div className="hidden md:block col-span-2 text-right font-label-caps text-label-caps font-bold">
                      {fmtSize(file.size)}
                    </div>

                    {/* Uploaded Timestamp */}
                    <div className="hidden md:block col-span-2 text-right font-label-caps text-label-caps text-on-surface-variant">
                      {timeAgo(file.modified)}
                    </div>

                    {/* Status Pill */}
                    <div className="col-span-1 md:col-span-2 flex justify-start md:justify-center mt-2 md:mt-0">
                      {file.synced ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 border-2 border-on-background bg-primary-container text-on-background font-label-caps text-xs uppercase rounded-full brutal-shadow font-bold">
                          <span
                            className="material-symbols-outlined text-[16px]"
                            style={{ fontVariationSettings: "'FILL' 1" }}
                          >
                            check_circle
                          </span>
                          Delivered
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1 border-2 border-on-background bg-[#FFB300] text-on-background font-label-caps text-xs uppercase rounded-full brutal-shadow font-bold">
                          <span
                            className="material-symbols-outlined text-[16px]"
                            style={{ fontVariationSettings: "'FILL' 1" }}
                          >
                            hourglass_top
                          </span>
                          Pending
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </section>

          {/* Info Banner */}
          <section className="mt-4 border-4 border-on-background bg-tertiary-fixed-dim p-6 flex flex-col md:flex-row items-start md:items-center gap-6 brutal-shadow-lg transform rotate-1 rounded-none relative overflow-hidden">
            <div
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(45deg, #000 0, #000 2px, transparent 2px, transparent 8px)',
              }}
            />
            <div className="relative w-16 h-16 bg-surface-container-lowest border-4 border-on-background flex-shrink-0 flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(164,198,57,1)] rounded-full z-10">
              <span
                className="material-symbols-outlined text-4xl text-on-background"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                info
              </span>
            </div>
            <p className="relative font-headline-md text-headline-md text-on-background uppercase z-10 leading-snug">
              Files marked as{' '}
              <span className="bg-primary-container px-2 border-2 border-on-background shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] mx-1">
                Delivered
              </span>{' '}
              have been deleted from the cloud buffer and now live safely on your laptop.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../config/firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import PortalSidebar from '../components/PortalSidebar';

interface CloudFile {
  id: string;
  name: string;
  size: number;
  mime: string;
  modified: string;
  synced?: boolean;
}

interface Album {
  id: string;
  name: string;
  description?: string;
  coverFileId?: string;
  fileIds: string[];
  created: string;
  modified: string;
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

function getFileIcon(mime: string): string {
  if (!mime) return 'insert_drive_file';
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'movie';
  if (mime.startsWith('audio/')) return 'audio_file';
  if (mime === 'application/pdf') return 'picture_as_pdf';
  return 'insert_drive_file';
}

export default function Albums() {
  const { currentUser } = useAuth();
  const [albums, setAlbums] = useState<Record<string, Album>>({});
  const [cloudFiles, setCloudFiles] = useState<Record<string, CloudFile>>({});
  const [activeAlbumId, setActiveAlbumId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCoverModal, setShowCoverModal] = useState<Album | null>(null);
  const [showAddPhotosModal, setShowAddPhotosModal] = useState<Album | null>(null);

  // New Album Form State
  const [newAlbumName, setNewAlbumName] = useState('');
  const [newAlbumDesc, setNewAlbumDesc] = useState('');
  const [newAlbumSelectedFiles, setNewAlbumSelectedFiles] = useState<string[]>([]);
  const [newAlbumCoverId, setNewAlbumCoverId] = useState<string | undefined>(undefined);

  // Add Photos Selection State
  const [selectedToAdd, setSelectedToAdd] = useState<string[]>([]);

  // Listen to Firestore for Albums
  useEffect(() => {
    if (!currentUser) return;
    const unsub = onSnapshot(
      collection(db, `users/${currentUser.uid}/albums`),
      (snapshot) => {
        const items: Record<string, Album> = {};
        snapshot.forEach((d) => {
          const data = d.data() as Album;
          items[d.id] = { ...data, id: d.id };
        });
        setAlbums(items);
      }
    );
    return () => unsub();
  }, [currentUser]);

  // Listen to Firestore for Files
  useEffect(() => {
    if (!currentUser) return;
    const unsub = onSnapshot(
      collection(db, `users/${currentUser.uid}/files`),
      (snapshot) => {
        const items: Record<string, CloudFile> = {};
        snapshot.forEach((d) => {
          const data = d.data();
          if (data.type === 'file') {
            items[d.id] = {
              id: d.id,
              name: data.name || '',
              size: data.size || 0,
              mime: data.mime || '',
              modified: data.modified || '',
              synced: !!data.synced,
            };
          }
        });
        setCloudFiles(items);
      }
    );
    return () => unsub();
  }, [currentUser]);

  const activeAlbum = activeAlbumId ? albums[activeAlbumId] : null;
  const imageFiles = Object.values(cloudFiles).filter(f => f.mime?.startsWith('image/'));

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleCreateAlbum = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !newAlbumName.trim()) return;

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const newAlbum: Album = {
      id,
      name: newAlbumName.trim(),
      description: newAlbumDesc.trim(),
      coverFileId: newAlbumCoverId || (newAlbumSelectedFiles.length > 0 ? newAlbumSelectedFiles[0] : undefined),
      fileIds: newAlbumSelectedFiles,
      created: now,
      modified: now,
    };

    await setDoc(doc(db, `users/${currentUser.uid}/albums/${id}`), newAlbum);
    setShowCreateModal(false);
    setNewAlbumName('');
    setNewAlbumDesc('');
    setNewAlbumSelectedFiles([]);
    setNewAlbumCoverId(undefined);
    setActiveAlbumId(id);
  };

  const handleDeleteAlbum = async (albumId: string) => {
    if (!currentUser || !albums[albumId]) return;
    if (!confirm(`Delete album "${albums[albumId].name}"? Files will remain safe in your vault.`)) return;

    await deleteDoc(doc(db, `users/${currentUser.uid}/albums/${albumId}`));
    if (activeAlbumId === albumId) setActiveAlbumId(null);
  };

  const handleSetCover = async (albumId: string, fileId: string) => {
    if (!currentUser || !albums[albumId]) return;
    await setDoc(
      doc(db, `users/${currentUser.uid}/albums/${albumId}`),
      { coverFileId: fileId, modified: new Date().toISOString() },
      { merge: true }
    );
    setShowCoverModal(null);
  };

  const handleAddFiles = async (albumId: string) => {
    if (!currentUser || !albums[albumId] || selectedToAdd.length === 0) return;
    const album = albums[albumId];
    const updatedIds = Array.from(new Set([...album.fileIds, ...selectedToAdd]));
    const coverId = album.coverFileId || (updatedIds.length > 0 ? updatedIds[0] : undefined);

    await setDoc(
      doc(db, `users/${currentUser.uid}/albums/${albumId}`),
      { fileIds: updatedIds, coverFileId: coverId, modified: new Date().toISOString() },
      { merge: true }
    );
    setShowAddPhotosModal(null);
    setSelectedToAdd([]);
  };

  const handleRemoveFile = async (albumId: string, fileId: string) => {
    if (!currentUser || !albums[albumId]) return;
    const album = albums[albumId];
    const updatedIds = album.fileIds.filter(id => id !== fileId);
    const updatedCover = album.coverFileId === fileId ? (updatedIds.length > 0 ? updatedIds[0] : undefined) : album.coverFileId;

    await setDoc(
      doc(db, `users/${currentUser.uid}/albums/${albumId}`),
      { fileIds: updatedIds, coverFileId: updatedCover, modified: new Date().toISOString() },
      { merge: true }
    );
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-background text-on-background font-body-md selection:bg-primary-container selection:text-on-background">
      {/* Fixed Left Sidebar */}
      <PortalSidebar />

      {/* Main Content Area */}
      <main className="flex-1 w-full bg-surface relative min-h-screen p-4 sm:p-6 md:p-12 pb-28 md:pb-12">
        <div className="max-w-[1100px] mx-auto w-full flex flex-col gap-8">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-4 border-on-background pb-4">
            <div>
              {activeAlbum ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveAlbumId(null)}
                    className="flex items-center gap-1 font-bold text-xs uppercase text-on-surface-variant hover:text-on-background border-2 border-on-background px-2.5 py-1 bg-surface-container hover:bg-surface-dim brutal-shadow"
                  >
                    <span className="material-symbols-outlined text-sm">arrow_back</span>
                    All Albums
                  </button>
                  <span className="text-on-surface-variant font-bold">/</span>
                  <h1 className="font-headline-lg text-2xl sm:text-3xl uppercase tracking-tight truncate">
                    {activeAlbum.name}
                  </h1>
                </div>
              ) : (
                <>
                  <h1 className="font-headline-lg text-2xl sm:text-3xl md:text-headline-lg uppercase tracking-tight">
                    Photo &amp; Media Albums
                  </h1>
                  <p className="font-body-md text-xs sm:text-sm text-on-surface-variant mt-1">
                    Organize your photos, select custom album covers, and group your vault files.
                  </p>
                </>
              )}
            </div>

            <div className="flex items-center gap-3">
              {!activeAlbum && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center gap-2 bg-primary text-on-primary border-2 border-on-background px-4 sm:px-6 py-2.5 font-button-text text-xs sm:text-sm uppercase font-bold brutal-shadow brutal-hover"
                >
                  <span className="material-symbols-outlined text-lg">add_photo_alternate</span>
                  + Create Album
                </button>
              )}
            </div>
          </div>

          {/* ── View 1: All Albums Grid ── */}
          {!activeAlbum && (
            <div>
              {Object.keys(albums).length === 0 ? (
                <div className="border-4 border-dashed border-on-background bg-surface-container-low p-10 sm:p-14 flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-16 h-16 bg-primary-container rounded-full border-2 border-on-background flex items-center justify-center brutal-shadow">
                    <span className="material-symbols-outlined text-4xl text-on-background">photo_album</span>
                  </div>
                  <div>
                    <h3 className="font-headline-md text-lg uppercase mb-1">No Albums Yet</h3>
                    <p className="font-body-md text-xs sm:text-sm text-on-surface-variant max-w-md">
                      Group your uploaded photos into custom collections with custom cover photos.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="bg-primary text-on-primary border-2 border-on-background px-6 py-3 font-button-text text-xs sm:text-sm uppercase font-bold brutal-shadow brutal-hover"
                  >
                    + Create Your First Album
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                  
                  {/* Create Card */}
                  <div
                    onClick={() => setShowCreateModal(true)}
                    className="border-2 border-dashed border-on-background bg-surface-container-lowest flex flex-col items-center justify-center p-8 cursor-pointer hover:bg-primary-container/20 hover:border-primary transition-all aspect-square text-center brutal-shadow"
                  >
                    <div className="w-12 h-12 rounded-full border-2 border-on-background bg-primary-container flex items-center justify-center mb-3">
                      <span className="material-symbols-outlined text-2xl font-bold">add</span>
                    </div>
                    <span className="font-headline-md text-sm uppercase">Create New Album</span>
                    <span className="font-body-md text-xs text-on-surface-variant mt-1">Organize photos &amp; files</span>
                  </div>

                  {/* Album Cards */}
                  {Object.values(albums).map((alb) => {
                    const coverFile = alb.coverFileId ? cloudFiles[alb.coverFileId] : null;
                    const itemCount = alb.fileIds.length;

                    return (
                      <div
                        key={alb.id}
                        onClick={() => setActiveAlbumId(alb.id)}
                        className="group border-2 border-on-background bg-surface-container-lowest flex flex-col cursor-pointer hover:border-primary transition-all brutal-shadow relative overflow-hidden"
                      >
                        {/* Cover Container */}
                        <div className="aspect-square bg-surface-container flex flex-col items-center justify-center overflow-hidden border-b-2 border-on-background relative">
                          {coverFile ? (
                            <div className="flex flex-col items-center gap-1 text-on-surface-variant p-4 text-center">
                              <span className="material-symbols-outlined text-5xl text-primary">{getFileIcon(coverFile.mime)}</span>
                              <span className="font-label-caps text-xs font-bold uppercase truncate max-w-full">{coverFile.name}</span>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-1 text-on-surface-variant">
                              <span className="material-symbols-outlined text-5xl">photo_library</span>
                              <span className="font-label-caps text-xs uppercase font-bold">Empty Album</span>
                            </div>
                          )}

                          {/* Item count badge */}
                          <div className="absolute top-2 right-2 bg-on-background text-background border border-on-background px-2.5 py-0.5 font-label-caps text-[10px] font-bold uppercase">
                            {itemCount} {itemCount === 1 ? 'file' : 'files'}
                          </div>

                          {coverFile && (
                            <div className="absolute bottom-2 left-2 bg-primary-fixed text-on-primary-fixed border border-on-background px-2 py-0.5 font-label-caps text-[9px] font-bold uppercase">
                              ★ Cover
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="p-4 flex flex-col flex-grow">
                          <h3 className="font-headline-md text-base uppercase truncate" title={alb.name}>{alb.name}</h3>
                          {alb.description && (
                            <p className="font-body-md text-xs text-on-surface-variant truncate mt-0.5">{alb.description}</p>
                          )}
                          <p className="font-label-caps text-[10px] text-on-surface-variant uppercase mt-auto pt-2">
                            Created {fmtDate(alb.created)}
                          </p>
                        </div>

                        {/* Hover Overlay */}
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
                              setShowCoverModal(alb);
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
                            + Add Files
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

          {/* ── View 2: Active Album Files ── */}
          {activeAlbum && (
            <div className="flex flex-col gap-6">
              
              {/* Banner */}
              <div className="border-4 border-on-background bg-surface-container-lowest p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 brutal-shadow">
                <div className="flex items-center gap-4 min-w-0">
                  <div
                    onClick={() => setShowCoverModal(activeAlbum)}
                    className="w-16 h-16 sm:w-20 sm:h-20 bg-surface-container border-2 border-on-background flex-shrink-0 flex items-center justify-center cursor-pointer group relative"
                    title="Click to select album cover"
                  >
                    <span className="material-symbols-outlined text-3xl text-primary">wallpaper</span>
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity text-[9px] font-bold uppercase text-center p-1">
                      Change Cover
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="bg-primary-fixed text-on-primary-fixed text-[10px] font-bold uppercase px-2 py-0.5 border border-on-background">
                        ALBUM
                      </span>
                      <span className="font-label-caps text-xs text-on-surface-variant">
                        {activeAlbum.fileIds.length} {activeAlbum.fileIds.length === 1 ? 'item' : 'items'}
                      </span>
                    </div>
                    <h2 className="font-headline-md text-xl sm:text-2xl uppercase tracking-tight truncate">{activeAlbum.name}</h2>
                    {activeAlbum.description && (
                      <p className="font-body-md text-xs sm:text-sm text-on-surface-variant mt-0.5">{activeAlbum.description}</p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => setShowAddPhotosModal(activeAlbum)}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-1 bg-primary text-on-primary border-2 border-on-background px-4 py-2 text-xs font-bold uppercase brutal-shadow"
                  >
                    <span className="material-symbols-outlined text-sm">add_photo_alternate</span>
                    + Add Files
                  </button>
                  <button
                    onClick={() => setShowCoverModal(activeAlbum)}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-1 bg-surface-container border-2 border-on-background px-3 py-2 text-xs font-bold uppercase hover:bg-surface-dim"
                  >
                    <span className="material-symbols-outlined text-sm">wallpaper</span>
                    Change Cover
                  </button>
                  <button
                    onClick={() => handleDeleteAlbum(activeAlbum.id)}
                    className="p-2 bg-error-container text-on-error-container border-2 border-on-background hover:brightness-95"
                    title="Delete Album"
                  >
                    <span className="material-symbols-outlined text-sm">delete</span>
                  </button>
                </div>
              </div>

              {/* Album File List */}
              {activeAlbum.fileIds.length === 0 ? (
                <div className="border-2 border-dashed border-on-background bg-surface-container-low p-10 text-center flex flex-col items-center justify-center gap-3">
                  <span className="material-symbols-outlined text-4xl text-on-surface-variant">photo_library</span>
                  <p className="font-headline-md text-sm uppercase">This album is empty</p>
                  <button
                    onClick={() => setShowAddPhotosModal(activeAlbum)}
                    className="bg-primary text-on-primary border-2 border-on-background px-4 py-2 font-bold text-xs uppercase brutal-shadow"
                  >
                    + Add Photos from Vault
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {activeAlbum.fileIds.map(fileId => {
                    const file = cloudFiles[fileId];
                    if (!file) return null;
                    const isCover = activeAlbum.coverFileId === file.id;

                    return (
                      <div
                        key={file.id}
                        className="group border-2 border-on-background bg-surface-container-lowest flex flex-col relative overflow-hidden brutal-shadow"
                      >
                        <div className="aspect-square bg-surface-container flex flex-col items-center justify-center p-3 text-center border-b-2 border-on-background relative">
                          <span className="material-symbols-outlined text-4xl text-primary mb-1">{getFileIcon(file.mime)}</span>
                          <span className="font-label-caps text-xs font-bold truncate max-w-full">{file.name}</span>
                          {isCover && (
                            <div className="absolute top-1 left-1 bg-primary-fixed text-on-primary-fixed border border-on-background px-1.5 py-0.5 text-[9px] font-black uppercase">
                              ★ Cover
                            </div>
                          )}
                        </div>

                        <div className="p-2 flex items-center justify-between text-[11px] font-label-caps">
                          <span className="text-on-surface-variant">{fmtSize(file.size)}</span>
                          <span className="text-primary font-bold">{file.synced ? 'Synced' : 'Pending'}</span>
                        </div>

                        {/* Hover Overlay */}
                        <div className="absolute inset-0 bg-background/90 flex flex-col items-center justify-center gap-1.5 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {file.mime?.startsWith('image/') && (
                            <button
                              onClick={() => handleSetCover(activeAlbum.id, file.id)}
                              className="w-full bg-primary-container text-on-primary-container border-2 border-on-background py-1 text-xs font-bold uppercase"
                            >
                              {isCover ? 'Current Cover' : 'Set as Cover'}
                            </button>
                          )}
                          <button
                            onClick={() => handleRemoveFile(activeAlbum.id, file.id)}
                            className="w-full bg-surface-container border-2 border-on-background py-1 text-xs font-bold uppercase hover:bg-error-container text-error"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          )}

        </div>
      </main>

      {/* ── Create Album Modal ── */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowCreateModal(false)}>
          <div className="bg-surface-container-lowest border-4 border-on-background w-full max-w-xl flex flex-col max-h-[90vh] brutal-shadow-lg" onClick={e => e.stopPropagation()}>
            <div className="bg-primary-container border-b-4 border-on-background p-4 flex items-center justify-between">
              <div className="flex items-center gap-2 font-headline-md text-base uppercase font-black">
                <span className="material-symbols-outlined text-2xl">photo_album</span>
                Create New Album
              </div>
              <button onClick={() => setShowCreateModal(false)} className="p-1 hover:bg-primary/20 border-2 border-transparent hover:border-on-background">
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateAlbum} className="p-6 overflow-y-auto flex flex-col gap-4">
              <div>
                <label className="block font-label-caps text-xs uppercase font-bold mb-1">Album Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Summer Memories, Project Beta"
                  value={newAlbumName}
                  onChange={e => setNewAlbumName(e.target.value)}
                  required
                  autoFocus
                  className="w-full bg-surface-container-low border-2 border-on-background px-3 py-2 text-sm font-bold focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block font-label-caps text-xs uppercase font-bold mb-1">Description (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Vacation highlights and documents"
                  value={newAlbumDesc}
                  onChange={e => setNewAlbumDesc(e.target.value)}
                  className="w-full bg-surface-container-low border-2 border-on-background px-3 py-2 text-sm focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="font-label-caps text-xs uppercase font-bold">Select Photos &amp; Choose Cover</label>
                  <span className="font-label-caps text-xs text-primary font-bold">{newAlbumSelectedFiles.length} selected</span>
                </div>

                {imageFiles.length === 0 ? (
                  <div className="border-2 border-dashed border-on-background p-4 text-center bg-surface-container-low text-xs text-on-surface-variant font-label-caps">
                    No uploaded photos yet. You can create the album now and add photos anytime!
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-2 border-2 border-on-background bg-surface-container-low">
                    {imageFiles.map(file => {
                      const isSelected = newAlbumSelectedFiles.includes(file.id);
                      const isCover = newAlbumCoverId === file.id;

                      return (
                        <div
                          key={file.id}
                          onClick={() => {
                            setNewAlbumSelectedFiles(prev => {
                              const next = prev.includes(file.id) ? prev.filter(x => x !== file.id) : [...prev, file.id];
                              if (!newAlbumCoverId && next.length > 0) setNewAlbumCoverId(next[0]);
                              return next;
                            });
                          }}
                          className={`relative aspect-square border-2 cursor-pointer flex flex-col items-center justify-center p-2 text-center transition-all ${
                            isSelected ? 'border-primary bg-primary-container/20 ring-2 ring-primary' : 'border-on-background bg-surface-container hover:border-primary'
                          }`}
                        >
                          <span className="material-symbols-outlined text-2xl text-primary">{getFileIcon(file.mime)}</span>
                          <span className="font-label-caps text-[9px] truncate max-w-full mt-1">{file.name}</span>

                          <div className={`absolute top-1 left-1 w-4 h-4 border border-on-background flex items-center justify-center ${isSelected ? 'bg-primary text-on-primary' : 'bg-surface'}`}>
                            {isSelected && <span className="material-symbols-outlined text-[10px]">check</span>}
                          </div>

                          {isSelected && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setNewAlbumCoverId(file.id);
                              }}
                              className={`absolute bottom-1 right-1 text-[8px] px-1 py-0.5 uppercase font-bold border border-on-background ${isCover ? 'bg-primary-fixed text-on-primary-fixed' : 'bg-surface hover:bg-primary-fixed'}`}
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
                  disabled={!newAlbumName.trim()}
                  className="flex-1 bg-primary text-on-primary border-2 border-on-background py-2.5 font-button-text text-xs uppercase font-bold brutal-shadow disabled:opacity-60"
                >
                  Create Album
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-5 py-2.5 border-2 border-on-background bg-surface-container font-bold text-xs uppercase hover:bg-surface-dim"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Select Cover Modal ── */}
      {showCoverModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowCoverModal(null)}>
          <div className="bg-surface-container-lowest border-4 border-on-background w-full max-w-xl flex flex-col max-h-[90vh] brutal-shadow-lg" onClick={e => e.stopPropagation()}>
            <div className="bg-primary-container border-b-4 border-on-background p-4 flex items-center justify-between">
              <div className="flex items-center gap-2 font-headline-md text-base uppercase font-black">
                <span className="material-symbols-outlined text-2xl">wallpaper</span>
                Select Cover for "{showCoverModal.name}"
              </div>
              <button onClick={() => setShowCoverModal(null)} className="p-1 hover:bg-primary/20 border-2 border-transparent hover:border-on-background">
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              <p className="font-label-caps text-xs text-on-surface-variant font-bold uppercase mb-3">
                Click any photo to set it as the cover art:
              </p>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-72 overflow-y-auto p-1">
                {Object.values(cloudFiles).filter(f => f.mime?.startsWith('image/')).map(file => {
                  const isCurrent = showCoverModal.coverFileId === file.id;
                  return (
                    <div
                      key={file.id}
                      onClick={() => handleSetCover(showCoverModal.id, file.id)}
                      className={`relative aspect-square border-2 cursor-pointer flex flex-col items-center justify-center p-2 text-center transition-all ${
                        isCurrent ? 'border-primary bg-primary-container/30 ring-2 ring-primary font-bold' : 'border-on-background bg-surface-container hover:border-primary'
                      }`}
                    >
                      <span className="material-symbols-outlined text-3xl text-primary">{getFileIcon(file.mime)}</span>
                      <span className="font-label-caps text-[10px] truncate max-w-full mt-1">{file.name}</span>
                      {isCurrent && (
                        <span className="absolute top-1 right-1 bg-primary-fixed border border-on-background text-[8px] font-black uppercase px-1">
                          Cover
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-4 border-t-2 border-on-background bg-surface-container flex justify-end">
              <button onClick={() => setShowCoverModal(null)} className="px-5 py-2 border-2 border-on-background bg-surface font-bold text-xs uppercase">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Photos to Album Modal ── */}
      {showAddPhotosModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowAddPhotosModal(null)}>
          <div className="bg-surface-container-lowest border-4 border-on-background w-full max-w-xl flex flex-col max-h-[90vh] brutal-shadow-lg" onClick={e => e.stopPropagation()}>
            <div className="bg-primary-container border-b-4 border-on-background p-4 flex items-center justify-between">
              <div className="flex items-center gap-2 font-headline-md text-base uppercase font-black">
                <span className="material-symbols-outlined text-2xl">add_photo_alternate</span>
                Add Files to "{showAddPhotosModal.name}"
              </div>
              <button onClick={() => setShowAddPhotosModal(null)} className="p-1 hover:bg-primary/20 border-2 border-transparent hover:border-on-background">
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              <div className="flex items-center justify-between mb-3">
                <span className="font-label-caps text-xs uppercase font-bold text-on-surface-variant">Select files from vault:</span>
                <span className="font-label-caps text-xs text-primary font-bold">{selectedToAdd.length} selected</span>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-72 overflow-y-auto p-1 border-2 border-on-background bg-surface-container-low">
                {Object.values(cloudFiles)
                  .filter(f => !showAddPhotosModal.fileIds.includes(f.id))
                  .map(file => {
                    const isSelected = selectedToAdd.includes(file.id);
                    return (
                      <div
                        key={file.id}
                        onClick={() => setSelectedToAdd(prev => prev.includes(file.id) ? prev.filter(x => x !== file.id) : [...prev, file.id])}
                        className={`relative aspect-square border-2 cursor-pointer flex flex-col items-center justify-center p-2 text-center transition-all ${
                          isSelected ? 'border-primary bg-primary-container/20 ring-2 ring-primary' : 'border-on-background bg-surface-container hover:border-primary'
                        }`}
                      >
                        <span className="material-symbols-outlined text-2xl text-primary">{getFileIcon(file.mime)}</span>
                        <span className="font-label-caps text-[9px] truncate max-w-full mt-1">{file.name}</span>

                        <div className={`absolute top-1 left-1 w-4 h-4 border border-on-background flex items-center justify-center ${isSelected ? 'bg-primary text-on-primary' : 'bg-surface'}`}>
                          {isSelected && <span className="material-symbols-outlined text-[10px]">check</span>}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            <div className="p-4 border-t-2 border-on-background bg-surface-container flex gap-3">
              <button
                onClick={() => handleAddFiles(showAddPhotosModal.id)}
                disabled={selectedToAdd.length === 0}
                className="flex-1 bg-primary text-on-primary border-2 border-on-background py-2.5 font-bold text-xs uppercase brutal-shadow disabled:opacity-60"
              >
                Add Selected ({selectedToAdd.length})
              </button>
              <button onClick={() => setShowAddPhotosModal(null)} className="px-5 py-2.5 border-2 border-on-background bg-surface font-bold text-xs uppercase">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

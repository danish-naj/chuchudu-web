import React, { useState } from 'react';
import { useFileSystem } from '../hooks/useFileSystem';
import { useSharing } from '../hooks/useSharing';
import { useNavigate } from 'react-router-dom';

interface CategoryPageProps {
  type: 'Photos' | 'Videos' | 'Documents' | 'Recent' | 'Trash';
}

export default function CategoryPage({ type }: CategoryPageProps) {
  const navigate = useNavigate();
  const { files, loading, error, deleteFile } = useFileSystem();
  const { shareFile } = useSharing();
  const [searchQuery, setSearchQuery] = useState('');

  // Filter files based on the category type and search query
  const filteredFiles = files.filter(f => {
    // Search filter
    if (searchQuery && !f.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;

    // Category filter
    if (type === 'Trash') return false; // Trash not implemented yet
    if (type === 'Recent') return true;
    if (type === 'Photos') return f.mime?.startsWith('image/');
    if (type === 'Videos') return f.mime?.startsWith('video/');
    if (type === 'Documents') return !f.mime?.startsWith('image/') && !f.mime?.startsWith('video/') && !f.mime?.startsWith('audio/');
    
    return true;
  });

  const getExt = (name: string) => {
    const parts = name.split('.');
    return parts.length > 1 ? parts.pop()!.toUpperCase() : 'FILE';
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return 'Unknown';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (mime?: string) => {
    if (!mime) return 'description';
    if (mime.startsWith('image/')) return 'image';
    if (mime.startsWith('video/')) return 'movie';
    if (mime.startsWith('audio/')) return 'audio_file';
    if (mime === 'application/pdf') return 'picture_as_pdf';
    if (mime.includes('zip') || mime.includes('compressed')) return 'folder_zip';
    return 'description';
  };
  
  const getFileBgClass = (mime?: string) => {
    if (!mime) return 'bg-surface-container-highest';
    if (mime.startsWith('image/')) return 'bg-surface-container-highest';
    if (mime === 'application/pdf') return 'bg-inverse-primary';
    if (mime.startsWith('video/')) return 'bg-surface-container-highest';
    if (mime.startsWith('audio/')) return 'bg-surface-container-high';
    if (mime.includes('zip')) return 'bg-primary';
    return 'bg-surface-container-highest';
  };

  const moveToTrash = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Delete this encrypted file permanently?")) {
      await deleteFile(id);
    }
  };

  const handleShare = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const url = await shareFile(id);
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

  const getHeaderDescription = () => {
    if (type === 'Photos') return `Viewing ${filteredFiles.length} items in your visual library.`;
    if (type === 'Videos') return `Viewing ${filteredFiles.length} videos in your vault.`;
    if (type === 'Documents') return `Viewing ${filteredFiles.length} securely encrypted documents.`;
    if (type === 'Recent') return `Viewing your ${filteredFiles.length} most recently added items.`;
    if (type === 'Trash') return `Your deleted items are ready to be securely wiped.`;
    return `Viewing ${filteredFiles.length} items.`;
  };

  return (
    <div className="flex flex-col gap-12 w-full">
      {/* Category Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b-4 border-on-background pb-6">
        <div>
          <h1 className="font-display-lg text-display-lg text-on-background mb-2 tracking-tighter uppercase">{type}</h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl">{getHeaderDescription()}</p>
        </div>
        <div className="flex gap-4">
          <div className="relative">
            <input 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-surface-container-lowest border-2 border-on-background focus:border-4 focus:ring-0 font-label-caps text-label-caps p-3 w-64 h-12 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:translate-x-[2px] focus:translate-y-[2px] transition-all outline-none placeholder:text-on-surface-variant" 
              placeholder={`Search ${type.toLowerCase()}...`} 
              type="text" 
            />
            <span className="material-symbols-outlined absolute right-3 top-3 text-on-background">search</span>
          </div>
          <button className="bg-surface-container-lowest border-2 border-on-background shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all duration-100 w-12 h-12 flex items-center justify-center cursor-pointer">
            <span className="material-symbols-outlined">filter_list</span>
          </button>
        </div>
      </header>

      {/* Grid Content */}
      <section className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-gutter">
        {loading && <div className="p-4 font-label-caps uppercase animate-pulse">Loading secure vault...</div>}
        {error && <div className="p-4 font-label-caps uppercase text-error">Error: {error}</div>}
        
        {!loading && filteredFiles.length === 0 && (
           <div className="col-span-full py-16 flex flex-col items-center justify-center text-on-surface-variant border-4 border-dashed border-on-surface rounded-lg">
              <span className="material-symbols-outlined text-display-lg" style={{ fontSize: '48px' }}>folder_open</span>
              <p className="font-label-caps uppercase mt-4">No {type.toLowerCase()} found.</p>
           </div>
        )}
        
        {filteredFiles.map(file => (
           <article key={file.id} className="bg-surface-container-lowest border-4 border-on-background shadow-[4px_4px_0px_0px_#1a1c1c] flex flex-col group hover:-translate-y-1 transition-transform cursor-pointer" onClick={() => navigate('/preview?id=' + file.id)}>
             <div className={`aspect-square w-full border-b-4 border-on-background relative overflow-hidden ${getFileBgClass(file.mime)} flex items-center justify-center`}>
               {/* Since we can't easily generate blobs for everything immediately, we show icons, but you could add a preview thumbnail generator hook here */}
               <span className="material-symbols-outlined text-display-lg group-hover:scale-110 transition-transform duration-300" style={{ fontSize: '64px' }}>
                 {getFileIcon(file.mime)}
               </span>
               <div className="absolute top-2 right-2 bg-primary-fixed text-on-primary-fixed border-2 border-on-background px-2 py-1 font-label-caps text-label-caps">
                 {getExt(file.name)}
               </div>
               <div className="absolute top-2 left-2 bg-surface neo-border px-2 py-1 flex items-center justify-center text-primary" title="Encrypted">
                 <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>lock</span>
               </div>
             </div>
             <div className="p-4 flex flex-col gap-2">
               <div className="flex justify-between items-start gap-2">
                  <h3 className="font-headline-md text-headline-md truncate flex-1" title={file.name}>{file.name}</h3>
                  <div className="flex gap-2">
                    <button onClick={(e) => handleShare(file.id, e)} className="text-on-surface-variant hover:text-primary transition-colors mt-1" title="Share Securely">
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>share</span>
                    </button>
                    <button onClick={(e) => moveToTrash(file.id, e)} className="text-on-surface-variant hover:text-error transition-colors mt-1" title="Delete">
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>delete</span>
                    </button>
                  </div>
               </div>
               <div className="flex justify-between items-center text-on-surface-variant font-label-caps text-label-caps">
                 <span>{formatSize(file.size)}</span>
                 <span>{new Date(file.modified || Date.now()).toLocaleDateString()}</span>
               </div>
             </div>
           </article>
        ))}
      </section>

      {/* Pagination / Load More */}
      {filteredFiles.length > 0 && (
        <div className="flex justify-center mt-8 pb-12">
          <button className="bg-surface-container-lowest border-[2px] border-on-background shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all duration-100 font-button-text text-button-text uppercase px-8 py-3 flex items-center gap-2 cursor-pointer">
            <span className="material-symbols-outlined">refresh</span>
            LOAD MORE
          </button>
        </div>
      )}
    </div>
  );
}

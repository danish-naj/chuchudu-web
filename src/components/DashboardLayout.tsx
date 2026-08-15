import React, { useState, useEffect } from 'react';
import Header from './Header';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { useFileSystem } from '../hooks/useFileSystem';
import { useSyncAgent } from '../hooks/useSyncAgent';

export default function DashboardLayout() {
  const location = useLocation();
  const path = location.pathname;
  
  const { uploadFile, getStorageStats } = useFileSystem();
  
  const [usedStorage, setUsedStorage] = useState(0);
  const MAX_STORAGE = 10 * 1024 * 1024 * 1024; // 10 GB
  const storagePercentage = Math.min(100, Math.round((usedStorage / MAX_STORAGE) * 100));

  useEffect(() => {
    getStorageStats().then(setUsedStorage);
    const handleRefresh = () => getStorageStats().then(setUsedStorage);
    window.addEventListener('chuchudu-refresh', handleRefresh);
    return () => window.removeEventListener('chuchudu-refresh', handleRefresh);
  }, [getStorageStats]);

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  };
  
  const handleAgentSync = async (file: File) => {
    try {
      console.log(`Syncing file from desktop agent: ${file.name}`);
      await uploadFile(file);
    } catch (err) {
      console.error("Failed to encrypt and save synced file", err);
    }
  };

  const { connected } = useSyncAgent(handleAgentSync);

  const getActiveState = (route: string) => {
    if (route === '/dashboard' && path === '/dashboard') return 'bg-primary-container neo-shadow';
    if (route !== '/dashboard' && path.startsWith(route)) return 'bg-primary-container neo-shadow';
    return 'bg-surface hover:bg-surface-container-high';
  };

  return (
    <div className="bg-surface text-on-surface font-body-md min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow w-full max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-8 flex flex-col md:flex-row gap-gutter pb-24 md:pb-8">
        
        {/* Persistent Sidebar (Hidden on Mobile) */}
        <aside className="hidden md:flex w-64 flex-shrink-0 flex-col gap-4">
          <h2 className="font-headline-md text-headline-md uppercase mb-2">Filters</h2>
          <div className="flex flex-col gap-2">
            <Link to="/dashboard" className={`w-full text-left ${getActiveState('/dashboard')} neo-border px-4 py-3 font-button-text text-button-text uppercase rounded flex items-center justify-between hover:translate-x-1 transition-transform`}>
              <span>All Files</span><span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>folder_open</span>
            </Link>
            <Link to="/dashboard/photos" className={`w-full text-left ${getActiveState('/dashboard/photos')} neo-border px-4 py-3 font-button-text text-button-text uppercase rounded flex items-center justify-between hover:translate-x-1 transition-transform`}>
              <span>Photos</span><span className="material-symbols-outlined">image</span>
            </Link>
            <Link to="/dashboard/videos" className={`w-full text-left ${getActiveState('/dashboard/videos')} neo-border px-4 py-3 font-button-text text-button-text uppercase rounded flex items-center justify-between hover:translate-x-1 transition-transform`}>
              <span>Videos</span><span className="material-symbols-outlined">movie</span>
            </Link>
            <Link to="/dashboard/documents" className={`w-full text-left ${getActiveState('/dashboard/documents')} neo-border px-4 py-3 font-button-text text-button-text uppercase rounded flex items-center justify-between hover:translate-x-1 transition-transform`}>
              <span>Documents</span><span className="material-symbols-outlined">description</span>
            </Link>
            <Link to="/dashboard/recent" className={`w-full text-left ${getActiveState('/dashboard/recent')} neo-border px-4 py-3 font-button-text text-button-text uppercase rounded flex items-center justify-between hover:translate-x-1 transition-transform mt-4`}>
              <span>Recent</span><span className="material-symbols-outlined">schedule</span>
            </Link>
            <Link to="/dashboard/trash" className={`w-full text-left ${getActiveState('/dashboard/trash')} neo-border px-4 py-3 font-button-text text-button-text uppercase rounded flex items-center justify-between hover:translate-x-1 transition-transform mt-4 text-error`}>
              <span>Trash</span><span className="material-symbols-outlined">delete</span>
            </Link>
          </div>
          
          <div className="mt-8 p-4 bg-primary-fixed neo-border neo-shadow-lg rounded relative">
            <div className="absolute -top-3 -right-3">
               <div className={`w-6 h-6 rounded-full border-2 border-on-background flex items-center justify-center ${connected ? 'bg-primary' : 'bg-surface-container-high'}`} title={connected ? 'Desktop Agent Connected' : 'Desktop Agent Disconnected'}>
                  {connected && <span className="absolute w-6 h-6 bg-primary rounded-full animate-ping opacity-75"></span>}
                  <span className="material-symbols-outlined text-[14px]" style={{ color: connected ? 'var(--cc-dark-950)' : 'var(--cc-dark-600)' }}>sync</span>
               </div>
            </div>
            <h3 className="font-headline-md text-headline-md uppercase mb-2">Storage</h3>
            <div className="w-full h-4 bg-surface neo-border rounded-full overflow-hidden mb-2">
              <div className="h-full bg-on-surface transition-all duration-500" style={{ width: `${storagePercentage}%` }}></div>
            </div>
            <p className="font-label-caps text-label-caps uppercase">{formatSize(usedStorage)} / 10.00 GB</p>
          </div>
        </aside>
        
        {/* Dynamic Main Content Area */}
        <div className="flex-grow flex flex-col gap-12 overflow-hidden">
           <Outlet />
        </div>
      </main>

      {/* Bottom Navigation (Mobile Only) */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-2 py-3 bg-surface border-t-4 border-black shadow-[0px_-4px_0px_0px_#a4c639]">
        <Link to="/dashboard" className={`flex flex-col items-center justify-center border-2 p-1 w-16 transition-all ${path === '/dashboard' || (path.startsWith('/dashboard') && !path.startsWith('/dashboard/trash')) ? 'bg-lime border-black shadow-[2px_2px_0px_0px_#000] -translate-y-1 text-black' : 'border-transparent text-on-surface-variant hover:bg-lime/20'}`}>
          <span className="material-symbols-outlined mb-1">folder</span>
          <span className="text-[10px] font-bold uppercase tracking-tighter">Files</span>
        </Link>
        <Link to="/dashboard/trash" className={`flex flex-col items-center justify-center border-2 p-1 w-16 transition-all ${path.startsWith('/dashboard/trash') ? 'bg-error border-black shadow-[2px_2px_0px_0px_#000] -translate-y-1 text-white' : 'border-transparent text-on-surface-variant hover:bg-error-container hover:text-error'}`}>
          <span className="material-symbols-outlined mb-1">delete</span>
          <span className="text-[10px] font-bold uppercase tracking-tighter">Trash</span>
        </Link>
        <Link to="/transfers" className={`flex flex-col items-center justify-center border-2 p-1 w-16 transition-all ${path.startsWith('/transfers') ? 'bg-lime border-black shadow-[2px_2px_0px_0px_#000] -translate-y-1 text-black' : 'border-transparent text-on-surface-variant hover:bg-lime/20'}`}>
          <span className="material-symbols-outlined mb-1">sync_alt</span>
          <span className="text-[10px] font-bold uppercase tracking-tighter">Transfers</span>
        </Link>
        <Link to="/settings" className={`flex flex-col items-center justify-center border-2 p-1 w-16 transition-all ${path.startsWith('/settings') ? 'bg-lime border-black shadow-[2px_2px_0px_0px_#000] -translate-y-1 text-black' : 'border-transparent text-on-surface-variant hover:bg-lime/20'}`}>
          <span className="material-symbols-outlined mb-1">settings</span>
          <span className="text-[10px] font-bold uppercase tracking-tighter">Settings</span>
        </Link>
      </nav>
    </div>
  );
}

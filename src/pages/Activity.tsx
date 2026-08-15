import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import { Link } from 'react-router-dom';
import { useTransfers } from '../context/TransferContext';
import { useFileSystem } from '../hooks/useFileSystem';

export default function Activity() {
  const { transfers } = useTransfers();
  const { getStorageStats } = useFileSystem();
  
  const [usedStorage, setUsedStorage] = useState(0);
  const [showPricing, setShowPricing] = useState(false);
  
  const MAX_STORAGE = 10 * 1024 * 1024 * 1024; // 10 GB
  const storagePercentage = Math.min(100, Math.round((usedStorage / MAX_STORAGE) * 100));

  useEffect(() => {
    getStorageStats().then(setUsedStorage);
  }, [getStorageStats, transfers]);

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  };

  return (
    <div className="bg-background text-on-surface font-body-md min-h-screen flex flex-col">
      <Header />

      {/* Main Content Canvas */}
      <main className="flex-grow w-full max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-12 flex flex-col gap-12">
        {/* Header Section */}
        <section className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b-4 border-on-surface pb-6">
          <div>
            <h1 className="font-display-lg text-display-lg uppercase italic text-on-surface drop-shadow-[4px_4px_0_#a4c639]">Activity Log</h1>
            <p className="font-label-caps text-label-caps text-on-surface-variant mt-2 uppercase">Tracking all kinetic data transfers</p>
          </div>
          {/* Search / Filter Bar */}
          <div className="flex gap-4 w-full md:w-auto">
            <div className="relative flex-grow md:w-64">
              <span className="material-symbols-outlined absolute left-3 top-3 text-on-surface">search</span>
              <input className="w-full bg-surface-container-lowest border-4 border-on-surface py-3 pl-10 pr-4 font-label-caps text-label-caps uppercase focus:outline-none focus:shadow-[4px_4px_0px_0px_#a4c639]" placeholder="Search activity..." type="text" />
            </div>
            <button className="bg-primary-container text-on-primary-container border-4 border-on-surface shadow-[4px_4px_0px_0px_#1a1c1c] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all px-6 py-3 font-button-text text-button-text uppercase flex items-center gap-2 cursor-pointer">
              <span className="material-symbols-outlined">filter_list</span> Filter
            </button>
          </div>
        </section>

        {/* Main Activity Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter">
          {/* Timeline (2 columns on Desktop) */}
          <section className="lg:col-span-2 flex flex-col gap-6">
            <h2 className="font-headline-md text-headline-md uppercase bg-on-surface text-surface inline-block px-4 py-1 shadow-[4px_4px_0px_0px_#1a1c1c] self-start">Recent Activity</h2>
            
            {transfers.length === 0 && (
              <div className="p-8 text-center text-on-surface-variant font-label-caps uppercase border-4 border-dashed border-on-surface">
                No recent activity found.
              </div>
            )}
            
            {transfers.map(t => (
              <article key={t.id} className={`${t.status === 'error' ? 'bg-[#ffdad6]' : 'bg-surface-container-lowest'} border-4 border-on-surface shadow-[4px_4px_0px_0px_#1a1c1c] p-6 flex flex-col md:flex-row gap-6 items-start relative overflow-hidden group`}>
                <div className={`w-16 h-16 border-4 border-on-surface flex items-center justify-center shrink-0 ${t.status === 'error' ? 'bg-[#ba1a1a] text-white' : 'bg-primary-container text-on-primary-container'}`}>
                  <span className="material-symbols-outlined text-4xl">
                    {t.type === 'upload' ? 'cloud_upload' : t.type === 'download' ? 'download' : t.type === 'share' ? 'link' : 'sync'}
                  </span>
                </div>
                <div className="flex-grow">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className={`font-button-text text-button-text uppercase ${t.status === 'error' ? 'text-[#93000a]' : 'text-on-surface'}`}>{t.name}</h3>
                    <span className="font-label-caps text-label-caps bg-on-surface text-surface px-2 py-1">
                      {new Date(t.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                  </div>
                  <p className={`font-body-md text-body-md mb-4 ${t.status === 'error' ? 'text-[#93000a]' : 'text-on-surface-variant'}`}>
                    {t.type} operation {t.status}
                  </p>
                  <div className="flex gap-2">
                    <span className="font-label-caps text-label-caps uppercase bg-surface-variant px-3 py-1 border-4 border-on-surface text-on-surface">{(t.total / (1024*1024)).toFixed(1)} MB</span>
                    <span className={`font-label-caps text-label-caps uppercase px-3 py-1 border-4 ${t.status === 'error' ? 'bg-[#ba1a1a] text-white border-[#ba1a1a]' : 'bg-primary-container text-on-primary-container border-on-surface'}`}>
                      {t.status}
                    </span>
                  </div>
                </div>
              </article>
            ))}

          </section>

          {/* Sidebar / System Alerts */}
          <aside className="lg:col-span-1 flex flex-col gap-6">
            <h2 className="font-headline-md text-headline-md uppercase bg-primary-container text-on-surface inline-block px-4 py-1 shadow-[4px_4px_0px_0px_#1a1c1c] self-start">System Alerts</h2>
            
            {/* Storage Warning */}
            <div className="bg-surface-container-lowest border-4 border-on-surface p-6 flex flex-col gap-4 relative">
              <div className="absolute -top-3 -right-3 bg-primary-container w-8 h-8 rounded-full border-4 border-on-surface flex items-center justify-center font-label-caps">!</div>
              <h3 className="font-button-text text-button-text uppercase flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">storage</span> Storage Status
              </h3>
              <div className="w-full bg-surface-variant border-4 border-on-surface h-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 h-full bg-primary-container border-r-4 border-on-surface transition-all duration-500" style={{width: `${storagePercentage}%`}}></div>
              </div>
              <p className="font-label-caps text-label-caps uppercase text-right">{storagePercentage}% Used ({formatSize(usedStorage)} / 10.00 GB)</p>
              <button onClick={() => setShowPricing(true)} className="bg-on-surface text-surface py-3 border-4 border-on-surface font-button-text text-button-text uppercase mt-2 hover:bg-primary-container hover:text-on-surface transition-colors cursor-pointer">Upgrade Plan</button>
            </div>

            {/* Security Alert */}
            <div className="bg-surface-container-lowest border-4 border-on-surface p-6 flex flex-col gap-4 border-dashed">
              <h3 className="font-button-text text-button-text uppercase flex items-center gap-2 text-on-surface">
                <span className="material-symbols-outlined">security</span> New Login
              </h3>
              <p className="font-body-md text-body-md text-on-surface-variant">MacBook Pro detected from Tokyo, JP.</p>
              <span className="font-label-caps text-label-caps uppercase bg-surface-variant px-2 py-1 self-start">Today, 09:42 AM</span>
            </div>
          </aside>
        </div>
      </main>

      {/* Pricing Modal Overlay */}
      {showPricing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="bg-surface border-4 border-on-surface shadow-[8px_8px_0px_0px_#1a1c1c] max-w-4xl w-full p-8 flex flex-col gap-8 relative animate-in fade-in zoom-in-95 duration-200">
            <button onClick={() => setShowPricing(false)} className="absolute top-4 right-4 w-10 h-10 border-4 border-on-surface flex items-center justify-center hover:bg-error hover:text-on-error transition-colors cursor-pointer">
              <span className="material-symbols-outlined">close</span>
            </button>
            
            <div className="text-center mb-4">
              <h2 className="font-display-lg text-display-lg uppercase italic drop-shadow-[4px_4px_0_#a4c639]">Upgrade Vault</h2>
              <p className="font-label-caps text-label-caps uppercase mt-2 text-on-surface-variant">Unlock infinite kinetic storage limits</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Pro Plan */}
              <div className="bg-surface-container border-4 border-on-surface p-6 flex flex-col gap-6 relative">
                <h3 className="font-headline-md text-headline-md uppercase">Pro Kinetic</h3>
                <div className="font-display-lg text-display-lg">$9<span className="text-2xl">/mo</span></div>
                <ul className="font-label-caps text-label-caps flex flex-col gap-4">
                  <li className="flex items-center gap-2"><span className="material-symbols-outlined text-primary">check_circle</span> 100 GB Storage</li>
                  <li className="flex items-center gap-2"><span className="material-symbols-outlined text-primary">check_circle</span> End-to-End Encryption</li>
                  <li className="flex items-center gap-2"><span className="material-symbols-outlined text-primary">check_circle</span> 30-Day Trash Recovery</li>
                </ul>
                <button className="mt-auto bg-on-surface text-surface py-3 border-4 border-on-surface font-button-text text-button-text uppercase hover:bg-primary-container hover:text-on-surface transition-colors cursor-pointer shadow-[4px_4px_0px_0px_#a4c639]">Select Pro</button>
              </div>
              
              {/* Max Plan */}
              <div className="bg-primary-container border-4 border-on-surface p-6 flex flex-col gap-6 relative shadow-[8px_8px_0px_0px_#1a1c1c] -translate-y-2">
                <div className="absolute -top-4 right-4 bg-error text-on-error px-3 py-1 font-label-caps text-label-caps uppercase border-4 border-on-surface rotate-3">Most Popular</div>
                <h3 className="font-headline-md text-headline-md uppercase">Max Velocity</h3>
                <div className="font-display-lg text-display-lg">$19<span className="text-2xl">/mo</span></div>
                <ul className="font-label-caps text-label-caps flex flex-col gap-4">
                  <li className="flex items-center gap-2"><span className="material-symbols-outlined">check_circle</span> 2 TB Storage</li>
                  <li className="flex items-center gap-2"><span className="material-symbols-outlined">check_circle</span> End-to-End Encryption</li>
                  <li className="flex items-center gap-2"><span className="material-symbols-outlined">check_circle</span> Infinite Trash Recovery</li>
                  <li className="flex items-center gap-2"><span className="material-symbols-outlined">check_circle</span> Priority Support</li>
                </ul>
                <button className="mt-auto bg-on-surface text-surface py-3 border-4 border-on-surface font-button-text text-button-text uppercase hover:bg-surface hover:text-on-surface transition-colors cursor-pointer">Select Max</button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Footer */}

      <footer className="w-full mt-auto bg-surface-container-highest dark:bg-on-surface-variant border-t-4 border-on-background dark:border-surface-container-highest z-10 relative">
        <div className="flex flex-col md:flex-row justify-between items-center px-margin-mobile md:px-margin-desktop py-8 max-w-container-max mx-auto gap-gutter w-full">
          <div className="font-headline-md text-headline-md font-bold text-on-background dark:text-background tracking-tighter">
            Chuchudu
          </div>
          <nav className="flex flex-wrap justify-center gap-6">
            <Link className="font-body-md text-body-md text-on-surface-variant dark:text-surface-variant hover:underline hover:text-primary dark:hover:text-primary-fixed transition-colors duration-200" to="#">Terms</Link>
            <Link className="font-body-md text-body-md text-on-surface-variant dark:text-surface-variant hover:underline hover:text-primary dark:hover:text-primary-fixed transition-colors duration-200" to="#">Privacy</Link>
            <Link className="font-body-md text-body-md text-on-surface-variant dark:text-surface-variant hover:underline hover:text-primary dark:hover:text-primary-fixed transition-colors duration-200" to="#">Support</Link>
          </nav>
          <div className="font-label-caps text-label-caps text-on-surface-variant uppercase">
            © 2026 Chuchudu. All Rights Reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

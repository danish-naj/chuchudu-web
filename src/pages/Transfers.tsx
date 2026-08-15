import React from 'react';
import Header from '../components/Header';
import { Link } from 'react-router-dom';
import { useTransfers } from '../context/TransferContext';

export default function Transfers() {
  const { getActiveTransfers, transfers, removeTransfer } = useTransfers();
  const activeTransfers = getActiveTransfers();
  
  const sharedLinks = transfers.filter(t => t.type === 'share' && t.status === 'completed');
  const history = transfers.filter(t => t.status === 'completed' || t.status === 'error').slice(0, 10); // Show last 10

  const getIconForType = (type: string) => {
    if (type === 'upload') return 'upload';
    if (type === 'download') return 'download';
    return 'sync';
  };

  const getFormat = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="bg-background text-on-background min-h-screen flex flex-col font-body-md selection:bg-primary-container selection:text-on-primary-container">
      <Header />
      
      {/* Main Content */}
      <main className="flex-grow w-full max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-12 flex flex-col gap-16">
        
        {/* Header Section */}
        <div className="flex justify-between items-end">
          <div>
            <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg uppercase text-on-background">Transfers Dashboard</h1>
            <p className="font-label-caps text-label-caps uppercase text-on-surface-variant mt-2 tracking-widest">Manage your active and past data flows</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter">
          
          {/* Left Column: Live & Shared Links */}
          <div className="lg:col-span-2 flex flex-col gap-12">
            
            {/* Live Transfers */}
            <section>
              <div className="flex items-center justify-between mb-6 border-b-4 border-on-background pb-2">
                <h2 className="font-headline-md text-headline-md uppercase flex items-center gap-2">
                  <span className="material-symbols-outlined animate-pulse text-error">sensors</span> Live Operations
                </h2>
                <span className="bg-primary-container neo-border px-3 py-1 font-label-caps text-label-caps uppercase">{activeTransfers.length} Active</span>
              </div>
              
              <div className="flex flex-col gap-6">
                {activeTransfers.length === 0 && (
                   <div className="p-8 text-center text-on-surface-variant font-label-caps uppercase border-4 border-dashed border-on-surface rounded-lg">
                      No active operations
                   </div>
                )}
                
                {activeTransfers.map(transfer => {
                  const percent = transfer.total > 0 ? Math.round((transfer.progress / transfer.total) * 100) : 0;
                  return (
                    <div key={transfer.id} className="bg-surface neo-border neo-shadow p-6 relative overflow-hidden group">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 neo-border flex items-center justify-center ${transfer.type === 'upload' ? 'bg-primary-container text-on-primary-container' : 'bg-surface-container-highest text-on-background'}`}>
                            <span className="material-symbols-outlined" style={{fontSize: '28px'}}>{getIconForType(transfer.type)}</span>
                          </div>
                          <div>
                            <h3 className="font-headline-md text-headline-md truncate max-w-[200px] md:max-w-xs">{transfer.name}</h3>
                            <p className="font-label-caps text-label-caps text-on-surface-variant uppercase mt-1">
                               {transfer.status} • {getFormat(transfer.progress)} / {getFormat(transfer.total)}
                            </p>
                          </div>
                        </div>
                        <button className="w-10 h-10 bg-error-container text-on-error-container neo-border neo-shadow-sm hover:translate-x-1 hover:translate-y-1 hover:shadow-none flex items-center justify-center transition-all" title="Cancel">
                          <span className="material-symbols-outlined">close</span>
                        </button>
                      </div>
                      {/* Progress Bar */}
                      <div className="w-full h-8 neo-border bg-surface-container-highest relative">
                        <div className="absolute top-0 left-0 h-full bg-primary-container border-r-4 border-on-background transition-all duration-300" style={{width: `${percent}%`}}></div>
                        <div className="absolute inset-0 flex items-center justify-center font-label-caps text-label-caps uppercase mix-blend-difference text-white">
                           {percent}% {transfer.status === 'error' && ' • ERROR'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Shared Links */}
            <section>
              <div className="flex items-center justify-between mb-6 border-b-4 border-on-background pb-2">
                <h2 className="font-headline-md text-headline-md uppercase flex items-center gap-2">
                  <span className="material-symbols-outlined">link</span> Active Shared Links
                </h2>
              </div>
                {sharedLinks.length === 0 && (
                  <div className="col-span-1 md:col-span-2 p-8 text-center text-on-surface-variant font-label-caps uppercase border-4 border-dashed border-on-surface rounded-lg">
                    No active shared links
                  </div>
                )}
                {sharedLinks.map(link => (
                  <div key={link.id} className="bg-surface neo-border neo-shadow p-5 flex flex-col gap-4">
                    <div className="flex justify-between items-start">
                      <h3 className="font-button-text text-button-text uppercase line-clamp-1">{link.name}</h3>
                      <span className="bg-surface-container-high neo-border px-2 py-1 font-label-caps text-label-caps uppercase text-primary flex items-center gap-1">
                        <span className="material-symbols-outlined" style={{fontSize: '14px'}}>check_circle</span> Active
                      </span>
                    </div>
                    <div className="flex gap-2 mt-4 items-center">
                      <span className="font-label-caps text-label-caps uppercase bg-surface-variant px-3 py-1 border-4 border-on-surface text-on-surface mr-auto">{(link.total / (1024*1024)).toFixed(1)} MB</span>
                      
                      <button onClick={() => {
                        if (window.confirm('Are you sure you want to revoke this link? Anyone with it will lose access immediately.')) {
                          removeTransfer(link.id);
                        }
                      }} className="bg-error-container text-on-error-container neo-border hover:bg-error hover:text-on-error transition-colors px-4 py-2 font-button-text text-button-text uppercase flex items-center gap-2 cursor-pointer shadow-[2px_2px_0px_0px_#1a1c1c] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]" title="Revoke Link">
                        <span className="material-symbols-outlined" style={{fontSize: '18px'}}>power_settings_new</span> Turn Off
                      </button>
                    </div>
                  </div>
                ))}

            </section>
          </div>

          {/* Right Column: History */}
          <div className="lg:col-span-1">
            <section className="h-full flex flex-col">
              <div className="flex items-center justify-between mb-6 border-b-4 border-on-background pb-2">
                <h2 className="font-headline-md text-headline-md uppercase flex items-center gap-2">
                  <span className="material-symbols-outlined">history</span> History
                </h2>
                <button className="font-label-caps text-label-caps uppercase hover:underline cursor-pointer">View All</button>
              </div>
              
              <div className="bg-surface neo-border neo-shadow flex-grow p-0 overflow-hidden">
                <ul className="divide-y-4 divide-on-background">
                  {history.length === 0 && (
                    <li className="p-4 text-center font-label-caps uppercase text-on-surface-variant">No history</li>
                  )}
                  {history.map(item => (
                    <li key={item.id} className="p-4 hover:bg-surface-container-highest transition-colors flex justify-between items-center group cursor-pointer">
                      <div className="flex items-center gap-3">
                        <span className={`material-symbols-outlined ${item.status === 'error' ? 'text-error' : 'text-primary'}`} style={{fontVariationSettings: "'FILL' 1"}}>
                          {item.status === 'error' ? 'cancel' : 'check_circle'}
                        </span>
                        <div>
                          <p className="font-button-text text-button-text uppercase line-clamp-1">{item.name}</p>
                          <p className="font-label-caps text-label-caps text-on-surface-variant mt-1">
                            {item.type} • {getFormat(item.total)}
                          </p>
                        </div>
                      </div>
                      <span className="font-label-caps text-label-caps text-on-surface-variant group-hover:text-on-background">
                        {new Date(item.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          </div>
        </div>
      </main>

      {/* Floating Action Button for New Transfer */}
      <button className="fixed bottom-8 right-8 z-40 bg-primary-container text-on-primary-container neo-border shadow-[8px_8px_0px_0px_#1a1c1c] hover:translate-x-1 hover:translate-y-1 hover:shadow-[4px_4px_0px_0px_#1a1c1c] rounded-none px-6 py-4 flex items-center gap-3 transition-all cursor-pointer">
        <span className="material-symbols-outlined" style={{fontSize: '28px', fontVariationSettings: "'wght' 700"}}>add</span>
        <span className="font-headline-md text-headline-md uppercase tracking-tight">New Transfer</span>
      </button>

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

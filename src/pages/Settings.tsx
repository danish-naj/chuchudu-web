import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useDrive } from '../context/DriveContext';
import { updateProfile } from 'firebase/auth';

const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const [showUpgrade, setShowUpgrade] = useState(false);
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const profileInputRef = useRef<HTMLInputElement>(null);
  const [localPhoto, setLocalPhoto] = useState<string | null>(null);

  const handleNavClick = (tab: string) => {
    if (tab === 'files') {
      navigate('/dashboard');
    } else {
      setActiveTab(tab);
    }
  };

  const handleProfileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && currentUser) {
      const file = e.target.files[0];
      // Create local preview immediately
      const url = URL.createObjectURL(file);
      setLocalPhoto(url);
      
      // In a real production app, we would upload this to Firebase Storage
      // and then call updateProfile(currentUser, { photoURL: downloadUrl }).
      // For this demo, we'll just update it locally with the Data URL or blob URL.
      // updateProfile(currentUser, { photoURL: url }).catch(console.error);
    }
  };

  return (
    <div className="bg-background text-on-surface font-body-md h-screen flex overflow-hidden relative">
      {/* Top Navigation (Mobile Only) */}
      <nav className="md:hidden fixed top-0 w-full z-50 flex justify-between items-center px-margin-mobile h-16 bg-surface border-b-2 border-on-surface shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <div className="font-headline-lg-mobile text-headline-lg-mobile font-black uppercase tracking-tighter text-on-surface cursor-pointer" onClick={() => navigate('/dashboard')}>Chuchudu</div>
        <div className="flex gap-4">
          <span className="material-symbols-outlined text-primary hover:bg-primary-container p-2 border-2 border-transparent active:translate-y-1 active:translate-x-1 cursor-pointer transition-all rounded">notifications</span>
          <span className="material-symbols-outlined text-primary hover:bg-primary-container p-2 border-2 border-transparent active:translate-y-1 active:translate-x-1 cursor-pointer transition-all rounded">help</span>
        </div>
      </nav>

      {/* Side Navigation (Desktop) */}
      <aside className="hidden md:flex flex-col h-screen p-4 gap-4 bg-surface border-r-2 border-on-surface shadow-[4px_0px_0px_0px_rgba(0,0,0,1)] w-64 z-40 relative flex-shrink-0">
        <div className="mb-8 cursor-pointer" onClick={() => navigate('/dashboard')}>
          <h1 className="font-headline-md text-headline-md font-black uppercase text-on-surface">Chuchudu</h1>
          <p className="font-label-caps text-label-caps text-on-surface-variant mt-1">File Sharing v2.0</p>
        </div>
        <nav className="flex-1 flex flex-col gap-2">
          <button onClick={() => handleNavClick('files')} className={`flex items-center gap-3 p-3 font-label-caps text-label-caps text-on-surface-variant hover:bg-secondary-container hover:translate-x-1 transition-transform border-2 border-transparent ${activeTab === 'files' ? 'bg-primary-container text-on-primary-container border-on-surface shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]' : ''}`}>
            <span className="material-symbols-outlined">folder</span> My Files
          </button>
          <button onClick={() => handleNavClick('storage')} className={`flex items-center gap-3 p-3 font-label-caps text-label-caps transition-transform ${activeTab === 'storage' ? 'bg-primary-container text-on-primary-container border-2 border-on-surface shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 active:scale-95' : 'text-on-surface-variant hover:bg-secondary-container hover:translate-x-1 border-2 border-transparent'}`}>
            <span className="material-symbols-outlined">database</span> Storage
          </button>
          <button onClick={() => handleNavClick('security')} className={`flex items-center gap-3 p-3 font-label-caps text-label-caps transition-transform ${activeTab === 'security' ? 'bg-primary-container text-on-primary-container border-2 border-on-surface shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 active:scale-95' : 'text-on-surface-variant hover:bg-secondary-container hover:translate-x-1 border-2 border-transparent'}`}>
            <span className="material-symbols-outlined">shield</span> Security
          </button>
          <button onClick={() => handleNavClick('profile')} className={`flex items-center gap-3 p-3 font-label-caps text-label-caps transition-transform ${activeTab === 'profile' ? 'bg-primary-container text-on-primary-container border-2 border-on-surface shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 active:scale-95' : 'text-on-surface-variant hover:bg-secondary-container hover:translate-x-1 border-2 border-transparent'}`}>
            <span className="material-symbols-outlined">person</span> Profile
          </button>
        </nav>
        <button onClick={() => setShowUpgrade(true)} className="bg-primary-container text-on-primary-container font-button-text text-button-text border-2 border-on-surface shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-4 uppercase hover:translate-y-1 hover:translate-x-1 hover:shadow-none transition-all active:scale-95">
            Upgrade Plan
        </button>
      </aside>

      {/* Mobile Tab Navigation */}
      <div className="md:hidden fixed top-16 w-full z-40 bg-surface border-b-2 border-black flex overflow-x-auto">
        <button onClick={() => setActiveTab('profile')} className={`flex-1 min-w-[100px] py-3 font-label-caps uppercase tracking-tighter text-sm border-b-4 transition-colors ${activeTab === 'profile' ? 'border-lime text-black' : 'border-transparent text-on-surface-variant'}`}>
          Profile
        </button>
        <button onClick={() => setActiveTab('storage')} className={`flex-1 min-w-[100px] py-3 font-label-caps uppercase tracking-tighter text-sm border-b-4 transition-colors ${activeTab === 'storage' ? 'border-lime text-black' : 'border-transparent text-on-surface-variant'}`}>
          Storage
        </button>
        <button onClick={() => setActiveTab('security')} className={`flex-1 min-w-[100px] py-3 font-label-caps uppercase tracking-tighter text-sm border-b-4 transition-colors ${activeTab === 'security' ? 'border-lime text-black' : 'border-transparent text-on-surface-variant'}`}>
          Security
        </button>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pt-32 md:pt-8 pb-24 md:pb-8 px-4 md:px-gutter">
        <div className="max-w-[1000px] mx-auto space-y-8">
          <header className="hidden md:block">
            <h2 className="font-headline-lg text-headline-lg md:font-display-lg md:text-display-lg font-black uppercase tracking-tighter">
              {activeTab === 'profile' && 'PROFILE SETTINGS'}
              {activeTab === 'storage' && 'STORAGE SETTINGS'}
              {activeTab === 'security' && 'SECURITY SETTINGS'}
            </h2>
          </header>
          <div className="flex flex-col gap-8">
            
            {/* Profile Section */}
            {activeTab === 'profile' && (
              <section className="bg-surface p-6 border-2 border-black shadow-[8px_8px_0px_0px_#000] flex flex-col gap-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                  <div className="relative group cursor-pointer" onClick={() => profileInputRef.current?.click()}>
                    <input type="file" ref={profileInputRef} className="hidden" accept="image/*" onChange={handleProfileChange} />
                    <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-none border-2 border-black shadow-[4px_4px_0px_0px_#000] overflow-hidden bg-lime relative flex items-center justify-center">
                      <img 
                        alt="User Avatar" 
                        className="w-full h-full object-cover mix-blend-multiply grayscale contrast-125" 
                        src={localPhoto || currentUser?.photoURL || "https://lh3.googleusercontent.com/aida-public/AB6AXuDrXlifdEJG7f2y4Z0J3BAg4fy4Ab7oJSRsIX1ao0epaQ83v3X3hL4j2fDICsvGmsKZJic8Ad5zltIl_BwzEA0qI3u4l2BnJsFlPMcNEr5OBD3rWHSThWXXbG82MoBFT-Yvem7Ez_FCW6nFU-ZZcc1klucqBlZqM40yaQJnIvVM4owHNxdoTItgtY-7ltOpaNLf0P7RQtNiI1qHUo9KVkfttMOSfxIjpwGU3Z_CqH1rmS4VCW-fYo-y3--9o6OX15UoZ2T0bXZAFpr3"}
                      />
                      <div className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center transition-all">
                        <span className="material-symbols-outlined text-white text-3xl">add_photo_alternate</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 space-y-4 w-full">
                    <div>
                      <label className="block font-label-caps text-label-caps mb-2 text-on-surface">DISPLAY NAME</label>
                      <input className="w-full bg-surface border-2 border-black p-3 font-body-lg text-body-lg focus:border-4 focus:outline-none transition-all placeholder:font-label-caps" type="text" defaultValue={currentUser?.displayName || currentUser?.email?.split('@')[0] || ''}/>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block font-label-caps text-label-caps mb-2 text-on-surface">USERNAME</label>
                    <input className="w-full bg-surface border-2 border-black p-3 font-body-lg text-body-lg focus:border-4 focus:outline-none transition-all placeholder:font-label-caps text-on-surface-variant bg-surface-container-highest cursor-not-allowed" type="text" readOnly value={`@${currentUser?.email?.split('@')[0] || 'user'}`}/>
                  </div>
                  <div>
                    <label className="block font-label-caps text-label-caps mb-2 text-on-surface">EMAIL</label>
                    <input className="w-full bg-surface border-2 border-black p-3 font-body-lg text-body-lg focus:border-4 focus:outline-none transition-all placeholder:font-label-caps text-on-surface-variant bg-surface-container-highest cursor-not-allowed" type="email" readOnly value={currentUser?.email || ''}/>
                  </div>
                </div>
                <div className="flex justify-end mt-4">
                  <button className="bg-lime text-black font-button-text text-button-text border-2 border-black shadow-[4px_4px_0px_0px_#000] px-8 py-3 uppercase hover:translate-y-1 hover:translate-x-1 hover:shadow-none transition-all active:scale-95">
                      Save Changes
                  </button>
                </div>
              </section>
            )}

            {/* Storage Section */}
            {activeTab === 'storage' && (
              <section className="bg-lime text-black p-6 border-2 border-black shadow-[8px_8px_0px_0px_#000] flex flex-col gap-6">
                <div className="flex justify-between items-center">
                  <h3 className="font-headline-md text-headline-md font-bold uppercase">STORAGE</h3>
                  <span className="material-symbols-outlined text-3xl">cloud</span>
                </div>
                
                {/* Local Storage Indicator */}
                <div className="space-y-2">
                  <div className="flex justify-between font-label-caps text-label-caps">
                    <span>LOCAL USED</span>
                    <span>12.4GB / 256GB</span>
                  </div>
                  <div className="h-6 w-full border-2 border-black bg-white relative overflow-hidden">
                    <div className="absolute top-0 left-0 h-full bg-black" style={{ width: '5%' }}></div>
                  </div>
                </div>
                
                <hr className="border-t-2 border-black" />
                
                {/* Google Drive Integration */}
                <div className="bg-white p-4 border-2 border-black">
                  <div className="flex items-center gap-3 mb-2">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/1/12/Google_Drive_icon_%282020%29.svg" alt="Google Drive" className="w-8 h-8" />
                    <h4 className="font-bold text-lg uppercase tracking-tighter">Google Drive Buffer</h4>
                  </div>
                  <p className="text-sm font-label-caps text-black/70 mb-4">Connect your Google Drive to enable offline file uploads and zero-cost sharing.</p>
                  
                  {useDrive().isConnected ? (
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-green-700 flex items-center gap-1"><span className="material-symbols-outlined text-sm">check_circle</span> Connected</span>
                      <button onClick={() => useDrive().disconnect()} className="bg-black text-white font-button-text border-2 border-black px-4 py-2 uppercase hover:bg-error transition-colors">
                        Disconnect
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => useDrive().connect()} className="w-full bg-black text-lime font-button-text border-2 border-black px-4 py-3 uppercase hover:translate-y-1 hover:translate-x-1 shadow-[4px_4px_0px_0px_#000] hover:shadow-none transition-all active:scale-95">
                        Connect Google Drive
                    </button>
                  )}
                </div>

                <button onClick={() => setShowUpgrade(true)} className="bg-black text-lime font-button-text text-button-text border-2 border-white shadow-[4px_4px_0px_0px_#fff] px-4 py-2 mt-2 uppercase hover:translate-y-1 hover:translate-x-1 hover:shadow-none transition-all active:scale-95 self-start">
                    Upgrade Space
                </button>
              </section>
            )}

            {/* Security Section */}
            {activeTab === 'security' && (
              <section className="bg-surface p-6 border-2 border-black shadow-[8px_8px_0px_0px_#000] flex flex-col gap-6">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-2xl">shield_lock</span>
                  <h3 className="font-headline-md text-headline-md font-bold uppercase">SECURITY</h3>
                </div>
                <div className="flex items-center justify-between p-4 border-2 border-black bg-surface-container-low">
                  <div>
                    <p className="font-body-lg text-body-lg font-bold">Two-Factor Auth</p>
                    <p className="font-label-caps text-label-caps text-on-surface-variant mt-1">Extra layer of security</p>
                  </div>
                  {/* Brutalist Toggle */}
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input defaultChecked className="sr-only peer" type="checkbox" value=""/>
                    <div className="w-14 h-8 bg-surface peer-focus:outline-none border-2 border-black rounded-none peer peer-checked:after:translate-x-6 peer-checked:bg-lime after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-black after:border-2 after:border-black after:h-6 after:w-6 after:transition-all"></div>
                  </label>
                </div>
                <button className="w-full bg-surface text-on-surface font-button-text text-button-text border-2 border-black shadow-[4px_4px_0px_0px_#000] px-4 py-3 uppercase hover:translate-y-1 hover:translate-x-1 hover:shadow-none transition-all active:scale-95 flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined">key</span> Change Password
                </button>
              </section>
            )}
          </div>
        </div>
      </main>

      {/* Bottom Navigation (Mobile Only) */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-2 py-3 bg-surface border-t-4 border-black shadow-[0px_-4px_0px_0px_#a4c639]">
        <Link to="/dashboard" className="flex flex-col items-center justify-center border-2 p-1 w-16 transition-all border-transparent text-on-surface-variant hover:bg-lime/20">
          <span className="material-symbols-outlined mb-1">folder</span>
          <span className="text-[10px] font-bold uppercase tracking-tighter">Files</span>
        </Link>
        <Link to="/dashboard/trash" className="flex flex-col items-center justify-center border-2 p-1 w-16 transition-all border-transparent text-on-surface-variant hover:bg-error-container hover:text-error">
          <span className="material-symbols-outlined mb-1">delete</span>
          <span className="text-[10px] font-bold uppercase tracking-tighter">Trash</span>
        </Link>
        <Link to="/transfers" className="flex flex-col items-center justify-center border-2 p-1 w-16 transition-all border-transparent text-on-surface-variant hover:bg-lime/20">
          <span className="material-symbols-outlined mb-1">sync_alt</span>
          <span className="text-[10px] font-bold uppercase tracking-tighter">Transfers</span>
        </Link>
        <Link to="/settings" className="flex flex-col items-center justify-center border-2 p-1 w-16 transition-all bg-lime border-black shadow-[2px_2px_0px_0px_#000] -translate-y-1 text-black">
          <span className="material-symbols-outlined mb-1">settings</span>
          <span className="text-[10px] font-bold uppercase tracking-tighter">Settings</span>
        </Link>
      </nav>

      {/* Upgrade Modal */}
      {showUpgrade && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-surface border-4 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] w-full max-w-4xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200 flex flex-col">
            <div className="flex justify-between items-center p-6 border-b-4 border-black bg-primary">
              <h2 className="font-headline-lg text-headline-lg uppercase font-black tracking-tighter text-black">Upgrade Your Vault</h2>
              <button onClick={() => setShowUpgrade(false)} className="bg-white border-2 border-black w-10 h-10 flex items-center justify-center hover:bg-error hover:text-white transition-colors">
                <span className="material-symbols-outlined font-bold">close</span>
              </button>
            </div>
            
            <div className="p-6 md:p-10 grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Free Tier */}
              <div className="border-4 border-black p-6 bg-surface-container flex flex-col relative group hover:-translate-y-2 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all">
                <h3 className="font-headline-md font-bold uppercase border-b-2 border-black pb-4 mb-4">Basic Storage</h3>
                <div className="text-display-sm font-black tracking-tighter mb-2">Free</div>
                <p className="font-label-caps text-on-surface-variant mb-6">Always free, zero cloud costs.</p>
                <ul className="space-y-3 mb-8 flex-1 font-body-lg">
                  <li className="flex items-center gap-2"><span className="material-symbols-outlined text-primary">check_circle</span> Unlimited Local Storage</li>
                  <li className="flex items-center gap-2"><span className="material-symbols-outlined text-primary">check_circle</span> 256GB Remote Sync</li>
                  <li className="flex items-center gap-2"><span className="material-symbols-outlined text-primary">check_circle</span> E2E Encryption</li>
                  <li className="flex items-center gap-2 text-on-surface-variant"><span className="material-symbols-outlined">close</span> Shared Links</li>
                </ul>
                <button disabled className="w-full bg-surface-container-highest text-on-surface-variant font-button-text uppercase py-3 border-2 border-black border-dashed opacity-70">Current Plan</button>
              </div>

              {/* Pro Tier */}
              <div className="border-4 border-black p-6 bg-primary text-black flex flex-col relative group hover:-translate-y-2 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all">
                <div className="absolute -top-4 -right-4 bg-black text-white font-label-caps uppercase px-4 py-1 rotate-12 border-2 border-primary">Most Popular</div>
                <h3 className="font-headline-md font-bold uppercase border-b-2 border-black pb-4 mb-4">Pro Vault</h3>
                <div className="text-display-sm font-black tracking-tighter mb-2">$5<span className="text-headline-sm">/mo</span></div>
                <p className="font-label-caps text-black/70 mb-6">For power users and teams.</p>
                <ul className="space-y-3 mb-8 flex-1 font-body-lg">
                  <li className="flex items-center gap-2"><span className="material-symbols-outlined">check_circle</span> Unlimited Local Storage</li>
                  <li className="flex items-center gap-2"><span className="material-symbols-outlined">check_circle</span> 2TB Remote Sync</li>
                  <li className="flex items-center gap-2"><span className="material-symbols-outlined">check_circle</span> Custom E2E Encryption Keys</li>
                  <li className="flex items-center gap-2"><span className="material-symbols-outlined">check_circle</span> Secure Shared Links</li>
                </ul>
                <button className="w-full bg-black text-primary font-button-text uppercase py-3 hover:bg-white hover:text-black hover:border-black border-2 border-transparent transition-colors">Upgrade Now</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;

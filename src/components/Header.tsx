import React, { useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Header() {
  const { logout, currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    // In a real app we'd dispatch an upload action. For now this just triggers the file picker.
    console.log("Upload triggered", e.target.files);
  };

  const isMyFiles = location.pathname.startsWith('/dashboard');
  const isTransfers = location.pathname.startsWith('/transfers');
  const isActivity = location.pathname.startsWith('/activity');

  const getNavClass = (isActive: boolean) => {
    if (isActive) {
      return "text-primary dark:text-primary-fixed border-b-2 border-primary dark:border-primary-fixed hover:-translate-y-0.5 hover:translate-x-0.5 transition-transform active:translate-y-1 active:translate-x-1 active:shadow-none transition-all pb-1";
    }
    return "text-on-surface dark:text-surface-bright hover:text-primary hover:-translate-y-0.5 hover:translate-x-0.5 transition-transform active:translate-y-1 active:translate-x-1 active:shadow-none transition-all pb-1";
  };

  return (
    <header className="w-full sticky top-0 z-50 bg-background dark:bg-on-background border-b-2 border-on-background dark:border-surface-container-highest shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)]">
      <div className="flex justify-between items-center px-margin-mobile md:px-margin-desktop py-4 max-w-container-max mx-auto w-full">
        <Link to="/dashboard" className="flex items-center gap-4">
          <img alt="Chuchudu Logo" className="h-10 w-10 object-cover neo-border rounded-full" src="https://lh3.googleusercontent.com/aida-public/AB6AXuB7Rbab1g-OPAoW2Drbyt1XQRoBcWpq_2ASDeXjH3XFwHUUogt4GvSiJT1s1YB7syNLVrRRg-txhDtnYK-du3Jqkv5yKiNruMPdsNdaaUDUwhSOscQ3HMZMdcDln_EvMkyYnkYx-Bd7vRedEXlfYuHDUuPDyg4XYxCyiy93i2xetEPjdoc9R5rq_iPFEpx1vM70JbzBCcGE_X18__ElURjFrKAMvu3H0dR5QC5zzuPST1z0MK-zKtpG-ORPZWKS-ArV9UoMHspKTykB" />
          <span className="font-headline-md text-headline-md font-black tracking-tighter text-on-background dark:text-background uppercase">Chuchudu</span>
        </Link>
        <nav className="hidden md:flex gap-8 items-center font-button-text text-button-text uppercase">
          <Link className={getNavClass(isMyFiles)} to="/dashboard">My Files</Link>
          <Link className={getNavClass(isTransfers)} to="/transfers">Transfers</Link>
          <Link className={getNavClass(isActivity)} to="/activity">Activity</Link>
        </nav>
        <div className="flex items-center gap-4">
          <div className="relative">
            <button 
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-2 p-1 neo-border bg-surface hover:-translate-y-0.5 hover:translate-x-0.5 transition-transform active:translate-y-1 active:translate-x-1 active:shadow-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] rounded-full pl-3 pr-1 group"
            >
              <span className="font-label-caps uppercase font-bold text-on-surface truncate max-w-[100px]">{currentUser?.displayName || currentUser?.email?.split('@')[0] || 'User'}</span>
              <img src={currentUser?.photoURL || "https://lh3.googleusercontent.com/aida-public/AB6AXuDrXlifdEJG7f2y4Z0J3BAg4fy4Ab7oJSRsIX1ao0epaQ83v3X3hL4j2fDICsvGmsKZJic8Ad5zltIl_BwzEA0qI3u4l2BnJsFlPMcNEr5OBD3rWHSThWXXbG82MoBFT-Yvem7Ez_FCW6nFU-ZZcc1klucqBlZqM40yaQJnIvVM4owHNxdoTItgtY-7ltOpaNLf0P7RQtNiI1qHUo9KVkfttMOSfxIjpwGU3Z_CqH1rmS4VCW-fYo-y3--9o6OX15UoZ2T0bXZAFpr3"} alt="Profile" className="w-8 h-8 rounded-full border-2 border-black object-cover" />
            </button>
            
            {showProfileMenu && (
               <div className="absolute top-full mt-2 right-0 w-64 bg-surface border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-4 flex flex-col gap-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="flex items-center gap-3 mb-2 border-b-2 border-black pb-4">
                     <img src={currentUser?.photoURL || "https://lh3.googleusercontent.com/aida-public/AB6AXuDrXlifdEJG7f2y4Z0J3BAg4fy4Ab7oJSRsIX1ao0epaQ83v3X3hL4j2fDICsvGmsKZJic8Ad5zltIl_BwzEA0qI3u4l2BnJsFlPMcNEr5OBD3rWHSThWXXbG82MoBFT-Yvem7Ez_FCW6nFU-ZZcc1klucqBlZqM40yaQJnIvVM4owHNxdoTItgtY-7ltOpaNLf0P7RQtNiI1qHUo9KVkfttMOSfxIjpwGU3Z_CqH1rmS4VCW-fYo-y3--9o6OX15UoZ2T0bXZAFpr3"} className="w-12 h-12 rounded-full border-2 border-black object-cover" />
                     <div className="flex flex-col flex-1 overflow-hidden">
                        <span className="font-headline-md uppercase text-on-surface truncate" title={currentUser?.displayName || currentUser?.email || 'User'}>{currentUser?.displayName || currentUser?.email?.split('@')[0] || 'User'}</span>
                        <span className="font-label-caps text-on-surface-variant text-[10px] truncate" title={currentUser?.email || ''}>{currentUser?.email || 'user@chuchudu.com'}</span>
                     </div>
                  </div>
                  <Link to="/settings" onClick={() => setShowProfileMenu(false)} className="flex items-center gap-2 font-label-caps uppercase p-2 hover:bg-primary-container border-2 border-transparent hover:border-black transition-colors w-full text-left">
                     <span className="material-symbols-outlined">person</span> Settings
                  </Link>
                  <button onClick={handleLogout} className="flex items-center gap-2 font-label-caps uppercase p-2 hover:bg-error-container hover:text-error-on border-2 border-transparent hover:border-black transition-colors w-full text-left text-error cursor-pointer">
                     <span className="material-symbols-outlined">logout</span> Log Out
                  </button>
               </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function PortalSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const path = location.pathname;

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (e) {
      console.error('Logout error:', e);
    }
  };

  const navItems = [
    { label: 'UPLOAD FILES', path: '/dashboard', icon: 'cloud_upload' },
    { label: 'UPLOAD STATUS', path: '/status', icon: 'pending_actions' },
    { label: 'GET APPS', path: '/apps', icon: 'download' },
    { label: 'TERMS & LEGAL', path: '/terms', icon: 'gavel' },
  ];

  return (
    <>
      {/* Desktop Fixed Sidebar */}
      <aside className="hidden md:flex w-[240px] flex-shrink-0 bg-surface border-r-2 border-on-background flex-col h-screen sticky top-0 z-20">
        {/* Logo */}
        <div className="p-6">
          <Link to="/" className="inline-block transform -rotate-3 hover:rotate-0 transition-transform">
            <div className="bg-primary-container text-on-background px-3 py-1 border-2 border-on-background brutal-shadow font-headline-md text-headline-md tracking-tight uppercase">
              Chuchudu
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-4 space-y-3">
          {navItems.map((item) => {
            const isActive = path === item.path;
            return (
              <Link
                key={item.label}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 font-button-text text-button-text uppercase tracking-wide transition-all ${
                  isActive
                    ? 'bg-primary-container text-on-background border-2 border-on-background brutal-shadow font-bold'
                    : 'text-on-surface-variant hover:text-on-background hover:bg-surface-container-high border-2 border-transparent'
                }`}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
                >
                  {item.icon}
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Bottom User Section */}
        <div className="p-6 border-t-2 border-on-background mt-auto bg-surface-container-highest">
          <p className="font-label-caps text-label-caps text-on-surface-variant truncate mb-2 text-xs" title={currentUser?.email || ''}>
            {currentUser?.email || 'user@chuchudu.in'}
          </p>
          <button
            onClick={handleLogout}
            className="text-primary font-button-text text-sm uppercase hover:underline cursor-pointer flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-sm">logout</span>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile Top Bar */}
      <div className="md:hidden bg-surface border-b-2 border-on-background p-4 flex items-center justify-between sticky top-0 z-30">
        <Link to="/" className="inline-block transform -rotate-2">
          <div className="bg-primary-container text-on-background px-2.5 py-0.5 border-2 border-on-background brutal-shadow font-headline-md text-lg uppercase">
            Chuchudu
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={handleLogout}
            className="border-2 border-on-background bg-surface-container px-3 py-1 font-label-caps text-xs uppercase brutal-shadow"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full z-40 bg-surface border-t-2 border-on-background flex justify-around items-center p-2 brutal-shadow">
        {navItems.map((item) => {
          const isActive = path === item.path;
          return (
            <Link
              key={item.label}
              to={item.path}
              className={`flex flex-col items-center p-2 text-xs font-label-caps uppercase ${
                isActive ? 'text-primary font-bold' : 'text-on-surface-variant'
              }`}
            >
              <span className="material-symbols-outlined text-xl">{item.icon}</span>
              <span className="text-[10px] tracking-tight">{item.label.split(' ')[0]}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}

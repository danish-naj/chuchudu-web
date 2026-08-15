import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

const Landing: React.FC = () => {
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add('animate-in');
        });
      },
      { threshold: 0.1 }
    );
    document.querySelectorAll('.scroll-hidden').forEach((el) => observerRef.current?.observe(el));
    return () => observerRef.current?.disconnect();
  }, []);

  return (
    <div className="bg-background text-on-background font-body-md antialiased w-full overflow-x-hidden selection:bg-primary-container selection:text-on-primary-container">

      {/* ── Top Navigation ── */}
      <header className="bg-surface text-primary font-headline-md w-full border-b-4 border-on-background shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] sticky top-0 z-50">
        <div className="flex justify-between items-center px-4 sm:px-6 md:px-12 py-3.5 max-w-container-max mx-auto">
          {/* Logo */}
          <Link to="/" className="font-headline-lg text-2xl sm:text-3xl md:text-headline-lg tracking-tighter uppercase text-on-surface -rotate-2 origin-center inline-block transform hover:rotate-0 transition-transform">
            Chuchudu
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            <a
              href="#how-it-works"
              className="text-on-secondary-fixed-variant font-medium hover:bg-primary-container hover:text-on-primary-container transition-transform hover:-translate-y-0.5 active:translate-y-0 px-4 py-2 brutal-border bg-surface"
            >
              Features
            </a>
            <a
              href="#security"
              className="font-bold px-4 py-2 bg-primary-container text-on-primary-container brutal-border brutal-shadow brutal-hover"
            >
              Security
            </a>
          </nav>

          {/* CTA Buttons */}
          <div className="flex items-center gap-3 sm:gap-4">
            <Link
              to="/login"
              className="hidden sm:inline-block font-button-text text-sm md:text-button-text text-on-surface px-4 sm:px-6 py-2 sm:py-3 brutal-border bg-surface brutal-shadow brutal-hover transition-all"
            >
              Log In
            </Link>
            <Link
              to="/signup"
              className="font-button-text text-xs sm:text-sm md:text-button-text text-on-primary px-4 sm:px-6 py-2 sm:py-3 brutal-border bg-primary brutal-shadow brutal-hover transition-all uppercase"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </header>

      <main className="w-full">
        {/* ── Hero Section ── */}
        <section className="relative pt-12 sm:pt-20 pb-20 sm:pb-32 px-4 sm:px-6 md:px-12 max-w-container-max mx-auto flex flex-col items-center text-center">
          {/* Badge */}
          <div className="inline-flex flex-wrap items-center justify-center gap-2 px-4 py-2 brutal-border bg-primary-container text-on-primary-container font-label-caps text-[10px] sm:text-xs uppercase rounded-full mb-6 sm:mb-8 brutal-shadow max-w-full text-center">
            <span className="w-2 h-2 rounded-full bg-on-primary-container animate-pulse flex-shrink-0" />
            <span>YOUR PC IS THE VAULT • ZERO CLOUD COSTS • E2E ENCRYPTED</span>
          </div>

          {/* Headline */}
          <h1 className="font-display-lg text-3xl sm:text-5xl md:text-7xl lg:text-[84px] leading-[1.15] sm:leading-[1.1] max-w-5xl mb-6 sm:mb-8 uppercase tracking-tight break-words">
            Your Laptop Is{' '}
            <br className="hidden sm:block" />
            <span className="bg-primary text-on-primary px-3 sm:px-4 py-0.5 sm:py-1 brutal-border inline-block -rotate-1 transform my-1">
              Your Storage.
            </span>
            <br />
            Upload From Any Device.
          </h1>

          {/* Sub-heading */}
          <p className="font-body-lg text-sm sm:text-lg md:text-2xl leading-relaxed sm:leading-normal max-w-3xl text-on-surface-variant mb-8 sm:mb-12 px-2">
            Upload photos, videos, and files directly from your phone browser. Files are AES-256
            encrypted and sent straight to your laptop hard drive. Cloud buffers auto-delete as soon
            as your desktop app syncs.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto max-w-xs sm:max-w-none">
            <a
              href="#downloads"
              className="font-button-text text-sm sm:text-button-text px-6 sm:px-8 py-3.5 sm:py-4 bg-primary text-on-primary brutal-border brutal-shadow-lg brutal-hover-lg transition-all flex items-center justify-center gap-2 uppercase font-bold"
            >
              <span className="material-symbols-outlined text-xl">desktop_windows</span>
              Get Desktop App
            </a>
            <Link
              to="/signup"
              className="font-button-text text-sm sm:text-button-text px-6 sm:px-8 py-3.5 sm:py-4 bg-surface text-on-surface brutal-border brutal-shadow-lg brutal-hover-lg transition-all flex items-center justify-center gap-2 uppercase font-bold"
            >
              <span className="material-symbols-outlined text-xl">language</span>
              Open Web Vault
            </Link>
          </div>
        </section>

        {/* ── How It Works ── */}
        <section
          id="how-it-works"
          className="py-16 sm:py-24 px-4 sm:px-6 md:px-12 bg-surface-container-low border-y-4 border-on-background"
        >
          <div className="max-w-container-max mx-auto">
            <h2 className="font-headline-lg text-3xl sm:text-5xl md:text-[64px] leading-tight mb-12 sm:mb-16 uppercase scroll-hidden text-center md:text-left">
              How It Works
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
              {/* Step 1 */}
              <div className="bg-surface brutal-border p-6 sm:p-8 brutal-shadow relative group scroll-hidden">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary brutal-border flex items-center justify-center font-headline-md text-on-primary mb-4 font-bold">
                  01
                </div>
                <span className="material-symbols-outlined text-[40px] sm:text-[48px] text-primary mb-4 block">
                  hard_drive
                </span>
                <h3 className="font-headline-md text-xl sm:text-headline-md mb-2 sm:mb-4">Run Desktop Vault</h3>
                <p className="font-body-md text-sm sm:text-base text-on-surface-variant leading-relaxed">
                  Set up a local folder on your PC. You get unlimited disk storage limited only by your
                  physical hard drive. No subscription caps.
                </p>
              </div>

              {/* Step 2 */}
              <div className="bg-primary-container brutal-border p-6 sm:p-8 brutal-shadow relative group scroll-hidden">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-surface brutal-border flex items-center justify-center font-headline-md text-on-surface mb-4 font-bold">
                  02
                </div>
                <span className="material-symbols-outlined text-[40px] sm:text-[48px] text-on-primary-container mb-4 block">
                  smartphone
                </span>
                <h3 className="font-headline-md text-xl sm:text-headline-md text-on-primary-container mb-2 sm:mb-4">
                  Upload From Any Phone
                </h3>
                <p className="font-body-md text-sm sm:text-base text-on-primary-container leading-relaxed">
                  Open chuchudu.in on any mobile browser. Sign in to your account
                  to pair instantly and start uploading your photos and videos.
                </p>
              </div>

              {/* Step 3 */}
              <div className="bg-surface brutal-border p-6 sm:p-8 brutal-shadow relative group scroll-hidden">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary brutal-border flex items-center justify-center font-headline-md text-on-primary mb-4 font-bold">
                  03
                </div>
                <span className="material-symbols-outlined text-[40px] sm:text-[48px] text-primary mb-4 block">
                  enhanced_encryption
                </span>
                <h3 className="font-headline-md text-xl sm:text-headline-md mb-2 sm:mb-4">E2EE &amp; Auto-Clean</h3>
                <p className="font-body-md text-sm sm:text-base text-on-surface-variant leading-relaxed">
                  Files are encrypted in transit. The temporary cloud buffer is purged immediately upon
                  successful receipt by your desktop vault.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Downloads Section ── */}
        <section
          id="downloads"
          className="py-16 sm:py-24 px-4 sm:px-6 md:px-12 max-w-container-max mx-auto"
        >
          <div className="text-center md:text-left mb-12 sm:mb-16">
            <h2 className="font-headline-lg text-3xl sm:text-5xl md:text-[64px] leading-tight uppercase bg-primary text-on-primary inline-block px-4 py-1 brutal-border -rotate-1 transform scroll-hidden">
              Downloads
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 max-w-4xl mx-auto">
            {/* Windows */}
            <div className="bg-surface brutal-border p-6 sm:p-8 flex flex-col brutal-shadow-lg brutal-hover-lg transition-all scroll-hidden">
              <div className="flex-grow">
                <span className="material-symbols-outlined text-[48px] sm:text-[64px] text-on-surface mb-4 block">
                  desktop_windows
                </span>
                <h3 className="font-headline-md text-xl sm:text-headline-md mb-1">Windows Agent</h3>
                <p className="font-label-caps text-xs text-on-surface-variant mb-4 uppercase">
                  v1.0.0 • .exe / .msi installer
                </p>
                <ul className="font-body-md text-xs sm:text-sm text-on-surface-variant space-y-2 mb-6">
                  <li className="flex items-center gap-2">✓ System tray runner &amp; autostart</li>
                  <li className="flex items-center gap-2">✓ Local vault folder manager &amp; explorer</li>
                  <li className="flex items-center gap-2">✓ Background cloud sync &amp; decryption</li>
                  <li className="flex items-center gap-2">✓ Windows 10 / 11 (64-bit)</li>
                </ul>
              </div>
              <a
                href="/downloads/Chuchudu-Agent-Setup.exe"
                download="Chuchudu-Setup.exe"
                className="font-button-text text-sm sm:text-button-text w-full py-3.5 sm:py-4 bg-primary text-on-primary brutal-border brutal-shadow brutal-hover transition-all uppercase text-center font-bold"
              >
                Download for Windows (.exe)
              </a>
            </div>

            {/* Web Portal */}
            <div className="bg-surface brutal-border p-6 sm:p-8 flex flex-col brutal-shadow-lg brutal-hover-lg transition-all scroll-hidden">
              <div className="flex-grow">
                <span className="material-symbols-outlined text-[48px] sm:text-[64px] text-on-surface mb-4 block">
                  public
                </span>
                <h3 className="font-headline-md text-xl sm:text-headline-md mb-1">Web Portal</h3>
                <p className="font-label-caps text-xs text-on-surface-variant mb-4 uppercase">
                  Safari / Chrome / Edge
                </p>
                <ul className="font-body-md text-xs sm:text-sm text-on-surface-variant space-y-2 mb-6">
                  <li className="flex items-center gap-2">✓ Works on iOS &amp; Android</li>
                  <li className="flex items-center gap-2">✓ No installation needed</li>
                  <li className="flex items-center gap-2">✓ Drag-and-drop &amp; camera upload</li>
                  <li className="flex items-center gap-2">✓ Progressive Web App (PWA)</li>
                </ul>
              </div>
              <Link
                to="/signup"
                className="font-button-text text-sm sm:text-button-text w-full py-3.5 sm:py-4 bg-on-surface text-surface brutal-border brutal-shadow brutal-hover transition-all uppercase text-center font-bold"
              >
                Open Web Portal
              </Link>
            </div>
          </div>
        </section>

        {/* ── Security / Legal Disclaimer ── */}
        <section
          id="security"
          className="py-16 sm:py-24 px-4 sm:px-6 md:px-12"
        >
          <div className="max-w-4xl mx-auto bg-error-container brutal-border p-6 sm:p-10 brutal-shadow-lg scroll-hidden">
            <div className="flex items-center gap-3 sm:gap-4 mb-4">
              <span className="material-symbols-outlined text-[32px] sm:text-[40px] text-on-error-container">
                verified_user
              </span>
              <h2 className="font-headline-md text-lg sm:text-headline-md text-on-error-container uppercase font-bold">
                Zero-Knowledge Guarantee
              </h2>
            </div>
            <p className="font-body-md text-xs sm:text-sm md:text-base text-on-error-container mb-4 font-bold leading-relaxed">
              AES-256-GCM Military Encryption. Your files are encrypted locally before leaving your device. We cannot read your files or access your encryption keys.
            </p>
            <div className="flex gap-4 sm:gap-6 pt-3 border-t-2 border-on-error-container flex-wrap text-xs sm:text-sm">
              <Link
                to="/terms"
                className="font-label-caps text-on-error-container uppercase underline hover:no-underline font-bold"
              >
                Terms of Service →
              </Link>
              <Link
                to="/privacy"
                className="font-label-caps text-on-error-container uppercase underline hover:no-underline font-bold"
              >
                Privacy Policy →
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="bg-surface-container-highest text-on-surface font-label-caps text-xs uppercase w-full border-t-4 border-on-background mt-12 sm:mt-20 flex flex-col md:flex-row justify-between items-center px-4 sm:px-6 md:px-12 py-6 sm:py-8 gap-4 sm:gap-6 text-center">
        <div className="font-headline-md text-lg font-black">CHUCHUDU</div>
        <div className="text-on-surface-variant text-[11px] sm:text-xs">© 2026 CHUCHUDU. ALL RIGHTS RESERVED.</div>
        <nav className="flex gap-4 sm:gap-6 flex-wrap justify-center text-[11px] sm:text-xs">
          <Link to="/terms" className="text-on-secondary-fixed-variant hover:text-primary underline">
            Terms
          </Link>
          <Link to="/privacy" className="text-on-secondary-fixed-variant hover:text-primary underline">
            Privacy
          </Link>
          <a href="mailto:legal@chuchudu.in" className="text-on-secondary-fixed-variant hover:text-primary underline">
            Contact
          </a>
        </nav>
      </footer>

    </div>
  );
};

export default Landing;

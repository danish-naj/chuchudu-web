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
    <div className="bg-background text-on-background font-body-md antialiased overflow-x-hidden selection:bg-primary-container selection:text-on-primary-container">

      {/* ── Top Navigation ── */}
      <header className="bg-surface text-primary font-headline-md w-full border-b-4 border-on-background shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] sticky top-0 z-50">
        <div className="flex justify-between items-center px-margin-mobile md:px-margin-desktop py-4 max-w-container-max mx-auto">
          {/* Logo */}
          <Link to="/" className="font-headline-lg text-headline-lg tracking-tighter uppercase text-on-surface -rotate-3 origin-center inline-block transform hover:rotate-0 transition-transform">
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
          <div className="flex items-center gap-4">
            <Link
              to="/login"
              className="hidden md:inline-block font-button-text text-button-text text-on-surface px-6 py-3 brutal-border bg-surface brutal-shadow brutal-hover transition-all"
            >
              Log In
            </Link>
            <Link
              to="/signup"
              className="font-button-text text-button-text text-on-primary px-6 py-3 brutal-border bg-primary brutal-shadow brutal-hover transition-all uppercase"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* ── Hero Section ── */}
        <section className="relative pt-20 pb-32 px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto flex flex-col items-center text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 brutal-border bg-primary-container text-on-primary-container font-label-caps text-label-caps uppercase rounded-full mb-8 brutal-shadow">
            <span className="w-2 h-2 rounded-full bg-on-primary-container animate-pulse" />
            YOUR PC IS THE VAULT • ZERO CLOUD STORAGE • E2E ENCRYPTED
          </div>

          {/* Headline */}
          <h1 className="font-display-lg text-display-lg md:text-[96px] leading-tight md:leading-[100px] max-w-5xl mb-8 uppercase">
            Your Laptop Is{' '}
            <br className="hidden md:block" />
            <span className="bg-primary text-on-primary px-4 brutal-border inline-block -rotate-2 transform">
              Your Storage.
            </span>
            <br />
            Upload From Any Device.
          </h1>

          {/* Sub-heading */}
          <p className="font-body-lg text-body-lg md:text-[24px] md:leading-[32px] max-w-3xl text-on-surface-variant mb-12">
            Upload photos, videos, and files directly from your phone browser. Files are AES-256
            encrypted and sent straight to your laptop hard drive. Cloud buffers auto-delete as soon
            as your desktop app syncs.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-6">
            <a
              href="#downloads"
              className="font-button-text text-button-text px-8 py-4 bg-primary text-on-primary brutal-border brutal-shadow-lg brutal-hover-lg transition-all flex items-center justify-center gap-2 uppercase"
            >
              <span className="material-symbols-outlined">desktop_windows</span>
              Get Desktop App &amp; APK
            </a>
            <Link
              to="/signup"
              className="font-button-text text-button-text px-8 py-4 bg-surface text-on-surface brutal-border brutal-shadow-lg brutal-hover-lg transition-all flex items-center justify-center gap-2 uppercase"
            >
              <span className="material-symbols-outlined">language</span>
              Open Web Uploader
            </Link>
          </div>
        </section>

        {/* ── How It Works ── */}
        <section
          id="how-it-works"
          className="py-24 px-margin-mobile md:px-margin-desktop bg-surface-container-low border-y-4 border-on-background"
        >
          <div className="max-w-container-max mx-auto">
            <h2 className="font-headline-lg text-headline-lg md:text-[64px] leading-none mb-16 uppercase scroll-hidden">
              How It Works
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Step 1 */}
              <div className="bg-surface brutal-border p-8 brutal-shadow relative group scroll-hidden">
                <div className="absolute -top-6 -left-6 w-12 h-12 bg-primary brutal-border flex items-center justify-center font-headline-md text-on-primary group-hover:-translate-y-2 group-hover:-translate-x-2 transition-transform">
                  01
                </div>
                <span className="material-symbols-outlined text-[48px] text-primary mb-6 block">
                  hard_drive
                </span>
                <h3 className="font-headline-md text-headline-md mb-4">Run Desktop Vault</h3>
                <p className="font-body-md text-body-md text-on-surface-variant">
                  Set up a local folder on your PC. You get unlimited disk storage limited only by your
                  physical hard drive. No subscription caps.
                </p>
              </div>

              {/* Step 2 */}
              <div className="bg-primary-container brutal-border p-8 brutal-shadow relative group scroll-hidden">
                <div className="absolute -top-6 -left-6 w-12 h-12 bg-surface brutal-border flex items-center justify-center font-headline-md text-on-surface group-hover:-translate-y-2 group-hover:-translate-x-2 transition-transform">
                  02
                </div>
                <span className="material-symbols-outlined text-[48px] text-on-primary-container mb-6 block">
                  smartphone
                </span>
                <h3 className="font-headline-md text-headline-md text-on-primary-container mb-4">
                  Upload From Any Phone
                </h3>
                <p className="font-body-md text-body-md text-on-primary-container">
                  Open chuchudu.in on any mobile browser or use our Android APK. Sign in to your account
                  to pair instantly and start uploading.
                </p>
              </div>

              {/* Step 3 */}
              <div className="bg-surface brutal-border p-8 brutal-shadow relative group scroll-hidden">
                <div className="absolute -top-6 -left-6 w-12 h-12 bg-primary brutal-border flex items-center justify-center font-headline-md text-on-primary group-hover:-translate-y-2 group-hover:-translate-x-2 transition-transform">
                  03
                </div>
                <span className="material-symbols-outlined text-[48px] text-primary mb-6 block">
                  enhanced_encryption
                </span>
                <h3 className="font-headline-md text-headline-md mb-4">E2EE &amp; Auto-Clean</h3>
                <p className="font-body-md text-body-md text-on-surface-variant">
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
          className="py-24 px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto"
        >
          <h2 className="font-headline-lg text-headline-lg md:text-[64px] leading-none mb-16 uppercase bg-primary text-on-primary inline-block px-4 brutal-border -rotate-1 transform scroll-hidden">
            Downloads
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Windows */}
            <div className="bg-surface brutal-border p-8 flex flex-col brutal-shadow-lg brutal-hover-lg transition-all scroll-hidden">
              <div className="flex-grow">
                <span className="material-symbols-outlined text-[64px] text-on-surface mb-6 block">
                  window
                </span>
                <h3 className="font-headline-md text-headline-md mb-2">Windows Agent</h3>
                <p className="font-label-caps text-label-caps text-on-surface-variant mb-4 uppercase">
                  .exe / .msi installer
                </p>
                <ul className="font-body-md text-body-md text-on-surface-variant text-sm space-y-1 mb-6">
                  <li>• System tray runner & autostart</li>
                  <li>• Local vault folder manager</li>
                  <li>• Background cloud sync ingestion</li>
                  <li>• Windows 10 / 11 (64-bit)</li>
                </ul>
              </div>
              <a
                href="/downloads/Chuchudu-Agent-Setup.exe"
                download
                className="font-button-text text-button-text w-full py-4 bg-on-surface text-surface brutal-border brutal-shadow brutal-hover transition-all uppercase text-center"
              >
                Download .exe
              </a>
            </div>

            {/* Android */}
            <div className="bg-primary brutal-border p-8 flex flex-col brutal-shadow-lg brutal-hover-lg transition-all scroll-hidden">
              <div className="flex-grow">
                <span className="material-symbols-outlined text-[64px] text-on-primary mb-6 block">
                  android
                </span>
                <h3 className="font-headline-md text-headline-md text-on-primary mb-2">Android APK</h3>
                <p className="font-label-caps text-label-caps text-on-primary mb-4 uppercase opacity-80">
                  Direct Download — Sideloadable
                </p>
                <ul className="font-body-md text-body-md text-on-primary text-sm space-y-1 mb-6 opacity-90">
                  <li>• Upload photos, videos, files</li>
                  <li>• Real-time delivery status</li>
                  <li>• Zero background battery drain</li>
                  <li>• Android 8.0+</li>
                </ul>
              </div>
              <a
                href="/downloads/chuchudu-mobile.apk"
                download
                className="font-button-text text-button-text w-full py-4 bg-surface text-on-surface brutal-border brutal-shadow brutal-hover transition-all uppercase text-center"
              >
                Download APK
              </a>
            </div>

            {/* Web Portal */}
            <div className="bg-surface brutal-border p-8 flex flex-col brutal-shadow-lg brutal-hover-lg transition-all scroll-hidden">
              <div className="flex-grow">
                <span className="material-symbols-outlined text-[64px] text-on-surface mb-6 block">
                  public
                </span>
                <h3 className="font-headline-md text-headline-md mb-2">Web Portal</h3>
                <p className="font-label-caps text-label-caps text-on-surface-variant mb-4 uppercase">
                  Safari / Chrome / Edge
                </p>
                <ul className="font-body-md text-body-md text-on-surface-variant text-sm space-y-1 mb-6">
                  <li>• Works on iOS & Android</li>
                  <li>• No installation needed</li>
                  <li>• Drag-and-drop uploader</li>
                  <li>• Progressive Web App (PWA)</li>
                </ul>
              </div>
              <Link
                to="/signup"
                className="font-button-text text-button-text w-full py-4 bg-on-surface text-surface brutal-border brutal-shadow brutal-hover transition-all uppercase text-center"
              >
                Open Portal
              </Link>
            </div>
          </div>
        </section>

        {/* ── Security / Legal Disclaimer ── */}
        <section
          id="security"
          className="py-24 px-margin-mobile md:px-margin-desktop"
        >
          <div className="max-w-4xl mx-auto bg-error-container brutal-border p-8 md:p-12 brutal-shadow-lg transform rotate-1 scroll-hidden">
            <div className="flex items-center gap-4 mb-6">
              <span className="material-symbols-outlined text-[40px] text-on-error-container">
                warning
              </span>
              <h2 className="font-headline-md text-headline-md text-on-error-container uppercase">
                Zero-Knowledge Guarantee
              </h2>
            </div>
            <p className="font-body-md text-body-md text-on-error-container mb-6 font-bold">
              AES-256-GCM Encryption standard. We cannot see your files. We cannot recover your keys.
            </p>
            <p className="font-label-caps text-label-caps text-on-error-container uppercase border-t-2 border-on-error-container pt-4 mb-4">
              Legal Notice: Users retain 100% ownership and liability for all stored data. Chuchudu
              acts solely as an encrypted transit tunnel. Do not lose your master recovery key.
            </p>
            <div className="flex gap-6 mt-2">
              <Link
                to="/terms"
                className="font-label-caps text-label-caps text-on-error-container uppercase underline hover:no-underline"
              >
                Terms of Service →
              </Link>
              <Link
                to="/privacy"
                className="font-label-caps text-label-caps text-on-error-container uppercase underline hover:no-underline"
              >
                Privacy Policy →
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="bg-surface-container-highest text-on-surface font-label-caps text-label-caps uppercase w-full border-t-4 border-on-background mt-20 flex flex-col md:flex-row justify-between items-center px-margin-mobile md:px-margin-desktop py-8 gap-gutter">
        <div className="font-headline-md text-headline-md font-black">CHUCHUDU</div>

        <div className="text-on-surface-variant">© 2026 CHUCHUDU. ALL RIGHTS RESERVED.</div>

        <nav className="flex gap-6 flex-wrap justify-center">
          <Link
            to="/terms"
            className="text-on-secondary-fixed-variant hover:text-primary underline transition-colors duration-200"
          >
            Terms of Service
          </Link>
          <Link
            to="/privacy"
            className="text-on-secondary-fixed-variant hover:text-primary underline transition-colors duration-200"
          >
            Privacy Policy
          </Link>
          <a
            href="mailto:legal@chuchudu.in"
            className="text-on-secondary-fixed-variant hover:text-primary underline transition-colors duration-200"
          >
            Contact
          </a>
        </nav>
      </footer>

    </div>
  );
};

export default Landing;

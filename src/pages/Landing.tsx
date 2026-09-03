import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

const Landing: React.FC = () => {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const [activeStep, setActiveStep] = useState(0);

  // Auto-cycle through sync visualizer steps
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % 3);
    }, 3200);
    return () => clearInterval(timer);
  }, []);

  // Scroll reveal observer
  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-in');
          }
        });
      },
      { threshold: 0.15 }
    );

    document.querySelectorAll('.scroll-hidden, .scroll-hidden-left, .scroll-hidden-right').forEach((el) => {
      observerRef.current?.observe(el);
    });

    return () => observerRef.current?.disconnect();
  }, []);

  const marqueeItems = [
    '🔒 ZERO CLOUD STORAGE FEES',
    '🛡️ MILITARY-GRADE AES-256-GCM',
    '💻 DIRECT LAPTOP VAULT',
    '⚡ 0MB RESIDUAL DATA',
    '🚀 UNLIMITED HARDWARE CAPACITY',
    '📱 SYNC FROM ANY PHONE',
    '👁️ ZERO KNOWLEDGE PRIVACY',
    '📁 REAL WINDOWS EXPLORER FILES',
  ];

  return (
    <div className="bg-background text-on-background font-body-md antialiased w-full overflow-x-hidden selection:bg-primary-container selection:text-on-primary-container">

      {/* ── Top Navigation Bar ── */}
      <header className="bg-surface text-on-background w-full border-b-4 border-on-background shadow-[0_4px_0_0_rgba(26,28,28,1)] sticky top-0 z-50">
        <div className="flex justify-between items-center px-4 sm:px-6 md:px-12 py-3.5 max-w-container-max mx-auto">
          
          {/* Top-Left: Real Logo Image + Stylized Font */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="relative">
              <img
                src="/chuchudu_logo.jpg"
                alt="Chuchudu Official Logo"
                className="w-9 h-9 sm:w-11 sm:h-11 rounded-lg border-2 border-on-background brutal-shadow object-cover group-hover:scale-105 transition-transform"
              />
            </div>
            <div className="flex flex-col">
              <span className="font-brand font-black text-xl sm:text-2xl md:text-[28px] uppercase tracking-tighter text-on-background leading-none group-hover:text-primary transition-colors">
                CHUCHUDU
              </span>
              <span className="font-label-caps text-[9px] sm:text-[10px] tracking-widest text-on-surface-variant uppercase font-bold">
                ENCRYPTED VAULT
              </span>
            </div>
          </Link>

          {/* Center Navigation (Desktop) */}
          <nav className="hidden md:flex items-center gap-6">
            <a
              href="#how-it-works"
              className="font-brand text-xs uppercase font-bold text-on-surface-variant hover:text-on-background px-3 py-1.5 border-2 border-transparent hover:border-on-background hover:bg-surface-container-high transition-all"
            >
              How It Works
            </a>
            <a
              href="#comparison"
              className="font-brand text-xs uppercase font-bold text-on-surface-variant hover:text-on-background px-3 py-1.5 border-2 border-transparent hover:border-on-background hover:bg-surface-container-high transition-all"
            >
              Why Chuchudu
            </a>
            <a
              href="#downloads"
              className="font-brand text-xs uppercase font-bold text-on-surface-variant hover:text-on-background px-3 py-1.5 border-2 border-transparent hover:border-on-background hover:bg-surface-container-high transition-all"
            >
              Apps
            </a>
            <a
              href="#security"
              className="font-brand text-xs uppercase font-bold px-3 py-1.5 bg-primary-container text-on-primary-container border-2 border-on-background brutal-shadow brutal-hover"
            >
              Security
            </a>
          </nav>

          {/* CTA Actions */}
          <div className="flex items-center gap-2.5 sm:gap-4">
            <Link
              to="/login"
              className="hidden sm:inline-block font-button-text text-xs sm:text-sm text-on-surface px-4 sm:px-6 py-2 sm:py-2.5 brutal-border-2 bg-surface brutal-shadow brutal-hover transition-all font-bold uppercase"
            >
              Log In
            </Link>
            <Link
              to="/signup"
              className="font-button-text text-xs sm:text-sm text-on-primary px-4 sm:px-6 py-2 sm:py-2.5 brutal-border-2 bg-primary brutal-shadow brutal-hover transition-all uppercase font-bold flex items-center gap-1.5"
            >
              <span>Get Started</span>
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </Link>
          </div>
        </div>
      </header>

      {/* ── Main Content Canvas ── */}
      <main className="w-full">

        {/* ── Hero Section ── */}
        <section className="relative pt-12 sm:pt-20 pb-16 sm:pb-24 px-4 sm:px-6 md:px-12 max-w-container-max mx-auto flex flex-col items-center text-center">
          
          {/* Floating Pill Badge */}
          <div className="inline-flex flex-wrap items-center justify-center gap-2 px-4 py-2 brutal-border bg-primary-container text-on-primary-container font-label-caps text-[10px] sm:text-xs uppercase rounded-full mb-6 sm:mb-8 brutal-shadow animate-float">
            <span className="w-2.5 h-2.5 rounded-full bg-on-primary-container animate-pulse flex-shrink-0" />
            <span className="font-bold">YOUR LAPTOP IS THE CLOUD • 0$ MONTHLY BILLS • AES-256-GCM</span>
          </div>

          {/* Main Headline */}
          <h1 className="font-brand font-black text-3xl sm:text-5xl md:text-7xl lg:text-[84px] leading-[1.12] max-w-5xl mb-6 uppercase tracking-tight break-words">
            STOP PAYING FOR CLOUD STORAGE.{' '}
            <br className="hidden sm:block" />
            <span className="bg-primary text-on-primary px-3 sm:px-5 py-1 brutal-border inline-block -rotate-1 transform my-1 sm:my-2 brutal-shadow">
              USE YOUR OWN PC.
            </span>
          </h1>

          {/* Sub-heading */}
          <p className="font-body-md text-sm sm:text-lg md:text-2xl leading-relaxed max-w-3xl text-on-surface-variant mb-8 sm:mb-10 px-2 font-medium">
            Upload photos, 4K videos, and files directly from your phone browser. Files are sliced into encrypted chunks and written straight to your laptop hard drive. 
            <strong className="text-on-background"> Zero cloud data retention.</strong>
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto max-w-xs sm:max-w-none mb-16">
            <Link
              to="/signup"
              className="font-brand text-xs sm:text-sm px-6 sm:px-8 py-3.5 sm:py-4 bg-primary text-on-primary brutal-border brutal-shadow-lg brutal-hover-lg transition-all flex items-center justify-center gap-2 uppercase font-extrabold"
            >
              <span className="material-symbols-outlined text-xl">account_circle</span>
              Get Started &amp; Download App
            </Link>
            <Link
              to="/login"
              className="font-brand text-xs sm:text-sm px-6 sm:px-8 py-3.5 sm:py-4 bg-surface text-on-surface brutal-border brutal-shadow-lg brutal-hover-lg transition-all flex items-center justify-center gap-2 uppercase font-extrabold"
            >
              <span className="material-symbols-outlined text-xl">lock_open</span>
              Sign In to Your Vault
            </Link>
          </div>

          {/* ── Interactive Live Sync Visualizer Simulation ── */}
          <div className="w-full max-w-4xl bg-surface-container-lowest brutal-border p-6 sm:p-8 brutal-shadow-lg text-left relative overflow-hidden scroll-hidden">
            
            {/* Header bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-on-background pb-4 mb-6">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-error border border-on-background" />
                <span className="w-3 h-3 rounded-full bg-[#FFB300] border border-on-background" />
                <span className="w-3 h-3 rounded-full bg-primary border border-on-background" />
                <span className="font-label-caps text-xs uppercase font-bold ml-2">CHUCHUDU ENCRYPTED TRANSIT PIPELINE</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-primary animate-ping" />
                <span className="font-label-caps text-xs text-primary font-bold">PIPELINE ACTIVE</span>
              </div>
            </div>

            {/* 3-Step Interactive Animation Diagram */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
              
              {/* Node 1: Mobile Phone */}
              <div className={`p-4 border-2 border-on-background transition-all duration-300 ${activeStep === 0 ? 'bg-primary-container brutal-shadow scale-102 font-bold' : 'bg-surface-container-low opacity-80'}`}>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-label-caps text-xs uppercase bg-on-background text-background px-2 py-0.5 font-bold">
                    01 • SENDER
                  </span>
                  <span className="material-symbols-outlined text-2xl">smartphone</span>
                </div>
                <h3 className="font-headline-md text-base uppercase mb-1">Mobile Browser</h3>
                <p className="font-body-md text-xs text-on-surface-variant leading-tight">
                  Photo sliced into 512KB chunks &amp; encrypted with AES-256-GCM.
                </p>
              </div>

              {/* Node 2: Transient Buffer */}
              <div className={`p-4 border-2 border-on-background transition-all duration-300 ${activeStep === 1 ? 'bg-primary-fixed brutal-shadow scale-102 font-bold' : 'bg-surface-container-low opacity-80'}`}>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-label-caps text-xs uppercase bg-on-background text-background px-2 py-0.5 font-bold">
                    02 • TRANSIT
                  </span>
                  <span className="material-symbols-outlined text-2xl">cloud_sync</span>
                </div>
                <h3 className="font-headline-md text-base uppercase mb-1">Zero-Retention Buffer</h3>
                <p className="font-body-md text-xs text-on-surface-variant leading-tight">
                  Transient encrypted payload. Automatically purged upon receipt.
                </p>
              </div>

              {/* Node 3: Laptop Vault */}
              <div className={`p-4 border-2 border-on-background transition-all duration-300 ${activeStep === 2 ? 'bg-primary-container brutal-shadow scale-102 font-bold' : 'bg-surface-container-low opacity-80'}`}>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-label-caps text-xs uppercase bg-on-background text-background px-2 py-0.5 font-bold">
                    03 • VAULT
                  </span>
                  <span className="material-symbols-outlined text-2xl">hard_drive</span>
                </div>
                <h3 className="font-headline-md text-base uppercase mb-1">Your Laptop Hard Drive</h3>
                <p className="font-body-md text-xs text-on-surface-variant leading-tight">
                  Decrypted locally &amp; stored with real name in <code className="font-bold">~/Chuchudu_Vault</code>.
                </p>
              </div>
            </div>

            {/* Live Status Stream Footer */}
            <div className="mt-6 pt-4 border-t-2 border-on-background flex flex-wrap items-center justify-between gap-4 font-label-caps text-xs text-on-surface-variant">
              <div>
                <span className="text-on-background font-bold">Master Key:</span> PBKDF2-SHA256 (600,000 rounds)
              </div>
              <div>
                <span className="text-on-background font-bold">Cloud Cost:</span> $0.00 / month
              </div>
              <div>
                <span className="text-on-background font-bold">Retention:</span> 0 Seconds
              </div>
            </div>
          </div>

        </section>

        {/* ── Marquee Ticker ── */}
        <div className="w-full bg-on-background text-background border-y-4 border-on-background py-3 overflow-hidden select-none">
          <div className="animate-marquee font-brand text-xs sm:text-sm uppercase font-black tracking-wider flex items-center gap-8">
            {marqueeItems.concat(marqueeItems).map((item, idx) => (
              <span key={idx} className="inline-flex items-center gap-8">
                <span>{item}</span>
                <span className="text-primary-container text-lg">•</span>
              </span>
            ))}
          </div>
        </div>

        {/* ── How It Works Deep-Dive ── */}
        <section id="how-it-works" className="py-20 sm:py-28 px-4 sm:px-6 md:px-12 bg-surface-container-low border-b-4 border-on-background">
          <div className="max-w-container-max mx-auto">
            
            <div className="mb-16 text-center md:text-left">
              <span className="font-label-caps text-xs text-primary font-bold uppercase tracking-widest block mb-2">
                SIMPLE THREE-STEP ARCHITECTURE
              </span>
              <h2 className="font-brand font-black text-3xl sm:text-5xl md:text-[56px] leading-tight uppercase scroll-hidden">
                HOW CHUCHUDU WORKS
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              
              {/* Step Card 01 */}
              <div className="bg-surface brutal-border p-6 sm:p-8 brutal-shadow relative group scroll-hidden hover:-translate-y-1 transition-transform">
                <div className="w-12 h-12 bg-primary brutal-border flex items-center justify-center font-brand font-black text-on-primary mb-6 brutal-shadow text-lg">
                  01
                </div>
                <span className="material-symbols-outlined text-4xl text-primary mb-4 block">
                  desktop_windows
                </span>
                <h3 className="font-brand font-black text-xl mb-3 uppercase">Install Desktop Agent</h3>
                <p className="font-body-md text-sm sm:text-base text-on-surface-variant leading-relaxed mb-4">
                  Run the lightweight Chuchudu Desktop Agent on your Windows PC. It runs silently in your system tray and creates your private vault folder.
                </p>
                <div className="bg-surface-container p-3 border-2 border-on-background font-label-caps text-xs">
                  ✓ Select any SSD, HDD, or external drive
                </div>
              </div>

              {/* Step Card 02 */}
              <div className="bg-primary-container brutal-border p-6 sm:p-8 brutal-shadow relative group scroll-hidden hover:-translate-y-1 transition-transform">
                <div className="w-12 h-12 bg-surface brutal-border flex items-center justify-center font-brand font-black text-on-surface mb-6 brutal-shadow text-lg">
                  02
                </div>
                <span className="material-symbols-outlined text-4xl text-on-primary-container mb-4 block">
                  add_photo_alternate
                </span>
                <h3 className="font-brand font-black text-xl text-on-primary-container mb-3 uppercase">Upload From Phone</h3>
                <p className="font-body-md text-sm sm:text-base text-on-primary-container leading-relaxed mb-4">
                  Open <code className="font-bold">chuchudu.in</code> on Safari, Chrome, or Android. Drag-and-drop or select photos from your camera roll.
                </p>
                <div className="bg-surface-container-lowest p-3 border-2 border-on-background font-label-caps text-xs text-on-background">
                  ✓ Encrypted locally before transmission
                </div>
              </div>

              {/* Step Card 03 */}
              <div className="bg-surface brutal-border p-6 sm:p-8 brutal-shadow relative group scroll-hidden hover:-translate-y-1 transition-transform">
                <div className="w-12 h-12 bg-primary brutal-border flex items-center justify-center font-brand font-black text-on-primary mb-6 brutal-shadow text-lg">
                  03
                </div>
                <span className="material-symbols-outlined text-4xl text-primary mb-4 block">
                  lock_open
                </span>
                <h3 className="font-brand font-black text-xl mb-3 uppercase">Instant Decrypt &amp; Save</h3>
                <p className="font-body-md text-sm sm:text-base text-on-surface-variant leading-relaxed mb-4">
                  Your desktop agent ingests the chunks, reconstructs the file, and purges the cloud buffer. Your files appear directly in Windows File Explorer!
                </p>
                <div className="bg-surface-container p-3 border-2 border-on-background font-label-caps text-xs">
                  ✓ Standard files ready for any desktop app
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ── Why Chuchudu: Comparison Matrix ── */}
        <section id="comparison" className="py-20 sm:py-28 px-4 sm:px-6 md:px-12 max-w-container-max mx-auto">
          
          <div className="text-center mb-16">
            <span className="font-label-caps text-xs text-primary font-bold uppercase tracking-widest block mb-2">
              WHY PAY FOR BIG TECH CLOUD?
            </span>
            <h2 className="font-brand font-black text-3xl sm:text-5xl md:text-[56px] leading-tight uppercase scroll-hidden">
              CHUCHUDU VS. TRADITIONAL CLOUD
            </h2>
          </div>

          <div className="w-full overflow-x-auto brutal-shadow-lg border-4 border-on-background bg-surface-container-lowest scroll-hidden">
            <table className="w-full text-left border-collapse font-body-md text-xs sm:text-sm">
              <thead>
                <tr className="bg-on-background text-background font-brand uppercase text-xs sm:text-sm">
                  <th className="p-4 sm:p-6 border-r-2 border-surface">Feature</th>
                  <th className="p-4 sm:p-6 bg-primary text-on-primary border-r-2 border-surface font-black">CHUCHUDU VAULT</th>
                  <th className="p-4 sm:p-6 border-r-2 border-surface opacity-80">Google One</th>
                  <th className="p-4 sm:p-6 opacity-80">iCloud / Dropbox</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-on-background">
                <tr className="hover:bg-surface-container-low transition-colors">
                  <td className="p-4 sm:p-6 font-bold">Monthly Subscription</td>
                  <td className="p-4 sm:p-6 bg-primary-container font-black text-on-primary-container">₹0 / $0 FOREVER</td>
                  <td className="p-4 sm:p-6 text-on-surface-variant">$2.99 – $9.99 / mo</td>
                  <td className="p-4 sm:p-6 text-on-surface-variant">$2.99 – $19.99 / mo</td>
                </tr>
                <tr className="hover:bg-surface-container-low transition-colors">
                  <td className="p-4 sm:p-6 font-bold">Storage Capacity</td>
                  <td className="p-4 sm:p-6 bg-primary-container font-black text-on-primary-container">Unlimited (Your SSD/HDD)</td>
                  <td className="p-4 sm:p-6 text-on-surface-variant">100 GB – 2 TB Cap</td>
                  <td className="p-4 sm:p-6 text-on-surface-variant">50 GB – 2 TB Cap</td>
                </tr>
                <tr className="hover:bg-surface-container-low transition-colors">
                  <td className="p-4 sm:p-6 font-bold">Zero-Knowledge Encryption</td>
                  <td className="p-4 sm:p-6 bg-primary-container font-black text-on-primary-container">✓ Client AES-256-GCM</td>
                  <td className="p-4 sm:p-6 text-on-surface-variant">❌ Server-Side Key Access</td>
                  <td className="p-4 sm:p-6 text-on-surface-variant">❌ Server-Side Key Access</td>
                </tr>
                <tr className="hover:bg-surface-container-low transition-colors">
                  <td className="p-4 sm:p-6 font-bold">Native File Explorer Access</td>
                  <td className="p-4 sm:p-6 bg-primary-container font-black text-on-primary-container">✓ Real Raw Files on Disk</td>
                  <td className="p-4 sm:p-6 text-on-surface-variant">Virtual Mounts / Sync Delays</td>
                  <td className="p-4 sm:p-6 text-on-surface-variant">Proprietary Virtual Drive</td>
                </tr>
                <tr className="hover:bg-surface-container-low transition-colors">
                  <td className="p-4 sm:p-6 font-bold">Cloud Data Retention</td>
                  <td className="p-4 sm:p-6 bg-primary-container font-black text-on-primary-container">0 Seconds (Auto-Purged)</td>
                  <td className="p-4 sm:p-6 text-on-surface-variant">Permanent Server Retention</td>
                  <td className="p-4 sm:p-6 text-on-surface-variant">Permanent Server Retention</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* ── Apps & Access Hub Section ── */}
        <section id="downloads" className="py-20 sm:py-28 px-4 sm:px-6 md:px-12 bg-surface-container-low border-y-4 border-on-background">
          <div className="max-w-container-max mx-auto">
            
            <div className="text-center md:text-left mb-16">
              <span className="font-label-caps text-xs text-primary font-bold uppercase tracking-widest block mb-2">
                GET CHUCHUDU ACROSS PLATFORMS
              </span>
              <h2 className="font-brand font-black text-3xl sm:text-5xl md:text-[56px] leading-tight uppercase scroll-hidden">
                CHUCHUDU APPS
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              
              {/* Windows Agent */}
              <div className="bg-surface brutal-border p-6 sm:p-8 flex flex-col brutal-shadow-lg hover:-translate-y-1 transition-all scroll-hidden">
                <div className="flex items-start justify-between mb-4">
                  <div className="bg-primary p-3 border-2 border-on-background brutal-shadow">
                    <span className="material-symbols-outlined text-4xl text-on-primary">
                      desktop_windows
                    </span>
                  </div>
                  <span className="font-label-caps text-xs bg-on-background text-background px-3 py-1 font-bold">
                    v1.0.0 STABLE
                  </span>
                </div>
                <h3 className="font-brand font-black text-xl sm:text-2xl uppercase mb-2">Windows PC</h3>
                <p className="font-body-md text-xs sm:text-sm text-on-surface-variant mb-6">
                  Requirement: Windows 10/11 (64-bit). Ingests encrypted chunks and stores files in your local vault.
                </p>
                <ul className="space-y-2 font-body-md text-xs sm:text-sm text-on-surface-variant mb-8 flex-1">
                  <li className="flex items-center gap-2">✓ Built on Rust &amp; Tauri v2</li>
                  <li className="flex items-center gap-2">✓ Multi-Vault USB &amp; External SSD support</li>
                  <li className="flex items-center gap-2">✓ 1-Click Encrypted Backup (.chuchudu)</li>
                  <li className="flex items-center gap-2">✓ Background system tray runner</li>
                </ul>
                <div className="flex flex-col gap-2">
                  <a
                    href="/downloads/Chuchudu-Setup.exe"
                    download="Chuchudu-Setup.exe"
                    className="w-full bg-primary text-on-primary border-2 border-on-background brutal-shadow py-3.5 sm:py-4 font-brand text-xs sm:text-sm uppercase text-center font-black brutal-hover block"
                  >
                    Download for Windows (.exe)
                  </a>
                  <p className="text-center font-label-caps text-[10px] text-on-surface-variant uppercase">
                    Setup &amp; Portable Available
                  </p>
                </div>
              </div>

              {/* macOS / MacBook Agent */}
              <div className="bg-surface brutal-border p-6 sm:p-8 flex flex-col brutal-shadow-lg hover:-translate-y-1 transition-all scroll-hidden">
                <div className="flex items-start justify-between mb-4">
                  <div className="bg-primary-container p-3 border-2 border-on-background brutal-shadow">
                    <span className="material-symbols-outlined text-4xl text-on-primary-container">
                      laptop_mac
                    </span>
                  </div>
                  <span className="font-label-caps text-xs bg-primary-container text-on-primary-container border-2 border-on-background px-3 py-1 font-bold">
                    UNIVERSAL DMG
                  </span>
                </div>
                <h3 className="font-brand font-black text-xl sm:text-2xl uppercase mb-2">macOS / MacBook</h3>
                <p className="font-body-md text-xs sm:text-sm text-on-surface-variant mb-6">
                  Requirement: macOS 10.15+ (Apple Silicon M1/M2/M3/M4 &amp; Intel Macs).
                </p>
                <ul className="space-y-2 font-body-md text-xs sm:text-sm text-on-surface-variant mb-8 flex-1">
                  <li className="flex items-center gap-2">✓ Apple Silicon M-series optimized</li>
                  <li className="flex items-center gap-2">✓ 1-Click drag-and-drop DMG installer</li>
                  <li className="flex items-center gap-2">✓ macOS Menu Bar runner &amp; Finder integration</li>
                  <li className="flex items-center gap-2">✓ Zero-knowledge local encryption</li>
                </ul>
                <div className="flex flex-col gap-2">
                  <a
                    href="/downloads/Chuchudu.pkg"
                    download="Chuchudu.pkg"
                    className="w-full bg-primary-fixed text-on-primary-fixed border-2 border-on-background brutal-shadow py-3.5 sm:py-4 font-brand text-xs sm:text-sm uppercase text-center font-black brutal-hover block"
                  >
                    Download for Mac (.pkg)
                  </a>
                  <div className="flex items-center justify-between px-1">
                    <a
                      href="/downloads/Chuchudu.dmg"
                      download="Chuchudu.dmg"
                      className="text-[11px] text-primary hover:underline font-bold uppercase"
                    >
                      Download .dmg →
                    </a>
                    <span className="font-label-caps text-[10px] text-on-surface-variant uppercase">
                      Universal PKG &amp; DMG
                    </span>
                  </div>
                </div>
              </div>

              {/* Mobile & Web Portal */}
              <div className="bg-surface brutal-border p-6 sm:p-8 flex flex-col brutal-shadow-lg hover:-translate-y-1 transition-all scroll-hidden">
                <div className="flex items-start justify-between mb-4">
                  <div className="bg-surface-container-high p-3 border-2 border-on-background brutal-shadow">
                    <span className="material-symbols-outlined text-4xl text-on-surface">
                      smartphone
                    </span>
                  </div>
                  <span className="font-label-caps text-xs bg-on-background text-background px-3 py-1 font-bold">
                    iOS &amp; ANDROID
                  </span>
                </div>
                <h3 className="font-brand font-black text-xl sm:text-2xl uppercase mb-2">Mobile &amp; Web</h3>
                <p className="font-body-md text-xs sm:text-sm text-on-surface-variant mb-6">
                  Works instantly on iPhone (Safari), Android (Chrome), or any tablet. Install as PWA or native app.
                </p>
                <ul className="space-y-2 font-body-md text-xs sm:text-sm text-on-surface-variant mb-8 flex-1">
                  <li className="flex items-center gap-2">✓ Mobile camera roll chunk upload</li>
                  <li className="flex items-center gap-2">✓ Face ID / Touch ID album unlock</li>
                  <li className="flex items-center gap-2">✓ Real-time QR code share link scan</li>
                  <li className="flex items-center gap-2">✓ Zero app store installation barrier</li>
                </ul>
                <div className="flex flex-col gap-2">
                  <Link
                    to="/signup"
                    className="w-full bg-surface text-on-surface border-2 border-on-background brutal-shadow py-3.5 sm:py-4 font-brand text-xs sm:text-sm uppercase text-center font-black brutal-hover block"
                  >
                    Open Web Portal
                  </Link>
                  <p className="text-center font-label-caps text-[10px] text-on-surface-variant uppercase">
                    Free Instant Access
                  </p>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ── Security & Cryptographic Guarantee ── */}
        <section id="security" className="py-20 sm:py-28 px-4 sm:px-6 md:px-12 max-w-container-max mx-auto">
          <div className="max-w-4xl mx-auto bg-error-container brutal-border p-6 sm:p-10 md:p-12 brutal-shadow-lg scroll-hidden">
            <div className="flex items-center gap-3 sm:gap-4 mb-4">
              <span className="material-symbols-outlined text-4xl text-on-error-container">
                verified_user
              </span>
              <h2 className="font-brand font-black text-xl sm:text-2xl md:text-3xl text-on-error-container uppercase">
                Zero-Knowledge Cryptographic Guarantee
              </h2>
            </div>
            <p className="font-body-md text-xs sm:text-sm md:text-base text-on-error-container mb-6 font-bold leading-relaxed">
              Every file is encrypted on your client hardware using AES-256-GCM with unique 96-bit IVs and sequence-bound authentication tags. We cannot read your files, inspect your photos, or recover lost passphrases.
            </p>
            <div className="flex gap-4 sm:gap-6 pt-4 border-t-2 border-on-error-container flex-wrap text-xs sm:text-sm">
              <Link to="/terms" className="font-brand text-on-error-container uppercase underline hover:no-underline font-black">
                Terms of Service →
              </Link>
              <Link to="/privacy" className="font-brand text-on-error-container uppercase underline hover:no-underline font-black">
                Privacy Policy →
              </Link>
              <a href="mailto:security@chuchudu.in" className="font-brand text-on-error-container uppercase underline hover:no-underline font-black">
                Security Disclosures →
              </a>
            </div>
          </div>
        </section>

      </main>

      {/* ── Footer ── */}
      <footer className="bg-surface-container-highest text-on-surface font-label-caps text-xs uppercase w-full border-t-4 border-on-background mt-12 py-8 px-4 sm:px-6 md:px-12">
        <div className="max-w-container-max mx-auto flex flex-col md:flex-row justify-between items-center gap-6 text-center md:text-left">
          
          <div className="flex items-center gap-3">
            <img
              src="/chuchudu_logo.jpg"
              alt="Chuchudu"
              className="w-8 h-8 rounded border border-on-background object-cover"
            />
            <span className="font-brand font-black text-lg text-on-background">CHUCHUDU</span>
          </div>

          <div className="text-on-surface-variant text-[11px] sm:text-xs">
            © 2026 CHUCHUDU. ALL RIGHTS RESERVED. ZERO CLOUD FEES.
          </div>

          <nav className="flex gap-4 sm:gap-6 flex-wrap justify-center text-[11px] sm:text-xs font-bold">
            <Link to="/terms" className="hover:text-primary underline">Terms</Link>
            <Link to="/privacy" className="hover:text-primary underline">Privacy</Link>
            <Link to="/apps" className="hover:text-primary underline">Downloads</Link>
            <a href="https://github.com/danish-naj/chuchudu-web" target="_blank" rel="noreferrer" className="hover:text-primary underline">GitHub</a>
          </nav>
        </div>
      </footer>

    </div>
  );
};

export default Landing;

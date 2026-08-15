import React from 'react';
import { Link } from 'react-router-dom';

export default function Privacy() {
  return (
    <div className="bg-background text-on-background font-body-md min-h-screen flex flex-col antialiased selection:bg-primary-container selection:text-on-primary-container">
      {/* Top Navigation Bar */}
      <header className="bg-background border-b-4 border-on-background shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] sticky top-0 z-50 w-full">
        <div className="flex justify-between items-center w-full px-margin-mobile md:px-margin-desktop h-20 max-w-container-max mx-auto">
          <Link
            to="/"
            className="text-headline-md font-headline-md font-black text-on-background uppercase tracking-tighter hover:text-primary transition-colors flex items-center gap-2"
          >
            <span className="bg-primary-container px-3 py-1 border-2 border-on-background brutal-shadow transform -rotate-2">
              CHUCHUDU
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            <Link
              to="/dashboard"
              className="text-on-surface font-label-caps text-label-caps font-bold uppercase hover:bg-primary-container hover:text-on-primary-container transition-all px-3 py-2 border-2 border-transparent hover:border-on-background hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
            >
              Upload Portal
            </Link>
            <Link
              to="/status"
              className="text-on-surface font-label-caps text-label-caps font-bold uppercase hover:bg-primary-container hover:text-on-primary-container transition-all px-3 py-2 border-2 border-transparent hover:border-on-background hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
            >
              Status
            </Link>
            <Link
              to="/apps"
              className="text-on-surface font-label-caps text-label-caps font-bold uppercase hover:bg-primary-container hover:text-on-primary-container transition-all px-3 py-2 border-2 border-transparent hover:border-on-background hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
            >
              Get Apps
            </Link>
            <Link
              to="/terms"
              className="text-on-surface font-label-caps text-label-caps font-bold uppercase hover:bg-primary-container hover:text-on-primary-container transition-all px-3 py-2 border-2 border-transparent hover:border-on-background hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
            >
              Terms of Service
            </Link>
          </nav>

          <div className="flex items-center gap-4">
            <Link
              to="/dashboard"
              className="hidden md:flex items-center justify-center gap-2 bg-primary-container text-on-primary-container font-button-text text-button-text uppercase px-6 py-3 border-2 border-on-background brutal-shadow brutal-hover font-bold"
            >
              OPEN PORTAL
            </Link>
            <Link
              to="/login"
              className="w-12 h-12 flex items-center justify-center border-2 border-on-background bg-surface-container-lowest hover:bg-primary-container transition-colors brutal-shadow brutal-hover rounded-none"
              aria-label="User Account"
            >
              <span className="material-symbols-outlined text-2xl">account_circle</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow w-full max-w-[900px] mx-auto px-margin-mobile md:px-margin-desktop py-12 md:py-16">
        <header className="mb-12">
          <h1 className="font-display-lg text-[36px] md:text-display-lg text-on-surface mb-4 uppercase border-b-4 border-on-surface pb-4 inline-block tracking-tighter">
            Privacy Policy
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl">
            Effective Date: August 15, 2026
          </p>
        </header>

        {/* Highlight Banner */}
        <div className="bg-primary-container text-on-primary-container border-4 border-on-surface brutal-shadow-lg p-6 md:p-8 mb-12 hover:-translate-y-1 hover:-translate-x-1 transition-all duration-200">
          <p className="font-headline-lg text-[24px] md:text-headline-lg leading-tight font-black uppercase">
            Your privacy is our core design principle, not an afterthought.
          </p>
        </div>

        <div className="space-y-10">
          {/* Section 1 */}
          <section className="bg-surface-container-lowest border-2 border-on-surface brutal-shadow p-6 md:p-8 hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all duration-200">
            <h2 className="font-headline-md text-headline-md text-on-surface mb-4 flex items-center gap-3">
              <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
                visibility_off
              </span>
              1. Our Privacy Philosophy
            </h2>
            <div className="space-y-4 font-body-md text-body-md text-on-surface-variant leading-relaxed">
              <p>
                At Chuchudu, we operate on a <strong>zero-knowledge architecture</strong>. This means
                we fundamentally cannot access, read, inspect, or decrypt the contents of your files.
              </p>
              <p>
                Your data is encrypted locally on your device with military-grade AES-256-GCM encryption
                before it ever touches our servers. The encryption keys remain solely in your possession.
                We only store the encrypted chunks necessary to facilitate transfer, and even then, only
                temporarily until downloaded by your desktop agent.
              </p>
            </div>
          </section>

          {/* Section 2 */}
          <section className="bg-surface-container-lowest border-2 border-on-surface brutal-shadow p-6 md:p-8 hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all duration-200">
            <h2 className="font-headline-md text-headline-md text-on-surface mb-6 flex items-center gap-3">
              <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
                database
              </span>
              2. Information We Collect
            </h2>
            <ul className="space-y-4 font-body-md text-body-md text-on-surface-variant">
              <li className="flex items-start gap-3">
                <span className="material-symbols-outlined text-primary mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>
                  check_box
                </span>
                <div>
                  <strong className="text-on-surface">Account Information:</strong> Email address (for authentication via Firebase Auth).
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="material-symbols-outlined text-primary mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>
                  check_box
                </span>
                <div>
                  <strong className="text-on-surface">Encrypted Metadata:</strong> File names and sizes (fully encrypted, unreadable to us).
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="material-symbols-outlined text-primary mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>
                  check_box
                </span>
                <div>
                  <strong className="text-on-surface">Encrypted File Chunks:</strong> Temporary buffer of raw, encrypted data fragments. Automatically deleted once synced.
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="material-symbols-outlined text-primary mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>
                  check_box
                </span>
                <div>
                  <strong className="text-on-surface">Usage Logs:</strong> Minimal server logs (connection status, transfer health) retained for security diagnostics only.
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="material-symbols-outlined text-primary mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>
                  check_box
                </span>
                <div>
                  <strong className="text-on-surface">Device Information:</strong> Basic OS and app version for compatibility checks.
                </div>
              </li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="bg-error-container text-on-error-container border-2 border-on-surface brutal-shadow p-6 md:p-8 hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all duration-200">
            <h2 className="font-headline-md text-headline-md mb-6 flex items-center gap-3">
              <span className="material-symbols-outlined text-error" style={{ fontVariationSettings: "'FILL' 1" }}>
                block
              </span>
              3. Information We Do NOT Collect
            </h2>
            <ul className="space-y-3 font-body-md text-body-md font-bold">
              <li className="flex items-center gap-3">
                <span className="material-symbols-outlined text-error" style={{ fontVariationSettings: "'FILL' 1" }}>
                  close
                </span>
                <span>Your actual file contents</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="material-symbols-outlined text-error" style={{ fontVariationSettings: "'FILL' 1" }}>
                  close
                </span>
                <span>Your encryption keys or master passphrases</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="material-symbols-outlined text-error" style={{ fontVariationSettings: "'FILL' 1" }}>
                  close
                </span>
                <span>Precise location data or GPS coordinates</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="material-symbols-outlined text-error" style={{ fontVariationSettings: "'FILL' 1" }}>
                  close
                </span>
                <span>Biometric data or personal identity documents</span>
              </li>
            </ul>
          </section>

          {/* Section 4: Data Retention */}
          <section className="bg-surface-container-lowest border-2 border-on-surface brutal-shadow p-6 md:p-8 hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all duration-200">
            <h2 className="font-headline-md text-headline-md text-on-surface mb-4 flex items-center gap-3">
              <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
                delete_sweep
              </span>
              4. Data Retention &amp; Automatic Purge
            </h2>
            <div className="space-y-4 font-body-md text-body-md text-on-surface-variant leading-relaxed">
              <p>
                Encrypted file chunks stored in cloud transit buffers are <strong>purged immediately and permanently</strong> upon
                successful receipt by your Desktop Agent vault.
              </p>
              <p>
                Account profiles are retained until you delete your account. You can request deletion of
                all account records at any time.
              </p>
            </div>
          </section>

          {/* Section 5: Security */}
          <section className="bg-surface-container-lowest border-2 border-on-surface brutal-shadow p-6 md:p-8 hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all duration-200">
            <h2 className="font-headline-md text-headline-md text-on-surface mb-4 flex items-center gap-3">
              <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
                lock
              </span>
              5. Security Standards
            </h2>
            <div className="space-y-4 font-body-md text-body-md text-on-surface-variant leading-relaxed">
              <p>
                We use industry-standard AES-256-GCM encryption with PBKDF2 key derivation (100,000 iterations),
                TLS in transit, and granular database security rules restricting data access strictly to authenticated account owners.
              </p>
            </div>
          </section>

          {/* Section 6: Contact */}
          <section className="bg-surface-container-lowest border-2 border-on-surface brutal-shadow p-6 md:p-8 hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all duration-200">
            <h2 className="font-headline-md text-headline-md text-on-surface mb-4 flex items-center gap-3">
              <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
                mail
              </span>
              6. Contact Us
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant mb-6">
              If you have any questions or data requests regarding this Privacy Policy, please contact our legal and privacy team.
            </p>
            <a
              className="inline-flex items-center gap-2 bg-primary-container text-on-primary-container font-button-text text-button-text uppercase px-6 py-3 border-2 border-on-surface brutal-shadow brutal-hover transition-all font-bold"
              href="mailto:legal@chuchudu.in"
            >
              <span className="material-symbols-outlined">mail</span>
              legal@chuchudu.in
            </a>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t-4 border-on-surface bg-surface-dim pt-12 pb-8 px-margin-mobile md:px-margin-desktop">
        <div className="max-w-[900px] mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="font-headline-md text-headline-md uppercase text-on-surface rotate-[-2deg] font-black">
            CHUCHUDU
          </div>
          <nav className="flex flex-wrap justify-center gap-6">
            <Link
              to="/"
              className="font-label-caps text-label-caps text-on-tertiary-container hover:text-primary hover:underline decoration-2 underline-offset-4 transition-all uppercase tracking-widest"
            >
              Home
            </Link>
            <Link
              to="/privacy"
              className="font-label-caps text-label-caps text-primary font-bold underline decoration-2 underline-offset-4 uppercase tracking-widest"
            >
              Privacy Policy
            </Link>
            <Link
              to="/terms"
              className="font-label-caps text-label-caps text-on-tertiary-container hover:text-primary hover:underline decoration-2 underline-offset-4 transition-all uppercase tracking-widest"
            >
              Terms of Service
            </Link>
          </nav>
          <div className="font-label-caps text-label-caps text-on-tertiary-container">
            © 2026 CHUCHUDU ENCRYPTED SYSTEMS
          </div>
        </div>
      </footer>
    </div>
  );
}

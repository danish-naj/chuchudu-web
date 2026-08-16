import React from 'react';
import { Link } from 'react-router-dom';
import PortalSidebar from '../components/PortalSidebar';

export default function GetApps() {
  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-background text-on-background font-body-md dotted-bg selection:bg-primary-container selection:text-on-background">
      {/* Fixed Left Sidebar */}
      <PortalSidebar />

      {/* Main Content Canvas */}
      <main className="flex-1 p-4 sm:p-6 md:p-12 max-w-container-max mx-auto w-full pb-28 md:pb-12">
        {/* Header Section */}
        <header className="mb-8 sm:mb-12">
          <h1 className="font-headline-lg text-2xl sm:text-3xl md:text-headline-lg uppercase mb-3 tracking-tight">
            Download Chuchudu Apps
          </h1>
          <p className="font-body-md text-xs sm:text-sm md:text-body-lg text-on-surface-variant max-w-2xl border-l-4 border-primary-fixed pl-3 sm:pl-4 leading-relaxed">
            Install the Desktop Agent on your Windows PC and the companion app on your Android phone to start syncing.
          </p>
        </header>

        {/* Platform Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-gutter mb-12">
          {/* Card A: Windows */}
          <article className="bg-surface-container-lowest border-2 border-on-background brutal-shadow-lg p-6 md:p-8 flex flex-col relative overflow-hidden group">
            {/* Decorative background accent */}
            <div className="absolute -right-12 -top-12 w-32 h-32 bg-primary-container rounded-full opacity-20 group-hover:scale-150 transition-transform duration-500 pointer-events-none"></div>

            <div className="flex items-start justify-between mb-6 relative z-10">
              <div className="bg-primary-fixed border-2 border-on-background p-3 inline-flex">
                <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                  desktop_windows
                </span>
              </div>
              <span className="font-label-caps text-label-caps uppercase bg-on-background text-background px-3 py-1 font-bold">
                v1.0.0
              </span>
            </div>

            <div className="mb-6 relative z-10">
              <span className="font-label-caps text-label-caps text-primary uppercase mb-2 block border-b-2 border-on-background pb-1 inline-block font-bold">
                Primary Vault Client
              </span>
              <h2 className="font-headline-md text-headline-md uppercase mb-2">
                Windows Desktop Agent
              </h2>
              <p className="font-body-md text-body-md text-on-surface-variant italic">
                Requirement: Windows 10/11 (64-bit)
              </p>
            </div>

            <ul className="flex flex-col gap-3 mb-8 flex-1 font-body-md text-body-md relative z-10">
              <li className="flex items-start gap-2">
                <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
                  check_box
                </span>
                File manager with photo, video, and document tabs
              </li>
              <li className="flex items-start gap-2">
                <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
                  check_box
                </span>
                Background cloud sync ingestion agent
              </li>
              <li className="flex items-start gap-2">
                <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
                  check_box
                </span>
                Local encrypted vault storage (~/Chuchudu_Vault)
              </li>
              <li className="flex items-start gap-2">
                <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
                  check_box
                </span>
                System tray runner &amp; autostart on boot
              </li>
              <li className="flex items-start gap-2">
                <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
                  check_box
                </span>
                Custom vault folder selector (choose your drive)
              </li>
            </ul>

            <div className="flex flex-col gap-3 relative z-10">
              <a
                href="/downloads/Chuchudu-Agent-Setup.exe"
                download="Chuchudu-Setup.exe"
                className="w-full bg-primary-fixed text-on-primary-fixed border-2 border-on-background brutal-shadow py-4 font-button-text text-button-text uppercase hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all active:bg-primary-fixed-dim text-center font-bold block"
              >
                Download for Windows (.exe)
              </a>
              <a
                href="https://github.com/danish-naj/chuchudu-web/releases"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-on-surface-variant hover:text-on-background text-center font-bold uppercase underline"
              >
                View Releases &amp; Source on GitHub →
              </a>
            </div>
          </article>

          {/* Card B: Android */}
          <article className="bg-surface-container-lowest border-2 border-on-background brutal-shadow-lg p-6 md:p-8 flex flex-col relative overflow-hidden group">
            <div className="flex items-start justify-between mb-6 relative z-10">
              <div className="bg-surface-container-high border-2 border-on-background p-3 inline-flex">
                <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                  android
                </span>
              </div>
              <span className="font-label-caps text-label-caps uppercase bg-[#FFB300] text-on-background border-2 border-on-background px-3 py-1 font-bold">
                COMING SOON
              </span>
            </div>

            <div className="mb-6 relative z-10">
              <span className="font-label-caps text-label-caps text-secondary uppercase mb-2 block border-b-2 border-on-background pb-1 inline-block font-bold">
                Native Companion App
              </span>
              <h2 className="font-headline-md text-headline-md uppercase mb-2">
                Android APK
              </h2>
              <p className="font-body-md text-body-md text-on-surface-variant italic">
                Status: In Active Development
              </p>
            </div>

            <ul className="flex flex-col gap-3 mb-6 flex-1 font-body-md text-body-md relative z-10">
              <li className="flex items-start gap-2">
                <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>
                  check_box
                </span>
                Background automatic camera roll sync
              </li>
              <li className="flex items-start gap-2">
                <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>
                  check_box
                </span>
                Direct phone-to-laptop encrypted chunk streaming
              </li>
              <li className="flex items-start gap-2">
                <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>
                  check_box
                </span>
                Push delivery notifications
              </li>
            </ul>

            <div className="bg-primary-container/30 p-3 border-2 border-dashed border-on-background mb-6 relative z-10">
              <p className="font-label-caps text-center uppercase text-xs flex items-center justify-center gap-1.5 font-bold text-on-surface">
                <span className="material-symbols-outlined text-sm">info</span>
                Use the Web Uploader on mobile Chrome in the meantime!
              </p>
            </div>

            <button
              disabled
              className="w-full bg-surface-container-high text-on-surface-variant border-2 border-on-background py-4 font-button-text text-button-text uppercase cursor-not-allowed relative z-10 mt-auto text-center font-bold block opacity-75"
            >
              Android App • Coming Soon
            </button>
          </article>
        </div>

        {/* Info Banner */}
        <aside className="bg-primary-fixed border-2 border-on-background brutal-shadow p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <span className="material-symbols-outlined text-4xl hidden md:block text-on-primary-fixed">
              language
            </span>
            <p className="font-body-lg text-body-lg text-on-background">
              <strong className="font-button-text text-button-text uppercase block mb-1">
                Already on iOS or another device?
              </strong>
              The web uploader at chuchudu.in works on any browser &mdash; no installation needed.
            </p>
          </div>
          <Link
            to="/dashboard"
            className="shrink-0 bg-background border-2 border-on-background brutal-shadow px-6 py-3 font-button-text text-button-text uppercase flex items-center gap-2 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all whitespace-nowrap font-bold"
          >
            Use Web Portal
            <span className="material-symbols-outlined">arrow_forward</span>
          </Link>
        </aside>
      </main>
    </div>
  );
}

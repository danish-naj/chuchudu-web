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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter mb-12">
          
          {/* Card 1: Windows Desktop */}
          <article className="bg-surface-container-lowest border-2 border-on-background brutal-shadow-lg p-6 md:p-8 flex flex-col relative overflow-hidden group">
            <div className="flex items-start justify-between mb-6 relative z-10">
              <div className="bg-primary-fixed border-2 border-on-background p-3 inline-flex">
                <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                  desktop_windows
                </span>
              </div>
              <span className="font-label-caps text-label-caps uppercase bg-on-background text-background px-3 py-1 font-bold">
                v1.0.0 STABLE
              </span>
            </div>

            <div className="mb-6 relative z-10">
              <span className="font-label-caps text-label-caps text-primary uppercase mb-2 block border-b-2 border-on-background pb-1 inline-block font-bold">
                Primary Vault Client
              </span>
              <h2 className="font-headline-md text-headline-md uppercase mb-2">
                Windows PC
              </h2>
              <p className="font-body-md text-body-md text-on-surface-variant italic">
                Requirement: Windows 10/11 (64-bit)
              </p>
            </div>

            <ul className="flex flex-col gap-3 mb-8 flex-1 font-body-md text-xs sm:text-sm relative z-10">
              <li className="flex items-start gap-2">
                <span className="material-symbols-outlined text-primary text-base" style={{ fontVariationSettings: "'FILL' 1" }}>
                  check_box
                </span>
                File manager with timeline albums &amp; QR link shares
              </li>
              <li className="flex items-start gap-2">
                <span className="material-symbols-outlined text-primary text-base" style={{ fontVariationSettings: "'FILL' 1" }}>
                  check_box
                </span>
                External SSD, HDD &amp; USB Multi-Vault profiles
              </li>
              <li className="flex items-start gap-2">
                <span className="material-symbols-outlined text-primary text-base" style={{ fontVariationSettings: "'FILL' 1" }}>
                  check_box
                </span>
                1-Click AES-256 encrypted vault backup (.chuchudu)
              </li>
              <li className="flex items-start gap-2">
                <span className="material-symbols-outlined text-primary text-base" style={{ fontVariationSettings: "'FILL' 1" }}>
                  check_box
                </span>
                System tray runner &amp; autostart on login
              </li>
            </ul>

            <div className="flex flex-col gap-3 relative z-10 mt-auto">
              <a
                href="/downloads/Chuchudu-Setup.exe"
                download="Chuchudu-Setup.exe"
                className="w-full bg-primary-fixed text-on-primary-fixed border-2 border-on-background brutal-shadow py-3.5 font-button-text text-button-text uppercase hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all active:bg-primary-fixed-dim text-center font-bold block"
              >
                Download for Windows (.exe)
              </a>
              <a
                href="/downloads/Chuchudu.exe"
                download="Chuchudu.exe"
                className="text-xs text-on-surface-variant hover:text-on-background text-center font-bold uppercase underline"
              >
                Download Portable (.exe) →
              </a>
            </div>
          </article>

          {/* Card 2: macOS Desktop (MacBook / iMac) */}
          <article className="bg-surface-container-lowest border-2 border-on-background brutal-shadow-lg p-6 md:p-8 flex flex-col relative overflow-hidden group">
            <div className="flex items-start justify-between mb-6 relative z-10">
              <div className="bg-primary-container border-2 border-on-background p-3 inline-flex">
                <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                  laptop_mac
                </span>
              </div>
              <span className="font-label-caps text-label-caps uppercase bg-primary-container text-on-primary-container border border-on-background px-3 py-1 font-bold">
                UNIVERSAL DMG
              </span>
            </div>

            <div className="mb-6 relative z-10">
              <span className="font-label-caps text-label-caps text-primary uppercase mb-2 block border-b-2 border-on-background pb-1 inline-block font-bold">
                Apple Silicon &amp; Intel
              </span>
              <h2 className="font-headline-md text-headline-md uppercase mb-2">
                macOS / MacBook
              </h2>
              <p className="font-body-md text-body-md text-on-surface-variant italic">
                Requirement: macOS 10.15+ (Catalina to Sequoia)
              </p>
            </div>

            <ul className="flex flex-col gap-3 mb-8 flex-1 font-body-md text-xs sm:text-sm relative z-10">
              <li className="flex items-start gap-2">
                <span className="material-symbols-outlined text-primary text-base" style={{ fontVariationSettings: "'FILL' 1" }}>
                  check_box
                </span>
                Native Apple Silicon (M1/M2/M3/M4) &amp; Intel Macs
              </li>
              <li className="flex items-start gap-2">
                <span className="material-symbols-outlined text-primary text-base" style={{ fontVariationSettings: "'FILL' 1" }}>
                  check_box
                </span>
                1-Click macOS PKG Installer (Auto-installs to Applications)
              </li>
              <li className="flex items-start gap-2">
                <span className="material-symbols-outlined text-primary text-base" style={{ fontVariationSettings: "'FILL' 1" }}>
                  check_box
                </span>
                macOS Menu Bar tray &amp; Finder folder integration
              </li>
              <li className="flex items-start gap-2">
                <span className="material-symbols-outlined text-primary text-base" style={{ fontVariationSettings: "'FILL' 1" }}>
                  check_box
                </span>
                Full zero-knowledge local encryption engine
              </li>
            </ul>

            <div className="flex flex-col gap-2 relative z-10 mt-auto">
              <a
                href="/downloads/Chuchudu.pkg"
                download="Chuchudu.pkg"
                className="w-full bg-primary text-on-primary border-2 border-on-background brutal-shadow py-3.5 font-button-text text-button-text uppercase hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all active:bg-primary-dim text-center font-bold block"
              >
                Download PKG Installer (.pkg)
              </a>
              <div className="flex items-center justify-between px-1">
                <a
                  href="/downloads/Chuchudu.dmg"
                  download="Chuchudu.dmg"
                  className="text-xs text-primary hover:underline font-bold uppercase"
                >
                  Download .dmg →
                </a>
                <a
                  href="https://github.com/danish-naj/chuchudu-web/releases"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-on-surface-variant hover:text-on-background font-bold uppercase underline"
                >
                  GitHub Releases →
                </a>
              </div>
            </div>
          </article>

          {/* Card 3: Mobile (iOS & Android) */}
          <article className="bg-surface-container-lowest border-2 border-on-background brutal-shadow-lg p-6 md:p-8 flex flex-col relative overflow-hidden group">
            <div className="flex items-start justify-between mb-6 relative z-10">
              <div className="bg-surface-container-high border-2 border-on-background p-3 inline-flex">
                <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                  smartphone
                </span>
              </div>
              <span className="font-label-caps text-label-caps uppercase bg-on-background text-background px-3 py-1 font-bold">
                MOBILE &amp; PWA
              </span>
            </div>

            <div className="mb-6 relative z-10">
              <span className="font-label-caps text-label-caps text-secondary uppercase mb-2 block border-b-2 border-on-background pb-1 inline-block font-bold">
                iPhone, iPad &amp; Android
              </span>
              <h2 className="font-headline-md text-headline-md uppercase mb-2">
                Mobile Companion
              </h2>
              <p className="font-body-md text-body-md text-on-surface-variant italic">
                iOS 15+ / Android / Mobile Safari &amp; Chrome
              </p>
            </div>

            <ul className="flex flex-col gap-3 mb-6 flex-1 font-body-md text-xs sm:text-sm relative z-10">
              <li className="flex items-start gap-2">
                <span className="material-symbols-outlined text-secondary text-base" style={{ fontVariationSettings: "'FILL' 1" }}>
                  check_box
                </span>
                Native iOS Camera &amp; QR Code scan support
              </li>
              <li className="flex items-start gap-2">
                <span className="material-symbols-outlined text-secondary text-base" style={{ fontVariationSettings: "'FILL' 1" }}>
                  check_box
                </span>
                Face ID &amp; Touch ID biometric album unlocking
              </li>
              <li className="flex items-start gap-2">
                <span className="material-symbols-outlined text-secondary text-base" style={{ fontVariationSettings: "'FILL' 1" }}>
                  check_box
                </span>
                Direct phone-to-laptop encrypted chunk streaming
              </li>
            </ul>

            <div className="bg-primary-container/30 p-3 border-2 border-dashed border-on-background mb-4 relative z-10">
              <p className="font-label-caps text-center uppercase text-[11px] flex items-center justify-center gap-1.5 font-bold text-on-surface">
                <span className="material-symbols-outlined text-sm">public</span>
                Installable as PWA on Safari &amp; Chrome!
              </p>
            </div>

            <Link
              to="/dashboard"
              className="w-full bg-surface-container-high hover:bg-surface-dim text-on-surface border-2 border-on-background py-3.5 font-button-text text-button-text uppercase relative z-10 mt-auto text-center font-bold block transition-all"
            >
              Open Mobile Web Portal →
            </Link>
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

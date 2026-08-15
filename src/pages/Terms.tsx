import React from 'react';
import { Link } from 'react-router-dom';

const sections = [
  { id: 'section-1', num: '01', title: '01. Acceptance of Terms' },
  { id: 'section-2', num: '02', title: '02. Description of Service' },
  { id: 'section-3', num: '03', title: '03. User Account' },
  { id: 'section-4', num: '04', title: '04. Privacy Policy' },
  { id: 'section-5', num: '05', title: '05. User Content', isAlert: true },
  { id: 'section-6', num: '06', title: '06. Prohibited Conduct' },
  { id: 'section-7', num: '07', title: '07. Intellectual Property' },
  { id: 'section-8', num: '08', title: '08. Service Modifications' },
  { id: 'section-9', num: '09', title: '09. Disclaimer of Warranties', isBold: true },
  { id: 'section-10', num: '10', title: '10. Limitation of Liability' },
  { id: 'section-11', num: '11', title: '11. Indemnification' },
  { id: 'section-12', num: '12', title: '12. Termination' },
  { id: 'section-13', num: '13', title: '13. Governing Law' },
  { id: 'section-14', num: '14', title: '14. Severability' },
  { id: 'section-15', num: '15', title: '15. Entire Agreement' },
];

export default function Terms() {
  return (
    <div className="bg-background text-on-background font-body-md antialiased min-h-screen flex flex-col selection:bg-primary-container selection:text-on-primary-container">
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
              to="/privacy"
              className="text-on-surface font-label-caps text-label-caps font-bold uppercase hover:bg-primary-container hover:text-on-primary-container transition-all px-3 py-2 border-2 border-transparent hover:border-on-background hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
            >
              Privacy Policy
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

      {/* Main Content Layout */}
      <main className="flex-grow w-full max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-12 flex flex-col md:flex-row gap-gutter relative">
        {/* Left Column: Sticky Table of Contents */}
        <aside className="w-full md:w-1/4 hidden md:block">
          <div className="sticky top-28 bg-surface-container-lowest border-2 border-on-background p-6 brutal-shadow">
            <h2 className="font-headline-md text-headline-md mb-6 uppercase border-b-2 border-on-background pb-2 font-bold tracking-tight">
              Contents
            </h2>
            <nav className="flex flex-col gap-2 font-label-caps text-xs">
              {sections.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className={`px-2 py-1.5 transition-all border border-transparent hover:border-on-background hover:bg-surface-container ${
                    s.isAlert
                      ? 'text-error font-bold hover:bg-error-container'
                      : s.isBold
                      ? 'font-bold text-on-surface'
                      : 'text-on-surface-variant hover:text-primary'
                  }`}
                >
                  {s.title}
                </a>
              ))}
            </nav>
          </div>
        </aside>

        {/* Right Column: Main Content Area */}
        <div className="w-full md:w-3/4 flex flex-col gap-8">
          <div className="mb-4">
            <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg uppercase mb-4 tracking-tight">
              Terms of Service
            </h1>
            <p className="font-label-caps text-label-caps text-on-surface-variant bg-primary-container inline-block px-3 py-1 border-2 border-on-background font-bold">
              Last Updated: August 15, 2026
            </p>
          </div>

          {/* Section 1 */}
          <section
            id="section-1"
            className="bg-surface-container-lowest border-2 border-on-background p-6 md:p-8 brutal-shadow scroll-mt-28"
          >
            <h3 className="font-headline-md text-headline-md mb-4 uppercase flex items-center gap-3">
              <span className="bg-on-background text-surface-container-lowest px-2 py-1 text-sm font-mono font-bold">
                01
              </span>{' '}
              Acceptance of Terms
            </h3>
            <p className="text-body-md font-body-md text-on-surface leading-relaxed">
              By accessing or using the CHUCHUDU file management and transfer service, you agree to be
              bound by these Terms of Service. If you do not agree to all the terms and conditions, you
              may not access or use the service.
            </p>
          </section>

          {/* Section 2 */}
          <section
            id="section-2"
            className="bg-surface-container-lowest border-2 border-on-background p-6 md:p-8 brutal-shadow scroll-mt-28"
          >
            <h3 className="font-headline-md text-headline-md mb-4 uppercase flex items-center gap-3">
              <span className="bg-on-background text-surface-container-lowest px-2 py-1 text-sm font-mono font-bold">
                02
              </span>{' '}
              Description of Service
            </h3>
            <p className="text-body-md font-body-md text-on-surface leading-relaxed">
              CHUCHUDU provides a decentralized, end-to-end encrypted personal file transfer and vault
              platform. Files are stored directly on the user&apos;s own hardware. Cloud storage acts
              strictly as a temporary, encrypted transit buffer that is purged immediately after sync.
            </p>
          </section>

          {/* Section 3 */}
          <section
            id="section-3"
            className="bg-surface-container-lowest border-2 border-on-background p-6 md:p-8 brutal-shadow scroll-mt-28"
          >
            <h3 className="font-headline-md text-headline-md mb-4 uppercase flex items-center gap-3">
              <span className="bg-on-background text-surface-container-lowest px-2 py-1 text-sm font-mono font-bold">
                03
              </span>{' '}
              User Account &amp; Security
            </h3>
            <p className="text-body-md font-body-md text-on-surface leading-relaxed">
              You are responsible for maintaining the confidentiality of your account credentials,
              passphrase, and for restricting access to your personal devices. Any activity occurring
              under your account remains your sole legal responsibility.
            </p>
          </section>

          {/* Section 4 */}
          <section
            id="section-4"
            className="bg-surface-container-lowest border-2 border-on-background p-6 md:p-8 brutal-shadow scroll-mt-28"
          >
            <h3 className="font-headline-md text-headline-md mb-4 uppercase flex items-center gap-3">
              <span className="bg-on-background text-surface-container-lowest px-2 py-1 text-sm font-mono font-bold">
                04
              </span>{' '}
              Privacy Policy
            </h3>
            <p className="text-body-md font-body-md text-on-surface leading-relaxed">
              Your use of CHUCHUDU is also governed by our{' '}
              <Link to="/privacy" className="text-primary font-bold underline">
                Privacy Policy
              </Link>
              , which details our zero-knowledge architecture and data protection standards.
            </p>
          </section>

          {/* Section 5: RED ALERT BOX */}
          <section
            id="section-5"
            className="bg-surface-container-lowest border-2 border-on-background p-6 md:p-8 brutal-shadow scroll-mt-28"
          >
            <h3 className="font-headline-md text-headline-md mb-4 uppercase flex items-center gap-3 text-error">
              <span className="bg-error text-surface-container-lowest px-2 py-1 text-sm font-mono font-bold">
                05
              </span>{' '}
              User Content &amp; Liability
            </h3>
            <p className="text-body-md font-body-md text-on-surface mb-6 leading-relaxed">
              Users may upload, transmit, and manage files and materials through the Service. You retain
              all rights in, and are exclusively and solely liable for, all User Content you process
              through the platform.
            </p>
            <div className="bg-error-container border-4 border-error p-6 shadow-[4px_4px_0px_0px_#ba1a1a]">
              <div className="flex items-start gap-4">
                <span
                  className="material-symbols-outlined text-error text-3xl flex-shrink-0"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  warning
                </span>
                <div>
                  <h4 className="font-headline-md text-error uppercase mb-2">Critical Notice</h4>
                  <p className="font-body-lg text-body-lg text-on-error-container font-bold leading-snug">
                    You are exclusively and solely responsible for all content you upload. Because Chuchudu
                    uses client-side zero-knowledge encryption, we cannot see, inspect, or moderate your files.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 6: List with X icons */}
          <section
            id="section-6"
            className="bg-surface-container-lowest border-2 border-on-background p-6 md:p-8 brutal-shadow scroll-mt-28"
          >
            <h3 className="font-headline-md text-headline-md mb-4 uppercase flex items-center gap-3">
              <span className="bg-on-background text-surface-container-lowest px-2 py-1 text-sm font-mono font-bold">
                06
              </span>{' '}
              Prohibited Conduct
            </h3>
            <p className="text-body-md font-body-md text-on-surface mb-4">
              You agree not to use the Service to:
            </p>
            <ul className="flex flex-col gap-3 font-body-md text-body-md">
              <li className="flex items-center gap-3 p-3 border-2 border-on-surface-variant bg-surface-container-low">
                <span
                  className="material-symbols-outlined text-error bg-error-container border border-error p-1 text-sm"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  close
                </span>
                Upload or transmit any content that is illegal, harmful, or violates third-party rights.
              </li>
              <li className="flex items-center gap-3 p-3 border-2 border-on-surface-variant bg-surface-container-low">
                <span
                  className="material-symbols-outlined text-error bg-error-container border border-error p-1 text-sm"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  close
                </span>
                Distribute ransomware, malware, viruses, or any destructive payloads.
              </li>
              <li className="flex items-center gap-3 p-3 border-2 border-on-surface-variant bg-surface-container-low">
                <span
                  className="material-symbols-outlined text-error bg-error-container border border-error p-1 text-sm"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  close
                </span>
                Attempt to compromise, reverse engineer, or gain unauthorized access to the network or services.
              </li>
            </ul>
          </section>

          {/* Section 7 */}
          <section
            id="section-7"
            className="bg-surface-container-lowest border-2 border-on-background p-6 md:p-8 brutal-shadow scroll-mt-28"
          >
            <h3 className="font-headline-md text-headline-md mb-4 uppercase flex items-center gap-3">
              <span className="bg-on-background text-surface-container-lowest px-2 py-1 text-sm font-mono font-bold">
                07
              </span>{' '}
              Intellectual Property
            </h3>
            <p className="text-body-md font-body-md text-on-surface leading-relaxed">
              The Service, software, and brand assets are the exclusive property of CHUCHUDU. You retain
              100% ownership of your files and grant no intellectual property rights to the service provider.
            </p>
          </section>

          {/* Section 8: Greyed info box */}
          <section
            id="section-8"
            className="bg-surface-container-lowest border-2 border-on-background p-6 md:p-8 brutal-shadow scroll-mt-28"
          >
            <h3 className="font-headline-md text-headline-md mb-4 uppercase flex items-center gap-3">
              <span className="bg-on-background text-surface-container-lowest px-2 py-1 text-sm font-mono font-bold">
                08
              </span>{' '}
              Service Modifications
            </h3>
            <div className="bg-surface-container-highest border-2 border-on-surface border-dashed p-6 mt-4">
              <div className="flex items-start gap-3">
                <span
                  className="material-symbols-outlined text-on-surface mt-1"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  info
                </span>
                <p className="text-body-md font-body-md text-on-surface italic leading-relaxed">
                  We reserve the right to withdraw or amend our Service, and any service or material we
                  provide, in our sole discretion without notice. We will not be liable if for any reason all
                  or any part of the Service is unavailable at any time.
                </p>
              </div>
            </div>
          </section>

          {/* Section 9: Bold disclaimer */}
          <section
            id="section-9"
            className="bg-surface-container-lowest border-2 border-on-background p-6 md:p-8 brutal-shadow scroll-mt-28"
          >
            <h3 className="font-headline-md text-headline-md mb-4 uppercase flex items-center gap-3">
              <span className="bg-on-background text-surface-container-lowest px-2 py-1 text-sm font-mono font-bold">
                09
              </span>{' '}
              Disclaimer of Warranties
            </h3>
            <div className="bg-on-background text-surface-container-lowest p-6 rotate-[1deg] hover:rotate-0 transition-transform">
              <p className="font-headline-md text-headline-md uppercase text-center tracking-widest leading-relaxed font-black">
                THE SERVICE IS PROVIDED ON AN &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; BASIS, WITHOUT ANY WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED.
              </p>
            </div>
          </section>

          {/* Section 10 */}
          <section
            id="section-10"
            className="bg-surface-container-lowest border-2 border-on-background p-6 md:p-8 brutal-shadow scroll-mt-28"
          >
            <h3 className="font-headline-md text-headline-md mb-4 uppercase flex items-center gap-3">
              <span className="bg-on-background text-surface-container-lowest px-2 py-1 text-sm font-mono font-bold">
                10
              </span>{' '}
              Limitation of Liability
            </h3>
            <p className="text-body-md font-body-md text-on-surface leading-relaxed">
              To the maximum extent permitted by applicable law, in no event will CHUCHUDU, its creator,
              operators, or affiliates be liable for damages of any kind, including loss of data, hardware
              failure, forgotten encryption passphrases, or unauthorized third-party access.
            </p>
          </section>

          {/* Section 11 */}
          <section
            id="section-11"
            className="bg-surface-container-lowest border-2 border-on-background p-6 md:p-8 brutal-shadow scroll-mt-28"
          >
            <h3 className="font-headline-md text-headline-md mb-4 uppercase flex items-center gap-3">
              <span className="bg-on-background text-surface-container-lowest px-2 py-1 text-sm font-mono font-bold">
                11
              </span>{' '}
              Indemnification
            </h3>
            <p className="text-body-md font-body-md text-on-surface leading-relaxed">
              You agree to defend, indemnify, and hold harmless CHUCHUDU and its operators against any and
              all claims, damages, liabilities, losses, costs, or expenses arising from your use of the
              Service or violation of these Terms.
            </p>
          </section>

          {/* Section 12 */}
          <section
            id="section-12"
            className="bg-surface-container-lowest border-2 border-on-background p-6 md:p-8 brutal-shadow scroll-mt-28"
          >
            <h3 className="font-headline-md text-headline-md mb-4 uppercase flex items-center gap-3">
              <span className="bg-on-background text-surface-container-lowest px-2 py-1 text-sm font-mono font-bold">
                12
              </span>{' '}
              Termination
            </h3>
            <p className="text-body-md font-body-md text-on-surface leading-relaxed">
              We may terminate or suspend access to our Service immediately, without prior notice or
              liability, for any reason whatsoever, including without limitation if you breach the Terms.
            </p>
          </section>

          {/* Section 13: Mentions India */}
          <section
            id="section-13"
            className="bg-surface-container-lowest border-2 border-on-background p-6 md:p-8 brutal-shadow scroll-mt-28 border-l-8 border-l-primary-container"
          >
            <h3 className="font-headline-md text-headline-md mb-4 uppercase flex items-center gap-3">
              <span className="bg-on-background text-surface-container-lowest px-2 py-1 text-sm font-mono font-bold">
                13
              </span>{' '}
              Governing Law
            </h3>
            <p className="text-body-md font-body-md text-on-surface leading-relaxed">
              These Terms shall be governed and construed in accordance with the laws of <strong>India</strong>,
              without regard to its conflict of law provisions. Any legal suit, action, or proceeding
              arising out of or related to these Terms shall be instituted exclusively in the courts of India.
            </p>
            <div className="mt-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-on-surface" style={{ fontVariationSettings: "'FILL' 1" }}>
                location_on
              </span>
              <span className="font-label-caps text-label-caps uppercase font-bold">
                Jurisdiction: New Delhi, India
              </span>
            </div>
          </section>

          {/* Section 14 */}
          <section
            id="section-14"
            className="bg-surface-container-lowest border-2 border-on-background p-6 md:p-8 brutal-shadow scroll-mt-28"
          >
            <h3 className="font-headline-md text-headline-md mb-4 uppercase flex items-center gap-3">
              <span className="bg-on-background text-surface-container-lowest px-2 py-1 text-sm font-mono font-bold">
                14
              </span>{' '}
              Severability
            </h3>
            <p className="text-body-md font-body-md text-on-surface leading-relaxed">
              If any provision of these Terms is held to be unenforceable or invalid, such provision will be
              modified and interpreted to accomplish the objectives of such provision to the greatest extent
              possible under applicable law.
            </p>
          </section>

          {/* Section 15 */}
          <section
            id="section-15"
            className="bg-surface-container-lowest border-2 border-on-background p-6 md:p-8 brutal-shadow scroll-mt-28"
          >
            <h3 className="font-headline-md text-headline-md mb-4 uppercase flex items-center gap-3">
              <span className="bg-on-background text-surface-container-lowest px-2 py-1 text-sm font-mono font-bold">
                15
              </span>{' '}
              Entire Agreement
            </h3>
            <p className="text-body-md font-body-md text-on-surface leading-relaxed">
              The Terms of Service and Privacy Policy constitute the sole and entire agreement between you
              and CHUCHUDU regarding the Service and supersede all prior understandings and agreements.
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-surface-container-highest border-t-4 border-on-background w-full py-12 px-margin-mobile md:px-margin-desktop flex flex-col md:flex-row justify-between items-center gap-gutter mt-auto">
        <div className="font-headline-md text-headline-md font-black text-on-background uppercase tracking-tighter">
          CHUCHUDU
        </div>
        <div className="flex flex-wrap justify-center gap-6 font-label-caps text-label-caps">
          <Link
            to="/terms"
            className="text-on-secondary-container hover:text-primary underline decoration-4 transition-colors duration-200"
          >
            Terms
          </Link>
          <Link
            to="/privacy"
            className="text-on-secondary-container hover:text-primary underline decoration-4 transition-colors duration-200"
          >
            Privacy
          </Link>
          <a
            href="mailto:legal@chuchudu.in"
            className="text-on-secondary-container hover:text-primary underline decoration-4 transition-colors duration-200"
          >
            Support
          </a>
          <Link
            to="/"
            className="text-on-secondary-container hover:text-primary underline decoration-4 transition-colors duration-200"
          >
            Home
          </Link>
        </div>
        <div className="font-body-md text-body-md text-on-background font-bold">
          © 2026 CHUCHUDU. ALL RIGHTS RESERVED.
        </div>
      </footer>
    </div>
  );
}

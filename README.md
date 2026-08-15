<div align="center">

  <img src="public/chuchudu_logo.jpg" alt="Chuchudu Logo" width="140" style="border-radius: 28px; box-shadow: 0 12px 32px rgba(0,0,0,0.3); margin-bottom: 16px;" />

  # CHUCHUDU

  ### **Your Files. Everywhere. Encrypted.**
  *A Zero-Knowledge, Zero-Cloud-Cost Personal Cloud Storage System.*

  [![Release](https://img.shields.io/github/v/release/danish-naj/chuchudu-web?style=for-the-badge&color=8DB83A)](https://github.com/danish-naj/chuchudu-web/releases)
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
  [![React](https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
  [![Tauri](https://img.shields.io/badge/Tauri_v2-24C8D8?style=for-the-badge&logo=tauri&logoColor=white)](https://tauri.app/)
  [![Rust](https://img.shields.io/badge/Rust-black?style=for-the-badge&logo=rust&logoColor=white)](https://www.rust-lang.org/)
  [![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

  [**Explore Live Web Portal »**](https://chuchudu.in) · [**Download Desktop Agent »**](https://chuchudu.in/apps) · [**Report Bug »**](https://github.com/danish-naj/chuchudu-web/issues)

</div>

---

## 💡 The Problem & The Solution

| The Traditional Cloud Dilemma 💸 | The Chuchudu Breakthrough 🚀 |
|---|---|
| Monthly subscriptions ($10–$30/mo) for Google One, Dropbox, or iCloud. | **Zero Cloud Storage Fees.** Store unlimited terabytes on your own PC hardware. |
| Tech giants have full server-side access to inspect and train AI on your photos. | **Zero-Knowledge Encryption (AES-256-GCM).** Files are encrypted locally before transmission. |
| Files are locked into proprietary walled gardens. | **Direct Windows File Explorer access.** Your files remain open, standard files on your disk. |
| Upload limits and artificial bandwidth throttling. | **Direct P2P & Transient Google Drive buffers.** Fast, reliable syncing across devices. |

---

## ✨ Core Features

- 🔒 **End-to-End Military Grade Encryption**: Files are sliced into 512KB chunks and encrypted via **AES-256-GCM** using unique 96-bit IVs and sequence-authenticated AAD. Master keys are derived on-device with **PBKDF2 SHA-256 (600,000 iterations)**.
- 💻 **Cross-Platform Native Desktop Agent**: Built on **Tauri v2 + Rust** for lightweight, memory-efficient background syncing (<40MB RAM), system tray runner, and autostart on boot.
- 📁 **Custom Storage Directory**: Choose any internal drive, secondary SSD, or external hard drive (`D:\MyPhotos`, `C:\Users\...\Vault`) as your storage destination.
- 📂 **Native Windows File Explorer Integration**: Files are saved with their real original names (`photo.jpg`, `document.pdf`) alongside encrypted manifests, allowing direct access in any desktop software.
- 👁️ **In-App Rich Media Hub**: Built-in instant preview player for photos, 4K videos, audio streams, PDFs, and syntax-highlighted code.
- ☁️ **Google Drive & Transient Cloud Buffering**: When your laptop is offline, mobile uploads buffer in your personal Google Drive or transient Firestore pipeline, then auto-purge the moment your laptop ingests them.
- 🎨 **Neo-Brutalist Interface**: High-contrast, accessibility-first design system featuring tactile brutalist shadows, bold typography, and responsive layouts.

---

## 🏛️ Architecture & Sync Flow

```text
  📱 Mobile Device / Web Portal (chuchudu.in)
      │
      ├── 1. Client-Side Chunking (512KB)
      ├── 2. AES-256-GCM Encryption (Client CryptoKey)
      │
      ▼
  ☁️ Transient Transit Buffer (Google Drive API / Firestore Chunks)
      │
      │ (Laptop wakes up or reconnects to network)
      ▼
  💻 Chuchudu Desktop Agent (Tauri v2 + Rust)
      │
      ├── 3. Ingests encrypted chunks from buffer
      ├── 4. Decrypts chunks with device master key
      ├── 5. Purges transient chunks from cloud buffer
      └── 6. Writes clean file to user's selected storage directory (~/Chuchudu_Vault)
```

---

## 🛠️ Tech Stack

### Web & Frontend
- **Framework**: [React 19](https://react.dev/) + [Vite](https://vitejs.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Styling**: Vanilla CSS tokens & [Tailwind CSS](https://tailwindcss.com/) with Neo-Brutalist design tokens
- **Routing & State**: React Router v7, React Context API, Lucide Icons & Material Symbols

### Desktop Agent
- **Core Engine**: [Tauri v2](https://tauri.app/) (Rust 1.77+)
- **Plugins**: `@tauri-apps/plugin-fs`, `@tauri-apps/plugin-dialog`, `@tauri-apps/plugin-shell`, `@tauri-apps/plugin-autostart`, `@tauri-apps/plugin-notification`
- **Packaging**: NSIS Windows Installer (`.exe`) & WiX MSI (`.msi`)

### Security & Backend
- **Cryptography**: Web Crypto API (SubtleCrypto) AES-256-GCM, PBKDF2 (SHA-256, 600K rounds)
- **Signaling & Database**: Firebase Auth, Cloud Firestore, Google OAuth 2.0 & Google Drive API v3

---

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/danish-naj/chuchudu-web.git
cd chuchudu-web
```

### 2. Configure Environment Variables

Create a `.env.local` file in both the root directory and `desktop-agent/`:

```env
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_GOOGLE_CLIENT_ID=your_google_oauth_client_id.apps.googleusercontent.com
```

### 3. Run the Web Portal

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

### 4. Run the Desktop Agent

```bash
cd desktop-agent
npm install

# Run Tauri desktop app in dev mode
npm run tauri dev

# Build production installers (.exe and .msi)
npm run tauri build
```

---

## 📦 Project Structure

```text
chuchudu-web/
├── public/                  # Static assets & brand media
│   ├── downloads/           # Public desktop installer binaries
│   └── chuchudu_logo.jpg    # Official brand logo
├── src/                     # Web Portal source code
│   ├── components/          # Reusable UI components & brutalist elements
│   ├── context/             # AuthContext, TransferContext, DriveContext
│   ├── crypto/              # AES-256-GCM chunk encryption & PBKDF2 key managers
│   ├── db/                  # IndexedDB & Firestore real-time sync pipelines
│   ├── pages/               # Landing, Dashboard, Settings, GetApps, OAuth, Preview
│   └── App.tsx              # Application routing & providers
├── desktop-agent/           # Native Desktop Sync Application
│   ├── src/                 # Desktop React UI (AgentApp.tsx, file gallery, settings)
│   ├── src-tauri/           # Rust Tauri backend
│   │   ├── src/             # lib.rs (system tray, windows, native events)
│   │   ├── icons/           # Complete OS icon sets (ico, icns, png, mipmaps)
│   │   ├── capabilities/    # Tauri v2 security & filesystem permissions
│   │   └── tauri.conf.json  # Desktop app configuration & NSIS bundler
│   └── package.json         # Desktop dependencies
├── .github/                 # GitHub workflows, PR templates, and issue schemas
├── CONTRIBUTING.md          # Contribution guidelines
├── SECURITY.md              # Security and vulnerability policy
└── LICENSE                  # MIT License
```

---

## 📄 License

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for more information.

---

<div align="center">
  <sub>Built with 🔒 by Danish Naj and the Chuchudu Community.</sub>
</div>

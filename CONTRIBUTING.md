# Contributing to Chuchudu

Thank you for your interest in contributing to **Chuchudu**! We welcome bug reports, feature suggestions, documentation enhancements, and pull requests.

---

## 🛠️ Development Setup

### Prerequisites
- **Node.js**: v18.0 or newer
- **Rust toolchain**: `rustc` & `cargo` (for building the Tauri desktop agent)
- **Git**

### Clone & Install

```bash
# Clone the repository
git clone https://github.com/danish-naj/chuchudu-web.git
cd chuchudu-web

# Install web portal dependencies
npm install

# Run the web portal dev server
npm run dev
```

### Running the Desktop Agent

```bash
# Navigate to desktop-agent directory
cd desktop-agent

# Install dependencies
npm install

# Run the Tauri desktop agent in development mode
npm run tauri dev
```

---

## 🔀 Pull Request Process

1. **Fork** the repository and create your branch from `main`:
   ```bash
   git checkout -b feature/my-new-feature
   ```
2. **Make your changes** following our brutalist design aesthetic and TypeScript conventions.
3. Ensure the project builds without errors:
   ```bash
   npm run build
   cd desktop-agent && npm run tauri build
   ```
4. **Commit** your changes with clear, semantic commit messages:
   ```bash
   git commit -m "feat: add support for drag-and-drop album organization"
   ```
5. **Push** to your fork and submit a Pull Request to `main`.

---

## 🎨 Code Style & Aesthetics
- **Architecture**: Zero-knowledge encryption must be preserved across all file transfer layers.
- **Design System**: Brutalist aesthetic — thick borders (`border-2 border-on-background`), bold typography, solid shadows (`box-shadow: 4px 4px 0 #1a1c1c`), high contrast lime-green accents.
- **TypeScript**: Strict type definitions, no unconstrained `any` types in cryptographic modules.

---

## 📜 Code of Conduct
All contributors are expected to uphold the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md).

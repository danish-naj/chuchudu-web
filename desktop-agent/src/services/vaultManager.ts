import { mkdir, writeTextFile, readTextFile, remove, exists, readFile, writeFile } from '@tauri-apps/plugin-fs';
import { homeDir } from '@tauri-apps/api/path';

export interface VaultFile {
  id: string;
  name: string;
  size: number;
  mime: string;
  modified: string;
  encrypted: boolean;
  starred: boolean;
  type: 'file' | 'folder';
  items?: number;
}

const isTauri = () => typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

export class VaultManager {
  private initialized = false;
  private memoryManifest: Record<string, VaultFile> = {};
  private memoryFiles: Record<string, Uint8Array> = {};
  private cachedVaultPath: string | null = null;

  async getVaultDir(): Promise<string> {
    if (!isTauri()) return 'Chuchudu_Vault';

    const saved = localStorage.getItem('chuchudu_vault_path');
    if (saved && saved.trim()) {
      return saved.trim();
    }

    try {
      const home = await homeDir();
      const defaultPath = `${home.replace(/\\/g, '/')}/Chuchudu_Vault`;
      localStorage.setItem('chuchudu_vault_path', defaultPath);
      return defaultPath;
    } catch {
      return 'C:/Users/ACER/Chuchudu_Vault';
    }
  }

  async setVaultDir(newPath: string) {
    localStorage.setItem('chuchudu_vault_path', newPath);
    this.cachedVaultPath = newPath;
    this.initialized = false;
    await this.init();
    window.dispatchEvent(new CustomEvent('vault-updated'));
  }

  async init() {
    if (this.initialized) return;

    if (!isTauri()) {
      try {
        const saved = localStorage.getItem('chuchudu_vault_manifest');
        if (saved) this.memoryManifest = JSON.parse(saved);
      } catch {}
      this.initialized = true;
      return;
    }

    try {
      const vaultDir = await this.getVaultDir();
      const hasDir = await exists(vaultDir);
      if (!hasDir) {
        await mkdir(vaultDir, { recursive: true });
      }

      const manifestPath = `${vaultDir}/.manifest.json`;
      const hasManifest = await exists(manifestPath);
      if (!hasManifest) {
        await writeTextFile(manifestPath, JSON.stringify({}));
      }
    } catch (e) {
      console.warn('[VaultManager] init warning:', e);
    }

    this.initialized = true;
  }

  async getManifest(): Promise<Record<string, VaultFile>> {
    await this.init();
    if (!isTauri()) return { ...this.memoryManifest };

    try {
      const vaultDir = await this.getVaultDir();
      const manifestPath = `${vaultDir}/.manifest.json`;
      const data = await readTextFile(manifestPath);
      return JSON.parse(data);
    } catch (e) {
      console.error('[VaultManager] Error reading manifest:', e);
      return {};
    }
  }

  async saveManifest(manifest: Record<string, VaultFile>) {
    await this.init();
    if (!isTauri()) {
      this.memoryManifest = { ...manifest };
      localStorage.setItem('chuchudu_vault_manifest', JSON.stringify(manifest));
      window.dispatchEvent(new CustomEvent('vault-updated'));
      return;
    }

    const vaultDir = await this.getVaultDir();
    const manifestPath = `${vaultDir}/.manifest.json`;
    await writeTextFile(manifestPath, JSON.stringify(manifest, null, 2));
    window.dispatchEvent(new CustomEvent('vault-updated'));
  }

  async saveFile(id: string, metadata: Omit<VaultFile, 'id'>, data: Uint8Array) {
    await this.init();
    if (!isTauri()) {
      this.memoryFiles[id] = data;
      const manifest = await this.getManifest();
      manifest[id] = { id, ...metadata };
      await this.saveManifest(manifest);
      return;
    }

    const vaultDir = await this.getVaultDir();

    // 1. Save vault ID file for fast lookup
    const idPath = `${vaultDir}/${id}.chuchudu`;
    await writeFile(idPath, data);

    // 2. Also save real named file directly in the folder so user can see it in Windows File Explorer
    if (metadata.name) {
      try {
        const cleanName = metadata.name.replace(/[<>:"/\\|?*]/g, '_');
        const namedPath = `${vaultDir}/${cleanName}`;
        await writeFile(namedPath, data);
      } catch (err) {
        console.warn('[VaultManager] Could not write named file:', err);
      }
    }

    const manifest = await this.getManifest();
    manifest[id] = { id, ...metadata };
    await this.saveManifest(manifest);
  }

  async readFile(id: string): Promise<Uint8Array | null> {
    await this.init();
    if (!isTauri()) return this.memoryFiles[id] || null;

    const vaultDir = await this.getVaultDir();
    const idPath = `${vaultDir}/${id}.chuchudu`;

    try {
      const fileExists = await exists(idPath);
      if (fileExists) {
        return await readFile(idPath);
      }
    } catch {}

    // Fallback: try by real name from manifest
    try {
      const manifest = await this.getManifest();
      if (manifest[id]?.name) {
        const cleanName = manifest[id].name.replace(/[<>:"/\\|?*]/g, '_');
        const namedPath = `${vaultDir}/${cleanName}`;
        const hasNamed = await exists(namedPath);
        if (hasNamed) {
          return await readFile(namedPath);
        }
      }
    } catch {}

    return null;
  }

  async deleteFile(id: string) {
    await this.init();
    if (!isTauri()) {
      delete this.memoryFiles[id];
      delete this.memoryManifest[id];
      await this.saveManifest(this.memoryManifest);
      return;
    }

    const vaultDir = await this.getVaultDir();
    const idPath = `${vaultDir}/${id}.chuchudu`;

    try {
      const fileExists = await exists(idPath);
      if (fileExists) {
        await remove(idPath);
      }
    } catch {}

    const manifest = await this.getManifest();
    if (manifest[id]) {
      try {
        const cleanName = manifest[id].name.replace(/[<>:"/\\|?*]/g, '_');
        const namedPath = `${vaultDir}/${cleanName}`;
        const hasNamed = await exists(namedPath);
        if (hasNamed) {
          await remove(namedPath);
        }
      } catch {}

      delete manifest[id];
      await this.saveManifest(manifest);
    }
  }
}

export const vault = new VaultManager();

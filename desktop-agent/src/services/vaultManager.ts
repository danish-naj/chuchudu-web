import { BaseDirectory, mkdir, writeTextFile, readTextFile, remove, exists, readFile, writeFile } from '@tauri-apps/plugin-fs';

const VAULT_DIR = 'Chuchudu_Vault';
const MANIFEST_FILE = `${VAULT_DIR}/.manifest.json`;

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
      const hasDir = await exists(VAULT_DIR, { baseDir: BaseDirectory.Home });
      if (!hasDir) await mkdir(VAULT_DIR, { baseDir: BaseDirectory.Home });

      const hasManifest = await exists(MANIFEST_FILE, { baseDir: BaseDirectory.Home });
      if (!hasManifest) await writeTextFile(MANIFEST_FILE, JSON.stringify({}), { baseDir: BaseDirectory.Home });
    } catch (e) {
      console.warn('Tauri FS init fallback:', e);
    }

    this.initialized = true;
  }

  async getManifest(): Promise<Record<string, VaultFile>> {
    await this.init();
    if (!isTauri()) return { ...this.memoryManifest };
    try {
      const data = await readTextFile(MANIFEST_FILE, { baseDir: BaseDirectory.Home });
      return JSON.parse(data);
    } catch (e) {
      console.error('Error reading manifest', e);
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
    await writeTextFile(MANIFEST_FILE, JSON.stringify(manifest, null, 2), { baseDir: BaseDirectory.Home });
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

    const filePath = `${VAULT_DIR}/${id}.chuchudu`;
    await writeFile(filePath, data, { baseDir: BaseDirectory.Home });

    const manifest = await this.getManifest();
    manifest[id] = { id, ...metadata };
    await this.saveManifest(manifest);
  }

  async readFile(id: string): Promise<Uint8Array | null> {
    await this.init();
    if (!isTauri()) return this.memoryFiles[id] || null;

    const filePath = `${VAULT_DIR}/${id}.chuchudu`;
    const fileExists = await exists(filePath, { baseDir: BaseDirectory.Home });
    if (!fileExists) return null;

    return await readFile(filePath, { baseDir: BaseDirectory.Home });
  }

  async deleteFile(id: string) {
    await this.init();
    if (!isTauri()) {
      delete this.memoryFiles[id];
      delete this.memoryManifest[id];
      await this.saveManifest(this.memoryManifest);
      return;
    }

    const filePath = `${VAULT_DIR}/${id}.chuchudu`;
    const fileExists = await exists(filePath, { baseDir: BaseDirectory.Home });
    if (fileExists) {
      await remove(filePath, { baseDir: BaseDirectory.Home });
    }

    const manifest = await this.getManifest();
    if (manifest[id]) {
      delete manifest[id];
      await this.saveManifest(manifest);
    }
  }
}

export const vault = new VaultManager();


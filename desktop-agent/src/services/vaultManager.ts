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
  tags?: string[];
}

export interface VaultProfile {
  id: string;
  name: string;
  path: string;
  isDefault?: boolean;
  createdAt: string;
}

export interface Album {
  id: string;
  name: string;
  description?: string;
  coverFileId?: string; // ID of the vault file used as cover
  fileIds: string[];
  isLocked?: boolean;
  pinHash?: string;
  created: string;
  modified: string;
}

export interface ShareLink {
  id: string;
  fileId: string;
  fileName: string;
  mime: string;
  size: number;
  shareUrl: string;
  base64Key: string;
  storageType: 'drive' | 'storage' | 'firestore';
  storageRefId?: string; // drive file ID or storage path
  expiresAt: string | null; // ISO string or null for never
  allowDownload: boolean;
  isPasswordProtected: boolean;
  passwordHash?: string;
  createdAt: string;
  isActive: boolean;
}

const isTauri = () => typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

export class VaultManager {
  private initialized = false;
  private memoryManifest: Record<string, VaultFile> = {};
  private memoryAlbums: Record<string, Album> = {};
  private memoryShareLinks: Record<string, ShareLink> = {};
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
      const cleanHome = home ? home.replace(/\\/g, '/').replace(/\/+$/, '') : '';
      const defaultPath = cleanHome ? `${cleanHome}/Chuchudu_Vault` : 'Chuchudu_Vault';
      localStorage.setItem('chuchudu_vault_path', defaultPath);
      return defaultPath;
    } catch {
      return 'Chuchudu_Vault';
    }
  }

  async setVaultDir(newPath: string) {
    localStorage.setItem('chuchudu_vault_path', newPath);
    this.cachedVaultPath = newPath;
    this.initialized = false;
    await this.init();
    window.dispatchEvent(new CustomEvent('vault-updated'));
  }

  // ─── Multi-Vault Profiles ──────────────────────────────────────────────────
  async getVaultProfiles(): Promise<VaultProfile[]> {
    try {
      const saved = localStorage.getItem('chuchudu_vault_profiles');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}

    const defaultDir = await this.getVaultDir();
    const defaultProfile: VaultProfile = {
      id: 'default',
      name: 'Primary Vault (SSD)',
      path: defaultDir,
      isDefault: true,
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem('chuchudu_vault_profiles', JSON.stringify([defaultProfile]));
    return [defaultProfile];
  }

  async addVaultProfile(name: string, path: string): Promise<VaultProfile> {
    const profiles = await this.getVaultProfiles();
    const newProfile: VaultProfile = {
      id: crypto.randomUUID(),
      name: name.trim() || 'External Vault',
      path: path.trim(),
      createdAt: new Date().toISOString(),
    };
    profiles.push(newProfile);
    localStorage.setItem('chuchudu_vault_profiles', JSON.stringify(profiles));
    return newProfile;
  }

  async switchVault(vaultId: string): Promise<VaultProfile | null> {
    const profiles = await this.getVaultProfiles();
    const target = profiles.find(p => p.id === vaultId);
    if (!target) return null;

    localStorage.setItem('chuchudu_active_vault_id', target.id);
    await this.setVaultDir(target.path);
    window.dispatchEvent(new CustomEvent('vault-switched', { detail: target }));
    return target;
  }

  async deleteVaultProfile(vaultId: string): Promise<void> {
    let profiles = await this.getVaultProfiles();
    if (profiles.length <= 1) return;
    profiles = profiles.filter(p => p.id !== vaultId);
    localStorage.setItem('chuchudu_vault_profiles', JSON.stringify(profiles));
    const activeId = localStorage.getItem('chuchudu_active_vault_id');
    if (activeId === vaultId) {
      await this.switchVault(profiles[0].id);
    }
  }

  async getActiveVaultProfile(): Promise<VaultProfile> {
    const profiles = await this.getVaultProfiles();
    const activeId = localStorage.getItem('chuchudu_active_vault_id');
    return profiles.find(p => p.id === activeId) || profiles[0];
  }

  async init() {
    if (this.initialized) return;

    if (!isTauri()) {
      try {
        const saved = localStorage.getItem('chuchudu_vault_manifest');
        if (saved) this.memoryManifest = JSON.parse(saved);
        const savedAlbums = localStorage.getItem('chuchudu_vault_albums');
        if (savedAlbums) this.memoryAlbums = JSON.parse(savedAlbums);
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

      const albumsPath = `${vaultDir}/.albums.json`;
      const hasAlbums = await exists(albumsPath);
      if (!hasAlbums) {
        await writeTextFile(albumsPath, JSON.stringify({}));
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

  // ─── Album Management ────────────────────────────────────────────────────────
  async getAlbums(): Promise<Record<string, Album>> {
    await this.init();
    if (!isTauri()) {
      try {
        const saved = localStorage.getItem('chuchudu_vault_albums');
        if (saved) return JSON.parse(saved);
      } catch {}
      return { ...this.memoryAlbums };
    }

    try {
      const vaultDir = await this.getVaultDir();
      const albumsPath = `${vaultDir}/.albums.json`;
      const hasAlbums = await exists(albumsPath);
      if (!hasAlbums) return {};
      const data = await readTextFile(albumsPath);
      return JSON.parse(data);
    } catch (e) {
      console.error('[VaultManager] Error reading albums:', e);
      return {};
    }
  }

  async saveAlbums(albums: Record<string, Album>) {
    await this.init();
    if (!isTauri()) {
      this.memoryAlbums = { ...albums };
      localStorage.setItem('chuchudu_vault_albums', JSON.stringify(albums));
      window.dispatchEvent(new CustomEvent('albums-updated'));
      return;
    }

    const vaultDir = await this.getVaultDir();
    const albumsPath = `${vaultDir}/.albums.json`;
    await writeTextFile(albumsPath, JSON.stringify(albums, null, 2));
    localStorage.setItem('chuchudu_vault_albums', JSON.stringify(albums));
    window.dispatchEvent(new CustomEvent('albums-updated'));
  }

  async createAlbum(name: string, description = '', coverFileId?: string, fileIds: string[] = [], isLocked = false, pinHash?: string): Promise<Album> {
    const albums = await this.getAlbums();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const newAlbum: Album = {
      id,
      name: name.trim(),
      description: description.trim(),
      coverFileId: coverFileId || (fileIds.length > 0 ? fileIds[0] : undefined),
      fileIds: [...fileIds],
      isLocked,
      pinHash,
      created: now,
      modified: now,
    };
    albums[id] = newAlbum;
    await this.saveAlbums(albums);
    return newAlbum;
  }

  async updateAlbum(id: string, updates: Partial<Album>): Promise<void> {
    const albums = await this.getAlbums();
    if (!albums[id]) return;
    albums[id] = {
      ...albums[id],
      ...updates,
      modified: new Date().toISOString(),
    };
    await this.saveAlbums(albums);
  }

  async deleteAlbum(id: string): Promise<void> {
    const albums = await this.getAlbums();
    if (albums[id]) {
      delete albums[id];
      await this.saveAlbums(albums);
    }
  }

  async addFilesToAlbum(albumId: string, fileIdsToAdd: string[]): Promise<void> {
    const albums = await this.getAlbums();
    const album = albums[albumId];
    if (!album) return;

    const existingSet = new Set(album.fileIds);
    fileIdsToAdd.forEach(fid => existingSet.add(fid));
    album.fileIds = Array.from(existingSet);

    // If no cover is set, use the first image as cover
    if (!album.coverFileId && album.fileIds.length > 0) {
      album.coverFileId = album.fileIds[0];
    }
    album.modified = new Date().toISOString();
    await this.saveAlbums(albums);
  }

  async removeFileFromAlbum(albumId: string, fileId: string): Promise<void> {
    const albums = await this.getAlbums();
    const album = albums[albumId];
    if (!album) return;

    album.fileIds = album.fileIds.filter(id => id !== fileId);
    if (album.coverFileId === fileId) {
      album.coverFileId = album.fileIds.length > 0 ? album.fileIds[0] : undefined;
    }
    album.modified = new Date().toISOString();
    await this.saveAlbums(albums);
  }

  async setAlbumCover(albumId: string, fileId: string): Promise<void> {
    const albums = await this.getAlbums();
    if (!albums[albumId]) return;
    albums[albumId].coverFileId = fileId;
    albums[albumId].modified = new Date().toISOString();
    await this.saveAlbums(albums);
  }

  // ─── Share Link Management ────────────────────────────────────────────────────
  async getShareLinks(): Promise<Record<string, ShareLink>> {
    await this.init();
    if (!isTauri()) return { ...this.memoryShareLinks };

    try {
      const vaultDir = await this.getVaultDir();
      const sharesPath = `${vaultDir}/.shares.json`;
      const existsShares = await exists(sharesPath);
      if (!existsShares) return {};
      const data = await readTextFile(sharesPath);
      return JSON.parse(data);
    } catch (e) {
      console.error('[VaultManager] Error reading share links:', e);
      return {};
    }
  }

  async saveShareLinks(links: Record<string, ShareLink>): Promise<void> {
    await this.init();
    if (!isTauri()) {
      this.memoryShareLinks = { ...links };
      localStorage.setItem('chuchudu_vault_shares', JSON.stringify(links));
      window.dispatchEvent(new CustomEvent('shares-updated'));
      return;
    }

    const vaultDir = await this.getVaultDir();
    const sharesPath = `${vaultDir}/.shares.json`;
    await writeTextFile(sharesPath, JSON.stringify(links, null, 2));
    window.dispatchEvent(new CustomEvent('shares-updated'));
  }

  async addShareLink(link: ShareLink): Promise<ShareLink> {
    const links = await this.getShareLinks();
    links[link.id] = link;
    await this.saveShareLinks(links);
    return link;
  }

  async updateShareLink(id: string, updates: Partial<ShareLink>): Promise<ShareLink | null> {
    const links = await this.getShareLinks();
    if (!links[id]) return null;
    links[id] = { ...links[id], ...updates };
    await this.saveShareLinks(links);
    return links[id];
  }

  async toggleShareLinkActive(id: string, active?: boolean): Promise<ShareLink | null> {
    const links = await this.getShareLinks();
    if (!links[id]) return null;
    links[id].isActive = active !== undefined ? active : !links[id].isActive;
    await this.saveShareLinks(links);
    return links[id];
  }

  async deleteShareLink(id: string): Promise<void> {
    const links = await this.getShareLinks();
    if (links[id]) {
      delete links[id];
      await this.saveShareLinks(links);
    }
  }

  // ─── File Operations ─────────────────────────────────────────────────────────
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

    // Also remove from any album containing this file
    const albums = await this.getAlbums();
    let albumsChanged = false;
    for (const alb of Object.values(albums)) {
      if (alb.fileIds.includes(id)) {
        alb.fileIds = alb.fileIds.filter(fid => fid !== id);
        if (alb.coverFileId === id) {
          alb.coverFileId = alb.fileIds.length > 0 ? alb.fileIds[0] : undefined;
        }
        albumsChanged = true;
      }
    }
    if (albumsChanged) {
      await this.saveAlbums(albums);
    }
  }

  // ─── Tag Management ──────────────────────────────────────────────────────────
  async setFileTags(fileId: string, tags: string[]): Promise<void> {
    const manifest = await this.getManifest();
    if (manifest[fileId]) {
      manifest[fileId].tags = tags;
      await this.saveManifest(manifest);
    }
  }

  // ─── 1-Click Encrypted Vault Backup & Restore ───────────────────────────────
  async exportVaultBackup(passphrase: string, onProgress?: (percent: number, status: string) => void): Promise<Uint8Array> {
    onProgress?.(10, 'Packaging vault files...');
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();

    const manifest = await this.getManifest();
    const albums = await this.getAlbums();
    const shares = await this.getShareLinks();

    zip.file('.manifest.json', JSON.stringify(manifest, null, 2));
    zip.file('.albums.json', JSON.stringify(albums, null, 2));
    zip.file('.shares.json', JSON.stringify(shares, null, 2));

    const fileList = Object.values(manifest);
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      try {
        const data = await this.readFile(file.id);
        if (data) {
          zip.file(`files/${file.id}`, data);
        }
      } catch (e) {
        console.warn(`Failed to package file ${file.name}:`, e);
      }
      onProgress?.(10 + Math.round(((i + 1) / (fileList.length || 1)) * 50), `Bundled ${file.name}`);
    }

    onProgress?.(65, 'Creating zip archive...');
    const zipBytes = await zip.generateAsync({ type: 'uint8array' });

    onProgress?.(80, 'Encrypting vault backup with AES-256...');
    const enc = new TextEncoder();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const passKey = await crypto.subtle.importKey('raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
    const aesKey = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
      passKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt']
    );

    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, aesKey, zipBytes.buffer as ArrayBuffer);

    // Pack: [Magic 8 bytes: 'CHUCHUDU'] + [Salt 16 bytes] + [IV 12 bytes] + [Ciphertext]
    const magic = enc.encode('CHUCHUDU');
    const combined = new Uint8Array(magic.length + salt.length + iv.length + ciphertext.byteLength);
    combined.set(magic, 0);
    combined.set(salt, magic.length);
    combined.set(iv, magic.length + salt.length);
    combined.set(new Uint8Array(ciphertext), magic.length + salt.length + iv.length);

    onProgress?.(100, 'Backup created successfully!');
    return combined;
  }

  async importVaultBackup(backupBytes: Uint8Array, passphrase: string, onProgress?: (percent: number, status: string) => void): Promise<{ filesRestored: number; albumsRestored: number }> {
    onProgress?.(10, 'Verifying backup header...');
    const enc = new TextEncoder();
    const dec = new TextDecoder();
    const magic = dec.decode(backupBytes.slice(0, 8));
    if (magic !== 'CHUCHUDU') {
      throw new Error('Invalid backup file format: Missing ChuChudu signature.');
    }

    const salt = backupBytes.slice(8, 24);
    const iv = backupBytes.slice(24, 36);
    const ciphertext = backupBytes.slice(36);

    onProgress?.(25, 'Decrypting vault backup...');
    const passKey = await crypto.subtle.importKey('raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
    const aesKey = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
      passKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );

    let decryptedZipBytes: ArrayBuffer;
    try {
      decryptedZipBytes = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, aesKey, ciphertext.buffer as ArrayBuffer);
    } catch {
      throw new Error('Decryption failed! Incorrect passphrase or corrupted backup.');
    }

    onProgress?.(50, 'Extracting vault archive...');
    const JSZip = (await import('jszip')).default;
    const zip = await JSZip.loadAsync(decryptedZipBytes);

    let restoredFilesCount = 0;
    let restoredAlbumsCount = 0;

    // Restore manifests
    if (zip.file('.manifest.json')) {
      const manifestStr = await zip.file('.manifest.json')!.async('string');
      const manifest = JSON.parse(manifestStr);
      await this.saveManifest(manifest);
      restoredFilesCount = Object.keys(manifest).length;
    }

    if (zip.file('.albums.json')) {
      const albumsStr = await zip.file('.albums.json')!.async('string');
      const albums = JSON.parse(albumsStr);
      await this.saveAlbums(albums);
      restoredAlbumsCount = Object.keys(albums).length;
    }

    if (zip.file('.shares.json')) {
      const sharesStr = await zip.file('.shares.json')!.async('string');
      const shares = JSON.parse(sharesStr);
      await this.saveShareLinks(shares);
    }

    // Restore files
    const fileEntries = Object.keys(zip.files).filter(p => p.startsWith('files/'));
    for (let i = 0; i < fileEntries.length; i++) {
      const entryPath = fileEntries[i];
      const fileId = entryPath.replace('files/', '');
      const fileData = await zip.file(entryPath)!.async('uint8array');
      const manifest = await this.getManifest();
      const meta = manifest[fileId] || { name: `restored_${fileId}`, mime: 'application/octet-stream', size: fileData.length, modified: new Date().toISOString(), encrypted: false, starred: false, type: 'file' };
      await this.saveFile(fileId, meta, fileData);
      onProgress?.(50 + Math.round(((i + 1) / fileEntries.length) * 50), `Restored file ${i + 1}/${fileEntries.length}`);
    }

    onProgress?.(100, 'Restore complete!');
    return { filesRestored: restoredFilesCount, albumsRestored: restoredAlbumsCount };
  }
}

export const vault = new VaultManager();

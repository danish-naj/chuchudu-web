/**
 * ChuChudu File Helpers
 * 
 * Utility functions for file size formatting, MIME type detection,
 * and file type categorization.
 */

/**
 * Format bytes into human-readable file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Get relative time string from a date
 */
export function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 172800) return 'Yesterday';
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  if (seconds < 2592000) return `${Math.floor(seconds / 604800)}w ago`;
  return date.toLocaleDateString();
}

/**
 * Get file category from MIME type
 */
export type FileCategory = 'image' | 'video' | 'audio' | 'document' | 'archive' | 'code' | 'other';

export function getFileCategory(mime: string): FileCategory {
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  if (
    mime.includes('pdf') ||
    mime.includes('doc') ||
    mime.includes('text') ||
    mime.includes('sheet') ||
    mime.includes('presentation') ||
    mime.includes('xlsx') ||
    mime.includes('pptx') ||
    mime.includes('csv')
  ) return 'document';
  if (
    mime.includes('zip') ||
    mime.includes('rar') ||
    mime.includes('tar') ||
    mime.includes('7z') ||
    mime.includes('archive') ||
    mime.includes('compressed')
  ) return 'archive';
  if (
    mime.includes('javascript') ||
    mime.includes('json') ||
    mime.includes('xml') ||
    mime.includes('html') ||
    mime.includes('css') ||
    mime.includes('python') ||
    mime.includes('java')
  ) return 'code';
  return 'other';
}

/**
 * Get a color associated with a file category
 */
export function getCategoryColor(category: FileCategory): string {
  const colors: Record<FileCategory, string> = {
    image: '#3B82F6',    // Blue
    video: '#EF4444',    // Red
    audio: '#A855F7',    // Purple
    document: '#F59E0B', // Amber
    archive: '#6B7280',  // Gray
    code: '#10B981',     // Emerald
    other: '#6B7280',    // Gray
  };
  return colors[category];
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
}

/**
 * Detect MIME type from file extension (fallback for when mime isn't available)
 */
export function getMimeFromExtension(ext: string): string {
  const mimeMap: Record<string, string> = {
    // Images
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
    gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
    ico: 'image/x-icon', bmp: 'image/bmp',
    // Videos
    mp4: 'video/mp4', webm: 'video/webm', mkv: 'video/x-matroska',
    avi: 'video/x-msvideo', mov: 'video/quicktime',
    // Audio
    mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg',
    flac: 'audio/flac', aac: 'audio/aac',
    // Documents
    pdf: 'application/pdf', doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    txt: 'text/plain', csv: 'text/csv', rtf: 'application/rtf',
    // Archives
    zip: 'application/zip', rar: 'application/x-rar-compressed',
    '7z': 'application/x-7z-compressed', tar: 'application/x-tar',
    gz: 'application/gzip',
    // Code
    js: 'text/javascript', ts: 'text/typescript', py: 'text/x-python',
    html: 'text/html', css: 'text/css', json: 'application/json',
    xml: 'application/xml',
  };
  return mimeMap[ext] || 'application/octet-stream';
}

/**
 * Truncate a filename to a maximum length, preserving extension
 */
export function truncateFilename(name: string, maxLength: number = 30): string {
  if (name.length <= maxLength) return name;
  const ext = getFileExtension(name);
  const baseName = name.slice(0, name.length - ext.length - 1);
  const truncatedBase = baseName.slice(0, maxLength - ext.length - 4) + '...';
  return ext ? `${truncatedBase}.${ext}` : truncatedBase;
}

/**
 * Generate a unique file ID
 */
export function generateFileId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Share duration options
 */
export const SHARE_DURATIONS = [
  { label: '1 hour', value: 3600 },
  { label: '6 hours', value: 21600 },
  { label: '24 hours', value: 86400 },
  { label: '7 days', value: 604800 },
  { label: '30 days', value: 2592000 },
] as const;

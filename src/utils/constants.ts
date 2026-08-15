/**
 * ChuChudu App-wide Constants
 */

export const APP_NAME = 'ChuChudu';
export const APP_TAGLINE = 'Your Files. Everywhere. Encrypted.';
export const APP_DOMAIN = 'chuchudu.in';
export const APP_VERSION = '1.0.0';

// Desktop agent API endpoint
// In production, this would be set via Cloudflare Tunnel
export const AGENT_API_URL = import.meta.env.VITE_AGENT_API_URL || 'http://localhost:3847';

// Encryption
export const ENCRYPTION_ALGORITHM = 'AES-GCM';
export const ENCRYPTION_KEY_LENGTH = 256;
export const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB

// UI
export const GRID_COLUMNS = {
  xs: 2,
  sm: 3,
  md: 4,
  lg: 5,
} as const;

export const ANIMATION_DURATIONS = {
  fast: 150,
  normal: 250,
  slow: 400,
} as const;

// File limits
export const MAX_FILE_NAME_LENGTH = 255;
export const MAX_PATH_DEPTH = 20;

// Theme
export const THEMES = ['dark', 'light', 'system'] as const;
export type Theme = typeof THEMES[number];

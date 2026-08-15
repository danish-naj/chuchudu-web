/**
 * ChuChudu Key Manager
 * 
 * Handles key derivation from user passphrase using PBKDF2,
 * and secure key storage in IndexedDB.
 * 
 * Security model:
 * - User provides a passphrase during signup
 * - Passphrase is stretched into an AES-256 master key via PBKDF2 (600K iterations)
 * - Master key is stored in IndexedDB as a non-extractable CryptoKey
 * - Individual file keys are generated randomly and wrapped with the master key
 * - Passphrase is NEVER stored — only the derived key
 * - Salt is stored alongside the key for re-derivation on other devices
 */

const DB_NAME = 'chuchudu-keystore';
const DB_VERSION = 1;
const STORE_NAME = 'keys';
const MASTER_KEY_ID = 'master-key';
const SALT_KEY_ID = 'master-salt';

// PBKDF2 parameters
const PBKDF2_ITERATIONS = 600_000; // OWASP recommended minimum
const SALT_LENGTH = 32; // 256-bit salt

/**
 * Opens the IndexedDB keystore
 */
function openKeyStore(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Stores a value in IndexedDB
 */
async function dbPut(key: string, value: unknown): Promise<void> {
  const db = await openKeyStore();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(value, key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}

/**
 * Retrieves a value from IndexedDB
 */
async function dbGet<T>(key: string): Promise<T | undefined> {
  const db = await openKeyStore();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result as T | undefined);
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}

/**
 * Deletes a value from IndexedDB
 */
async function dbDelete(key: string): Promise<void> {
  const db = await openKeyStore();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}

/**
 * Generates a random salt for PBKDF2
 */
function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
}

/**
 * Derives a master encryption key from a user passphrase using PBKDF2
 * 
 * @param passphrase - User's encryption passphrase
 * @param salt - Random salt (generated during signup, stored for re-derivation)
 * @returns Non-extractable AES-256-GCM CryptoKey
 */
export async function deriveKeyFromPassphrase(
  passphrase: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  
  // Import passphrase as key material
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  // Derive AES-256-GCM key via PBKDF2
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as unknown as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    {
      name: 'AES-GCM',
      length: 256,
    },
    false, // Non-extractable — cannot be read from JS
    ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey']
  );
}

/**
 * Sets up the master key during user registration
 * 
 * @param passphrase - User's chosen encryption passphrase
 * @returns The salt (should be stored alongside the user's auth record)
 */
export async function setupMasterKey(passphrase: string, providedSalt?: Uint8Array): Promise<Uint8Array> {
  const salt = providedSalt || generateSalt();
  const masterKey = await deriveKeyFromPassphrase(passphrase, salt);

  // Store in IndexedDB (non-extractable — safe from XSS)
  await dbPut(MASTER_KEY_ID, masterKey);
  await dbPut(SALT_KEY_ID, salt);

  return salt;
}

/**
 * Unlocks the master key on login using the passphrase
 * Re-derives the key and stores it in IndexedDB for the session
 * 
 * @param passphrase - User's encryption passphrase
 * @param salt - The salt stored during registration
 */
export async function unlockMasterKey(
  passphrase: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  const masterKey = await deriveKeyFromPassphrase(passphrase, salt);
  
  // Store for session use
  await dbPut(MASTER_KEY_ID, masterKey);
  await dbPut(SALT_KEY_ID, salt);

  return masterKey;
}

/**
 * Retrieves the current master key from IndexedDB
 * Returns undefined if not unlocked yet
 */
export async function getMasterKey(): Promise<CryptoKey | undefined> {
  return dbGet<CryptoKey>(MASTER_KEY_ID);
}

/**
 * Retrieves the stored salt
 */
export async function getStoredSalt(): Promise<Uint8Array | undefined> {
  return dbGet<Uint8Array>(SALT_KEY_ID);
}

/**
 * Locks the vault — removes the master key from IndexedDB
 * Should be called on sign-out
 */
export async function lockVault(): Promise<void> {
  await dbDelete(MASTER_KEY_ID);
  // Keep salt — needed for re-login
}

/**
 * Clears all stored keys (full reset)
 */
export async function clearKeyStore(): Promise<void> {
  await dbDelete(MASTER_KEY_ID);
  await dbDelete(SALT_KEY_ID);
}

/**
 * Checks if a master key is currently available (user is "unlocked")
 */
export async function isVaultUnlocked(): Promise<boolean> {
  const key = await getMasterKey();
  return key !== undefined;
}

/**
 * Wraps (encrypts) a file-level key with the master key
 * Used when generating per-file encryption keys
 */
export async function wrapFileKey(
  fileKey: CryptoKey,
  masterKey: CryptoKey
): Promise<ArrayBuffer> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const wrapped = await crypto.subtle.wrapKey(
    'raw',
    fileKey,
    masterKey,
    { name: 'AES-GCM', iv }
  );

  // Prepend IV to wrapped key
  const result = new Uint8Array(12 + wrapped.byteLength);
  result.set(iv, 0);
  result.set(new Uint8Array(wrapped), 12);
  return result.buffer;
}

/**
 * Unwraps (decrypts) a file-level key with the master key
 */
export async function unwrapFileKey(
  wrappedKeyData: ArrayBuffer,
  masterKey: CryptoKey,
  extractable = false
): Promise<CryptoKey> {
  const data = new Uint8Array(wrappedKeyData);
  const iv = data.slice(0, 12);
  const wrappedKey = data.slice(12);

  return crypto.subtle.unwrapKey(
    'raw',
    wrappedKey,
    masterKey,
    { name: 'AES-GCM', iv },
    { name: 'AES-GCM', length: 256 },
    extractable, // true if we need to export it for sharing URL
    ['encrypt', 'decrypt']
  );
}

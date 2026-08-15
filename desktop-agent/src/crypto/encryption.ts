/**
 * ChuChudu E2E Encryption Module
 * 
 * Uses AES-256-GCM (Galois/Counter Mode) for authenticated encryption.
 * Files are chunked before encryption to handle large files without
 * running out of memory.
 * 
 * Architecture:
 * - Each file chunk gets a unique IV (Initialization Vector)
 * - IV is prepended to each encrypted chunk (12 bytes)
 * - Chunk sequence number is included in additional authenticated data (AAD)
 *   to prevent reordering attacks
 */

const CHUNK_SIZE = 512 * 1024; // 512KB per chunk (fits comfortably in Firestore 1MB doc limit when base64 encoded)
const IV_LENGTH = 12; // 96-bit IV for AES-GCM (NIST recommended)

/**
 * Generates a cryptographically random IV
 */
function generateIV(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(IV_LENGTH));
}

/**
 * Encrypts a single chunk of data with AES-256-GCM
 * 
 * @param data - The plaintext chunk as ArrayBuffer
 * @param key - The CryptoKey for AES-GCM encryption
 * @param chunkIndex - Sequence number for AAD (prevents reordering)
 * @returns Encrypted blob with IV prepended: [IV (12 bytes)][ciphertext + auth tag]
 */
export async function encryptChunk(
  data: ArrayBuffer,
  key: CryptoKey,
  chunkIndex: number
): Promise<ArrayBuffer> {
  const iv = generateIV();
  
  // Include chunk index in additional authenticated data
  // This prevents an attacker from reordering chunks
  const aad = new TextEncoder().encode(`chuchudu-chunk-${chunkIndex}`);
  
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv as unknown as BufferSource,
      additionalData: aad as unknown as BufferSource,
      tagLength: 128, // 128-bit auth tag
    },
    key,
    data
  );

  // Prepend IV to ciphertext
  const result = new Uint8Array(IV_LENGTH + ciphertext.byteLength);
  result.set(iv, 0);
  result.set(new Uint8Array(ciphertext), IV_LENGTH);
  
  return result.buffer;
}

/**
 * Decrypts a single chunk of data with AES-256-GCM
 * 
 * @param encryptedData - The encrypted chunk with prepended IV
 * @param key - The CryptoKey for AES-GCM decryption
 * @param chunkIndex - Sequence number for AAD verification
 * @returns Decrypted plaintext as ArrayBuffer
 */
export async function decryptChunk(
  encryptedData: ArrayBuffer,
  key: CryptoKey,
  chunkIndex: number
): Promise<ArrayBuffer> {
  const dataArray = new Uint8Array(encryptedData);
  
  // Extract IV from first 12 bytes
  const iv = dataArray.slice(0, IV_LENGTH);
  const ciphertext = dataArray.slice(IV_LENGTH);
  
  // Must match the AAD used during encryption
  const aad = new TextEncoder().encode(`chuchudu-chunk-${chunkIndex}`);
  
  return crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv as unknown as BufferSource,
      additionalData: aad as unknown as BufferSource,
      tagLength: 128,
    },
    key,
    ciphertext
  );
}

/**
 * Encrypts an entire file by chunking it and encrypting each chunk
 * 
 * @param file - The File object to encrypt
 * @param key - The CryptoKey for encryption
 * @param onProgress - Progress callback (0-100)
 * @returns Array of encrypted chunks as Blobs
 */
export async function encryptFile(
  file: File,
  key: CryptoKey,
  onProgress?: (percent: number) => void
): Promise<Blob[]> {
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
  const encryptedChunks: Blob[] = [];

  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, file.size);
    const chunk = file.slice(start, end);
    const chunkBuffer = await chunk.arrayBuffer();

    const encryptedChunk = await encryptChunk(chunkBuffer, key, i);
    encryptedChunks.push(new Blob([encryptedChunk]));

    if (onProgress) {
      onProgress(Math.round(((i + 1) / totalChunks) * 100));
    }
  }

  return encryptedChunks;
}

/**
 * Decrypts an array of encrypted chunks back into the original file
 * 
 * @param encryptedChunks - Array of encrypted Blobs
 * @param key - The CryptoKey for decryption
 * @param fileName - Original filename for the resulting File object
 * @param mimeType - MIME type for the resulting File object
 * @param onProgress - Progress callback (0-100)
 * @returns Decrypted File object
 */
export async function decryptFile(
  encryptedChunks: Blob[],
  key: CryptoKey,
  fileName: string,
  mimeType: string,
  onProgress?: (percent: number) => void
): Promise<File> {
  const decryptedChunks: ArrayBuffer[] = [];

  for (let i = 0; i < encryptedChunks.length; i++) {
    const chunkBuffer = await encryptedChunks[i].arrayBuffer();
    const decryptedChunk = await decryptChunk(chunkBuffer, key, i);
    decryptedChunks.push(decryptedChunk);

    if (onProgress) {
      onProgress(Math.round(((i + 1) / encryptedChunks.length) * 100));
    }
  }

  return new File(decryptedChunks, fileName, { type: mimeType });
}

/**
 * Generates a random AES-256 key (for file-level encryption)
 * Non-extractable for security
 */
export async function generateFileKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true, // Must be extractable so we can wrap it with the master key!
    ['encrypt', 'decrypt']
  );
}

/**
 * Exports a CryptoKey to raw bytes (for wrapping/sharing)
 * Only works if the key was created with extractable: true
 */
export async function exportKey(key: CryptoKey): Promise<ArrayBuffer> {
  return crypto.subtle.exportKey('raw', key);
}

/**
 * Imports raw key bytes back into a CryptoKey
 */
export async function importKey(
  keyData: ArrayBuffer,
  extractable = false
): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-GCM', length: 256 },
    extractable,
    ['encrypt', 'decrypt']
  );
}

/**
 * Quick helper to encrypt a string (for metadata encryption)
 */
export async function encryptString(
  plaintext: string,
  key: CryptoKey
): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);
  return encryptChunk(data.buffer, key, 0);
}

/**
 * Quick helper to decrypt a string
 */
export async function decryptString(
  encryptedData: ArrayBuffer,
  key: CryptoKey
): Promise<string> {
  const decrypted = await decryptChunk(encryptedData, key, 0);
  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

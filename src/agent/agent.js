import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer } from 'ws';
import chokidar from 'chokidar';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define the Sync folder in the project root for MVP
const SYNC_DIR = path.join(__dirname, '../../Sync');

// Ensure Sync directory exists
if (!fs.existsSync(SYNC_DIR)) {
  fs.mkdirSync(SYNC_DIR, { recursive: true });
}

console.log(`\n🚀 ChuChudu Desktop Sync Agent`);
console.log(`Watching folder: ${SYNC_DIR}\n`);

// Create WebSocket server
const wss = new WebSocketServer({ port: 8080 });

let connectedClient = null;

wss.on('connection', (ws) => {
  console.log('✅ Web Dashboard connected to Sync Agent.');
  connectedClient = ws;

  ws.on('close', () => {
    console.log('❌ Web Dashboard disconnected.');
    connectedClient = null;
  });
});

// Setup Chokidar watcher
const watcher = chokidar.watch(SYNC_DIR, {
  ignored: /(^|[\/\\])\../, // ignore dotfiles
  persistent: true,
  ignoreInitial: true // Only watch for new files dropped after starting
});

watcher.on('add', async (filePath) => {
  const fileName = path.basename(filePath);
  console.log(`\n📥 Detected new file: ${fileName}`);
  
  if (!connectedClient) {
    console.log(`⚠️  Dashboard not connected. Ignoring file.`);
    return;
  }

  try {
    // Read the file buffer
    const buffer = fs.readFileSync(filePath);
    
    // Guess MIME type purely from extension for MVP
    let mimeType = 'application/octet-stream';
    if (fileName.endsWith('.jpg') || fileName.endsWith('.jpeg')) mimeType = 'image/jpeg';
    else if (fileName.endsWith('.png')) mimeType = 'image/png';
    else if (fileName.endsWith('.mp4')) mimeType = 'video/mp4';
    else if (fileName.endsWith('.pdf')) mimeType = 'application/pdf';

    // Send the file over WebSocket as a Base64 JSON payload
    console.log(`📤 Sending ${fileName} to Dashboard for encryption...`);
    
    connectedClient.send(JSON.stringify({
      type: 'SYNC_FILE',
      name: fileName,
      mime: mimeType,
      size: buffer.length,
      dataBase64: buffer.toString('base64')
    }));

    // Optionally delete the original file after syncing? 
    // We'll leave it for now so the user doesn't lose it unexpectedly.
    console.log(`✅ ${fileName} streamed successfully.`);

  } catch (err) {
    console.error(`❌ Failed to read or send file ${fileName}:`, err);
  }
});

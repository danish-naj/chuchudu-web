import { useState, useEffect } from 'react';

// Helper to convert base64 back to a Blob/File
function base64ToFile(base64Data: string, fileName: string, mimeType: string): File {
  const byteCharacters = atob(base64Data);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new File([byteArray], fileName, { type: mimeType });
}

export function useSyncAgent(onFileReceived: (file: File) => Promise<void>) {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let ws: WebSocket;
    let reconnectTimer: any;

    const connect = () => {
      ws = new WebSocket('ws://localhost:8080');

      ws.onopen = () => {
        console.log("Connected to Desktop Sync Agent");
        setConnected(true);
      };

      ws.onmessage = async (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'SYNC_FILE') {
            console.log(`Received file from Sync Agent: ${payload.name}`);
            const file = base64ToFile(payload.dataBase64, payload.name, payload.mime);
            await onFileReceived(file);
          }
        } catch (err) {
          console.error("Error processing sync message", err);
        }
      };

      ws.onclose = () => {
        setConnected(false);
        // Attempt to reconnect every 3 seconds
        reconnectTimer = setTimeout(connect, 3000);
      };

      ws.onerror = (err) => {
        // Will trigger onclose automatically
        // console.error("WebSocket error", err);
      };
    };

    connect();

    return () => {
      clearTimeout(reconnectTimer);
      if (ws) ws.close();
    };
  }, [onFileReceived]);

  return { connected };
}

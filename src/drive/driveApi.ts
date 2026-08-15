/**
 * Google Drive API Client
 * Used for buffering uploads and hosting shared files.
 */

const UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
const DRIVE_API_URL = 'https://www.googleapis.com/drive/v3/files';

export class DriveClient {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  /**
   * Uploads a chunk or file to Google Drive.
   * We use the multipart upload type to send metadata and file content together.
   */
  async uploadFile(blob: Blob, name: string, parentFolderId?: string): Promise<string> {
    const metadata = {
      name,
      parents: parentFolderId ? [parentFolderId] : [],
      // appProperties can be used to tag our chunks so we can easily find them
      appProperties: {
        chuchudu: 'true'
      }
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', blob);

    const res = await fetch(UPLOAD_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`
      },
      body: form
    });

    if (!res.ok) {
      throw new Error(`Drive upload failed: ${res.statusText}`);
    }

    const data = await res.json();
    return data.id; // The Google Drive file ID
  }

  /**
   * Gets a specific file's content
   */
  async getFile(driveFileId: string): Promise<Blob> {
    const res = await fetch(`${DRIVE_API_URL}/${driveFileId}?alt=media`, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`
      }
    });

    if (!res.ok) throw new Error(`Drive download failed: ${res.statusText}`);
    return await res.blob();
  }

  /**
   * Finds the "Chuchudu Buffer" folder, creating it if it doesn't exist.
   */
  async getOrCreateBufferFolder(): Promise<string> {
    // 1. Search for folder
    const query = encodeURIComponent("mimeType='application/vnd.google-apps.folder' and name='Chuchudu_Buffer' and trashed=false");
    const searchRes = await fetch(`${DRIVE_API_URL}?q=${query}&fields=files(id,name)`, {
      headers: { Authorization: `Bearer ${this.accessToken}` }
    });
    const searchData = await searchRes.json();
    
    if (searchData.files && searchData.files.length > 0) {
      return searchData.files[0].id;
    }

    // 2. Create if not found
    const createRes = await fetch(DRIVE_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'Chuchudu_Buffer',
        mimeType: 'application/vnd.google-apps.folder'
      })
    });
    
    const createData = await createRes.json();
    return createData.id;
  }

  /**
   * Generates a public web content link for sharing
   */
  async makePublicAndGetLink(driveFileId: string): Promise<string> {
    // 1. Create public permission
    await fetch(`${DRIVE_API_URL}/${driveFileId}/permissions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        role: 'reader',
        type: 'anyone'
      })
    });

    // 2. Fetch the webContentLink
    const res = await fetch(`${DRIVE_API_URL}/${driveFileId}?fields=webContentLink,id`, {
      headers: { Authorization: `Bearer ${this.accessToken}` }
    });
    const data = await res.json();
    return data.id; // We return the ID, the downloader can use the Drive API or direct link
  }
}

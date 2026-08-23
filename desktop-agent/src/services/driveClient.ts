/**
 * Google Drive API Client for Desktop Agent
 * Used for buffering uploads and hosting shared files.
 */

const UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
const DRIVE_API_URL = 'https://www.googleapis.com/drive/v3/files';

export class DriveClient {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  async uploadFile(blob: Blob, name: string, parentFolderId?: string): Promise<string> {
    const metadata = {
      name,
      parents: parentFolderId ? [parentFolderId] : [],
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
    return data.id;
  }

  async getFile(driveFileId: string): Promise<Blob> {
    const res = await fetch(`${DRIVE_API_URL}/${driveFileId}?alt=media`, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`
      }
    });

    if (!res.ok) throw new Error(`Drive download failed: ${res.statusText}`);
    return await res.blob();
  }

  async getOrCreateBufferFolder(): Promise<string> {
    const query = encodeURIComponent("mimeType='application/vnd.google-apps.folder' and name='Chuchudu_Buffer' and trashed=false");
    const searchRes = await fetch(`${DRIVE_API_URL}?q=${query}&fields=files(id,name)`, {
      headers: { Authorization: `Bearer ${this.accessToken}` }
    });
    const searchData = await searchRes.json();
    
    if (searchData.files && searchData.files.length > 0) {
      return searchData.files[0].id;
    }

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

  async makePublicAndGetLink(driveFileId: string): Promise<string> {
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

    return driveFileId;
  }

  async deleteFile(driveFileId: string): Promise<void> {
    try {
      await fetch(`${DRIVE_API_URL}/${driveFileId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${this.accessToken}`
        }
      });
    } catch {}
  }
}

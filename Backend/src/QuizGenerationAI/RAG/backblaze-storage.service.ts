import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import { BlobStorage } from './rag.interfaces';

interface B2Authorization {
  authorizationToken: string;
  apiUrl: string;
  downloadUrl: string;
  allowed?: { bucketId?: string; bucketName?: string };
}
interface B2File {
  fileId: string;
  fileName: string;
  contentLength: number;
  action: string;
}
interface B2FilePage {
  files: B2File[];
  nextFileName: string | null;
  nextFileId?: string | null;
}

export class StorageProviderError extends Error {
  constructor(
    public readonly operation: string,
    public readonly status: number,
  ) {
    super(`Storage operation ${operation} failed (${status})`);
    this.name = 'StorageProviderError';
  }
}

@Injectable()
export class BackblazeStorageService implements BlobStorage {
  private readonly b2Key: string;
  private readonly b2KeyId: string;
  private readonly b2BucketName: string | undefined;
  private readonly b2BucketId: string | undefined;

  constructor(config: ConfigService) {
    this.b2Key =
      config.get<string>('B2_APPLICATION_KEY') ||
      config.get<string>('BlackBlaze_Key') ||
      config.get<string>('BLACKBLAZE_Key') ||
      config.getOrThrow<string>('B2_KEY');
    this.b2KeyId =
      config.get<string>('B2_KEY_ID') ||
      config.getOrThrow<string>('B2_APPLICATION_KEY_ID');
    this.b2BucketName = config.get<string>('B2_BUCKET_NAME');
    this.b2BucketId = config.get<string>('B2_BUCKET_ID');
  }

  async uploadFile(file: Express.Multer.File, key: string): Promise<void> {
    const mimeType = file.mimetype || 'b2/x-auto';
    await this.uploadBuffer(file.buffer, key, mimeType);
  }

  async uploadBase64(base64: string, key: string): Promise<void> {
    const buffer = Buffer.from(base64, 'utf-8');
    await this.uploadBuffer(buffer, key, 'text/plain');
  }

  private async uploadBuffer(buffer: Buffer, key: string, mimeType: string): Promise<void> {
    const auth = await this.authorize();
    const upload = await this.request<{
      uploadUrl: string;
      authorizationToken: string;
    }>(auth, 'b2_get_upload_url', {
      bucketId: this.bucketId(auth),
    });
    
    const response = await fetch(upload.uploadUrl, {
      method: 'POST',
      signal: AbortSignal.timeout(120000),
      headers: {
        Authorization: upload.authorizationToken,
        'X-Bz-File-Name': encodeURIComponent(key),
        'Content-Type': mimeType,
        'Content-Length': String(buffer.length),
        'X-Bz-Content-Sha1': createHash('sha1').update(buffer).digest('hex'),
      },
      body: new Uint8Array(buffer),
    });
    
    if (!response.ok) throw new StorageProviderError('upload', response.status);
    await response.arrayBuffer();
  }

  async downloadUrl(key: string): Promise<string> {
    const auth = await this.authorize();
    const bucketName = this.b2BucketName || auth.allowed?.bucketName;
    if (!bucketName) throw new Error('B2_BUCKET_NAME is required');
    const token = await this.request<{ authorizationToken: string }>(
      auth,
      'b2_get_download_authorization',
      {
        bucketId: this.bucketId(auth),
        fileNamePrefix: key,
        validDurationInSeconds: 900,
        b2ContentDisposition: 'attachment',
      },
    );
    const url = new URL(
      `${auth.downloadUrl}/file/${encodeURIComponent(bucketName)}/${key.split('/').map(encodeURIComponent).join('/')}`,
    );
    url.searchParams.set('Authorization', token.authorizationToken);
    url.searchParams.set('b2ContentDisposition', 'attachment');
    return url.toString();
  }

  async downloadBase64(key: string): Promise<string> {
    const url = await this.downloadUrl(key);
    const response = await fetch(url);
    if (!response.ok) throw new StorageProviderError('downloadBase64', response.status);
    return await response.text();
  }

  async deleteFile(key: string): Promise<void> {
    const auth = await this.authorize();
    let startFileName: string | null = null;
    let startFileId: string | null = null;
    do {
      const page: B2FilePage = await this.request<B2FilePage>(
        auth,
        'b2_list_file_versions',
        {
          bucketId: this.bucketId(auth),
          prefix: key,
          startFileName,
          startFileId,
          maxFileCount: 1000,
        },
      );
      for (const file of page.files) {
        if (file.fileName !== key) continue;
        await this.request(auth, 'b2_delete_file_version', {
          fileName: key,
          fileId: file.fileId,
        });
      }
      startFileName = page.nextFileName;
      startFileId = page.nextFileId ?? null;
    } while (startFileName);
  }

  async deleteFolder(prefix: string): Promise<void> {
    const auth = await this.authorize();
    let startFileName: string | null = null;
    let startFileId: string | null = null;
    do {
      const page: B2FilePage = await this.request<B2FilePage>(
        auth,
        'b2_list_file_versions',
        {
          bucketId: this.bucketId(auth),
          prefix,
          startFileName,
          startFileId,
          maxFileCount: 1000,
        },
      );
      for (const file of page.files) {
        if (!file.fileName.startsWith(prefix)) continue;
        await this.request(auth, 'b2_delete_file_version', {
          fileName: file.fileName,
          fileId: file.fileId,
        }).catch(() => {}); // best effort delete
      }
      startFileName = page.nextFileName;
      startFileId = page.nextFileId ?? null;
    } while (startFileName);
  }

  private async authorize(): Promise<B2Authorization> {
    const response = await fetch(
      'https://api.backblazeb2.com/b2api/v2/b2_authorize_account',
      {
        signal: AbortSignal.timeout(30000),
        headers: {
          Authorization:
            'Basic ' +
            Buffer.from(`${this.b2KeyId}:${this.b2Key}`).toString('base64'),
        },
      },
    );
    if (!response.ok)
      throw new StorageProviderError('authorization', response.status);
    return (await response.json()) as B2Authorization;
  }

  private async request<T>(
    auth: B2Authorization,
    operation: string,
    body: object,
  ): Promise<T> {
    const response = await fetch(`${auth.apiUrl}/b2api/v2/${operation}`, {
      method: 'POST',
      signal: AbortSignal.timeout(30000),
      headers: {
        Authorization: auth.authorizationToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!response.ok)
      throw new StorageProviderError(operation, response.status);
    return (await response.json()) as T;
  }

  private bucketId(auth: B2Authorization): string {
    const id = this.b2BucketId || auth.allowed?.bucketId;
    if (!id)
      throw new Error(
        'B2_BUCKET_ID is required for an unrestricted application key',
      );
    return id;
  }
}

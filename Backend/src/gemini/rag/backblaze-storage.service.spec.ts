import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import {
  BackblazeStorageService,
  StorageProviderError,
} from './backblaze-storage.service';
import { QuotaExceededError, TEACHER_QUOTA_BYTES } from './note.errors';

describe('BackblazeStorageService (native B2)', () => {
  const key = 'teachers/teacher-1/notes/id-notes.txt';
  const auth = {
    authorizationToken: 'account-token',
    apiUrl: 'https://api.example',
    downloadUrl: 'https://download.example',
    allowed: { bucketId: 'bucket', bucketName: 'private-notes' },
  };
  const file = {
    buffer: Buffer.from('12345'),
    size: 1,
    mimetype: 'text/plain',
  } as Express.Multer.File;
  let fetchMock: jest.SpyInstance<
    ReturnType<typeof fetch>,
    Parameters<typeof fetch>
  >;
  beforeEach(() => {
    fetchMock = jest.spyOn(globalThis, 'fetch');
  });
  afterEach(() => jest.restoreAllMocks());
  function respond(value: unknown, status = 200) {
    return Promise.resolve(new Response(JSON.stringify(value), { status }));
  }
  function setup() {
    const query = jest.fn().mockResolvedValue([]);
    const database = {
      transaction: jest.fn(
        async (fn: (manager: { query: typeof query }) => Promise<unknown>) =>
          fn({ query }),
      ),
    };
    const service = new BackblazeStorageService(
      new ConfigService({ B2_KEY_ID: 'key-id', B2_APPLICATION_KEY: 'key' }),
      database as unknown as DataSource,
    );
    return { service, query };
  }
  it('counts all pages under the complete teacher prefix', async () => {
    fetchMock
      .mockImplementationOnce(() => respond(auth))
      .mockImplementationOnce(() =>
        respond({
          files: [{ contentLength: 15 }],
          nextFileName: 'teachers/teacher-1/next',
        }),
      )
      .mockImplementationOnce(() =>
        respond({ files: [{ contentLength: 25 }], nextFileName: null }),
      );
    const { service } = setup();
    await expect(service.usage('teacher-1')).resolves.toBe(40);
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://api.example/b2api/v2/b2_list_file_names',
      expect.objectContaining({
        body: JSON.stringify({
          bucketId: 'bucket',
          prefix: 'teachers/teacher-1/',
          startFileName: null,
          maxFileCount: 1000,
        }),
      }),
    );
    const secondPage = JSON.parse(
      (fetchMock.mock.calls[2][1] as RequestInit).body as string,
    ) as { startFileName: string };
    expect(secondPage.startFileName).toBe('teachers/teacher-1/next');
  });
  it('rejects uploads over quota using actual buffer bytes', async () => {
    const { service } = setup();
    jest.spyOn(service, 'usage').mockResolvedValue(TEACHER_QUOTA_BYTES - 4);
    await expect(
      service.uploadFile(file, 'teacher-1', key),
    ).rejects.toBeInstanceOf(QuotaExceededError);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('allows the exact quota boundary and uses the original native upload protocol', async () => {
    const { service, query } = setup();
    jest.spyOn(service, 'usage').mockResolvedValue(TEACHER_QUOTA_BYTES - 5);
    fetchMock
      .mockImplementationOnce(() => respond(auth))
      .mockImplementationOnce(() =>
        respond({
          uploadUrl: 'https://upload.example',
          authorizationToken: 'upload-token',
        }),
      )
      .mockImplementationOnce(() => respond({ fileId: 'b2-version-id' }));
    await service.uploadFile(file, 'teacher-1', key);
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('pg_advisory_xact_lock'),
      ['notes-quota:teacher-1'],
    );
    expect(fetchMock).toHaveBeenLastCalledWith(
      'https://upload.example',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'X-Bz-File-Name': encodeURIComponent(key),
          'Content-Length': '5',
        }) as Record<string, string>,
      }),
    );
  });
  it('does not inspect usage before obtaining the quota lock', async () => {
    const { service, query } = setup();
    let unlock!: () => void;
    query.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          unlock = resolve;
        }),
    );
    const usage = jest
      .spyOn(service, 'usage')
      .mockResolvedValue(TEACHER_QUOTA_BYTES);
    const operation = service.uploadFile(file, 'teacher-1', key);
    expect(usage).not.toHaveBeenCalled();
    unlock();
    await expect(operation).rejects.toBeInstanceOf(QuotaExceededError);
  });
  it('fails closed on listing/provider failures', async () => {
    const { service } = setup();
    fetchMock.mockImplementationOnce(() => respond({}, 503));
    await expect(
      service.uploadFile(file, 'teacher-1', key),
    ).rejects.toBeInstanceOf(StorageProviderError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it('issues a 15-minute filename-scoped token, never an account token', async () => {
    const { service } = setup();
    fetchMock
      .mockImplementationOnce(() => respond(auth))
      .mockImplementationOnce(() =>
        respond({ authorizationToken: 'download-token' }),
      );
    const url = new URL(await service.downloadUrl('teacher-1', key));
    expect(url.searchParams.get('Authorization')).toBe('download-token');
    expect(url.pathname).toBe(`/file/private-notes/${key}`);
    const request = JSON.parse(
      (fetchMock.mock.calls[1][1] as RequestInit).body as string,
    ) as object;
    expect(request).toEqual({
      bucketId: 'bucket',
      fileNamePrefix: key,
      validDurationInSeconds: 900,
      b2ContentDisposition: 'attachment',
    });
  });
  it('removes every exact-key version and ignores prefix-neighbor files', async () => {
    const { service } = setup();
    fetchMock
      .mockImplementationOnce(() => respond(auth))
      .mockImplementationOnce(() =>
        respond({
          files: [
            { fileName: key, fileId: 'v1' },
            { fileName: `${key}-other`, fileId: 'foreign' },
          ],
          nextFileName: key,
          nextFileId: 'v2',
        }),
      )
      .mockImplementationOnce(() => respond({}))
      .mockImplementationOnce(() =>
        respond({
          files: [{ fileName: key, fileId: 'v2' }],
          nextFileName: null,
        }),
      )
      .mockImplementationOnce(() => respond({}));
    await service.deleteFile('teacher-1', key);
    const deletes = fetchMock.mock.calls.filter(
      ([url]) =>
        typeof url === 'string' && url.endsWith('b2_delete_file_version'),
    );
    expect(
      deletes.map(
        ([, init]) =>
          JSON.parse((init as RequestInit).body as string) as object,
      ),
    ).toEqual([
      { fileName: key, fileId: 'v1' },
      { fileName: key, fileId: 'v2' },
    ]);
  });
  it('rejects foreign keys and invalid teacher identifiers before network calls', async () => {
    const { service } = setup();
    await expect(service.downloadUrl('teacher-2', key)).rejects.toThrow(
      'ownership',
    );
    await expect(service.usage('../teacher-1')).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

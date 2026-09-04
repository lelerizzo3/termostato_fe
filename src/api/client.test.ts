import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiRequest, UnauthorizedError } from './client';
import { clearApiKey, getApiKey, saveApiKey } from '../auth/apiKeyStore';

describe('api client', () => {
  beforeEach(() => {
    clearApiKey();
    vi.restoreAllMocks();
  });

  it('invia X-API-Key e JSON', async () => {
    saveApiKey('test-key');
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'content-type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(apiRequest<{ ok: boolean }>('/stato')).resolves.toEqual({ ok: true });
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(new Headers(init.headers).get('X-API-Key')).toBe('test-key');
  });

  it('cancella la chiave e solleva UnauthorizedError su 401', async () => {
    saveApiKey('invalid-key');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: 'API key non valida' }), { status: 401, headers: { 'content-type': 'application/json' } })));

    await expect(apiRequest('/stato')).rejects.toBeInstanceOf(UnauthorizedError);
    expect(getApiKey()).toBeNull();
  });
});

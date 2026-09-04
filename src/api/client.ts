import { clearApiKey, getApiKey, notifyApiKeyInvalid } from '../auth/apiKeyStore';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '/termostato/api').replace(/\/$/, '');

export class ApiRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly payload?: unknown
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

export class UnauthorizedError extends ApiRequestError {
  constructor(payload?: unknown) {
    super('API-key mancante o non valida', 401, payload);
    this.name = 'UnauthorizedError';
  }
}

async function parsePayload(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) return undefined;
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

function messageFromPayload(payload: unknown, fallback: string): string {
  if (typeof payload === 'object' && payload !== null && 'message' in payload) {
    const message = (payload as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) return message;
  }
  if (typeof payload === 'object' && payload !== null && 'error' in payload) {
    const error = (payload as { error?: unknown }).error;
    if (typeof error === 'string' && error.trim()) return error;
  }
  return fallback;
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const apiKey = getApiKey();
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (apiKey) headers.set('X-API-Key', apiKey);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  } catch {
    throw new ApiRequestError('Impossibile raggiungere il backend', 0);
  }

  const payload = await parsePayload(response);
  if (response.status === 401) {
    clearApiKey();
    notifyApiKeyInvalid();
    throw new UnauthorizedError(payload);
  }
  if (!response.ok) {
    throw new ApiRequestError(
      messageFromPayload(payload, `Errore del backend (${response.status})`),
      response.status,
      payload
    );
  }
  if (response.status === 204) return undefined as T;
  return payload as T;
}

export function apiBaseUrl(): string {
  return API_BASE_URL;
}

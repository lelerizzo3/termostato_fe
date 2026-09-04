export const API_KEY_STORAGE_KEY = 'termostato.apiKey';
export const API_KEY_INVALID_EVENT = 'termostato:api-key-invalid';

export function getApiKey(): string | null {
  return window.localStorage.getItem(API_KEY_STORAGE_KEY);
}

export function saveApiKey(value: string): void {
  window.localStorage.setItem(API_KEY_STORAGE_KEY, value.trim());
}

export function clearApiKey(): void {
  window.localStorage.removeItem(API_KEY_STORAGE_KEY);
}

export function maskApiKey(value: string | null): string {
  if (!value) return 'Non impostata';
  if (value.length <= 4) return '••••';
  return `••••••••${value.slice(-4)}`;
}

export function notifyApiKeyInvalid(): void {
  window.dispatchEvent(new Event(API_KEY_INVALID_EVENT));
}

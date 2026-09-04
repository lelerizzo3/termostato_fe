import { FormEvent, ReactNode, useEffect, useState } from 'react';
import { getHealth } from '../api/endpoints';
import { ApiRequestError, UnauthorizedError } from '../api/client';
import {
  API_KEY_INVALID_EVENT,
  clearApiKey,
  getApiKey,
  saveApiKey
} from './apiKeyStore';

interface ApiKeyGateProps {
  children: ReactNode;
}

export function ApiKeyGate({ children }: ApiKeyGateProps) {
  const [hasKey, setHasKey] = useState(() => Boolean(getApiKey()));

  useEffect(() => {
    const handleInvalid = () => setHasKey(false);
    window.addEventListener(API_KEY_INVALID_EVENT, handleInvalid);
    return () => window.removeEventListener(API_KEY_INVALID_EVENT, handleInvalid);
  }, []);

  if (!hasKey) {
    return <ApiKeyEntry onAuthenticated={() => setHasKey(true)} />;
  }

  return <>{children}</>;
}

function ApiKeyEntry({ onAuthenticated }: { onAuthenticated: () => void }) {
  const [value, setValue] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const key = value.trim();
    if (!key) {
      setError('Inserisci una API-key.');
      return;
    }

    setError(null);
    setIsChecking(true);
    saveApiKey(key);
    try {
      await getHealth();
      onAuthenticated();
    } catch (cause) {
      clearApiKey();
      if (cause instanceof UnauthorizedError) {
        setError('API-key non valida o non autorizzata.');
      } else if (cause instanceof ApiRequestError) {
        setError(cause.status === 0 ? cause.message : `Backend non disponibile: ${cause.message}`);
      } else {
        setError('Impossibile verificare la API-key.');
      }
    } finally {
      setIsChecking(false);
    }
  }

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-slate-900 px-4 py-8">
      <section className="app-card w-full max-w-md">
        <div className="mb-5 text-center text-5xl" aria-hidden="true">🔒</div>
        <h1 className="text-center text-2xl font-bold text-slate-100">Inserisci la API-key</h1>
        <p className="mt-3 text-center text-sm leading-6 text-slate-400">
          La chiave viene verificata con il backend e salvata solo nel browser di questo dispositivo.
        </p>
        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="field-label">X-API-Key</span>
            <input
              className="field-input field-input-left mt-2"
              type="password"
              autoComplete="off"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              placeholder="Chiave autorizzata"
              autoFocus
            />
          </label>
          {error && (
            <p className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200" role="alert">
              {error}
            </p>
          )}
          <button className="btn-primary w-full" type="submit" disabled={isChecking}>
            {isChecking ? 'Verifica in corso…' : 'Accedi'}
          </button>
        </form>
      </section>
    </main>
  );
}

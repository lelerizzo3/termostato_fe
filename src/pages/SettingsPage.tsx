import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiRequestError, UnauthorizedError } from '../api/client';
import { getHealth } from '../api/endpoints';
import { clearApiKey, getApiKey, notifyApiKeyInvalid, saveApiKey, maskApiKey } from '../auth/apiKeyStore';
import { InlineNotice } from '../components/common/States';

export function SettingsPage() {
  const [currentKey, setCurrentKey] = useState(() => getApiKey());
  const [newKey, setNewKey] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  async function replaceKey() {
    const value = newKey.trim();
    if (!value) {
      setError('Inserisci una nuova API-key.');
      return;
    }
    setMessage(null);
    setError(null);
    setChecking(true);
    saveApiKey(value);
    try {
      await getHealth();
      setCurrentKey(value);
      setNewKey('');
      setMessage('API-key salvata e verificata.');
    } catch (cause) {
      if (cause instanceof UnauthorizedError) {
        setError('La nuova API-key non è autorizzata.');
      } else if (cause instanceof ApiRequestError) {
        setError(cause.message);
      } else {
        setError('Impossibile verificare la nuova API-key.');
      }
      clearApiKey();
      setCurrentKey(null);
    } finally {
      setChecking(false);
    }
  }

  function removeKey() {
    clearApiKey();
    setCurrentKey(null);
    notifyApiKeyInvalid();
  }

  return (
    <div className="space-y-4">
      {message && <InlineNotice tone="success">{message}</InlineNotice>}
      {error && <InlineNotice tone="warning">{error}</InlineNotice>}

      <section className="app-card">
        <h2 className="section-title">API-key</h2>
        <div className="flex items-center justify-between border-b border-slate-700 py-3">
          <span className="field-label">Stato</span>
          <span className={`rounded-full px-3 py-1 text-sm font-semibold ${currentKey ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-700 text-slate-300'}`}>
            {currentKey ? 'Impostata' : 'Non impostata'}
          </span>
        </div>
        <div className="flex items-center justify-between py-3">
          <span className="field-label">Chiave</span>
          <span className="font-mono text-sm text-slate-200">{maskApiKey(currentKey)}</span>
        </div>
        <p className="text-xs leading-5 text-slate-400">La chiave resta nel localStorage di questo dispositivo e non viene mostrata nei log.</p>
      </section>

      <section className="app-card">
        <h2 className="section-title">Sostituisci chiave</h2>
        <label className="block">
          <span className="field-label">Nuova API-key</span>
          <input
            className="field-input field-input-left mt-2"
            type="password"
            autoComplete="off"
            value={newKey}
            onChange={(event) => setNewKey(event.target.value)}
            placeholder="Inserisci la nuova chiave"
          />
        </label>
        <button className="btn-primary mt-4 w-full" type="button" onClick={replaceKey} disabled={checking}>
          {checking ? 'Verifica in corso…' : 'Salva e verifica'}
        </button>
      </section>

      <section className="app-card">
        <h2 className="section-title">Impostazioni applicative</h2>
        <p className="text-sm leading-5 text-slate-400">Modifica soglia, override, polling, notifiche e parametri di conservazione.</p>
        <Link className="btn-secondary mt-4 block w-full text-center" to="/config">Apri configurazione</Link>
      </section>

      <button className="btn-danger w-full" type="button" onClick={removeKey} disabled={!currentKey}>
        Rimuovi chiave da questo dispositivo
      </button>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useCurrentState } from '../hooks/useApi';
import { formatTemperature, localNowTime } from '../lib/datetime';
import { ErrorState, LoadingState } from '../components/common/States';

export function StatusPage() {
  const state = useCurrentState();
  const [lastRefresh, setLastRefresh] = useState(() => localNowTime());

  useEffect(() => {
    if (state.dataUpdatedAt) setLastRefresh(new Date(state.dataUpdatedAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
  }, [state.dataUpdatedAt]);

  async function refresh() {
    await state.refetch();
  }

  if (state.isLoading) return <LoadingState label="Lettura sensore e relay…" />;
  if (state.isError || !state.data) return <ErrorState error={state.error} onRetry={refresh} />;

  return (
    <div className="space-y-4">
      <section className="app-card border-orange-500 bg-slate-800 text-center">
        <p className="section-title">Temperatura ambiente</p>
        <p className="text-6xl font-bold tracking-tight text-slate-100">
          {state.data.temperatura.toFixed(1)} <span className="text-2xl font-medium text-slate-400">°C</span>
        </p>
        <p className="mt-2 text-sm text-slate-400">Lettura corrente dal sensore</p>
      </section>

      <section className="app-card">
        <h2 className="section-title">Stato termostato</h2>
        <div className="flex items-center justify-between border-b border-slate-700 py-3">
          <span className="field-label">Target attivo</span>
          <strong className="text-lg text-slate-100">{formatTemperature(state.data.temperatura_target)}</strong>
        </div>
        <div className="flex items-center justify-between py-3">
          <span className="field-label">Relay caldaia</span>
          <span className={`rounded-full px-3 py-1 text-sm font-bold ${state.data.relay_acceso ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-700 text-slate-300'}`}>
            {state.data.relay_acceso ? 'ACCESO' : 'SPENTO'}
          </span>
        </div>
        {state.data.temperatura_target === null && (
          <p className="mt-2 rounded-xl bg-slate-700/60 px-3 py-2 text-sm text-slate-300">
            Nessun target attivo: il calendario non prevede riscaldamento in questo momento.
          </p>
        )}
      </section>

      <section className="app-card">
        <h2 className="section-title">Aggiornamento</h2>
        <div className="flex items-center justify-between py-2">
          <span className="field-label">Ultima lettura</span>
          <strong className="text-lg text-slate-100">{lastRefresh}</strong>
        </div>
        <p className="mt-2 text-xs leading-5 text-slate-400">
          Orario locale del dispositivo. Il servizio `/stato` non restituisce un timestamp backend.
        </p>
        <button className="btn-primary mt-4 w-full" type="button" onClick={refresh} disabled={state.isFetching}>
          {state.isFetching ? 'Aggiornamento…' : '↻ Aggiorna'}
        </button>
      </section>

      <section className="app-card">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-slate-300">Nessun comando relay disponibile</span>
          <span className="rounded-md border border-slate-600 px-2 py-1 text-xs text-slate-400">sola lettura</span>
        </div>
        <p className="mt-2 text-sm leading-5 text-slate-400">Per modificare il comportamento usa configurazione e calendario.</p>
      </section>
    </div>
  );
}

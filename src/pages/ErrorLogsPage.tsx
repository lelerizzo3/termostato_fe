import { FormEvent, useState } from 'react';
import type { ErrorLogRecord } from '../api/types';
import { useErrorLogs } from '../hooks/useApi';
import { formatLocalDateTime, utcToday } from '../lib/datetime';
import { EmptyState, ErrorState, InlineNotice, LoadingState } from '../components/common/States';

export function ErrorLogsPage() {
  const today = utcToday();
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [appliedFrom, setAppliedFrom] = useState(today);
  const [appliedTo, setAppliedTo] = useState(today);
  const [rangeError, setRangeError] = useState<string | null>(null);
  const logs = useErrorLogs(appliedFrom, appliedTo);

  function applyRange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (from > to) {
      setRangeError('La data iniziale non può essere successiva alla data finale.');
      return;
    }
    setRangeError(null);
    setAppliedFrom(from);
    setAppliedTo(to);
  }

  return (
    <div className="space-y-4">
      <form className="app-card grid grid-cols-2 gap-3" onSubmit={applyRange}>
        <label>
          <span className="field-label">Da (UTC)</span>
          <input className="field-input mt-2 text-left" type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
        </label>
        <label>
          <span className="field-label">A (UTC)</span>
          <input className="field-input mt-2 text-left" type="date" value={to} onChange={(event) => setTo(event.target.value)} />
        </label>
        <button className="btn-secondary col-span-2" type="submit">Applica intervallo</button>
      </form>
      {rangeError && <InlineNotice tone="warning">{rangeError}</InlineNotice>}
      {logs.isLoading && <LoadingState label="Caricamento errori…" />}
      {logs.isError && <ErrorState error={logs.error} onRetry={() => void logs.refetch()} />}
      {logs.data && logs.data.length === 0 && <EmptyState>Nessun errore nel range selezionato.</EmptyState>}
      {logs.data && logs.data.length > 0 && (
        <div className="space-y-3">
          {[...logs.data].reverse().map((record) => <ErrorCard key={record.id} record={record} />)}
        </div>
      )}
    </div>
  );
}

function ErrorCard({ record }: { record: ErrorLogRecord }) {
  return (
    <article className="app-card border-l-4 border-l-red-500">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-red-200">{record.tipo_errore}</h2>
          <p className="mt-1 text-sm text-slate-400">{formatLocalDateTime(record.data_ora)}</p>
        </div>
        <span className="rounded-full bg-red-500/15 px-2 py-1 text-xs font-semibold text-red-300">{record.num_errori_consecutivi} consecutivi</span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <span className="text-slate-400">Caldaia</span>
        <span className="text-right text-slate-200">{record.caldaia_accesa === null ? 'Non disponibile' : record.caldaia_accesa ? 'Accesa' : 'Spenta'}</span>
        <span className="text-slate-400">Temperatura</span>
        <span className="text-right text-slate-200">{record.temperatura_rilevata === null ? 'Non disponibile' : `${record.temperatura_rilevata.toFixed(1)} °C`}</span>
      </div>
    </article>
  );
}

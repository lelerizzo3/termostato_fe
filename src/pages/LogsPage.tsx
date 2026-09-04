import { FormEvent, useMemo, useState } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { FixedSizeList, ListChildComponentProps } from 'react-window';
import type { PollingLogRecord } from '../api/types';
import { usePollingLogs } from '../hooks/useApi';
import { formatLocalTime, parseApiTimestamp, utcToday } from '../lib/datetime';
import { ErrorState, EmptyState, InlineNotice, LoadingState } from '../components/common/States';

interface ChartRecord extends PollingLogRecord {
  timestampMs: number;
  relayIndicator: number;
}

export function LogsPage() {
  const today = utcToday();
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [appliedFrom, setAppliedFrom] = useState(today);
  const [appliedTo, setAppliedTo] = useState(today);
  const [rangeError, setRangeError] = useState<string | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const logs = usePollingLogs(appliedFrom, appliedTo);

  function applyRange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (from > to) {
      setRangeError('La data iniziale non può essere successiva alla data finale.');
      return;
    }
    setRangeError(null);
    setAppliedFrom(from);
    setAppliedTo(to);
    setShowDetail(false);
  }

  const chartData = useMemo<ChartRecord[]>(() => {
    return [...(logs.data ?? [])]
      .sort((a, b) => parseApiTimestamp(a.data_ora).getTime() - parseApiTimestamp(b.data_ora).getTime())
      .map((record) => ({
        ...record,
        timestampMs: parseApiTimestamp(record.data_ora).getTime(),
        relayIndicator: record.caldaia_accesa ? 1 : 0
      }))
      .filter((record) => Number.isFinite(record.timestampMs));
  }, [logs.data]);

  const detailData = useMemo(() => [...(logs.data ?? [])].sort((a, b) => parseApiTimestamp(b.data_ora).getTime() - parseApiTimestamp(a.data_ora).getTime()), [logs.data]);

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
      {logs.isLoading && <LoadingState label="Caricamento log…" />}
      {logs.isError && <ErrorState error={logs.error} onRetry={() => void logs.refetch()} />}
      {logs.data && logs.data.length === 0 && <EmptyState>Nessun record nel range selezionato.</EmptyState>}
      {logs.data && logs.data.length > 0 && (
        <>
          <section className="app-card">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="section-title mb-0">Andamento temperatura</h2>
              <span className="rounded-md border border-slate-600 px-2 py-1 text-xs text-slate-400">{logs.data.length} record</span>
            </div>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 8, right: 4, left: -18, bottom: 4 }}>
                  <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="timestampMs"
                    type="number"
                    domain={['dataMin', 'dataMax']}
                    tickFormatter={(value: number) => new Date(value).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                    stroke="#94a3b8"
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis yAxisId="temperature" stroke="#94a3b8" tick={{ fontSize: 11 }} domain={['auto', 'auto']} />
                  <YAxis yAxisId="relay" hide domain={[0, 1]} />
                  <Tooltip
                    labelFormatter={(value) => new Date(Number(value)).toLocaleString('it-IT')}
                    formatter={(value: number, name: string) => {
                      if (name === 'relayIndicator') return [value === 1 ? 'ON' : 'OFF', 'Caldaia'];
                      return [`${Number(value).toFixed(1)} °C`, name === 'temperatura_rilevata' ? 'Rilevata' : 'Target'];
                    }}
                    contentStyle={{ background: '#1e293b', border: '1px solid #475569', borderRadius: 12 }}
                  />
                  <Line yAxisId="temperature" type="monotone" dataKey="temperatura_rilevata" stroke="#f97316" strokeWidth={2.5} dot={false} connectNulls={false} />
                  <Line yAxisId="temperature" type="stepAfter" dataKey="temperatura_target" stroke="#38bdf8" strokeWidth={2} strokeDasharray="6 5" dot={false} connectNulls={false} />
                  <Line yAxisId="relay" type="stepAfter" dataKey="relayIndicator" stroke="#22c55e" strokeWidth={2} dot={false} strokeOpacity={0.45} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-400">
              <span className="text-orange-400">● Rilevata</span>
              <span className="text-sky-400">- - Target</span>
              <span className="text-emerald-400">▰ Caldaia ON</span>
            </div>
          </section>

          <section className="app-card p-0">
            <button className="flex min-h-16 w-full items-center justify-between gap-3 px-4 text-left" type="button" onClick={() => setShowDetail((value) => !value)} aria-expanded={showDetail}>
              <span>
                <strong className="block text-slate-100">Dettaglio record</strong>
                <span className="text-sm text-slate-400">{logs.data.length} voci nel range</span>
              </span>
              <span className="btn-secondary px-3 py-1 text-sm">{showDetail ? 'Nascondi dettaglio ▴' : 'Mostra dettaglio ▾'}</span>
            </button>
            {showDetail && <LogDetailTable records={detailData} />}
          </section>
        </>
      )}
    </div>
  );
}

function LogDetailTable({ records }: { records: PollingLogRecord[] }) {
  return (
    <div className="border-t border-slate-700 px-2 pb-3 pt-2">
      <div className="grid grid-cols-[1.1fr_.7fr_1fr_1fr] gap-2 rounded-lg bg-slate-700/70 px-2 py-2 text-xs font-semibold text-slate-300">
        <span>Ora</span><span>Cald.</span><span className="text-right">Rilevata</span><span className="text-right">Target</span>
      </div>
      <FixedSizeList
        height={Math.min(420, Math.max(84, records.length * 42))}
        itemCount={records.length}
        itemSize={42}
        width="100%"
        itemData={records}
      >
        {DetailRow}
      </FixedSizeList>
    </div>
  );
}

function DetailRow({ index, style, data }: ListChildComponentProps<PollingLogRecord[]>) {
  const record = data[index];
  return (
    <div style={style} className={`grid grid-cols-[1.1fr_.7fr_1fr_1fr] items-center gap-2 border-b border-slate-700/70 px-2 text-sm ${index % 2 ? 'bg-slate-800/30' : ''}`}>
      <span className="font-mono text-slate-300">{formatLocalTime(record.data_ora)}</span>
      <span className={record.caldaia_accesa ? 'text-emerald-400' : 'text-slate-500'} aria-label={record.caldaia_accesa ? 'Accesa' : 'Spenta'}>{record.caldaia_accesa ? '●' : '○'}</span>
      <span className="text-right text-slate-200">{record.temperatura_rilevata.toFixed(1)}°</span>
      <span className="text-right text-slate-200">{record.temperatura_target === null ? '—' : `${record.temperatura_target.toFixed(1)}°`}</span>
    </div>
  );
}

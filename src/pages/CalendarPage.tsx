import { useEffect, useMemo, useState } from 'react';
import type { DayKey, TimeInterval } from '../api/types';
import { useCalendar, useUpdateCalendar } from '../hooks/useApi';
import { DAY_KEYS, DAY_LABELS, emptyCalendar, normalizeCalendarTimes, sortIntervals, validateIntervals } from '../lib/calendar';
import { ErrorState, InlineNotice, LoadingState } from '../components/common/States';
import { TemperatureStepper } from '../components/common/TemperatureStepper';

function currentDay(): DayKey {
  return DAY_KEYS[(new Date().getDay() + 6) % 7];
}

export function CalendarPage() {
  const query = useCalendar();
  const update = useUpdateCalendar();
  const [calendar, setCalendar] = useState(emptyCalendar());
  const [expandedDay, setExpandedDay] = useState<DayKey | null>(currentDay());
  const [copySource, setCopySource] = useState<DayKey | null>(null);
  const [copyTargets, setCopyTargets] = useState<DayKey[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (query.data) {
      setCalendar(normalizeCalendarTimes(query.data));
      setError(null);
    }
  }, [query.data]);

  const dayErrors = useMemo(() => Object.fromEntries(DAY_KEYS.map((day) => [day, validateIntervals(calendar.giorni[day])])), [calendar]);

  if (query.isLoading) return <LoadingState label="Caricamento calendario…" />;
  if (query.isError || !query.data) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;

  function updateInterval(day: DayKey, index: number, patch: Partial<TimeInterval>) {
    setCalendar((previous) => ({
      giorni: {
        ...previous.giorni,
        [day]: previous.giorni[day].map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item)
      }
    }));
    setMessage(null);
    setError(null);
  }

  function addInterval(day: DayKey) {
    setCalendar((previous) => ({
      giorni: {
        ...previous.giorni,
        [day]: [...previous.giorni[day], { ora_inizio: '00:00', ora_fine: '01:00', temperatura_target: 20.0 }]
      }
    }));
    setMessage(null);
  }

  function removeInterval(day: DayKey, index: number) {
    setCalendar((previous) => ({ giorni: { ...previous.giorni, [day]: previous.giorni[day].filter((_, itemIndex) => itemIndex !== index) } }));
    setMessage(null);
  }

  function openCopyPanel(source: DayKey) {
    if (copySource === source) {
      setCopySource(null);
      return;
    }
    setCopySource(source);
    setCopyTargets([]);
    setMessage(null);
  }

  function toggleCopyTarget(day: DayKey) {
    setCopyTargets((previous) => previous.includes(day) ? previous.filter((item) => item !== day) : [...previous, day]);
  }

  function confirmCopy(source: DayKey) {
    if (copyTargets.length === 0) return;
    setCalendar((previous) => {
      const nextDays = { ...previous.giorni };
      for (const target of copyTargets) {
        nextDays[target] = previous.giorni[source].map((interval) => ({ ...interval }));
      }
      return { giorni: nextDays };
    });
    const labels = copyTargets.map((target) => DAY_LABELS[target]).join(', ');
    setMessage(`Intervalli copiati su ${labels}.`);
    setCopySource(null);
    setCopyTargets([]);
  }

  async function save() {
    const payload = normalizeCalendarTimes(calendar);
    const validationError = DAY_KEYS.map((day) => validateIntervals(payload.giorni[day])).find(Boolean);
    if (validationError) {
      setError(validationError);
      return;
    }
    try {
      await update.mutateAsync(payload);
      setMessage('Calendario salvato.');
      setError(null);
    } catch {
      setError('Salvataggio calendario non riuscito.');
    }
  }

  return (
    <div className="space-y-4">
      <InlineNotice>Gli orari sono gestiti nel fuso configurato dal backend e vengono inviati senza conversione. Formato: HH:mm.</InlineNotice>
      {message && <InlineNotice tone="success">{message}</InlineNotice>}
      {error && <InlineNotice tone="warning">{error}</InlineNotice>}

      {DAY_KEYS.map((day) => {
        const intervals = sortIntervals(calendar.giorni[day]);
        const expanded = expandedDay === day;
        return (
          <section className={`app-card ${expanded ? 'border-orange-500' : ''}`} key={day}>
            <button className="flex min-h-11 w-full items-center justify-between text-left" type="button" onClick={() => setExpandedDay(expanded ? null : day)} aria-expanded={expanded}>
              <span className="text-lg font-semibold">{DAY_LABELS[day]}</span>
              <span className="text-sm text-slate-400">{intervals.length} intervalli {expanded ? '▴' : '▾'}</span>
            </button>
            {expanded && (
              <div className="mt-3 space-y-3">
                {intervals.map((interval, index) => {
                  const actualIndex = calendar.giorni[day].indexOf(interval);
                  return (
                    <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-2 space-y-2" key={`${day}-${index}`}>
                      <div className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-1.5">
                        <input className="field-input px-2 text-center text-sm" type="time" value={interval.ora_inizio} onChange={(event) => updateInterval(day, actualIndex, { ora_inizio: event.target.value })} aria-label={`Ora inizio ${DAY_LABELS[day]} ${index + 1}`} />
                        <span className="text-slate-500">–</span>
                        <input className="field-input px-2 text-center text-sm" type="time" value={interval.ora_fine} onChange={(event) => updateInterval(day, actualIndex, { ora_fine: event.target.value })} aria-label={`Ora fine ${DAY_LABELS[day]} ${index + 1}`} />
                        <button className="min-h-11 px-2 text-xl text-red-300" type="button" aria-label={`Rimuovi intervallo ${index + 1}`} onClick={() => removeInterval(day, actualIndex)}>×</button>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="field-label shrink-0">Temperatura (°C)</span>
                        <TemperatureStepper
                          value={interval.temperatura_target}
                          onChange={(next) => updateInterval(day, actualIndex, { temperatura_target: next })}
                          ariaLabel={`Temperatura target ${DAY_LABELS[day]} ${index + 1}`}
                        />
                      </div>
                    </div>
                  );
                })}
                <div className="flex gap-2">
                  <button className="btn-secondary flex-1" type="button" onClick={() => addInterval(day)}>+ Intervallo</button>
                  <button className="btn-secondary flex-1" type="button" onClick={() => openCopyPanel(day)} aria-expanded={copySource === day}>Copia su…</button>
                </div>
                {copySource === day && (
                  <div className="rounded-xl border border-slate-600 bg-slate-800/80 p-3 space-y-3">
                    <p className="text-sm text-slate-300">Seleziona i giorni su cui copiare gli intervalli di {DAY_LABELS[day]}:</p>
                    <div className="grid grid-cols-2 gap-2">
                      {DAY_KEYS.filter((target) => target !== day).map((target) => {
                        const checked = copyTargets.includes(target);
                        return (
                          <label className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm transition ${checked ? 'border-orange-500 bg-orange-500/10 text-orange-100' : 'border-slate-600 bg-slate-700 text-slate-200'}`} key={target}>
                            <input className="h-4 w-4 accent-orange-500" type="checkbox" checked={checked} onChange={() => toggleCopyTarget(target)} />
                            {DAY_LABELS[target]}
                          </label>
                        );
                      })}
                    </div>
                    <div className="flex gap-2">
                      <button className="btn-secondary flex-1" type="button" onClick={() => { setCopySource(null); setCopyTargets([]); }}>Annulla</button>
                      <button className="btn-primary flex-1" type="button" onClick={() => confirmCopy(day)} disabled={copyTargets.length === 0}>Copia ({copyTargets.length})</button>
                    </div>
                  </div>
                )}
                {dayErrors[day] && <p className="text-sm text-red-300">{dayErrors[day]}</p>}
              </div>
            )}
          </section>
        );
      })}

      <button className="btn-primary w-full" type="button" onClick={save} disabled={update.isPending}>
        {update.isPending ? 'Salvataggio…' : 'Salva calendario'}
      </button>
    </div>
  );
}

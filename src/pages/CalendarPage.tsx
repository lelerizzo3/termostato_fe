import { useEffect, useMemo, useState } from 'react';
import type { DayKey, TimeInterval } from '../api/types';
import { useCalendar, useUpdateCalendar } from '../hooks/useApi';
import { DAY_KEYS, DAY_LABELS, emptyCalendar, localCalendarToUtc, sortIntervals, utcCalendarToLocal, validateIntervals } from '../lib/calendar';
import { ErrorState, InlineNotice, LoadingState } from '../components/common/States';

function currentDay(): DayKey {
  return DAY_KEYS[(new Date().getDay() + 6) % 7];
}

export function CalendarPage() {
  const query = useCalendar();
  const update = useUpdateCalendar();
  const [calendar, setCalendar] = useState(emptyCalendar());
  const [expandedDay, setExpandedDay] = useState<DayKey | null>(currentDay());
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (query.data) {
      const converted = utcCalendarToLocal(query.data);
      setCalendar(converted.calendar);
      setError(converted.warnings[0] ?? null);
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

  function copyDay(source: DayKey) {
    const target = window.prompt('Copia intervalli su quale giorno? (lunedi, martedi, …)');
    if (!target || !DAY_KEYS.includes(target as DayKey) || target === source) return;
    const targetDay = target as DayKey;
    setCalendar((previous) => ({ giorni: { ...previous.giorni, [targetDay]: previous.giorni[source].map((interval) => ({ ...interval })) } }));
    setMessage(`Intervalli copiati su ${DAY_LABELS[targetDay]}.`);
  }

  async function save() {
    const validationError = DAY_KEYS.map((day) => dayErrors[day]).find(Boolean);
    if (validationError) {
      setError(validationError);
      return;
    }
    const converted = localCalendarToUtc(calendar);
    if (converted.warnings.length > 0) {
      setError(converted.warnings[0]);
      return;
    }
    try {
      await update.mutateAsync(converted.calendar);
      setMessage('Calendario salvato.');
      setError(null);
    } catch {
      setError('Salvataggio calendario non riuscito.');
    }
  }

  return (
    <div className="space-y-4">
      <InlineNotice>Gli orari sono modificati in ora locale e inviati al backend in UTC. Formato: HH:mm.</InlineNotice>
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
                    <div className="grid grid-cols-[1fr_auto_1fr_1fr_auto] items-center gap-1.5" key={`${day}-${index}`}>
                      <input className="field-input px-2 text-center text-sm" type="time" value={interval.ora_inizio} onChange={(event) => updateInterval(day, actualIndex, { ora_inizio: event.target.value })} />
                      <span className="text-slate-500">–</span>
                      <input className="field-input px-2 text-center text-sm" type="time" value={interval.ora_fine} onChange={(event) => updateInterval(day, actualIndex, { ora_fine: event.target.value })} />
                      <input className="field-input px-2 text-center text-sm" type="number" step="0.1" value={interval.temperatura_target} onChange={(event) => updateInterval(day, actualIndex, { temperatura_target: Number(event.target.value) })} aria-label={`Temperatura target ${DAY_LABELS[day]} ${index + 1}`} />
                      <button className="min-h-11 px-2 text-xl text-red-300" type="button" aria-label={`Rimuovi intervallo ${index + 1}`} onClick={() => removeInterval(day, actualIndex)}>×</button>
                    </div>
                  );
                })}
                <div className="flex gap-2">
                  <button className="btn-secondary flex-1" type="button" onClick={() => addInterval(day)}>+ Intervallo</button>
                  <button className="btn-secondary flex-1" type="button" onClick={() => copyDay(day)}>Copia su…</button>
                </div>
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

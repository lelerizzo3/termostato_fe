import type { ReactNode } from 'react';
import { ApiRequestError } from '../../api/client';

export function LoadingState({ label = 'Caricamento…' }: { label?: string }) {
  return (
    <div className="app-card flex min-h-32 items-center justify-center text-sm text-slate-400" role="status">
      <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-500 border-t-orange-400" />
      {label}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const message = error instanceof ApiRequestError ? error.message : 'Si è verificato un errore inatteso.';
  return (
    <div className="app-card border-red-500/40 bg-red-500/10" role="alert">
      <p className="font-semibold text-red-200">Impossibile completare la richiesta</p>
      <p className="mt-1 text-sm text-red-300">{message}</p>
      {onRetry && <button className="btn-secondary mt-4" type="button" onClick={onRetry}>Riprova</button>}
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="app-card text-center text-sm text-slate-400">{children}</div>;
}

export function InlineNotice({ children, tone = 'info' }: { children: ReactNode; tone?: 'info' | 'warning' | 'success' }) {
  const styles = {
    info: 'border-sky-500/30 bg-sky-500/10 text-sky-200',
    warning: 'border-amber-500/40 bg-amber-500/10 text-amber-200',
    success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
  };
  return <div className={`rounded-xl border px-3 py-2 text-sm ${styles[tone]}`}>{children}</div>;
}

export function FieldError({ message }: { message?: string }) {
  return message ? <p className="mt-1 text-xs text-red-300">{message}</p> : null;
}

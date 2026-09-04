import { NavLink, useLocation } from 'react-router-dom';
import { useHealth } from '../../hooks/useApi';

const navigation = [
  { to: '/stato', label: 'Stato', icon: '🏠' },
  { to: '/calendario', label: 'Calendario', icon: '📅' },
  { to: '/log', label: 'Log', icon: '📈' },
  { to: '/errori', label: 'Errori', icon: '⚠️' },
  { to: '/settings', label: 'Impostaz.', icon: '🔑' }
];

const titles: Record<string, string> = {
  '/stato': 'Stato',
  '/calendario': 'Calendario',
  '/log': 'Log polling',
  '/errori': 'Log errori',
  '/settings': 'Impostazioni',
  '/config': 'Configurazione'
};

export function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const health = useHealth();
  const title = titles[location.pathname] ?? 'Termostato';

  return (
    <div className="min-h-[100dvh] bg-slate-900 text-slate-100">
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-3xl flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-700 bg-slate-900/95 px-4 py-3 backdrop-blur sm:px-6">
          <h1 className="text-xl font-bold tracking-tight">{title}</h1>
          <div className="flex items-center gap-2 text-xs text-slate-400" aria-label="Stato backend">
            <span className={`h-2.5 w-2.5 rounded-full ${health.isSuccess ? 'bg-emerald-400' : 'bg-red-400'}`} />
            <span>{health.isSuccess ? 'Backend UP' : 'Backend non disponibile'}</span>
          </div>
        </header>
        <main className="flex-1 overflow-x-hidden px-3 pb-24 pt-4 sm:px-6">{children}</main>
        <nav className="safe-bottom fixed bottom-0 left-0 right-0 z-30 border-t border-slate-700 bg-slate-800/95 shadow-2xl backdrop-blur sm:mx-auto sm:max-w-3xl" aria-label="Navigazione principale">
          <div className="mx-auto grid max-w-3xl grid-cols-5">
            {navigation.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => {
                  const settingsSection = item.to === '/settings' && location.pathname === '/config';
                  return `flex min-h-16 flex-col items-center justify-center gap-0.5 px-1 text-[11px] transition ${isActive || settingsSection ? 'text-orange-400' : 'text-slate-400 hover:text-slate-200'}`;
                }}
              >
                <span className="text-xl leading-6" aria-hidden="true">{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}

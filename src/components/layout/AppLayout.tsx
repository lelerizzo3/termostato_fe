import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useHealth } from '../../hooks/useApi';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { LANDSCAPE_TABLET_QUERY } from '../../lib/layout';

type Area = 'termostato' | 'shelly';

interface NavItem {
  to: string;
  label: string;
  icon: string;
}

const thermostatNav: NavItem[] = [
  { to: '/stato', label: 'Stato', icon: '🏠' },
  { to: '/calendario', label: 'Calendario', icon: '📅' },
  { to: '/log', label: 'Log', icon: '📈' },
  { to: '/errori', label: 'Errori', icon: '⚠️' },
  { to: '/settings', label: 'Impostaz.', icon: '🔑' }
];

const shellyNav: NavItem[] = [
  { to: '/shelly/monitor', label: 'Monitor', icon: '📊' },
  { to: '/shelly', label: 'Dispositivi', icon: '💡' }
];

const areaTabs: { area: Area; label: string; to: string }[] = [
  { area: 'termostato', label: '🏠 Termostato', to: '/stato' },
  { area: 'shelly', label: '💡 Dispositivi', to: '/shelly/monitor' }
];

const titles: Record<string, string> = {
  '/stato': 'Stato',
  '/calendario': 'Calendario',
  '/log': 'Log polling',
  '/errori': 'Log errori',
  '/settings': 'Impostazioni',
  '/config': 'Configurazione',
  '/shelly': 'Dispositivi Shelly',
  '/shelly/monitor': 'Monitor consumi'
};

function areaForPath(pathname: string): Area {
  return pathname.startsWith('/shelly') ? 'shelly' : 'termostato';
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const health = useHealth();
  const isWide = useMediaQuery(LANDSCAPE_TABLET_QUERY);
  const area = areaForPath(location.pathname);
  const navigation = area === 'shelly' ? shellyNav : thermostatNav;
  const title = titles[location.pathname] ?? (area === 'shelly' ? 'Dispositivi Shelly' : 'Termostato');

  const navLinks = navigation.map((item) => {
    const settingsSection = item.to === '/settings' && location.pathname === '/config';
    return (
      <NavLink
        key={item.to}
        to={item.to}
        end
        className={({ isActive }) =>
          `flex min-h-16 flex-col items-center justify-center gap-0.5 px-1 text-center text-[11px] transition ${isWide ? '' : 'flex-1'} ${isActive || settingsSection ? 'text-orange-400' : 'text-slate-400 hover:text-slate-200'}`
        }
      >
        <span className="text-xl leading-6" aria-hidden="true">{item.icon}</span>
        <span>{item.label}</span>
      </NavLink>
    );
  });

  return (
    <div className="min-h-[100dvh] bg-slate-900 text-slate-100 land:pl-[env(safe-area-inset-left)]">
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-3xl flex-col land:max-w-[1440px] land:flex-row">
        {isWide && (
          <aside
            className="sticky top-0 flex h-[100dvh] w-20 shrink-0 flex-col border-r border-slate-700 bg-slate-800/95 py-2 backdrop-blur"
            aria-label="Navigazione laterale"
          >
            {navLinks}
          </aside>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-slate-700 bg-slate-900/95 backdrop-blur">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5 sm:px-6 land:px-5">
              <h1 className="mr-auto text-xl font-bold tracking-tight land:text-lg">{title}</h1>
              <div
                role="tablist"
                aria-label="Sezione applicazione"
                className="order-last grid w-full grid-cols-2 gap-1 land:order-none land:w-auto land:grid-flow-col land:auto-cols-max"
              >
                {areaTabs.map((tab) => (
                  <button
                    key={tab.area}
                    type="button"
                    role="tab"
                    aria-selected={area === tab.area}
                    className={`min-h-11 rounded-xl px-3 text-sm font-semibold transition land:px-4 land:text-xs ${area === tab.area ? 'bg-orange-500 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200'}`}
                    onClick={() => navigate(tab.to)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400" aria-label="Stato backend">
                <span className={`h-2.5 w-2.5 rounded-full ${health.isSuccess ? 'bg-emerald-400' : 'bg-red-400'}`} />
                <span>{health.isSuccess ? 'Backend UP' : 'Backend non disponibile'}</span>
              </div>
            </div>
          </header>
          <main className={`flex-1 overflow-x-hidden px-3 pt-4 sm:px-6 land:px-5 ${isWide ? 'pb-6' : 'pb-24'}`}>{children}</main>
        </div>
      </div>

      {!isWide && (
        <nav className="safe-bottom fixed bottom-0 left-0 right-0 z-30 border-t border-slate-700 bg-slate-800/95 shadow-2xl backdrop-blur sm:mx-auto sm:max-w-3xl" aria-label="Navigazione principale">
          <div className="mx-auto flex max-w-3xl">{navLinks}</div>
        </nav>
      )}
    </div>
  );
}

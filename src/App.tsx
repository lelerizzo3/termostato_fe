import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ApiKeyGate } from './auth/ApiKeyGate';
import { AppLayout } from './components/layout/AppLayout';
import { StatusPage } from './pages/StatusPage';
import { ConfigPage } from './pages/ConfigPage';
import { CalendarPage } from './pages/CalendarPage';
import { LogsPage } from './pages/LogsPage';
import { ErrorLogsPage } from './pages/ErrorLogsPage';
import { SettingsPage } from './pages/SettingsPage';

export default function App() {
  const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || undefined;
  return (
    <BrowserRouter basename={basename}>
      <ApiKeyGate>
        <AppLayout>
          <Routes>
            <Route path="/" element={<Navigate to="/stato" replace />} />
            <Route path="/stato" element={<StatusPage />} />
            <Route path="/config" element={<ConfigPage />} />
            <Route path="/calendario" element={<CalendarPage />} />
            <Route path="/log" element={<LogsPage />} />
            <Route path="/errori" element={<ErrorLogsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/stato" replace />} />
          </Routes>
        </AppLayout>
      </ApiKeyGate>
    </BrowserRouter>
  );
}

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { StatusPage } from './StatusPage';

const refetch = vi.fn();

vi.mock('../hooks/useApi', () => ({
  useCurrentState: () => ({
    isLoading: false,
    isError: false,
    isFetching: false,
    dataUpdatedAt: Date.now(),
    data: {
      temperatura: 19,
      umidita: 50,
      temperatura_target: 20.5,
      relay_acceso: true,
      temperatura_esterna: 24.3,
      umidita_esterna: 68.6
    },
    refetch
  })
}));

describe('StatusPage', () => {
  it('mostra temperatura, target e stato relay', () => {
    render(<StatusPage />);
    expect(screen.getByText('19.0')).toBeInTheDocument();
    expect(screen.getByText('50.0')).toBeInTheDocument();
    expect(screen.getByText('20.5 °C')).toBeInTheDocument();
    expect(screen.getByText('24.3 °C')).toBeInTheDocument();
    expect(screen.getByText('68.6 %')).toBeInTheDocument();
    expect(screen.getByText('ACCESO')).toBeInTheDocument();
  });
});

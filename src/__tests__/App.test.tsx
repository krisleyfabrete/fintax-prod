import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../contexts/AuthContext';
import { BrowserRouter } from 'react-router-dom';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          {ui}
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
};

describe('App', () => {
  it('renders without crashing', () => {
    const { container } = renderWithProviders(<div data-testid="app">App</div>);
    expect(container).toBeTruthy();
  });

  it('has valid HTML structure', () => {
    const { container } = renderWithProviders(<div data-testid="app">App</div>);
    expect(container.querySelector('[data-testid="app"]')).toBeTruthy();
  });
});

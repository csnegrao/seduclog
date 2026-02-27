import { render, screen } from '@testing-library/react';
import ETADisplay from '../components/ETADisplay';

describe('ETADisplay', () => {
  it('shows connecting message when not connected', () => {
    render(<ETADisplay eta={null} isConnected={false} />);
    expect(screen.getByText('Conectando…')).toBeInTheDocument();
  });

  it('shows waiting message when connected but no eta', () => {
    render(<ETADisplay eta={null} isConnected={true} />);
    expect(screen.getByText('Aguardando dados do motorista…')).toBeInTheDocument();
  });

  it('shows eta when connected and eta is provided', () => {
    render(<ETADisplay eta={15} isConnected={true} />);
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText(/min para entrega/)).toBeInTheDocument();
  });

  it('has aria-live="polite" for accessibility', () => {
    const { container } = render(<ETADisplay eta={null} isConnected={false} />);
    const el = container.firstChild;
    expect(el).toHaveAttribute('aria-live', 'polite');
  });
});

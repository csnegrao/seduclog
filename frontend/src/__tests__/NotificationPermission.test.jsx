import { render, screen, fireEvent } from '@testing-library/react';
import NotificationPermission from '../components/NotificationPermission';

describe('NotificationPermission', () => {
  const originalNotification = window.Notification;

  afterEach(() => {
    Object.defineProperty(window, 'Notification', {
      writable: true,
      configurable: true,
      value: originalNotification,
    });
  });

  it('renders the prompt when permission is "default"', () => {
    Object.defineProperty(window, 'Notification', {
      writable: true,
      configurable: true,
      value: { permission: 'default' },
    });
    render(<NotificationPermission userId="user-1" />);
    expect(screen.getByText(/Deseja receber notificações/)).toBeInTheDocument();
  });

  it('does not render when permission is already "granted"', () => {
    Object.defineProperty(window, 'Notification', {
      writable: true,
      configurable: true,
      value: { permission: 'granted' },
    });
    const { container } = render(<NotificationPermission userId="user-1" />);
    expect(container.firstChild).toBeNull();
  });

  it('does not render when permission is "denied"', () => {
    Object.defineProperty(window, 'Notification', {
      writable: true,
      configurable: true,
      value: { permission: 'denied' },
    });
    const { container } = render(<NotificationPermission userId="user-1" />);
    expect(container.firstChild).toBeNull();
  });

  it('hides the banner when "Agora não" is clicked', () => {
    Object.defineProperty(window, 'Notification', {
      writable: true,
      configurable: true,
      value: { permission: 'default' },
    });
    render(<NotificationPermission userId="user-1" />);
    const denyBtn = screen.getByText('Agora não');
    fireEvent.click(denyBtn);
    expect(screen.queryByText(/Deseja receber notificações/)).not.toBeInTheDocument();
  });
});

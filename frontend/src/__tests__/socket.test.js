import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Mock socket.io-client before importing the module
vi.mock('socket.io-client', () => ({
  io: vi.fn(() => ({
    emit: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    connected: false,
    disconnect: vi.fn(),
  })),
}));

// Clear module registry so each test starts fresh
beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('socket service', () => {
  it('calls io() with backend URL on getSocket', async () => {
    const { io } = await import('socket.io-client');
    const { getSocket } = await import('../services/socket');

    getSocket();
    expect(io).toHaveBeenCalledWith(
      expect.stringMatching(/localhost:3001/),
      expect.any(Object)
    );
  });

  it('reuses the same socket instance on multiple calls', async () => {
    const { io } = await import('socket.io-client');
    const { getSocket } = await import('../services/socket');

    const s1 = getSocket();
    const s2 = getSocket();
    expect(s1).toBe(s2);
    expect(io).toHaveBeenCalledTimes(1);
  });

  it('emitDriverLocation emits driver:location event', async () => {
    const { getSocket, emitDriverLocation } = await import('../services/socket');
    const socket = getSocket();
    emitDriverLocation('order-1', -8.05, -34.9, 10);
    expect(socket.emit).toHaveBeenCalledWith('driver:location', {
      deliveryOrderId: 'order-1',
      lat: -8.05,
      lng: -34.9,
      eta: 10,
    });
  });

  it('emitDriverStatus emits driver:status event', async () => {
    const { getSocket, emitDriverStatus } = await import('../services/socket');
    const socket = getSocket();
    emitDriverStatus('order-1', 'dispatched');
    expect(socket.emit).toHaveBeenCalledWith('driver:status', {
      deliveryOrderId: 'order-1',
      status: 'dispatched',
    });
  });

  it('joinDeliveryAsRequester emits requester:join event', async () => {
    const { getSocket, joinDeliveryAsRequester } = await import('../services/socket');
    const socket = getSocket();
    joinDeliveryAsRequester('order-2');
    expect(socket.emit).toHaveBeenCalledWith('requester:join', { deliveryOrderId: 'order-2' });
  });

  it('disconnectSocket calls disconnect and resets', async () => {
    const { getSocket, disconnectSocket } = await import('../services/socket');
    const socket = getSocket();
    disconnectSocket();
    expect(socket.disconnect).toHaveBeenCalled();
  });
});

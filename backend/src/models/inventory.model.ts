import { InventorySession } from '../types';

// In-memory inventory session store — replace with a real database in production.
const sessions: InventorySession[] = [];

export function createSession(session: InventorySession): InventorySession {
  sessions.push(session);
  return session;
}

export function findSessionById(id: string): InventorySession | undefined {
  return sessions.find((s) => s.id === id);
}

export function saveSession(updated: InventorySession): InventorySession {
  const idx = sessions.findIndex((s) => s.id === updated.id);
  if (idx === -1) throw new Error(`Inventory session "${updated.id}" not found in store`);
  sessions[idx] = updated;
  return updated;
}

export function findAllSessions(): InventorySession[] {
  return [...sessions];
}

/**
 * Offline sync queue using IndexedDB via the `idb` library.
 *
 * Stores pending API actions when the device is offline and replays them in
 * order when connectivity is restored.
 */

import { openDB, IDBPDatabase } from 'idb';
import { PendingAction } from '../types/driver.types';

const DB_NAME = 'seduclog-offline';
const STORE_NAME = 'pending-actions';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}

/** Persists an action to the offline queue. */
export async function enqueueAction(action: PendingAction): Promise<void> {
  const db = await getDb();
  await db.put(STORE_NAME, action);
}

/** Returns all pending actions ordered by timestamp. */
export async function getPendingActions(): Promise<PendingAction[]> {
  const db = await getDb();
  const all = await db.getAll(STORE_NAME);
  return (all as PendingAction[]).sort((a, b) => a.timestamp - b.timestamp);
}

/** Removes a successfully synced action from the queue. */
export async function removeAction(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(STORE_NAME, id);
}

/** Clears all pending actions (e.g. after full sync). */
export async function clearActions(): Promise<void> {
  const db = await getDb();
  await db.clear(STORE_NAME);
}

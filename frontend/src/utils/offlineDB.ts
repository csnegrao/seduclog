import { openDB, DBSchema, IDBPDatabase } from 'idb';

export interface CachedOrder {
  id: string;
  [key: string]: unknown;
}

interface SeduclogDB extends DBSchema {
  pendingDeliveries: {
    key: string;
    value: {
      id: string;
      orderId: string;
      type: 'pickup' | 'location' | 'occurrence' | 'deliver';
      payload: unknown;
      createdAt: number;
      retries: number;
    };
  };
  cachedOrders: {
    key: string;
    value: CachedOrder;
  };
}

let dbInstance: IDBPDatabase<SeduclogDB> | null = null;

async function getDB(): Promise<IDBPDatabase<SeduclogDB>> {
  if (!dbInstance) {
    dbInstance = await openDB<SeduclogDB>('seduclog', 1, {
      upgrade(db) {
        db.createObjectStore('pendingDeliveries', { keyPath: 'id' });
        db.createObjectStore('cachedOrders', { keyPath: 'id' });
      },
    });
  }
  return dbInstance;
}

export async function queueOfflineAction(
  orderId: string,
  type: SeduclogDB['pendingDeliveries']['value']['type'],
  payload: unknown,
): Promise<void> {
  const db = await getDB();
  const id = `${type}_${orderId}_${Date.now()}`;
  await db.put('pendingDeliveries', { id, orderId, type, payload, createdAt: Date.now(), retries: 0 });
}

export async function getPendingActions(): Promise<SeduclogDB['pendingDeliveries']['value'][]> {
  const db = await getDB();
  return db.getAll('pendingDeliveries');
}

export async function removePendingAction(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('pendingDeliveries', id);
}

export async function cacheOrders(orders: CachedOrder[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('cachedOrders', 'readwrite');
  await tx.store.clear();
  for (const order of orders) {
    await tx.store.put(order);
  }
  await tx.done;
}

export async function getCachedOrders(): Promise<CachedOrder[]> {
  const db = await getDB();
  return db.getAll('cachedOrders');
}

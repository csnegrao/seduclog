import { openDB, DBSchema, IDBPDatabase } from 'idb';

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
    value: unknown;
  };
}

let dbInstance: IDBPDatabase<SeduclogDB> | null = null;

async function getDB(): Promise<IDBPDatabase<SeduclogDB>> {
  if (!dbInstance) {
    dbInstance = await openDB<SeduclogDB>('seduclog', 1, {
      upgrade(db) {
        db.createObjectStore('pendingDeliveries', { keyPath: 'id' });
        db.createObjectStore('cachedOrders', { keyPath: 'id' as never });
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

export async function cacheOrders(orders: unknown[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('cachedOrders', 'readwrite');
  await tx.store.clear();
  for (const order of orders) {
    await tx.store.put(order);
  }
  await tx.done;
}

export async function getCachedOrders(): Promise<unknown[]> {
  const db = await getDB();
  return db.getAll('cachedOrders');
}

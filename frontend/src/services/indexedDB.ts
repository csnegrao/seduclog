const DB_NAME = 'seduclog';
const DB_VERSION = 1;

interface PendingAction {
  id?: number;
  url: string;
  method: string;
  body: unknown;
  token: string;
  createdAt: string;
}

interface CachedDelivery {
  id: string;
  data: unknown;
  cachedAt: string;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('pendingActions')) {
        db.createObjectStore('pendingActions', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('deliveries')) {
        db.createObjectStore('deliveries', { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function queueOfflineAction(action: Omit<PendingAction, 'id' | 'createdAt'>): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pendingActions', 'readwrite');
    tx.objectStore('pendingActions').add({ ...action, createdAt: new Date().toISOString() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getPendingActions(): Promise<PendingAction[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pendingActions', 'readonly');
    const req = tx.objectStore('pendingActions').getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function removePendingAction(id: number): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pendingActions', 'readwrite');
    tx.objectStore('pendingActions').delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function cacheDelivery(delivery: CachedDelivery): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('deliveries', 'readwrite');
    tx.objectStore('deliveries').put(delivery);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getCachedDeliveries(): Promise<CachedDelivery[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('deliveries', 'readonly');
    const req = tx.objectStore('deliveries').getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function syncPendingActions(): Promise<void> {
  const token = localStorage.getItem('token');
  if (!token) return;

  const actions = await getPendingActions();
  for (const action of actions) {
    try {
      await fetch(action.url, {
        method: action.method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(action.body),
      });
      if (action.id !== undefined) {
        await removePendingAction(action.id);
      }
    } catch {
      // Will be retried later
    }
  }
}

// IndexedDB wrapper for offline storage and sync queue

const DB_NAME = 'fintax_offline';
const DB_VERSION = 1;

export interface SyncQueueItem {
  id: string;
  table: string;
  operation: 'insert' | 'update' | 'delete';
  data: Record<string, unknown>;
  timestamp: number;
  retries: number;
}

interface CachedData {
  key: string;
  data: unknown;
  timestamp: number;
  expiresAt: number;
}

let db: IDBDatabase | null = null;

export async function initDB(): Promise<IDBDatabase> {
  if (db) return db;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;

      // Sync queue store
      if (!database.objectStoreNames.contains('syncQueue')) {
        const syncStore = database.createObjectStore('syncQueue', { keyPath: 'id' });
        syncStore.createIndex('table', 'table', { unique: false });
        syncStore.createIndex('timestamp', 'timestamp', { unique: false });
      }

      // Cached data store
      if (!database.objectStoreNames.contains('cache')) {
        const cacheStore = database.createObjectStore('cache', { keyPath: 'key' });
        cacheStore.createIndex('expiresAt', 'expiresAt', { unique: false });
      }

      // Transactions store for offline
      if (!database.objectStoreNames.contains('transactions')) {
        database.createObjectStore('transactions', { keyPath: 'id' });
      }

      // Accounts store for offline
      if (!database.objectStoreNames.contains('accounts')) {
        database.createObjectStore('accounts', { keyPath: 'id' });
      }

      // Categories store for offline
      if (!database.objectStoreNames.contains('categories')) {
        database.createObjectStore('categories', { keyPath: 'id' });
      }

      // Budgets store for offline
      if (!database.objectStoreNames.contains('budgets')) {
        database.createObjectStore('budgets', { keyPath: 'id' });
      }

      // Goals store for offline
      if (!database.objectStoreNames.contains('goals')) {
        database.createObjectStore('goals', { keyPath: 'id' });
      }
    };
  });
}

// Sync Queue Operations
export async function addToSyncQueue(item: Omit<SyncQueueItem, 'id' | 'timestamp' | 'retries'>): Promise<string> {
  const database = await initDB();
  const id = crypto.randomUUID();
  const queueItem: SyncQueueItem = {
    ...item,
    id,
    timestamp: Date.now(),
    retries: 0,
  };

  return new Promise((resolve, reject) => {
    const transaction = database.transaction('syncQueue', 'readwrite');
    const store = transaction.objectStore('syncQueue');
    const request = store.add(queueItem);

    request.onsuccess = () => resolve(id);
    request.onerror = () => reject(request.error);
  });
}

export async function getSyncQueue(): Promise<SyncQueueItem[]> {
  const database = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction('syncQueue', 'readonly');
    const store = transaction.objectStore('syncQueue');
    const index = store.index('timestamp');
    const request = index.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function removeFromSyncQueue(id: string): Promise<void> {
  const database = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction('syncQueue', 'readwrite');
    const store = transaction.objectStore('syncQueue');
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function updateSyncQueueItem(id: string, updates: Partial<SyncQueueItem>): Promise<void> {
  const database = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction('syncQueue', 'readwrite');
    const store = transaction.objectStore('syncQueue');
    const getRequest = store.get(id);

    getRequest.onsuccess = () => {
      const item = getRequest.result;
      if (item) {
        const updateRequest = store.put({ ...item, ...updates });
        updateRequest.onsuccess = () => resolve();
        updateRequest.onerror = () => reject(updateRequest.error);
      } else {
        resolve();
      }
    };
    getRequest.onerror = () => reject(getRequest.error);
  });
}

export async function getSyncQueueCount(): Promise<number> {
  const database = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction('syncQueue', 'readonly');
    const store = transaction.objectStore('syncQueue');
    const request = store.count();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Cache Operations
export async function cacheData(key: string, data: unknown, ttlMinutes: number = 60): Promise<void> {
  const database = await initDB();
  const now = Date.now();
  const cachedItem: CachedData = {
    key,
    data,
    timestamp: now,
    expiresAt: now + ttlMinutes * 60 * 1000,
  };

  return new Promise((resolve, reject) => {
    const transaction = database.transaction('cache', 'readwrite');
    const store = transaction.objectStore('cache');
    const request = store.put(cachedItem);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getCachedData<T>(key: string): Promise<T | null> {
  const database = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction('cache', 'readonly');
    const store = transaction.objectStore('cache');
    const request = store.get(key);

    request.onsuccess = () => {
      const result = request.result as CachedData | undefined;
      if (result && result.expiresAt > Date.now()) {
        resolve(result.data);
      } else {
        resolve(null);
      }
    };
    request.onerror = () => reject(request.error);
  });
}

export async function clearExpiredCache(): Promise<void> {
  const database = await initDB();
  const now = Date.now();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction('cache', 'readwrite');
    const store = transaction.objectStore('cache');
    const index = store.index('expiresAt');
    const range = IDBKeyRange.upperBound(now);
    const request = index.openCursor(range);

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      } else {
        resolve();
      }
    };
    request.onerror = () => reject(request.error);
  });
}

// Generic Store Operations
export async function saveToStore<T extends { id: string }>(storeName: string, data: T): Promise<void> {
  const database = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.put(data);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getFromStore<T>(storeName: string, id: string): Promise<T | null> {
  const database = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

export async function getAllFromStore<T>(storeName: string): Promise<T[]> {
  const database = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteFromStore(storeName: string, id: string): Promise<void> {
  const database = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function clearStore(storeName: string): Promise<void> {
  const database = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Bulk operations for syncing
export async function bulkSaveToStore<T extends { id: string }>(storeName: string, items: T[]): Promise<void> {
  const database = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);

    items.forEach((item) => {
      store.put(item);
    });

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

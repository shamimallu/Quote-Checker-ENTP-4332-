import type { Warranty } from "@/lib/warranty-types";

// Client-only: do not call these during server rendering.
// Uses IndexedDB (built into every browser) instead of localStorage because
// warranty PDFs and photos are too large for localStorage's ~5MB limit.
const DB_NAME = "homi-warranty-vault";
const STORE = "warranties";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function run<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const request = action(db.transaction(STORE, mode).objectStore(STORE));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function loadWarranties(): Promise<Warranty[]> {
  return run("readonly", (store) => store.getAll() as IDBRequest<Warranty[]>);
}

export async function saveWarranty(warranty: Warranty): Promise<void> {
  await run("readwrite", (store) => store.put(warranty));
}

export async function deleteWarranty(id: string): Promise<void> {
  await run("readwrite", (store) => store.delete(id));
}

export type ReportFileCategory = "transportation" | "driver" | "billings"  | "crm";

export interface StoredReportFile {
  id: string;
  name: string;
  type: "PDF" | "XLSX";
  category: ReportFileCategory;
  createdAt: number;
  sizeBytes: number;
  blob: Blob;
}

export type StoredReportFileMeta = Omit<StoredReportFile, "blob">;

const DB_NAME = "action-auto-reports";
const DB_VERSION = 1;
const STORE_NAME = "generated-report-files";

function openReportsDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB is not available"));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("createdAt", "createdAt", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("Failed to open IndexedDB"));
  });
}

function withStore<T>(
  mode: IDBTransactionMode,
  run: (
    store: IDBObjectStore,
    resolve: (value: T) => void,
    reject: (reason?: unknown) => void,
  ) => void,
): Promise<T> {
  return openReportsDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, mode);
        const store = tx.objectStore(STORE_NAME);

        run(store, resolve, reject);

        tx.oncomplete = () => db.close();
        tx.onerror = () => {
          reject(tx.error ?? new Error("IndexedDB transaction failed"));
          db.close();
        };
        tx.onabort = () => {
          reject(tx.error ?? new Error("IndexedDB transaction aborted"));
          db.close();
        };
      }),
  );
}

export async function saveGeneratedReportFile(input: {
  name: string;
  category: ReportFileCategory;
  type: "PDF" | "XLSX";
  blob: Blob;
}): Promise<StoredReportFileMeta> {
  const record: StoredReportFile = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    name: input.name,
    type: input.type,
    category: input.category,
    createdAt: Date.now(),
    sizeBytes: input.blob.size,
    blob: input.blob,
  };

  await withStore<void>("readwrite", (store, resolve, reject) => {
    const request = store.put(record);
    request.onsuccess = () => resolve();
    request.onerror = () =>
      reject(request.error ?? new Error("Failed to save report file"));
  });

  const { blob: _blob, ...meta } = record;
  return meta;
}

export async function listGeneratedReportFiles(): Promise<
  StoredReportFileMeta[]
> {
  const records = await withStore<StoredReportFile[]>(
    "readonly",
    (store, resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () =>
        resolve((request.result ?? []) as StoredReportFile[]);
      request.onerror = () =>
        reject(request.error ?? new Error("Failed to list report files"));
    },
  );

  return records
    .map(({ blob: _blob, ...meta }) => meta)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function getGeneratedReportFileBlob(
  id: string,
): Promise<Blob | null> {
  const record = await withStore<StoredReportFile | null>(
    "readonly",
    (store, resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () =>
        resolve((request.result as StoredReportFile | undefined) ?? null);
      request.onerror = () =>
        reject(request.error ?? new Error("Failed to load report file"));
    },
  );

  return record?.blob ?? null;
}

export async function deleteGeneratedReportFile(id: string): Promise<void> {
  await withStore<void>("readwrite", (store, resolve, reject) => {
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () =>
      reject(request.error ?? new Error("Failed to delete report file"));
  });
}

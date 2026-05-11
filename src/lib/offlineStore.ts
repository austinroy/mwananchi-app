import type { CivicBrief } from "./types";

const dbName = "mwananchi-offline";
const dbVersion = 1;
const storeName = "encrypted-records";
const localKeyName = "mwananchi_offline_key";

export type OfflineMutation = {
  id: string;
  path: string;
  method: "POST" | "PUT" | "DELETE";
  body?: string;
  createdAt: string;
};

type OfflineRecord = {
  id: string;
  iv: string;
  data: string;
};

export async function cacheOfflineBrief(brief: CivicBrief) {
  await putEncryptedRecord(`brief:${brief.id}`, brief);
}

export async function listOfflineBriefs() {
  const records = await listEncryptedRecords<CivicBrief>("brief:");
  return records.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function queueOfflineMutation(
  mutation: Omit<OfflineMutation, "id" | "createdAt">,
) {
  const queued: OfflineMutation = {
    ...mutation,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  await putEncryptedRecord(`mutation:${queued.id}`, queued);
  return queued;
}

export async function listOfflineMutations() {
  return listEncryptedRecords<OfflineMutation>("mutation:");
}

export async function removeOfflineMutation(id: string) {
  const db = await openOfflineDb();
  await requestToPromise(
    db
      .transaction(storeName, "readwrite")
      .objectStore(storeName)
      .delete(`mutation:${id}`),
  );
  db.close();
}

export function createOfflineBrief(input: {
  title: string;
  category: CivicBrief["category"];
  jurisdiction: string;
}): CivicBrief {
  return {
    id: `offline-${crypto.randomUUID()}`,
    title: input.title,
    category: input.category,
    jurisdiction: input.jurisdiction,
    visibility: "private",
    summary:
      "Saved offline. Mwananchi App will generate the full brief when the API is reachable.",
    keyPoints: ["This brief is queued for sync."],
    affectedGroups: ["Pending analysis"],
    concerns: ["AI analysis has not run yet because the app is offline."],
    citizenQuestions: ["What should be reviewed once this syncs?"],
    nextSteps: ["Reconnect to the internet to sync this brief."],
    aiError: "Offline draft pending sync.",
    createdAt: new Date().toISOString(),
  };
}

async function putEncryptedRecord(id: string, value: unknown) {
  const db = await openOfflineDb();
  const record = await encryptRecord(id, value);
  await requestToPromise(
    db.transaction(storeName, "readwrite").objectStore(storeName).put(record),
  );
  db.close();
}

async function listEncryptedRecords<T>(prefix: string) {
  const db = await openOfflineDb();
  const records = await requestToPromise<OfflineRecord[]>(
    db.transaction(storeName, "readonly").objectStore(storeName).getAll(),
  );
  db.close();

  const values = await Promise.all(
    records
      .filter((record) => record.id.startsWith(prefix))
      .map((record) => decryptRecord<T>(record)),
  );
  return values.filter(Boolean) as T[];
}

async function encryptRecord(
  id: string,
  value: unknown,
): Promise<OfflineRecord> {
  const key = await getEncryptionKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(JSON.stringify(value));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoded,
  );

  return {
    id,
    iv: toBase64(iv),
    data: toBase64(new Uint8Array(encrypted)),
  };
}

async function decryptRecord<T>(record: OfflineRecord): Promise<T | null> {
  try {
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: fromBase64(record.iv) },
      await getEncryptionKey(),
      fromBase64(record.data),
    );
    return JSON.parse(new TextDecoder().decode(decrypted)) as T;
  } catch {
    return null;
  }
}

async function getEncryptionKey() {
  const rawKey = getOrCreateLocalKey();
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(rawKey),
  );
  return crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);
}

function getOrCreateLocalKey() {
  const existing = localStorage.getItem(localKeyName);
  if (existing) return existing;

  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const value = toBase64(bytes);
  localStorage.setItem(localKeyName, value);
  return value;
}

function openOfflineDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(dbName, dbVersion);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(storeName, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function requestToPromise<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function toBase64(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes));
}

function fromBase64(value: string) {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}

import type { CivicBrief } from "./types";

const dbName = "mwananchi-offline";
const dbVersion = 2;
const storeName = "records";
const blockedMutationPathPattern = /^\/api\/(?:users|auth|sessions)(?:\/|$)/;
const blockedMutationBodyKeys = [
  "authorization",
  "credential",
  "credentials",
  "email",
  "name",
  "password",
  "session",
  "token",
  "user",
  "userId",
];

export type OfflineMutation = {
  id: string;
  path: string;
  method: "POST" | "PUT" | "DELETE";
  body?: string;
  relatedRecordId?: string;
  createdAt: string;
};

type OfflineRecord<T = unknown> = {
  id: string;
  value: T;
};

export async function cacheOfflineBrief(brief: CivicBrief) {
  await putRecord(`brief:${brief.id}`, brief);
}

export async function listOfflineBriefs() {
  const records = await listRecords<CivicBrief>("brief:");
  return records.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function queueOfflineMutation(
  mutation: Omit<OfflineMutation, "id" | "createdAt">,
) {
  assertSyncableMutation(mutation);

  const queued: OfflineMutation = {
    ...mutation,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  await putRecord(`mutation:${queued.id}`, queued);
  return queued;
}

export async function listOfflineMutations() {
  return listRecords<OfflineMutation>("mutation:");
}

export async function removeOfflineMutation(id: string) {
  await deleteRecord(`mutation:${id}`);
}

export async function removeOfflineBrief(briefId: string) {
  await deleteRecord(`brief:${briefId}`);
}

async function deleteRecord(id: string) {
  const db = await openOfflineDb();
  await requestToPromise(
    db.transaction(storeName, "readwrite").objectStore(storeName).delete(id),
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

function assertSyncableMutation(
  mutation: Omit<OfflineMutation, "id" | "createdAt">,
) {
  if (blockedMutationPathPattern.test(mutation.path)) {
    throw new Error("Auth and user records cannot be stored offline.");
  }

  if (!mutation.body) return;

  try {
    const body = JSON.parse(mutation.body) as unknown;
    if (containsBlockedBodyKey(body)) {
      throw new Error("Auth and user records cannot be stored offline.");
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes("stored offline")) {
      throw error;
    }
  }
}

function containsBlockedBodyKey(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;

  if (Array.isArray(value)) {
    return value.some((item) => containsBlockedBodyKey(item));
  }

  return Object.entries(value).some(([key, item]) => {
    const normalizedKey = key.replace(/[-_]/g, "").toLowerCase();
    const isBlockedKey = blockedMutationBodyKeys.some(
      (blockedKey) =>
        normalizedKey === blockedKey.toLowerCase() ||
        normalizedKey.includes(blockedKey.toLowerCase()),
    );
    return isBlockedKey || containsBlockedBodyKey(item);
  });
}

async function putRecord(id: string, value: unknown) {
  const db = await openOfflineDb();
  await requestToPromise(
    db
      .transaction(storeName, "readwrite")
      .objectStore(storeName)
      .put({ id, value }),
  );
  db.close();
}

async function listRecords<T>(prefix: string) {
  const db = await openOfflineDb();
  const records = await requestToPromise<OfflineRecord<T>[]>(
    db.transaction(storeName, "readonly").objectStore(storeName).getAll(),
  );
  db.close();

  return records
    .filter((record) => record.id.startsWith(prefix))
    .map((record) => record.value)
    .filter(Boolean);
}

function openOfflineDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(dbName, dbVersion);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(storeName)) {
        request.result.createObjectStore(storeName, { keyPath: "id" });
      }
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

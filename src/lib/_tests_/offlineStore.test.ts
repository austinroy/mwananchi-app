import type { CivicBrief } from "../types";
import {
  cacheOfflineBrief,
  listOfflineBriefs,
  queueOfflineMutation,
  listOfflineMutations,
  removeOfflineMutation,
} from "../offlineStore";

const stores = new Map<string, Map<string, unknown>>();

class MockObjectStore {
  constructor(private readonly records: Map<string, unknown>) {}

  put(value: { id: string }) {
    this.records.set(value.id, value);
    return createRequest(value);
  }

  getAll() {
    return createRequest([...this.records.values()]);
  }

  delete(id: string) {
    this.records.delete(id);
    return createRequest(undefined);
  }
}

class MockTransaction {
  constructor(private readonly records: Map<string, unknown>) {}

  objectStore() {
    return new MockObjectStore(this.records);
  }
}

class MockDatabase {
  constructor(private readonly records: Map<string, unknown>) {}

  objectStoreNames = {
    contains: () => stores.has("mwananchi-offline"),
  } as unknown as DOMStringList;

  createObjectStore() {
    return new MockObjectStore(this.records);
  }

  transaction() {
    return new MockTransaction(this.records);
  }

  close() {}
}

function createRequest<T>(result: T) {
  const request = { result } as IDBRequest<T>;
  queueMicrotask(() => request.onsuccess?.call(request, {} as Event));
  return request as IDBRequest<T>;
}

function openDb(name: string) {
  const records = stores.get(name) ?? new Map<string, unknown>();
  stores.set(name, records);

  const request: Partial<IDBOpenDBRequest> = {
    result: new MockDatabase(records) as unknown as IDBDatabase,
  };
  queueMicrotask(() => {
    request.onupgradeneeded?.call(
      request as IDBOpenDBRequest,
      {} as IDBVersionChangeEvent,
    );
    request.onsuccess?.call(request as IDBOpenDBRequest, {} as Event);
  });
  return request as IDBOpenDBRequest;
}

const brief: CivicBrief = {
  id: "brief-offline-test",
  title: "Offline test",
  category: "Budget",
  jurisdiction: "Nairobi",
  visibility: "private",
  summary: "Stored offline",
  keyPoints: ["one"],
  affectedGroups: ["Residents"],
  concerns: ["Pending sync"],
  citizenQuestions: ["What changes?"],
  nextSteps: ["Sync"],
  createdAt: "2026-05-12T00:00:00.000Z",
};

describe("offlineStore", () => {
  beforeEach(() => {
    stores.clear();
    window.localStorage.clear();
    Object.defineProperty(window, "indexedDB", {
      configurable: true,
      value: { open: jest.fn(openDb) },
    });
  });

  it("stores and lists offline briefs", async () => {
    await cacheOfflineBrief(brief);
    await expect(listOfflineBriefs()).resolves.toEqual([brief]);
  });

  it("queues and removes offline mutations", async () => {
    const queued = await queueOfflineMutation({
      path: "/api/briefs",
      method: "POST",
      body: '{"ok":true}',
    });

    await expect(listOfflineMutations()).resolves.toMatchObject([
      {
        id: queued.id,
        path: "/api/briefs",
        method: "POST",
        body: '{"ok":true}',
      },
    ]);

    await removeOfflineMutation(queued.id);
    await expect(listOfflineMutations()).resolves.toEqual([]);
  });

  it("rejects auth and user records from offline storage", async () => {
    await expect(
      queueOfflineMutation({
        path: "/api/users",
        method: "POST",
        body: JSON.stringify({
          id: "user_123",
          email: "person@example.com",
        }),
      }),
    ).rejects.toThrow("Auth and user records cannot be stored offline.");

    await expect(
      queueOfflineMutation({
        path: "/api/briefs",
        method: "POST",
        body: JSON.stringify({
          input: {
            title: "Budget",
            authToken: "secret-session-token",
          },
        }),
      }),
    ).rejects.toThrow("Auth and user records cannot be stored offline.");

    await expect(listOfflineMutations()).resolves.toEqual([]);
  });
});

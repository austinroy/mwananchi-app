import type {
  AiApiKeyStatus,
  AiDefaultsRecord,
  AiModelSelection,
  AiProviderId,
  ChatMessage,
  CivicAction,
  CivicActionInput,
  CivicBrief,
  NewBriefInput,
  UpdateVisibilityResult,
} from "./types";
import {
  cacheOfflineBrief,
  createOfflineBrief,
  listOfflineBriefs,
  listOfflineMutations,
  queueOfflineMutation,
  removeOfflineBrief,
  removeOfflineMutation,
} from "./offlineStore";
import { normalizeApiBaseUrl } from "./apiBaseUrl";

const apiBaseUrl = normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL);
export const apiAuthContextReadyEvent = "mwananchi:api-auth-context-ready";
let apiAuthContext: ApiAuthContext = {};

export function setApiAuthContext(context: ApiAuthContext) {
  apiAuthContext = context;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(apiAuthContextReadyEvent));
  }
}

export async function listApiBriefs() {
  const apiBriefs = await apiRequest<CivicBrief[]>("/api/briefs");
  const offlineBriefs = await listOfflineBriefs();
  if (!apiBriefs) return offlineBriefs;
  const apiIds = new Set(apiBriefs.map((brief) => brief.id));
  return [
    ...offlineBriefs.filter((brief) => !apiIds.has(brief.id)),
    ...apiBriefs,
  ];
}

export async function getApiBrief(briefId: string) {
  return apiRequestWithStatus<CivicBrief>(`/api/briefs/${briefId}`);
}

export async function getApiSharedBrief(briefId: string) {
  return apiRequestWithStatus<CivicBrief>(`/api/share/briefs/${briefId}`);
}

export async function createApiBrief(
  input: NewBriefInput,
  ai?: AiModelSelection,
) {
  const body = JSON.stringify({ input, ai });
  const result = await apiRequestWithStatus<CivicBrief>("/api/briefs", {
    method: "POST",
    body,
  });

  if (result.status >= 200 && result.status < 300 && result.data) {
    return result.data;
  }
  if (result.status !== 0) {
    throw new Error(`Could not save brief. API returned ${result.status}.`);
  }

  const offlineBrief = createOfflineBrief(input);
  await cacheOfflineBrief(offlineBrief);
  await queueOfflineMutation({
    path: "/api/briefs",
    method: "POST",
    body,
    relatedRecordId: `brief:${offlineBrief.id}`,
  });
  return offlineBrief;
}

export async function getApiChatMessages(briefId: string) {
  return apiRequest<ChatMessage[]>(`/api/briefs/${briefId}/messages`);
}

export async function sendApiChatMessage(
  briefId: string,
  content: string,
  ai?: AiModelSelection,
) {
  const path = `/api/briefs/${briefId}/messages`;
  const body = JSON.stringify({ content, ai });
  const result = await apiRequestWithStatus<ChatMessage>(path, {
    method: "POST",
    body,
  });
  if (result.status >= 200 && result.status < 300 && result.data) {
    return result.data;
  }
  if (result.status !== 0) {
    throw new Error(`Could not send message. API returned ${result.status}.`);
  }

  await queueOfflineMutation({ path, method: "POST", body });
  return {
    id: `offline-message-${crypto.randomUUID()}`,
    briefId,
    role: "assistant",
    content:
      "Saved offline. Mwananchi App will send your message when the API is reachable.",
    aiError: "Offline message pending sync.",
    createdAt: new Date().toISOString(),
  };
}

export async function clearApiChatMessages(briefId: string) {
  return apiRequestStrict<{ ok: boolean }>(`/api/briefs/${briefId}/messages`, {
    method: "DELETE",
  });
}

export async function generateApiAction(
  briefId: string,
  input: CivicActionInput,
) {
  const path = `/api/briefs/${briefId}/actions`;
  const body = JSON.stringify(input);
  const result = await apiRequestWithStatus<CivicAction>(path, {
    method: "POST",
    body,
  });
  if (result.status >= 200 && result.status < 300 && result.data) {
    return result.data;
  }
  if (result.status !== 0) {
    throw new Error(
      `Could not save action draft. API returned ${result.status}.`,
    );
  }

  await queueOfflineMutation({ path, method: "POST", body });
  return {
    ...input,
    id: `offline-action-${crypto.randomUUID()}`,
    briefId,
    content:
      "Saved offline. Mwananchi App will generate this civic action when the API is reachable.",
    aiError: "Offline action pending sync.",
    createdAt: new Date().toISOString(),
  };
}

export async function listApiActions(briefId: string) {
  return apiRequest<CivicAction[]>(`/api/briefs/${briefId}/actions`);
}

export async function deleteApiAction(briefId: string, actionId: string) {
  return apiRequestStrict<{ ok: boolean }>(
    `/api/briefs/${briefId}/actions/${actionId}`,
    {
      method: "DELETE",
    },
  );
}

export async function updateApiBriefVisibility(
  briefId: string,
  visibility: "private" | "unlisted" | "public",
) {
  const path = `/api/briefs/${briefId}/visibility`;
  const body = JSON.stringify({ visibility });
  const result = await apiRequestWithStatus<UpdateVisibilityResult>(path, {
    method: "PUT",
    body,
  });
  if (result.status >= 200 && result.status < 300 && result.data) {
    return result.data;
  }
  if (result.status !== 0) {
    throw new Error(
      `Could not update brief visibility. API returned ${result.status}.`,
    );
  }

  await queueOfflineMutation({ path, method: "PUT", body });
  return { ok: true, visibility };
}

export async function deleteApiBrief(briefId: string) {
  const path = `/api/briefs/${briefId}`;
  try {
    return await apiRequestStrict<{ ok: boolean }>(path, {
      method: "DELETE",
    });
  } catch (error) {
    if (!isNetworkError(error)) throw error;
    await queueOfflineMutation({ path, method: "DELETE" });
    return { ok: true };
  }
}

export async function syncOfflineChanges() {
  if (!navigator.onLine) return { synced: 0 };
  const queued = await listOfflineMutations();
  let synced = 0;

  for (const mutation of queued) {
    const result = await apiRequestWithStatus(mutation.path, {
      method: mutation.method,
      body: mutation.body,
    });
    if (result.status === 0) break;
    if (result.status >= 200 && result.status < 300) {
      if (mutation.relatedRecordId?.startsWith("brief:")) {
        await removeOfflineBrief(
          mutation.relatedRecordId.slice("brief:".length),
        );
      }
      await removeOfflineMutation(mutation.id);
      synced += 1;
    }
  }

  return { synced };
}

export async function listAiApiKeyStatuses() {
  const apiStatuses = await apiRequest<AiApiKeyStatus[]>(
    "/api/users/me/ai-keys",
  );
  if (apiStatuses) return apiStatuses;
  return [];
}

export async function saveAiApiKey(provider: AiProviderId, apiKey: string) {
  const apiStatus = await apiRequest<AiApiKeyStatus>("/api/users/me/ai-keys", {
    method: "PUT",
    body: JSON.stringify({ provider, apiKey }),
  });
  if (!apiStatus)
    throw new Error(
      "Could not save API key. Make sure the API server is running and API_KEY_ENCRYPTION_SECRET is configured.",
    );
  return apiStatus;
}

export async function deleteAiApiKey(provider: AiProviderId) {
  const result = await apiRequest<{ ok: boolean }>(
    `/api/users/me/ai-keys/${provider}`,
    {
      method: "DELETE",
    },
  );
  if (!result) throw new Error("Could not remove API key.");
  return result;
}

export async function getApiAiDefaults() {
  return apiRequest<AiDefaultsRecord>("/api/users/me/ai-defaults");
}

export async function saveApiAiDefaults(selection: AiModelSelection) {
  const result = await apiRequest<AiDefaultsRecord>(
    "/api/users/me/ai-defaults",
    {
      method: "PUT",
      body: JSON.stringify(selection),
    },
  );
  if (!result) throw new Error("Could not save AI defaults.");
  return result;
}

export async function listProviderModels(
  provider: AiProviderId,
  baseUrl?: string,
) {
  if (provider === "lmstudio")
    return listLmStudioModels(baseUrl || "http://127.0.0.1:1234/v1");

  const apiModels = await apiRequest<{ models: string[] }>(
    `/api/ai/providers/${provider}/models`,
  );
  if (!apiModels)
    throw new Error(
      "Could not load models from this provider. Check the stored API key and API server.",
    );
  return apiModels.models;
}

export async function listLmStudioModels(baseUrl: string) {
  const normalizedBaseUrl = baseUrl.trim().replace(/\/$/, "");
  try {
    return await listLmStudioModelsDirect(normalizedBaseUrl);
  } catch {
    const proxiedModels = await apiRequest<{ models: string[] }>(
      "/api/ai/lmstudio/models",
      {
        method: "POST",
        body: JSON.stringify({ baseUrl: normalizedBaseUrl }),
      },
    );
    if (proxiedModels) return proxiedModels.models;
    throw new Error(
      "Could not load LM Studio models. Enable CORS in LM Studio or run the Mwananchi API server on the same machine.",
    );
  }
}

async function listLmStudioModelsDirect(baseUrl: string) {
  const response = await fetch(`${baseUrl}/models`, {
    headers: {
      authorization: "Bearer lm-studio",
    },
  });
  if (!response.ok)
    throw new Error(
      `LM Studio model request failed with ${response.status}. Make sure the local server is running.`,
    );

  const payload = await response.json();
  if (!Array.isArray(payload.data)) return [];

  return payload.data
    .map((model: { id?: unknown }) =>
      typeof model.id === "string" ? model.id : "",
    )
    .filter(Boolean);
}

async function apiRequest<T>(path: string, init?: RequestInit) {
  const result = await apiRequestWithStatus<T>(path, init);
  return result?.data ?? null;
}

async function apiRequestWithStatus<T>(path: string, init?: RequestInit) {
  try {
    const token = await apiAuthContext.getToken?.();
    const response = await fetch(`${apiBaseUrl}${path}`, {
      ...init,
      headers: {
        "content-type": "application/json",
        ...(apiAuthContext.userId
          ? { "x-mwananchi-user-id": apiAuthContext.userId }
          : {}),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...init?.headers,
      },
    });

    if (!response.ok) {
      return { status: response.status, data: null };
    }
    return { status: response.status, data: (await response.json()) as T };
  } catch {
    return { status: 0, data: null };
  }
}

async function apiRequestStrict<T>(path: string, init?: RequestInit) {
  let response: Response;
  try {
    const token = await apiAuthContext.getToken?.();
    response = await fetch(`${apiBaseUrl}${path}`, {
      ...init,
      headers: {
        "content-type": "application/json",
        ...(apiAuthContext.userId
          ? { "x-mwananchi-user-id": apiAuthContext.userId }
          : {}),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...init?.headers,
      },
    });
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : "Network request failed",
    );
  }

  if (!response.ok) {
    const message = await readApiError(response);
    throw new Error(message || `API request failed with ${response.status}`);
  }
  return (await response.json()) as T;
}

function isNetworkError(error: unknown) {
  return (
    error instanceof Error && /network|fetch|failed|load/i.test(error.message)
  );
}

async function readApiError(response: Response) {
  try {
    const payload = await response.json();
    return typeof payload.error === "string" ? payload.error : "";
  } catch {
    return "";
  }
}

type ApiAuthContext = {
  userId?: string;
  getToken?: () => Promise<string | null>;
};

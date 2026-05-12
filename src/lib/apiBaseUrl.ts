const defaultApiBaseUrl = "http://localhost:8787";

export function normalizeApiBaseUrl(value?: string) {
  const trimmed = value?.trim();
  if (!trimmed) return defaultApiBaseUrl;

  if (trimmed.startsWith("/")) {
    return trimmed.replace(/\/+$/, "");
  }

  const withProtocol = /^[a-z][a-z\d+\-.]*:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  return withProtocol.replace(/\/+$/, "");
}

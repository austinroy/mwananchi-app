const localApiBaseUrl = "http://localhost:8787";

export function normalizeApiBaseUrl(
  value?: string,
  hostname = globalThis.location?.hostname,
) {
  const trimmed = value?.trim();
  if (!trimmed) {
    return isLocalHost(hostname) ? localApiBaseUrl : "";
  }

  if (trimmed.startsWith("/")) {
    return trimmed.replace(/\/+$/, "");
  }

  const withProtocol = /^[a-z][a-z\d+\-.]*:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  return withProtocol.replace(/\/+$/, "");
}

function isLocalHost(hostname?: string) {
  return !hostname || hostname === "localhost" || hostname === "127.0.0.1";
}

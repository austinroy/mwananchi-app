import { normalizeApiBaseUrl } from "../apiBaseUrl";

describe("normalizeApiBaseUrl", () => {
  it("defaults to the local API when unset", () => {
    expect(normalizeApiBaseUrl(undefined, "localhost")).toBe(
      "http://localhost:8787",
    );
    expect(normalizeApiBaseUrl("", "127.0.0.1")).toBe("http://localhost:8787");
  });

  it("uses same-origin requests when unset on deployed hosts", () => {
    expect(normalizeApiBaseUrl(undefined, "mwananchi-app.netlify.app")).toBe(
      "",
    );
  });

  it("adds https to host-only deploy values", () => {
    expect(normalizeApiBaseUrl("mwananchi-app.netlify.app")).toBe(
      "https://mwananchi-app.netlify.app",
    );
  });

  it("preserves absolute and relative API bases without trailing slashes", () => {
    expect(normalizeApiBaseUrl("https://api.example.com/")).toBe(
      "https://api.example.com",
    );
    expect(normalizeApiBaseUrl("/.netlify/functions/api/")).toBe(
      "/.netlify/functions/api",
    );
  });
});

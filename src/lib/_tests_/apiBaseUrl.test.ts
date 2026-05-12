import { normalizeApiBaseUrl } from "../apiBaseUrl";

describe("normalizeApiBaseUrl", () => {
  it("defaults to the local API when unset", () => {
    expect(normalizeApiBaseUrl()).toBe("http://localhost:8787");
    expect(normalizeApiBaseUrl("")).toBe("http://localhost:8787");
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

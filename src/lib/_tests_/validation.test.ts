import {
  validateBriefCategory,
  validateBriefTitle,
  validateDocumentText,
  validateJurisdiction,
  validateRequiredText,
} from "../validation";

describe("validation helpers", () => {
  it("requires trimmed text before checking minimum length", () => {
    expect(validateRequiredText("   ", "Document title", 3)).toBe(
      "Document title is required.",
    );
  });

  it("returns a minimum length message for short text", () => {
    expect(validateRequiredText("ab", "Document title", 3)).toBe(
      "Document title must be at least 3 characters.",
    );
  });

  it("accepts values that meet the required length after trimming", () => {
    expect(validateRequiredText("  Budget Bill  ", "Document title", 3)).toBe(
      undefined,
    );
  });

  it("validates brief form fields with their product-specific messages", () => {
    expect(validateBriefTitle("Hi")).toBe(
      "Document title must be at least 3 characters.",
    );
    expect(validateJurisdiction("K")).toBe(
      "Jurisdiction must be at least 2 characters.",
    );
    expect(validateDocumentText("short")).toBe(
      "Document text must be at least 20 characters.",
    );
  });

  it("allows known civic categories and rejects unknown ones", () => {
    expect(validateBriefCategory("Budget")).toBe(undefined);
    expect(validateBriefCategory("Transport")).toBe("Choose a valid category.");
  });
});

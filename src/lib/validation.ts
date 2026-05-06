import type { BriefCategory } from "./types";
import { categories } from "./civicOptions";

export function validateRequiredText(
  value: string,
  label: string,
  minLength = 1,
) {
  const trimmed = value.trim();
  if (!trimmed) return `${label} is required.`;
  if (trimmed.length < minLength) {
    return `${label} must be at least ${minLength} characters.`;
  }
  return undefined;
}

export function validateBriefTitle(value: string) {
  return validateRequiredText(value, "Document title", 3);
}

export function validateJurisdiction(value: string) {
  return validateRequiredText(value, "Jurisdiction", 2);
}

export function validateDocumentText(value: string) {
  return validateRequiredText(value, "Document text", 20);
}

export function validateBriefCategory(value: string): string | undefined {
  if (!categories.includes(value as BriefCategory)) {
    return "Choose a valid category.";
  }
  return undefined;
}

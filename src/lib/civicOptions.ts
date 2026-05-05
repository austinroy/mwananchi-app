import type { BriefCategory, CivicActionInput, CivicActionType } from "./types";

export const categories: BriefCategory[] = [
  "Housing",
  "Justice",
  "Elections",
  "Education",
  "Health",
  "Budget",
  "Other",
];

export const actionTypes: { value: CivicActionType; label: string }[] = [
  { value: "email", label: "Email" },
  { value: "petition", label: "Petition" },
  { value: "public_comment", label: "Public comment" },
  { value: "whatsapp_summary", label: "WhatsApp summary" },
  { value: "talking_points", label: "Talking points" },
];

export const actionTones: CivicActionInput["tone"][] = [
  "Respectful",
  "Firm",
  "Youth-friendly",
  "Professional",
];

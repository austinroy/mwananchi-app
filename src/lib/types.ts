export type BriefCategory =
  | "Housing"
  | "Justice"
  | "Elections"
  | "Education"
  | "Health"
  | "Budget"
  | "Other";

export type CivicBrief = {
  id: string;
  title: string;
  category: BriefCategory;
  jurisdiction: string;
  visibility: "private" | "unlisted" | "public";
  summary: string;
  keyPoints: string[];
  affectedGroups: string[];
  concerns: string[];
  citizenQuestions: string[];
  nextSteps: string[];
  aiError?: string;
  createdAt: string;
};

export type AiProviderId =
  | "openai"
  | "openrouter"
  | "anthropic"
  | "lmstudio"
  | "custom";

export type AiModelSelection = {
  provider: AiProviderId;
  model: string;
  baseUrl?: string;
};

export type AiApiKeyStatus = {
  provider: AiProviderId;
  isConfigured: boolean;
  updatedAt: string;
};

export type AiDefaultsRecord = AiModelSelection & {
  updatedAt?: string;
};

export type UpdateVisibilityResult = {
  ok: boolean;
  visibility: "private" | "unlisted" | "public";
};

export type NewBriefInput = {
  title: string;
  category: BriefCategory;
  jurisdiction: string;
  documentText: string;
};

export type ChatMessage = {
  id: string;
  briefId: string;
  role: "user" | "assistant";
  content: string;
  aiError?: string;
  createdAt: string;
};

export type CivicActionType =
  | "email"
  | "petition"
  | "public_comment"
  | "whatsapp_summary"
  | "talking_points";

export type CivicActionInput = {
  actionType: CivicActionType;
  tone: "Respectful" | "Firm" | "Youth-friendly" | "Professional";
  audience: string;
  extraContext?: string;
  ai?: AiModelSelection;
};

export type CivicAction = CivicActionInput & {
  id: string;
  briefId: string;
  content: string;
  aiError?: string;
  createdAt: string;
};

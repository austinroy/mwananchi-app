import type {
  AiModelSelection,
  CivicActionInput,
  NewBriefInput,
} from "./types";
import {
  clearApiChatMessages,
  createApiBrief,
  deleteApiBrief,
  generateApiAction,
  getApiBrief,
  getApiChatMessages,
  getApiSharedBrief,
  listApiBriefs,
  sendApiChatMessage,
  shareApiBrief,
} from "./api";

export const seedBrief: import("./types").CivicBrief = {
  id: "brief-sample-budget",
  title: "County Budget Public Notice",
  category: "Budget",
  jurisdiction: "Nairobi County",
  isPublic: true,
  summary:
    "The notice invites residents to comment on proposed budget priorities. The clearest public interest issues are service delivery, ward-level allocation, and whether spending plans are easy for citizens to track.",
  keyPoints: [
    "Residents have a defined public participation window.",
    "The proposal affects county services such as roads, clinics, schools, and sanitation.",
    "Budget details should be compared against previous allocations and actual spending.",
  ],
  affectedGroups: [
    "Residents",
    "Ward representatives",
    "Small businesses",
    "Community organizations",
  ],
  concerns: [
    "The notice may not explain tradeoffs in plain language.",
    "Some residents may not have enough time or access to participate.",
  ],
  citizenQuestions: [
    "Which wards receive the largest increases or cuts?",
    "How will residents see whether the money was spent as promised?",
    "What services will be delayed if this budget is approved?",
  ],
  nextSteps: [
    "Prepare a short public comment before the deadline.",
    "Ask your MCA or county office for ward-level allocation details.",
    "Share a plain-language summary with your community group.",
  ],
  createdAt: new Date().toISOString(),
};

export async function listBriefs(userId?: string) {
  const apiBriefs = await listApiBriefs();
  return apiBriefs ?? [];
}

export async function getBrief(briefId: string) {
  const apiBrief = await getApiBrief(briefId);
  if (!apiBrief) throw new Error("Brief not found");
  return apiBrief;
}

export async function getSharedBrief(briefId: string) {
  const apiBrief = await getApiSharedBrief(briefId);
  if (!apiBrief) throw new Error("Shared brief not found");
  return apiBrief;
}

export async function createBrief(
  input: NewBriefInput,
  userId?: string,
  ai?: AiModelSelection,
) {
  const apiBrief = await createApiBrief(input, ai);
  if (!apiBrief) throw new Error("Failed to create brief");
  return apiBrief;
}

export async function getChatMessages(briefId: string) {
  const apiMessages = await getApiChatMessages(briefId);
  return apiMessages ?? [];
}

export async function sendChatMessage(
  briefId: string,
  content: string,
  ai?: AiModelSelection,
) {
  const apiMessage = await sendApiChatMessage(briefId, content, ai);
  if (!apiMessage) throw new Error("Failed to send message");
  return apiMessage;
}

export async function clearChatMessages(briefId: string) {
  const apiResult = await clearApiChatMessages(briefId);
  if (!apiResult) throw new Error("Failed to clear messages");
  return apiResult;
}

export async function generateAction(briefId: string, input: CivicActionInput) {
  const apiAction = await generateApiAction(briefId, input);
  if (!apiAction) throw new Error("Failed to generate action");
  return apiAction;
}

export async function shareBrief(briefId: string) {
  const apiResult = await shareApiBrief(briefId);
  if (!apiResult) throw new Error("Failed to share brief");
  return apiResult;
}

export async function deleteBrief(briefId: string, userId?: string) {
  const apiResult = await deleteApiBrief(briefId);
  if (!apiResult) throw new Error("Failed to delete brief");
  return apiResult;
}

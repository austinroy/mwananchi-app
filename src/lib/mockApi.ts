import type {
  ChatMessage,
  CivicAction,
  CivicActionInput,
  CivicBrief,
  NewBriefInput,
} from './types';

const delay = (ms = 450) => new Promise((resolve) => setTimeout(resolve, ms));
const savedBriefsStorageKey = 'mwananchi_saved_briefs';
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8787';

const briefs = new Map<string, CivicBrief>();
const messages = new Map<string, ChatMessage[]>();
const actions = new Map<string, CivicAction[]>();

const seedBrief: CivicBrief = {
  id: 'brief-sample-budget',
  title: 'County Budget Public Notice',
  category: 'Budget',
  jurisdiction: 'Nairobi County',
  summary:
    'The notice invites residents to comment on proposed budget priorities. The clearest public interest issues are service delivery, ward-level allocation, and whether spending plans are easy for citizens to track.',
  keyPoints: [
    'Residents have a defined public participation window.',
    'The proposal affects county services such as roads, clinics, schools, and sanitation.',
    'Budget details should be compared against previous allocations and actual spending.',
  ],
  affectedGroups: ['Residents', 'Ward representatives', 'Small businesses', 'Community organizations'],
  concerns: [
    'The notice may not explain tradeoffs in plain language.',
    'Some residents may not have enough time or access to participate.',
  ],
  citizenQuestions: [
    'Which wards receive the largest increases or cuts?',
    'How will residents see whether the money was spent as promised?',
    'What services will be delayed if this budget is approved?',
  ],
  nextSteps: [
    'Prepare a short public comment before the deadline.',
    'Ask your MCA or county office for ward-level allocation details.',
    'Share a plain-language summary with your community group.',
  ],
  createdAt: new Date().toISOString(),
};

briefs.set(seedBrief.id, seedBrief);
messages.set(seedBrief.id, [
  {
    id: 'msg-1',
    briefId: seedBrief.id,
    role: 'assistant',
    content: 'Ask me what this notice means for residents, budgets, or public participation.',
    createdAt: new Date().toISOString(),
  },
]);

export async function listBriefs(userId?: string) {
  const apiBriefs = await apiRequest<CivicBrief[]>(`/api/briefs${userId ? `?userId=${encodeURIComponent(userId)}` : ''}`);
  if (apiBriefs) return apiBriefs;

  await delay(200);
  const storedBriefs = userId ? loadSavedBriefs(userId) : [];
  return mergeBriefs([...storedBriefs, seedBrief]).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getBrief(briefId: string) {
  const apiBrief = await apiRequest<CivicBrief>(`/api/briefs/${briefId}`);
  if (apiBrief) return apiBrief;

  await delay(250);
  hydrateSavedBriefs();
  const brief = briefs.get(briefId);
  if (!brief) throw new Error('Brief not found');
  return brief;
}

export async function createBrief(input: NewBriefInput, userId?: string) {
  const apiBrief = await apiRequest<CivicBrief>('/api/briefs', {
    method: 'POST',
    body: JSON.stringify({ input, userId }),
  });
  if (apiBrief) return apiBrief;

  await delay(700);
  const id = `brief-${crypto.randomUUID()}`;
  const brief: CivicBrief = {
    id,
    title: input.title,
    category: input.category,
    jurisdiction: input.jurisdiction,
    summary: `This ${input.category.toLowerCase()} document appears to affect public decision-making in ${input.jurisdiction}. Mwananchi App would summarize the official text, highlight who is affected, and help citizens prepare informed questions.`,
    keyPoints: [
      'The document should be translated into plain language before public discussion.',
      'Citizens need to know deadlines, responsible offices, and practical effects.',
      'Any unclear claims should be checked against the original public source.',
    ],
    affectedGroups: ['Citizens', 'Community organizers', 'Journalists', 'Civil society groups'],
    concerns: [
      'Important details may be hidden in technical wording.',
      'The current MVP uses mock analysis until an AI backend is connected.',
    ],
    citizenQuestions: [
      'What decision is the public being asked to influence?',
      'Who benefits, who carries costs, and who might be left out?',
      'Where can citizens submit official feedback?',
    ],
    nextSteps: [
      'Ask a follow-up question in the chat panel.',
      'Generate a public comment or representative email.',
      userId ? 'Find this brief again from your dashboard.' : 'Create an account to keep generated briefs across sessions.',
    ],
    createdAt: new Date().toISOString(),
  };

  briefs.set(id, brief);
  if (userId) {
    saveBriefForUser(userId, brief);
  }
  messages.set(id, [
    {
      id: crypto.randomUUID(),
      briefId: id,
      role: 'assistant',
      content: 'I created the first plain-language brief. What would you like to understand next?',
      createdAt: new Date().toISOString(),
    },
  ]);

  return brief;
}

function mergeBriefs(items: CivicBrief[]) {
  return [...new Map(items.map((brief) => [brief.id, brief])).values()];
}

function loadSavedBriefs(userId: string) {
  const savedBriefs = readSavedBriefs();
  const userBriefs = savedBriefs[userId] ?? [];
  userBriefs.forEach((brief) => briefs.set(brief.id, brief));
  return userBriefs;
}

function saveBriefForUser(userId: string, brief: CivicBrief) {
  const savedBriefs = readSavedBriefs();
  savedBriefs[userId] = mergeBriefs([brief, ...(savedBriefs[userId] ?? [])]);
  window.localStorage.setItem(savedBriefsStorageKey, JSON.stringify(savedBriefs));
}

function hydrateSavedBriefs() {
  Object.values(readSavedBriefs()).flat().forEach((brief) => briefs.set(brief.id, brief));
}

function readSavedBriefs(): Record<string, CivicBrief[]> {
  if (typeof window === 'undefined') return {};

  const storedValue = window.localStorage.getItem(savedBriefsStorageKey);
  if (!storedValue) return {};

  try {
    return JSON.parse(storedValue) as Record<string, CivicBrief[]>;
  } catch {
    window.localStorage.removeItem(savedBriefsStorageKey);
    return {};
  }
}

export async function getChatMessages(briefId: string) {
  const apiMessages = await apiRequest<ChatMessage[]>(`/api/briefs/${briefId}/messages`);
  if (apiMessages) return apiMessages;

  await delay(150);
  return messages.get(briefId) ?? [];
}

export async function sendChatMessage(briefId: string, content: string) {
  const apiMessage = await apiRequest<ChatMessage>(`/api/briefs/${briefId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  });
  if (apiMessage) return apiMessage;

  await delay(450);
  const thread = messages.get(briefId) ?? [];
  const now = new Date().toISOString();
  const userMessage: ChatMessage = {
    id: crypto.randomUUID(),
    briefId,
    role: 'user',
    content,
    createdAt: now,
  };
  const assistantMessage: ChatMessage = {
    id: crypto.randomUUID(),
    briefId,
    role: 'assistant',
    content:
      'Based on the brief, focus on the practical effect, the public participation deadline, and which office is accountable. A real AI backend should quote or cite the source text before making stronger claims.',
    createdAt: now,
  };

  messages.set(briefId, [...thread, userMessage, assistantMessage]);
  return assistantMessage;
}

export async function generateAction(briefId: string, input: CivicActionInput) {
  const apiAction = await apiRequest<CivicAction>(`/api/briefs/${briefId}/actions`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
  if (apiAction) return apiAction;

  await delay(600);
  const action: CivicAction = {
    ...input,
    id: crypto.randomUUID(),
    briefId,
    content: buildActionDraft(input),
    createdAt: new Date().toISOString(),
  };

  actions.set(briefId, [...(actions.get(briefId) ?? []), action]);
  return action;
}

async function apiRequest<T>(path: string, init?: RequestInit) {
  try {
    const response = await fetch(`${apiBaseUrl}${path}`, {
      ...init,
      headers: {
        'content-type': 'application/json',
        ...init?.headers,
      },
    });

    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

function buildActionDraft(input: CivicActionInput) {
  if (input.actionType === 'whatsapp_summary') {
    return 'Public document summary: this proposal may affect local services and citizen participation. Ask what changes, who is affected, how feedback will be used, and where official comments should be sent.';
  }

  return `Dear ${input.audience || 'public official'},

I am writing to request a clear explanation of the proposal, including who is affected, what tradeoffs were considered, and how public feedback will influence the final decision.

Please share the official submission process, deadline, and any ward-level or community-level details citizens should review.

Regards,
A concerned mwananchi`;
}

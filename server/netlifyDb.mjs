import { getDatabase } from '@netlify/database';

const db = getDatabase();

export async function upsertUser(input) {
  const now = new Date().toISOString();
  const user = {
    id: input.id,
    name: input.name || 'Mwananchi user',
    email: String(input.email || '').trim().toLowerCase(),
    createdAt: now,
  };

  await db.sql`
    INSERT INTO users (id, name, email, created_at)
    VALUES (${user.id}, ${user.name}, ${user.email}, ${user.createdAt})
    ON CONFLICT(id) DO UPDATE SET name = excluded.name, email = excluded.email
  `;

  return user;
}

export async function listBriefs(userId) {
  const result = userId
    ? await db.sql`
        SELECT * FROM briefs
        WHERE user_id = ${userId} OR id = 'brief-sample-budget'
        ORDER BY created_at DESC
      `
    : await db.sql`
        SELECT * FROM briefs
        WHERE user_id IS NULL OR id = 'brief-sample-budget'
        ORDER BY created_at DESC
      `;

  return rows(result).map(mapBriefRow);
}

export async function getBrief(briefId) {
  const result = await db.sql`SELECT * FROM briefs WHERE id = ${briefId}`;
  const row = rows(result)[0];
  return row ? mapBriefRow(row) : null;
}

export async function createBrief(input, userId) {
  const brief = buildBrief(input, userId);

  await db.sql`
    INSERT INTO briefs (
      id, user_id, title, category, jurisdiction, source_text, summary,
      key_points, affected_groups, concerns, citizen_questions, next_steps, created_at
    )
    VALUES (
      ${brief.id},
      ${userId || null},
      ${brief.title},
      ${brief.category},
      ${brief.jurisdiction},
      ${input.documentText},
      ${brief.summary},
      ${JSON.stringify(brief.keyPoints)},
      ${JSON.stringify(brief.affectedGroups)},
      ${JSON.stringify(brief.concerns)},
      ${JSON.stringify(brief.citizenQuestions)},
      ${JSON.stringify(brief.nextSteps)},
      ${brief.createdAt}
    )
  `;

  await insertMessage({
    id: crypto.randomUUID(),
    briefId: brief.id,
    role: 'assistant',
    content: 'I created the first plain-language brief. What would you like to understand next?',
    createdAt: new Date().toISOString(),
  });

  return brief;
}

export async function listMessages(briefId) {
  const result = await db.sql`
    SELECT * FROM chat_messages
    WHERE brief_id = ${briefId}
    ORDER BY created_at ASC
  `;

  return rows(result).map((row) => ({
    id: row.id,
    briefId: row.brief_id,
    role: row.role,
    content: row.content,
    createdAt: serializeDate(row.created_at),
  }));
}

export async function sendMessage(briefId, content) {
  const now = new Date().toISOString();
  await insertMessage({
    id: crypto.randomUUID(),
    briefId,
    role: 'user',
    content,
    createdAt: now,
  });

  const assistantMessage = {
    id: crypto.randomUUID(),
    briefId,
    role: 'assistant',
    content:
      'Based on the stored brief, focus on the practical effect, public participation deadline, and accountable office. A real AI backend should cite the source text before making stronger claims.',
    createdAt: now,
  };
  await insertMessage(assistantMessage);
  return assistantMessage;
}

export async function createAction(briefId, input) {
  const action = {
    ...input,
    id: crypto.randomUUID(),
    briefId,
    content: buildActionDraft(input),
    createdAt: new Date().toISOString(),
  };

  await db.sql`
    INSERT INTO civic_actions (id, brief_id, action_type, tone, audience, extra_context, content, created_at)
    VALUES (
      ${action.id},
      ${briefId},
      ${action.actionType},
      ${action.tone},
      ${action.audience},
      ${action.extraContext || null},
      ${action.content},
      ${action.createdAt}
    )
  `;

  return action;
}

async function insertMessage(message) {
  await db.sql`
    INSERT INTO chat_messages (id, brief_id, role, content, created_at)
    VALUES (${message.id}, ${message.briefId}, ${message.role}, ${message.content}, ${message.createdAt})
  `;
}

function buildBrief(input, userId) {
  return {
    id: `brief-${crypto.randomUUID()}`,
    title: input.title,
    category: input.category,
    jurisdiction: input.jurisdiction,
    summary: `This ${String(input.category).toLowerCase()} document appears to affect public decision-making in ${input.jurisdiction}. Mwananchi App summarized the submitted text, highlighted who is affected, and prepared citizen questions.`,
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
}

function buildActionDraft(input) {
  if (input.actionType === 'whatsapp_summary') {
    return 'Public document summary: this proposal may affect local services and citizen participation. Ask what changes, who is affected, how feedback will be used, and where official comments should be sent.';
  }

  return `Dear ${input.audience || 'public official'},

I am writing to request a clear explanation of the proposal, including who is affected, what tradeoffs were considered, and how public feedback will influence the final decision.

Please share the official submission process, deadline, and any ward-level or community-level details citizens should review.

Regards,
A concerned mwananchi`;
}

function mapBriefRow(row) {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    jurisdiction: row.jurisdiction,
    summary: row.summary,
    keyPoints: parseJsonArray(row.key_points),
    affectedGroups: parseJsonArray(row.affected_groups),
    concerns: parseJsonArray(row.concerns),
    citizenQuestions: parseJsonArray(row.citizen_questions),
    nextSteps: parseJsonArray(row.next_steps),
    createdAt: serializeDate(row.created_at),
  };
}

function parseJsonArray(value) {
  if (Array.isArray(value)) return value;
  return JSON.parse(value);
}

function rows(result) {
  return result?.rows ?? result ?? [];
}

function serializeDate(value) {
  return value instanceof Date ? value.toISOString() : String(value);
}

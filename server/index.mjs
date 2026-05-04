import { createServer } from 'node:http';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '..', 'data');
mkdirSync(dataDir, { recursive: true });

const db = new DatabaseSync(join(dataDir, 'mwananchi.sqlite'));
const host = process.env.API_HOST || '127.0.0.1';
const port = Number(process.env.API_PORT || 8787);

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS briefs (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    jurisdiction TEXT NOT NULL,
    source_text TEXT NOT NULL,
    summary TEXT NOT NULL,
    key_points TEXT NOT NULL,
    affected_groups TEXT NOT NULL,
    concerns TEXT NOT NULL,
    citizen_questions TEXT NOT NULL,
    next_steps TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY,
    brief_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS civic_actions (
    id TEXT PRIMARY KEY,
    brief_id TEXT NOT NULL,
    action_type TEXT NOT NULL,
    tone TEXT NOT NULL,
    audience TEXT NOT NULL,
    extra_context TEXT,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
`);

seedSampleBrief();

createServer(async (req, res) => {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  try {
    const url = new URL(req.url ?? '/', `http://${req.headers.host}`);

    if (req.method === 'GET' && url.pathname === '/api/health') {
      sendJson(res, { ok: true });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/users') {
      const body = await readJson(req);
      sendJson(res, upsertUser(body));
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/briefs') {
      sendJson(res, listBriefs(url.searchParams.get('userId') ?? undefined));
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/briefs') {
      const body = await readJson(req);
      sendJson(res, createBrief(body.input, body.userId));
      return;
    }

    const briefMessagesMatch = url.pathname.match(/^\/api\/briefs\/([^/]+)\/messages$/);
    if (briefMessagesMatch && req.method === 'GET') {
      sendJson(res, listMessages(briefMessagesMatch[1]));
      return;
    }

    if (briefMessagesMatch && req.method === 'POST') {
      const body = await readJson(req);
      sendJson(res, sendMessage(briefMessagesMatch[1], body.content));
      return;
    }

    const briefActionsMatch = url.pathname.match(/^\/api\/briefs\/([^/]+)\/actions$/);
    if (briefActionsMatch && req.method === 'POST') {
      const body = await readJson(req);
      sendJson(res, createAction(briefActionsMatch[1], body));
      return;
    }

    const briefMatch = url.pathname.match(/^\/api\/briefs\/([^/]+)$/);
    if (briefMatch && req.method === 'GET') {
      const brief = getBrief(briefMatch[1]);
      if (!brief) {
        sendJson(res, { error: 'Brief not found' }, 404);
        return;
      }
      sendJson(res, brief);
      return;
    }

    sendJson(res, { error: 'Not found' }, 404);
  } catch (error) {
    sendJson(res, { error: error instanceof Error ? error.message : 'Server error' }, 500);
  }
}).listen(port, host, () => {
  console.log(`Mwananchi API listening on http://${host}:${port}`);
});

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.CLIENT_ORIGIN || 'http://localhost:5173');
  res.setHeader('Access-Control-Allow-Headers', 'content-type');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
}

function sendJson(res, payload, status = 200) {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(payload));
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

function upsertUser(input) {
  const now = new Date().toISOString();
  const user = {
    id: input.id,
    name: input.name || 'Mwananchi user',
    email: String(input.email || '').trim().toLowerCase(),
    createdAt: now,
  };

  db.prepare(`
    INSERT INTO users (id, name, email, created_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET name = excluded.name, email = excluded.email
  `).run(user.id, user.name, user.email, user.createdAt);

  return user;
}

function listBriefs(userId) {
  const rows = userId
    ? db.prepare('SELECT * FROM briefs WHERE user_id = ? OR id = ? ORDER BY created_at DESC').all(userId, 'brief-sample-budget')
    : db.prepare('SELECT * FROM briefs WHERE user_id IS NULL OR id = ? ORDER BY created_at DESC').all('brief-sample-budget');

  return rows.map(mapBriefRow);
}

function getBrief(briefId) {
  const row = db.prepare('SELECT * FROM briefs WHERE id = ?').get(briefId);
  return row ? mapBriefRow(row) : null;
}

function createBrief(input, userId) {
  const brief = buildBrief(input, userId);

  db.prepare(`
    INSERT INTO briefs (
      id, user_id, title, category, jurisdiction, source_text, summary,
      key_points, affected_groups, concerns, citizen_questions, next_steps, created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    brief.id,
    userId || null,
    brief.title,
    brief.category,
    brief.jurisdiction,
    input.documentText,
    brief.summary,
    JSON.stringify(brief.keyPoints),
    JSON.stringify(brief.affectedGroups),
    JSON.stringify(brief.concerns),
    JSON.stringify(brief.citizenQuestions),
    JSON.stringify(brief.nextSteps),
    brief.createdAt,
  );

  const message = {
    id: crypto.randomUUID(),
    briefId: brief.id,
    role: 'assistant',
    content: 'I created the first plain-language brief. What would you like to understand next?',
    createdAt: new Date().toISOString(),
  };
  insertMessage(message);

  return brief;
}

function listMessages(briefId) {
  return db.prepare('SELECT * FROM chat_messages WHERE brief_id = ? ORDER BY created_at ASC')
    .all(briefId)
    .map((row) => ({
      id: row.id,
      briefId: row.brief_id,
      role: row.role,
      content: row.content,
      createdAt: row.created_at,
    }));
}

function sendMessage(briefId, content) {
  const now = new Date().toISOString();
  insertMessage({
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
  insertMessage(assistantMessage);
  return assistantMessage;
}

function createAction(briefId, input) {
  const action = {
    ...input,
    id: crypto.randomUUID(),
    briefId,
    content: buildActionDraft(input),
    createdAt: new Date().toISOString(),
  };

  db.prepare(`
    INSERT INTO civic_actions (id, brief_id, action_type, tone, audience, extra_context, content, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    action.id,
    briefId,
    action.actionType,
    action.tone,
    action.audience,
    action.extraContext || null,
    action.content,
    action.createdAt,
  );

  return action;
}

function insertMessage(message) {
  db.prepare(`
    INSERT INTO chat_messages (id, brief_id, role, content, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(message.id, message.briefId, message.role, message.content, message.createdAt);
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
    keyPoints: JSON.parse(row.key_points),
    affectedGroups: JSON.parse(row.affected_groups),
    concerns: JSON.parse(row.concerns),
    citizenQuestions: JSON.parse(row.citizen_questions),
    nextSteps: JSON.parse(row.next_steps),
    createdAt: row.created_at,
  };
}

function seedSampleBrief() {
  const existing = db.prepare('SELECT id FROM briefs WHERE id = ?').get('brief-sample-budget');
  if (existing) return;

  const sample = {
    id: 'brief-sample-budget',
    userId: null,
    title: 'County Budget Public Notice',
    category: 'Budget',
    jurisdiction: 'Nairobi County',
    sourceText: 'Sample county budget public notice.',
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

  db.prepare(`
    INSERT INTO briefs (
      id, user_id, title, category, jurisdiction, source_text, summary,
      key_points, affected_groups, concerns, citizen_questions, next_steps, created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    sample.id,
    sample.userId,
    sample.title,
    sample.category,
    sample.jurisdiction,
    sample.sourceText,
    sample.summary,
    JSON.stringify(sample.keyPoints),
    JSON.stringify(sample.affectedGroups),
    JSON.stringify(sample.concerns),
    JSON.stringify(sample.citizenQuestions),
    JSON.stringify(sample.nextSteps),
    sample.createdAt,
  );

  insertMessage({
    id: 'msg-1',
    briefId: sample.id,
    role: 'assistant',
    content: 'Ask me what this notice means for residents, budgets, or public participation.',
    createdAt: sample.createdAt,
  });
}

import { createServer } from "node:http";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createPublicKey,
  randomBytes,
  verify,
} from "node:crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, "..", "data");
mkdirSync(dataDir, { recursive: true });

const db = new DatabaseSync(join(dataDir, "mwananchi.sqlite"));
const host = process.env.API_HOST || "127.0.0.1";
const port = Number(process.env.API_PORT || 8787);
const clerkJwksUrl = process.env.CLERK_JWKS_URL;
let cachedJwks = null;

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
    ai_error TEXT,
    is_public INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY,
    brief_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    ai_error TEXT,
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
    ai_error TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS ai_api_keys (
    user_id TEXT NOT NULL,
    provider TEXT NOT NULL,
    encrypted_key TEXT NOT NULL,
    iv TEXT NOT NULL,
    auth_tag TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (user_id, provider)
  );

  CREATE TABLE IF NOT EXISTS user_ai_defaults (
    user_id TEXT PRIMARY KEY,
    provider TEXT NOT NULL,
    model TEXT NOT NULL,
    base_url TEXT,
    updated_at TEXT NOT NULL
  );
`);

ensureColumn("briefs", "visibility", "TEXT NOT NULL DEFAULT 'private'");
db.exec("UPDATE briefs SET visibility = 'unlisted' WHERE is_public = 1 AND visibility = 'private'");
ensureColumn("briefs", "ai_error", "TEXT");
ensureColumn("chat_messages", "ai_error", "TEXT");
ensureColumn("civic_actions", "ai_error", "TEXT");
seedSampleBrief();

createServer(async (req, res) => {
  setCorsHeaders(res);

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  try {
    const url = new URL(req.url ?? "/", `http://${req.headers.host}`);

    if (req.method === "GET" && url.pathname === "/api/health") {
      sendJson(res, { ok: true });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/ai/lmstudio/models") {
      const body = await readJson(req);
      sendJson(res, await listLmStudioModels(body.baseUrl));
      return;
    }

    const providerModelsMatch = url.pathname.match(
      /^\/api\/ai\/providers\/([^/]+)\/models$/,
    );
    if (providerModelsMatch && req.method === "GET") {
      const userId = await getRequiredRequestUserId(req, res);
      if (!userId) return;
      sendJson(
        res,
        await listConfiguredProviderModels(providerModelsMatch[1], userId),
      );
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/users") {
      const body = await readJson(req);
      sendJson(res, upsertUser(body));
      return;
    }

    if (url.pathname === "/api/users/me/ai-keys") {
      const userId = await getRequiredRequestUserId(req, res);
      if (!userId) return;

      if (req.method === "GET") {
        sendJson(res, listUserAiKeyStatuses(userId));
        return;
      }

      if (req.method === "PUT") {
        const body = await readJson(req);
        sendJson(res, upsertUserAiKey(userId, body));
        return;
      }
    }

    const aiKeyMatch = url.pathname.match(
      /^\/api\/users\/me\/ai-keys\/([^/]+)$/,
    );
    if (aiKeyMatch && req.method === "DELETE") {
      const userId = await getRequiredRequestUserId(req, res);
      if (!userId) return;
      deleteUserAiKey(userId, aiKeyMatch[1]);
      sendJson(res, { ok: true });
      return;
    }

    if (url.pathname === "/api/users/me/ai-defaults") {
      const userId = await getRequiredRequestUserId(req, res);
      if (!userId) return;

      if (req.method === "GET") {
        sendJson(res, getUserAiDefaults(userId));
        return;
      }

      if (req.method === "PUT") {
        const body = await readJson(req);
        sendJson(res, upsertUserAiDefaults(userId, body));
        return;
      }
    }

    if (req.method === "GET" && url.pathname === "/api/briefs") {
      sendJson(res, listBriefs(await getRequestUserId(req)));
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/briefs") {
      const body = await readJson(req);
      sendJson(
        res,
        await createBrief(body.input, await getRequestUserId(req), body.ai),
      );
      return;
    }

    const briefMessagesMatch = url.pathname.match(
      /^\/api\/briefs\/([^/]+)\/messages$/,
    );
    if (briefMessagesMatch && req.method === "GET") {
      if (!canAccessBrief(briefMessagesMatch[1], await getRequestUserId(req))) {
        sendJson(res, { error: "Brief not found" }, 404);
        return;
      }
      sendJson(res, listMessages(briefMessagesMatch[1]));
      return;
    }

    if (briefMessagesMatch && req.method === "POST") {
      const body = await readJson(req);
      const userId = await getRequestUserId(req);
      if (!canAccessBrief(briefMessagesMatch[1], userId)) {
        sendJson(res, { error: "Brief not found" }, 404);
        return;
      }
      sendJson(
        res,
        await sendMessage(briefMessagesMatch[1], body.content, body.ai, userId),
      );
      return;
    }

    if (briefMessagesMatch && req.method === "DELETE") {
      const userId = await getRequestUserId(req);
      if (!canAccessBrief(briefMessagesMatch[1], userId)) {
        sendJson(res, { error: "Brief not found" }, 404);
        return;
      }
      clearMessages(briefMessagesMatch[1]);
      sendJson(res, { ok: true });
      return;
    }

    const briefActionsMatch = url.pathname.match(
      /^\/api\/briefs\/([^/]+)\/actions$/,
    );
    if (briefActionsMatch && req.method === "GET") {
      const userId = await getRequestUserId(req);
      if (!canAccessBrief(briefActionsMatch[1], userId)) {
        sendJson(res, { error: "Brief not found" }, 404);
        return;
      }
      sendJson(res, listActions(briefActionsMatch[1]));
      return;
    }

    if (briefActionsMatch && req.method === "POST") {
      const body = await readJson(req);
      const userId = await getRequestUserId(req);
      if (!canAccessBrief(briefActionsMatch[1], userId)) {
        sendJson(res, { error: "Brief not found" }, 404);
        return;
      }
      sendJson(res, await createAction(briefActionsMatch[1], body, userId));
      return;
    }

    const briefActionMatch = url.pathname.match(
      /^\/api\/briefs\/([^/]+)\/actions\/([^/]+)$/,
    );
    if (briefActionMatch && req.method === "DELETE") {
      const userId = await getRequestUserId(req);
      if (!canAccessBrief(briefActionMatch[1], userId)) {
        sendJson(res, { error: "Brief not found" }, 404);
        return;
      }
      const result = deleteAction(briefActionMatch[1], briefActionMatch[2]);
      if (!result) {
        sendJson(res, { error: "Draft action not found" }, 404);
        return;
      }
      sendJson(res, result);
      return;
    }

    const visibilityMatch = url.pathname.match(
      /^\/api\/briefs\/([^/]+)\/visibility$/,
    );
    if (visibilityMatch && req.method === "PUT") {
      const body = await readJson(req);
      const userId = await getRequestUserId(req);
      const result = updateBriefVisibility(visibilityMatch[1], userId, body.visibility);
      if (!result) {
        sendJson(res, { error: "Brief not found" }, 404);
        return;
      }
      sendJson(res, result);
      return;
    }

    const publicBriefMatch = url.pathname.match(
      /^\/api\/share\/briefs\/([^/]+)$/,
    );
    if (publicBriefMatch && req.method === "GET") {
      const brief = getPublicBrief(publicBriefMatch[1]);
      if (!brief) {
        sendJson(res, { error: "Shared brief not found" }, 404);
        return;
      }
      sendJson(res, brief);
      return;
    }

    const briefMatch = url.pathname.match(/^\/api\/briefs\/([^/]+)$/);
    if (briefMatch && req.method === "GET") {
      const userId = await getRequestUserId(req);
      const brief = getBrief(briefMatch[1], userId);
      if (!brief) {
        const existingBrief = getBriefRecord(briefMatch[1]);
        if (existingBrief && existingBrief.visibility === "private") {
          sendJson(res, { error: "Authentication required" }, 401);
          return;
        }
        sendJson(res, { error: "Brief not found" }, 404);
        return;
      }
      sendJson(res, brief);
      return;
    }

    if (briefMatch && req.method === "DELETE") {
      const userId = await getRequestUserId(req);
      const result = deleteBrief(briefMatch[1], userId);
      if (result?.status === "not_found") {
        sendJson(res, { error: "Brief not found" }, 404);
        return;
      }
      if (result?.status === "sample") {
        sendJson(res, { error: "The sample brief cannot be deleted." }, 403);
        return;
      }
      if (result?.status === "forbidden") {
        sendJson(res, { error: "You can only delete briefs you created." }, 403);
        return;
      }
      sendJson(res, result);
      return;
    }

    sendJson(res, { error: "Not found" }, 404);
  } catch (error) {
    sendJson(
      res,
      { error: error instanceof Error ? error.message : "Server error" },
      500,
    );
  }
}).listen(port, host, () => {
  console.log(`Mwananchi API listening on http://${host}:${port}`);
});

function setCorsHeaders(res) {
  res.setHeader(
    "Access-Control-Allow-Origin",
    process.env.CLIENT_ORIGIN || "http://localhost:5173",
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "content-type, authorization, x-mwananchi-user-id",
  );
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
}

function sendJson(res, payload, status = 200) {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(payload));
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

function upsertUser(input) {
  const now = new Date().toISOString();
  const user = {
    id: input.id,
    name: input.name || "Mwananchi user",
    email: String(input.email || "")
      .trim()
      .toLowerCase(),
    createdAt: now,
  };

  db.prepare(
    `
    INSERT INTO users (id, name, email, created_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET name = excluded.name, email = excluded.email
  `,
  ).run(user.id, user.name, user.email, user.createdAt);

  return user;
}

function listUserAiKeyStatuses(userId) {
  const rows = db
    .prepare(
      "SELECT provider, updated_at FROM ai_api_keys WHERE user_id = ? ORDER BY provider ASC",
    )
    .all(userId);
  return rows.map((row) => ({
    provider: row.provider,
    isConfigured: true,
    updatedAt: row.updated_at,
  }));
}

function upsertUserAiKey(userId, input) {
  const provider = normalizeProvider(input.provider);
  const apiKey = String(input.apiKey || "").trim();
  if (!provider) throw new Error("Unsupported AI provider.");
  if (!apiKey) throw new Error("API key is required.");

  const encrypted = encryptApiKey(apiKey);
  const now = new Date().toISOString();
  db.prepare(
    `
    INSERT INTO ai_api_keys (user_id, provider, encrypted_key, iv, auth_tag, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id, provider) DO UPDATE SET
      encrypted_key = excluded.encrypted_key,
      iv = excluded.iv,
      auth_tag = excluded.auth_tag,
      updated_at = excluded.updated_at
  `,
  ).run(
    userId,
    provider,
    encrypted.encryptedKey,
    encrypted.iv,
    encrypted.authTag,
    now,
    now,
  );

  return {
    provider,
    isConfigured: true,
    updatedAt: now,
  };
}

function deleteUserAiKey(userId, providerValue) {
  const provider = normalizeProvider(providerValue);
  if (!provider) return;
  db.prepare("DELETE FROM ai_api_keys WHERE user_id = ? AND provider = ?").run(
    userId,
    provider,
  );
}

function getUserAiDefaults(userId) {
  const row = db
    .prepare("SELECT * FROM user_ai_defaults WHERE user_id = ?")
    .get(userId);
  if (!row) return null;

  return {
    provider: row.provider,
    model: row.model,
    ...(row.base_url ? { baseUrl: row.base_url } : {}),
    updatedAt: row.updated_at,
  };
}

function upsertUserAiDefaults(userId, input) {
  const selection = normalizeAiSelection(input);
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO user_ai_defaults (user_id, provider, model, base_url, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      provider = excluded.provider,
      model = excluded.model,
      base_url = excluded.base_url,
      updated_at = excluded.updated_at
  `).run(
    userId,
    selection.provider,
    selection.model,
    selection.baseUrl || null,
    now,
  );

  return {
    ...selection,
    updatedAt: now,
  };
}

function getDecryptedUserAiKey(userId, providerValue) {
  const provider = normalizeProvider(providerValue);
  if (!provider) return null;

  const row = db
    .prepare(
      "SELECT encrypted_key, iv, auth_tag FROM ai_api_keys WHERE user_id = ? AND provider = ?",
    )
    .get(userId, provider);
  if (!row) return null;

  try {
    return decryptApiKey(row);
  } catch {
    return null;
  }
}

function encryptApiKey(apiKey) {
  const key = getApiKeyEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(apiKey, "utf8"),
    cipher.final(),
  ]);

  return {
    encryptedKey: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
  };
}

function decryptApiKey(row) {
  const decipher = createDecipheriv(
    "aes-256-gcm",
    getApiKeyEncryptionKey(),
    Buffer.from(row.iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(row.auth_tag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(row.encrypted_key, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

function getApiKeyEncryptionKey() {
  const secret = process.env.API_KEY_ENCRYPTION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "API_KEY_ENCRYPTION_SECRET must be set to at least 32 characters before storing user API keys.",
    );
  }

  return createHash("sha256").update(secret).digest();
}

function normalizeProvider(provider) {
  return ["openai", "openrouter", "anthropic", "lmstudio", "custom"].includes(
    provider,
  )
    ? provider
    : null;
}

function listBriefs(userId) {
  const rows = userId
    ? db
        .prepare(
          "SELECT * FROM briefs WHERE user_id = ? OR id = ? ORDER BY created_at DESC",
        )
        .all(userId, "brief-sample-budget")
    : db
        .prepare(
          "SELECT * FROM briefs WHERE user_id IS NULL OR id = ? ORDER BY created_at DESC",
        )
        .all("brief-sample-budget");

  return rows.map(mapBriefRow);
}

function getBrief(briefId, userId) {
  const row = db
    .prepare(
      `
      SELECT * FROM briefs
      WHERE id = ?
        AND (visibility IN ('unlisted', 'public') OR user_id IS NULL OR user_id = ? OR id = ?)
    `,
    )
    .get(briefId, userId || "", "brief-sample-budget");
  return row ? mapBriefRow(row) : null;
}

function getBriefRecord(briefId) {
  return db.prepare("SELECT * FROM briefs WHERE id = ?").get(briefId);
}

function getPublicBrief(briefId) {
  const row = db
    .prepare("SELECT * FROM briefs WHERE id = ? AND visibility IN ('unlisted', 'public')")
    .get(briefId);
  return row ? mapBriefRow(row) : null;
}

async function createBrief(input, userId, ai) {
  const brief = await buildBrief(input, userId, ai);

  db.prepare(
    `
    INSERT INTO briefs (
      id, user_id, title, category, jurisdiction, source_text, summary,
      key_points, affected_groups, concerns, citizen_questions, next_steps, ai_error, visibility, created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
  ).run(
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
    brief.aiError || null,
    brief.visibility || "private",
    brief.createdAt,
  );

  const message = {
    id: crypto.randomUUID(),
    briefId: brief.id,
    role: "assistant",
    content:
      "I created the first plain-language brief. What would you like to understand next?",
    createdAt: new Date().toISOString(),
  };
  insertMessage(message);

  return brief;
}

function listMessages(briefId) {
  return db
    .prepare(
      "SELECT * FROM chat_messages WHERE brief_id = ? ORDER BY created_at ASC",
    )
    .all(briefId)
    .map((row) => ({
      id: row.id,
      briefId: row.brief_id,
      role: row.role,
      content: row.content,
      aiError: row.ai_error || undefined,
      createdAt: row.created_at,
    }));
}

function clearMessages(briefId) {
  db.prepare("DELETE FROM chat_messages WHERE brief_id = ?").run(briefId);
}

function listActions(briefId) {
  return db
    .prepare(
      "SELECT * FROM civic_actions WHERE brief_id = ? ORDER BY created_at DESC",
    )
    .all(briefId)
    .map(mapActionRow);
}

function deleteAction(briefId, actionId) {
  const result = db
    .prepare("DELETE FROM civic_actions WHERE brief_id = ? AND id = ?")
    .run(briefId, actionId);
  return result.changes ? { ok: true } : null;
}

async function sendMessage(briefId, content, ai, userId) {
  const now = new Date().toISOString();
  insertMessage({
    id: crypto.randomUUID(),
    briefId,
    role: "user",
    content,
    createdAt: now,
  });

  const assistantMessage = {
    id: crypto.randomUUID(),
    briefId,
    role: "assistant",
    ...(await buildChatReply(briefId, content, ai, userId)),
    createdAt: now,
  };
  insertMessage(assistantMessage);
  return assistantMessage;
}

async function createAction(briefId, input, userId) {
  const draft = await buildActionDraft(briefId, input, userId);
  const action = {
    ...input,
    id: crypto.randomUUID(),
    briefId,
    content: draft.content,
    aiError: draft.aiError,
    createdAt: new Date().toISOString(),
  };

  db.prepare(
    `
    INSERT INTO civic_actions (id, brief_id, action_type, tone, audience, extra_context, content, ai_error, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
  ).run(
    action.id,
    briefId,
    action.actionType,
    action.tone,
    action.audience,
    action.extraContext || null,
    action.content,
    action.aiError || null,
    action.createdAt,
  );

  return action;
}

function updateBriefVisibility(briefId, userId, visibility) {
  if (!["private", "unlisted", "public"].includes(visibility)) return null;
  const row = db
    .prepare(
      "SELECT * FROM briefs WHERE id = ? AND (user_id = ? OR user_id IS NULL OR id = ?)",
    )
    .get(briefId, userId || "", "brief-sample-budget");
  if (!row) return null;

  db.prepare("UPDATE briefs SET visibility = ? WHERE id = ?").run(visibility, briefId);
  return { ok: true, visibility };
}

function deleteBrief(briefId, userId) {
  if (briefId === "brief-sample-budget") return { status: "sample" };

  const row = db
    .prepare("SELECT * FROM briefs WHERE id = ?")
    .get(briefId);
  if (!row) return { status: "not_found" };
  if (row.user_id && row.user_id !== userId) return { status: "forbidden" };

  db.prepare("DELETE FROM chat_messages WHERE brief_id = ?").run(briefId);
  db.prepare("DELETE FROM civic_actions WHERE brief_id = ?").run(briefId);
  db.prepare("DELETE FROM briefs WHERE id = ?").run(briefId);

  return { ok: true };
}

function insertMessage(message) {
  db.prepare(
    `
    INSERT INTO chat_messages (id, brief_id, role, content, ai_error, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `,
  ).run(
    message.id,
    message.briefId,
    message.role,
    message.content,
    message.aiError || null,
    message.createdAt,
  );
}

async function buildBrief(input, userId, ai) {
  const { brief: aiBrief, error: aiError } = await generateBriefWithAi(
    input,
    ai,
    userId,
  );

  return {
    id: `brief-${crypto.randomUUID()}`,
    title: input.title,
    category: input.category,
    jurisdiction: input.jurisdiction,
    visibility: "private",
    summary:
      aiBrief?.summary ??
      `This ${String(input.category).toLowerCase()} document appears to affect public decision-making in ${input.jurisdiction}. Mwananchi App summarized the submitted text, highlighted who is affected, and prepared citizen questions.`,
    keyPoints: aiBrief?.keyPoints ?? [
      "The document should be translated into plain language before public discussion.",
      "Citizens need to know deadlines, responsible offices, and practical effects.",
      "Any unclear claims should be checked against the original public source.",
    ],
    affectedGroups: aiBrief?.affectedGroups ?? [
      "Citizens",
      "Community organizers",
      "Journalists",
      "Civil society groups",
    ],
    concerns: aiBrief?.concerns ?? [
      "Important details may be hidden in technical wording.",
      "The current MVP uses mock analysis until an AI backend is connected.",
    ],
    citizenQuestions: aiBrief?.citizenQuestions ?? [
      "What decision is the public being asked to influence?",
      "Who benefits, who carries costs, and who might be left out?",
      "Where can citizens submit official feedback?",
    ],
    nextSteps: aiBrief?.nextSteps ?? [
      "Ask a follow-up question in the chat panel.",
      "Generate a public comment or representative email.",
      userId
        ? "Find this brief again from your dashboard."
        : "Create an account to keep generated briefs across sessions.",
    ],
    aiError,
    createdAt: new Date().toISOString(),
  };
}

async function buildActionDraft(briefId, input, userId) {
  const { text: aiDraft, error: aiError } = await generateActionWithAi(
    briefId,
    input,
    userId,
  );
  if (aiDraft) return { content: aiDraft, aiError };

  if (input.actionType === "whatsapp_summary") {
    return {
      content:
        "Public document summary: this proposal may affect local services and citizen participation. Ask what changes, who is affected, how feedback will be used, and where official comments should be sent.",
      aiError,
    };
  }

  return {
    content: `Dear ${input.audience || "public official"},

I am writing to request a clear explanation of the proposal, including who is affected, what tradeoffs were considered, and how public feedback will influence the final decision.

Please share the official submission process, deadline, and any ward-level or community-level details citizens should review.

Regards,
A concerned mwananchi`,
    aiError,
  };
}

async function generateBriefWithAi(input, ai, userId) {
  const result = await generateAiText({
    ai,
    userId,
    instructions:
      "You are a careful civic document explainer. Do not invent facts. If the document is unclear, say what is uncertain. Return only valid JSON.",
    input: `Analyze this civic document and return JSON with keys summary, keyPoints, affectedGroups, concerns, citizenQuestions, nextSteps. Arrays should contain 3 to 5 concise items.
${getLanguageInstruction(ai)}

Title: ${input.title}
Category: ${input.category}
Jurisdiction: ${input.jurisdiction}

Document:
${input.documentText.slice(0, 24000)}`,
  });

  const text = result.text;
  if (!text) return { brief: null, error: result.error };
  const parsed = parseJsonObject(text);
  if (!parsed) {
    return {
      brief: buildBriefFromUnstructuredAiText(text),
      error: "The AI provider returned prose instead of structured JSON, so Mwananchi App used that response as the brief summary.",
    };
  }

  return {
    brief: normalizeParsedBrief(parsed),
    error: result.error,
  };
}

async function buildChatReply(briefId, content, ai, userId) {
  const brief = getBriefForAi(briefId);
  const thread = listMessages(briefId).slice(-8);
  const context = brief
    ? `Brief title: ${brief.title}
Category: ${brief.category}
Jurisdiction: ${brief.jurisdiction}
Summary: ${brief.summary}
Key points: ${brief.keyPoints.join("; ")}
Concerns: ${brief.concerns.join("; ")}
Source text excerpt: ${brief.sourceText.slice(0, 12000)}`
    : "";

  const result = await generateAiText({
    ai,
    userId,
    instructions:
      `You answer questions about a civic brief. Ground answers in the provided brief/source text. If unsupported, say the brief does not include enough information. ${getLanguageInstruction(ai)}`,
    input: `${context}

Recent chat:
${thread.map((message) => `${message.role}: ${message.content}`).join("\n")}

User question: ${content}`,
  });

  return {
    content:
      result.text ||
      "Based on the stored brief, focus on the practical effect, public participation deadline, and accountable office. A real AI backend should cite the source text before making stronger claims.",
    aiError: result.error,
  };
}

async function generateActionWithAi(briefId, input, userId) {
  const brief = getBriefForAi(briefId);
  if (!brief)
    return {
      text: null,
      error: "The brief could not be loaded for AI generation.",
    };

  return generateAiText({
    ai: input.ai,
    userId,
    instructions:
      `Draft clear, respectful civic action text. Avoid legal advice. Keep claims grounded in the brief. ${getLanguageInstruction(input.ai)}`,
    input: `Create a ${input.actionType} with a ${input.tone} tone for ${input.audience || "a public official"}.

Extra context: ${input.extraContext || "None"}

Brief:
${brief.title}
${brief.summary}
Key points: ${brief.keyPoints.join("; ")}
Questions: ${brief.citizenQuestions.join("; ")}`,
  });
}

async function generateAiText({ ai, userId, instructions, input }) {
  const selection = normalizeAiSelection(ai);
  const userApiKey = userId
    ? getDecryptedUserAiKey(userId, selection.provider)
    : null;
  const isConfigured = isAiProviderConfigured(selection, userApiKey);

  try {
    let text = null;
    if (selection.provider === "openai") {
      text = await callOpenAiResponses(
        selection.model,
        instructions,
        input,
        userApiKey,
      );
    } else if (selection.provider === "anthropic") {
      text = await callAnthropicMessages(
        selection.model,
        instructions,
        input,
        userApiKey,
      );
    } else {
      text = await callOpenAiCompatible(
        selection,
        instructions,
        input,
        userApiKey,
      );
    }

    return {
      text,
      error: text ? undefined : getNoTextMessage(selection, isConfigured),
    };
  } catch (error) {
    return {
      text: null,
      error: getAiErrorMessage(selection, error, isConfigured),
    };
  }
}

function isAiProviderConfigured(selection, userApiKey) {
  if (selection.provider === "openai")
    return Boolean(userApiKey || process.env.OPENAI_API_KEY);
  if (selection.provider === "anthropic")
    return Boolean(userApiKey || process.env.ANTHROPIC_API_KEY);
  if (selection.provider === "openrouter")
    return Boolean(userApiKey || process.env.OPENROUTER_API_KEY);
  if (selection.provider === "lmstudio")
    return Boolean(selection.baseUrl || process.env.LM_STUDIO_BASE_URL);
  return Boolean(
    (userApiKey || process.env.CUSTOM_AI_API_KEY) &&
    process.env.CUSTOM_AI_BASE_URL,
  );
}

async function callOpenAiResponses(model, instructions, input, userApiKey) {
  const apiKey = userApiKey || process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ model, instructions, input }),
  });

  if (!response.ok)
    throw new Error(`OpenAI request failed with ${response.status}`);
  const payload = await response.json();
  return extractOpenAiOutputText(payload);
}

async function callOpenAiCompatible(
  selection,
  instructions,
  input,
  userApiKey,
) {
  const config = getCompatibleProviderConfig(selection, userApiKey);
  if (!config.apiKey || !config.baseUrl) return null;

  const response = await fetch(
    `${config.baseUrl.replace(/\/$/, "")}/chat/completions`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${config.apiKey}`,
        "content-type": "application/json",
        ...(selection.provider === "openrouter"
          ? {
              "HTTP-Referer":
                process.env.CLIENT_ORIGIN || "http://localhost:5173",
              "X-Title": "Mwananchi App",
            }
          : {}),
      },
      body: JSON.stringify({
        model: selection.model,
        max_tokens: 1600,
        temperature: 0.3,
        messages: [
          { role: "system", content: instructions },
          { role: "user", content: input },
        ],
      }),
    },
  );

  if (!response.ok)
    throw new Error(
      `${selection.provider} request failed with ${response.status}`,
    );
  const payload = await response.json();
  return extractChatCompletionText(payload);
}

async function callAnthropicMessages(model, instructions, input, userApiKey) {
  const apiKey = userApiKey || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 1600,
      system: instructions,
      messages: [{ role: "user", content: input }],
    }),
  });

  if (!response.ok)
    throw new Error(`Anthropic request failed with ${response.status}`);
  const payload = await response.json();
  return extractAnthropicText(payload);
}

function getAiErrorMessage(selection, error, isConfigured) {
  const rawMessage = error instanceof Error ? error.message : "";
  const status = rawMessage.match(/\b(\d{3})\b/)?.[1];
  const providerName = getProviderLabel(selection.provider);
  const prefix = isConfigured ? `Configured ${providerName}` : providerName;

  if (!isConfigured) {
    return getMissingKeyMessage(selection.provider);
  }

  if (status === "401" || status === "403") {
    return `${prefix} rejected the API key. Check the stored key or server environment key.`;
  }

  if (status === "404") {
    return `${prefix} could not find model "${selection.model}". Choose a different model and try again.`;
  }

  if (status === "429") {
    return `${prefix} rate limits or quota were reached. Try again later or switch providers.`;
  }

  if (status && Number(status) >= 500) {
    return `${prefix} is temporarily unavailable. Mwananchi App used the prototype fallback instead.`;
  }

  return `${prefix} threw an error before completing the request. Check the provider settings, model name, and network availability.`;
}

function getNoTextMessage(selection, isConfigured) {
  if (!isConfigured) return getMissingKeyMessage(selection.provider);
  return `Configured ${getProviderLabel(selection.provider)} returned an empty response. Mwananchi App used the prototype fallback instead.`;
}

function getMissingKeyMessage(provider) {
  return `No ${getProviderLabel(provider)} API key is configured for this request. Mwananchi App used the prototype fallback instead.`;
}

function getProviderLabel(provider) {
  const labels = {
    openai: "OpenAI",
    openrouter: "OpenRouter",
    anthropic: "Anthropic",
    lmstudio: "LM Studio",
    custom: "custom provider",
  };
  return labels[provider] || "AI provider";
}

function getCompatibleProviderConfig(selection, userApiKey) {
  const provider = selection.provider;
  if (provider === "openrouter") {
    return {
      apiKey: userApiKey || process.env.OPENROUTER_API_KEY,
      baseUrl: "https://openrouter.ai/api/v1",
    };
  }

  if (provider === "lmstudio") {
    return {
      apiKey: userApiKey || process.env.LM_STUDIO_API_KEY || "lm-studio",
      baseUrl:
        selection.baseUrl ||
        process.env.LM_STUDIO_BASE_URL ||
        "http://127.0.0.1:1234/v1",
    };
  }

  return {
    apiKey: userApiKey || process.env.CUSTOM_AI_API_KEY,
    baseUrl: process.env.CUSTOM_AI_BASE_URL,
  };
}

async function listConfiguredProviderModels(providerValue, userId) {
  const provider = normalizeProvider(providerValue);
  if (!provider) throw new Error("Unsupported AI provider.");
  if (provider === "lmstudio")
    throw new Error("LM Studio models are loaded directly from the browser.");

  const userApiKey = getDecryptedUserAiKey(userId, provider);
  const models = await fetchProviderModels(provider, userApiKey);
  return { models };
}

async function fetchProviderModels(provider, userApiKey) {
  if (provider === "openai") {
    const apiKey = userApiKey || process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OpenAI is not configured.");
    const response = await fetch("https://api.openai.com/v1/models", {
      headers: { authorization: `Bearer ${apiKey}` },
    });
    if (!response.ok)
      throw new Error(`OpenAI model request failed with ${response.status}`);
    const payload = await response.json();
    return normalizeModelList(payload.data);
  }

  if (provider === "openrouter") {
    const apiKey = userApiKey || process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error("OpenRouter is not configured.");
    const response = await fetch("https://openrouter.ai/api/v1/models", {
      headers: { authorization: `Bearer ${apiKey}` },
    });
    if (!response.ok)
      throw new Error(
        `OpenRouter model request failed with ${response.status}`,
      );
    const payload = await response.json();
    return normalizeModelList(payload.data);
  }

  if (provider === "anthropic") {
    const apiKey = userApiKey || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("Anthropic is not configured.");
    const response = await fetch("https://api.anthropic.com/v1/models", {
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
    });
    if (!response.ok)
      throw new Error(`Anthropic model request failed with ${response.status}`);
    const payload = await response.json();
    return normalizeModelList(payload.data);
  }

  const config = getCompatibleProviderConfig(
    { provider, model: "" },
    userApiKey,
  );
  if (!config.apiKey || !config.baseUrl)
    throw new Error("Custom provider is not configured.");
  const response = await fetch(`${config.baseUrl.replace(/\/$/, "")}/models`, {
    headers: { authorization: `Bearer ${config.apiKey}` },
  });
  if (!response.ok)
    throw new Error(
      `Custom provider model request failed with ${response.status}`,
    );
  const payload = await response.json();
  return normalizeModelList(payload.data);
}

function normalizeModelList(value) {
  return Array.isArray(value)
    ? value
        .map((model) => {
          if (typeof model === "string") return model;
          if (typeof model.id === "string") return model.id;
          if (typeof model.name === "string") return model.name;
          return "";
        })
        .filter(Boolean)
    : [];
}

async function listLmStudioModels(baseUrlValue) {
  const baseUrl = String(
    baseUrlValue ||
      process.env.LM_STUDIO_BASE_URL ||
      "http://127.0.0.1:1234/v1",
  ).trim();
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/models`, {
    headers: {
      authorization: `Bearer ${process.env.LM_STUDIO_API_KEY || "lm-studio"}`,
    },
  });

  if (!response.ok)
    throw new Error(`LM Studio model request failed with ${response.status}`);

  const payload = await response.json();
  return { models: normalizeModelList(payload.data) };
}

function normalizeAiSelection(ai) {
  const provider = [
    "openai",
    "openrouter",
    "anthropic",
    "lmstudio",
    "custom",
  ].includes(ai?.provider)
    ? ai.provider
    : "openai";
  const fallbackModels = {
    openai: "gpt-5.4-mini",
    openrouter: "openai/gpt-5.4-mini",
    anthropic: "claude-sonnet-4-5",
    lmstudio: "local-model",
    custom: "gpt-4.1",
  };

  return {
    provider,
    model:
      typeof ai?.model === "string" && ai.model.trim()
        ? ai.model.trim()
        : fallbackModels[provider],
    ...(provider === "lmstudio" &&
    typeof ai?.baseUrl === "string" &&
    ai.baseUrl.trim()
      ? { baseUrl: ai.baseUrl.trim() }
      : {}),
    ...(["en", "sw", "ar", "fr", "pt"].includes(ai?.language)
      ? { language: ai.language }
      : {}),
  };
}

function getLanguageInstruction(ai) {
  const instructions = {
    ar: "Respond in Arabic. Use clear Modern Standard Arabic and keep civic/legal wording accessible.",
    fr: "Respond in French. Keep civic/legal wording clear and accessible.",
    pt: "Respond in Portuguese. Keep civic/legal wording clear and accessible.",
    sw: "Respond in Kiswahili. Keep civic/legal wording clear and accessible for Kenyan readers.",
  };
  return instructions[ai?.language] || "Respond in English.";
}

function parseJsonObject(value) {
  const normalized = value
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();

  try {
    return JSON.parse(normalized);
  } catch {
    const match = normalized.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

function normalizeParsedBrief(parsed) {
  return {
    summary: String(parsed.summary || parsed.plainLanguageSummary || parsed.overview || "").trim(),
    keyPoints: normalizeStringArray(parsed.keyPoints || parsed.key_points || parsed.points),
    affectedGroups: normalizeStringArray(parsed.affectedGroups || parsed.affected_groups || parsed.whoIsAffected),
    concerns: normalizeStringArray(parsed.concerns || parsed.risks || parsed.possibleConcerns),
    citizenQuestions: normalizeStringArray(parsed.citizenQuestions || parsed.citizen_questions || parsed.questions),
    nextSteps: normalizeStringArray(parsed.nextSteps || parsed.next_steps || parsed.actions),
  };
}

function buildBriefFromUnstructuredAiText(text) {
  const sections = parseMarkdownishSections(text);
  return {
    summary: summarizeUnstructuredText(sections.summary?.join(" ") || text),
    keyPoints: sections.keyPoints || extractListLikeLines(text).slice(0, 5),
    affectedGroups: sections.affectedGroups || ["Citizens", "Community groups", "Public officials"],
    concerns: sections.concerns || ["Review the original document before relying on this summary."],
    citizenQuestions: sections.citizenQuestions || ["What official process, deadline, and responsible office should citizens verify?"],
    nextSteps: sections.nextSteps || ["Compare this summary against the source document.", "Ask a follow-up question in the chat panel."],
  };
}

function parseMarkdownishSections(text) {
  const sections = {};
  let currentKey = "summary";

  text.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    const heading = trimmed.replace(/^#{1,3}\s+/, "").replace(/:$/, "").toLowerCase();
    if (/key points?/.test(heading)) currentKey = "keyPoints";
    else if (/affected|who is affected/.test(heading)) currentKey = "affectedGroups";
    else if (/concerns?|risks?/.test(heading)) currentKey = "concerns";
    else if (/questions?/.test(heading)) currentKey = "citizenQuestions";
    else if (/next steps?|actions?/.test(heading)) currentKey = "nextSteps";
    else if (/summary|overview/.test(heading)) currentKey = "summary";

    const item = trimmed
      .replace(/^#{1,3}\s+/, "")
      .replace(/^[-*]\s+/, "")
      .replace(/^\d+[.)]\s+/, "")
      .trim();

    if (item && item.toLowerCase() !== heading) {
      sections[currentKey] = [...(sections[currentKey] || []), item];
    }
  });

  return sections;
}

function summarizeUnstructuredText(text) {
  return text.replace(/\s+/g, " ").trim().slice(0, 900);
}

function extractListLikeLines(text) {
  return text
    .split("\n")
    .map((line) => line.trim().replace(/^[-*]\s+/, "").replace(/^\d+[.)]\s+/, ""))
    .filter((line) => line.length > 20)
    .slice(0, 6);
}

function normalizeStringArray(value) {
  return Array.isArray(value)
    ? value
        .map((item) => String(item).trim())
        .filter(Boolean)
        .slice(0, 6)
    : [];
}

function extractOpenAiOutputText(payload) {
  const directText = extractContentText(payload.output_text);
  if (directText) return directText;

  const outputText = extractContentText(
    payload.output?.flatMap((item) => item.content ?? []),
  );
  if (outputText) return outputText;

  return extractChatCompletionText(payload);
}

function extractAnthropicText(payload) {
  const contentText = extractContentText(payload.content);
  if (contentText) return contentText;

  return extractContentText(
    payload.completion ?? payload.output_text ?? payload.text,
  );
}

function extractChatCompletionText(payload) {
  const choice = payload.choices?.[0];
  const content =
    choice?.message?.content ?? choice?.text ?? choice?.delta?.content;
  const text = extractContentText(content);
  if (text) return text;

  const reasoningContent = extractContentText(
    choice?.message?.reasoning_content,
  );
  return reasoningContent || null;
}

function extractContentText(content) {
  if (typeof content === "string") return content.trim() || null;
  if (typeof content?.text === "string") return content.text.trim() || null;
  if (typeof content?.content === "string")
    return content.content.trim() || null;
  if (!Array.isArray(content)) return null;

  return (
    content
      .map((item) => {
        if (typeof item === "string") return item;
        if (typeof item?.text === "string") return item.text;
        if (typeof item?.content === "string") return item.content;
        if (Array.isArray(item?.content))
          return extractContentText(item.content) || "";
        return "";
      })
      .filter(Boolean)
      .join("\n")
      .trim() || null
  );
}

function getBriefForAi(briefId) {
  const row = db.prepare("SELECT * FROM briefs WHERE id = ?").get(briefId);
  if (!row) return null;
  return {
    ...mapBriefRow(row),
    sourceText: row.source_text,
  };
}

function mapBriefRow(row) {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    jurisdiction: row.jurisdiction,
    visibility: row.visibility || "private",
    summary: row.summary,
    keyPoints: JSON.parse(row.key_points),
    affectedGroups: JSON.parse(row.affected_groups),
    concerns: JSON.parse(row.concerns),
    citizenQuestions: JSON.parse(row.citizen_questions),
    nextSteps: JSON.parse(row.next_steps),
    aiError: row.ai_error || undefined,
    createdAt: row.created_at,
  };
}

function mapActionRow(row) {
  return {
    id: row.id,
    briefId: row.brief_id,
    actionType: row.action_type,
    tone: row.tone,
    audience: row.audience,
    extraContext: row.extra_context || undefined,
    content: row.content,
    aiError: row.ai_error || undefined,
    createdAt: row.created_at,
  };
}

function canAccessBrief(briefId, userId) {
  return Boolean(getBrief(briefId, userId));
}

async function getRequestUserId(req) {
  const bearerToken = req.headers.authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  const tokenUserId = bearerToken
    ? await getVerifiedUserIdFromJwt(bearerToken)
    : null;
  return tokenUserId || req.headers["x-mwananchi-user-id"] || undefined;
}

async function getRequiredRequestUserId(req, res) {
  const userId = await getRequestUserId(req);
  if (!userId) {
    sendJson(res, { error: "Authentication required" }, 401);
    return null;
  }
  return userId;
}

async function getVerifiedUserIdFromJwt(token) {
  if (!clerkJwksUrl) return null;

  const [headerSegment, payloadSegment, signatureSegment] = token.split(".");
  if (!headerSegment || !payloadSegment || !signatureSegment) return null;

  try {
    const header = JSON.parse(base64UrlDecode(headerSegment).toString("utf8"));
    const json = base64UrlDecode(payloadSegment).toString("utf8");
    const claims = JSON.parse(json);
    if (claims.exp && Date.now() >= claims.exp * 1000) return null;
    if (header.alg !== "RS256" || !header.kid) return null;

    const jwks = await getClerkJwks();
    const jwk = jwks.keys.find((key) => key.kid === header.kid);
    if (!jwk) return null;

    const key = createPublicKey({ key: jwk, format: "jwk" });
    const isValid = verify(
      "RSA-SHA256",
      Buffer.from(`${headerSegment}.${payloadSegment}`),
      key,
      base64UrlDecode(signatureSegment),
    );

    return isValid && typeof claims.sub === "string" ? claims.sub : null;
  } catch {
    return null;
  }
}

async function getClerkJwks() {
  if (cachedJwks) return cachedJwks;

  const response = await fetch(clerkJwksUrl);
  if (!response.ok) throw new Error("Could not load Clerk JWKS.");
  cachedJwks = await response.json();
  return cachedJwks;
}

function base64UrlDecode(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(
    normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="),
    "base64",
  );
}

function ensureColumn(tableName, columnName, definition) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
  if (columns.some((column) => column.name === columnName)) return;
  db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
}

function seedSampleBrief() {
  const existing = db
    .prepare("SELECT id FROM briefs WHERE id = ?")
    .get("brief-sample-budget");
  if (existing) return;

  const sample = {
    id: "brief-sample-budget",
    userId: null,
    title: "County Budget Public Notice",
    category: "Budget",
    jurisdiction: "Nairobi County",
    visibility: "unlisted",
    sourceText: "Sample county budget public notice.",
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

  db.prepare(
    `
    INSERT INTO briefs (
      id, user_id, title, category, jurisdiction, source_text, summary,
      key_points, affected_groups, concerns, citizen_questions, next_steps, ai_error, visibility, created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
  ).run(
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
    null,
    sample.visibility || "private",
    sample.createdAt,
  );

  insertMessage({
    id: "msg-1",
    briefId: sample.id,
    role: "assistant",
    content:
      "Ask me what this notice means for residents, budgets, or public participation.",
    createdAt: sample.createdAt,
  });
}

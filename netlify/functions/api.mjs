import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

const sampleBriefId = "brief-sample-budget";
const categories = [
  "Housing",
  "Justice",
  "Elections",
  "Education",
  "Health",
  "Budget",
  "Other",
];
const actionTypes = [
  "email",
  "petition",
  "public_comment",
  "whatsapp_summary",
  "talking_points",
];
const actionTones = ["Respectful", "Firm", "Youth-friendly", "Professional"];
const providerIds = ["openai", "openrouter", "anthropic", "lmstudio", "custom"];

export default async function handler(request) {
  try {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    if (request.method === "GET" && url.pathname === "/api/health") {
      return json({ ok: true });
    }

    await ensureSchema();
    await seedSampleBrief();

    if (request.method === "POST" && url.pathname === "/api/users") {
      return json(await upsertUser(await readJson(request)));
    }

    if (url.pathname === "/api/users/me/ai-defaults") {
      const userId = getRequiredRequestUserId(request);
      if (!userId) return json({ error: "Authentication required" }, 401);

      if (request.method === "GET") {
        return json(await getUserAiDefaults(userId));
      }

      if (request.method === "PUT") {
        return json(
          await upsertUserAiDefaults(userId, await readJson(request)),
        );
      }
    }

    if (url.pathname === "/api/users/me/ai-keys") {
      const userId = getRequiredRequestUserId(request);
      if (!userId) return json({ error: "Authentication required" }, 401);

      if (request.method === "GET") {
        return json(await listUserAiKeyStatuses(userId));
      }

      if (request.method === "PUT") {
        return json(await upsertUserAiKey(userId, await readJson(request)));
      }
    }

    const aiKeyMatch = url.pathname.match(
      /^\/api\/users\/me\/ai-keys\/([^/]+)$/,
    );
    if (aiKeyMatch && request.method === "DELETE") {
      const userId = getRequiredRequestUserId(request);
      if (!userId) return json({ error: "Authentication required" }, 401);
      await deleteUserAiKey(userId, aiKeyMatch[1]);
      return json({ ok: true });
    }

    const providerModelsMatch = url.pathname.match(
      /^\/api\/ai\/providers\/([^/]+)\/models$/,
    );
    if (providerModelsMatch && request.method === "GET") {
      const userId = getRequiredRequestUserId(request);
      if (!userId) return json({ error: "Authentication required" }, 401);
      return json({
        models: await listConfiguredProviderModels(
          providerModelsMatch[1],
          userId,
        ),
      });
    }

    if (
      request.method === "POST" &&
      url.pathname === "/api/ai/lmstudio/models"
    ) {
      const body = await readJson(request);
      return json({ models: await listLmStudioModels(body.baseUrl) });
    }

    if (request.method === "GET" && url.pathname === "/api/briefs") {
      return json(await listBriefs(getRequestUserId(request)));
    }

    if (request.method === "POST" && url.pathname === "/api/briefs") {
      const body = await readJson(request);
      return json(
        await createBrief(body.input, getRequestUserId(request), body.ai),
      );
    }

    const publicBriefMatch = url.pathname.match(
      /^\/api\/share\/briefs\/([^/]+)$/,
    );
    if (publicBriefMatch && request.method === "GET") {
      const brief = await getPublicBrief(publicBriefMatch[1]);
      if (!brief) return json({ error: "Shared brief not found" }, 404);
      return json(brief);
    }

    const briefMessagesMatch = url.pathname.match(
      /^\/api\/briefs\/([^/]+)\/messages$/,
    );
    if (briefMessagesMatch && request.method === "GET") {
      const userId = getRequestUserId(request);
      if (!(await canAccessBrief(briefMessagesMatch[1], userId))) {
        return json({ error: "Brief not found" }, 404);
      }
      return json(await listMessages(briefMessagesMatch[1]));
    }

    if (briefMessagesMatch && request.method === "POST") {
      const body = await readJson(request);
      const userId = getRequestUserId(request);
      if (!(await canAccessBrief(briefMessagesMatch[1], userId))) {
        return json({ error: "Brief not found" }, 404);
      }
      return json(
        await sendMessage(briefMessagesMatch[1], body.content, body.ai, userId),
      );
    }

    if (briefMessagesMatch && request.method === "DELETE") {
      const userId = getRequestUserId(request);
      if (!(await canAccessBrief(briefMessagesMatch[1], userId))) {
        return json({ error: "Brief not found" }, 404);
      }
      await clearMessages(briefMessagesMatch[1]);
      return json({ ok: true });
    }

    const briefActionsMatch = url.pathname.match(
      /^\/api\/briefs\/([^/]+)\/actions$/,
    );
    if (briefActionsMatch && request.method === "GET") {
      const userId = getRequestUserId(request);
      if (!(await canAccessBrief(briefActionsMatch[1], userId))) {
        return json({ error: "Brief not found" }, 404);
      }
      return json(await listActions(briefActionsMatch[1]));
    }

    if (briefActionsMatch && request.method === "POST") {
      const body = await readJson(request);
      const userId = getRequestUserId(request);
      if (!(await canAccessBrief(briefActionsMatch[1], userId))) {
        return json({ error: "Brief not found" }, 404);
      }
      return json(await createAction(briefActionsMatch[1], body, userId));
    }

    const briefActionMatch = url.pathname.match(
      /^\/api\/briefs\/([^/]+)\/actions\/([^/]+)$/,
    );
    if (briefActionMatch && request.method === "DELETE") {
      const userId = getRequestUserId(request);
      if (!(await canAccessBrief(briefActionMatch[1], userId))) {
        return json({ error: "Brief not found" }, 404);
      }
      const result = await deleteAction(
        briefActionMatch[1],
        briefActionMatch[2],
      );
      if (!result) return json({ error: "Draft action not found" }, 404);
      return json(result);
    }

    const visibilityMatch = url.pathname.match(
      /^\/api\/briefs\/([^/]+)\/visibility$/,
    );
    if (visibilityMatch && request.method === "PUT") {
      const body = await readJson(request);
      const result = await updateBriefVisibility(
        visibilityMatch[1],
        getRequestUserId(request),
        body.visibility,
      );
      if (!result) return json({ error: "Brief not found" }, 404);
      return json(result);
    }

    const briefMatch = url.pathname.match(/^\/api\/briefs\/([^/]+)$/);
    if (briefMatch && request.method === "GET") {
      const userId = getRequestUserId(request);
      const brief = await getBrief(briefMatch[1], userId);
      if (!brief) {
        const existingBrief = await getBriefRecord(briefMatch[1]);
        if (existingBrief && existingBrief.visibility === "private") {
          return json({ error: "Authentication required" }, 401);
        }
        return json({ error: "Brief not found" }, 404);
      }
      return json(brief);
    }

    if (briefMatch && request.method === "DELETE") {
      const result = await deleteBrief(
        briefMatch[1],
        getRequestUserId(request),
      );
      if (result?.status === "not_found") {
        return json({ error: "Brief not found" }, 404);
      }
      if (result?.status === "sample") {
        return json({ error: "The sample brief cannot be deleted." }, 403);
      }
      if (result?.status === "forbidden") {
        return json({ error: "You can only delete briefs you created." }, 403);
      }
      return json(result);
    }

    return json({ error: "Not found" }, 404);
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : "Server error" },
      500,
    );
  }
}

export const config = {
  path: "/api/*",
};

let schemaReady = false;
let sampleSeeded = false;

async function ensureSchema() {
  if (schemaReady) return;

  await pipeline([
    {
      sql: `
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT NOT NULL UNIQUE,
          created_at TEXT NOT NULL
        )
      `,
    },
    {
      sql: `
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
          created_at TEXT NOT NULL,
          visibility TEXT NOT NULL DEFAULT 'private'
        )
      `,
    },
    {
      sql: `
        CREATE TABLE IF NOT EXISTS chat_messages (
          id TEXT PRIMARY KEY,
          brief_id TEXT NOT NULL,
          role TEXT NOT NULL,
          content TEXT NOT NULL,
          ai_error TEXT,
          created_at TEXT NOT NULL
        )
      `,
    },
    {
      sql: `
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
        )
      `,
    },
    {
      sql: `
        CREATE TABLE IF NOT EXISTS ai_api_keys (
          user_id TEXT NOT NULL,
          provider TEXT NOT NULL,
          encrypted_key TEXT NOT NULL,
          iv TEXT NOT NULL,
          auth_tag TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          PRIMARY KEY (user_id, provider)
        )
      `,
    },
    {
      sql: `
        CREATE TABLE IF NOT EXISTS user_ai_defaults (
          user_id TEXT PRIMARY KEY,
          provider TEXT NOT NULL,
          model TEXT NOT NULL,
          base_url TEXT,
          updated_at TEXT NOT NULL
        )
      `,
    },
  ]);

  schemaReady = true;
}

async function seedSampleBrief() {
  if (sampleSeeded) return;

  const existing = await execute("SELECT id FROM briefs WHERE id = ?", [
    sampleBriefId,
  ]);
  if (firstRow(existing)) {
    await execute("UPDATE briefs SET visibility = ? WHERE id = ?", [
      "public",
      sampleBriefId,
    ]);
    sampleSeeded = true;
    return;
  }

  const sample = buildSampleBrief();
  await execute(
    `
      INSERT INTO briefs (
        id, user_id, title, category, jurisdiction, source_text, summary,
        key_points, affected_groups, concerns, citizen_questions, next_steps,
        ai_error, visibility, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      sample.id,
      null,
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
      sample.visibility,
      sample.createdAt,
    ],
  );

  await insertMessage({
    id: "msg-1",
    briefId: sample.id,
    role: "assistant",
    content:
      "Ask me what this notice means for residents, budgets, or public participation.",
    createdAt: sample.createdAt,
  });

  sampleSeeded = true;
}

async function upsertUser(input) {
  const now = new Date().toISOString();
  const user = {
    id: String(input.id || "").trim(),
    name: String(input.name || "Mwananchi user").trim(),
    email: String(input.email || "")
      .trim()
      .toLowerCase(),
    createdAt: now,
  };

  if (!user.id || !user.email) {
    throw new Error("User id and email are required.");
  }

  await execute(
    `
      INSERT INTO users (id, name, email, created_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        email = excluded.email
    `,
    [user.id, user.name, user.email, user.createdAt],
  );

  return user;
}

async function listUserAiKeyStatuses(userId) {
  const result = await execute(
    "SELECT provider, updated_at FROM ai_api_keys WHERE user_id = ? ORDER BY provider ASC",
    [userId],
  );
  return rows(result).map((row) => ({
    provider: valueAt(row, 0),
    isConfigured: true,
    updatedAt: valueAt(row, 1),
  }));
}

async function upsertUserAiKey(userId, input) {
  const provider = normalizeProvider(input.provider);
  const apiKey = String(input.apiKey || "").trim();
  if (!provider) throw new Error("Unsupported AI provider.");
  if (!apiKey) throw new Error("API key is required.");

  const encrypted = encryptSecret(apiKey);
  const now = new Date().toISOString();
  await execute(
    `
      INSERT INTO ai_api_keys (user_id, provider, encrypted_key, iv, auth_tag, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id, provider) DO UPDATE SET
        encrypted_key = excluded.encrypted_key,
        iv = excluded.iv,
        auth_tag = excluded.auth_tag,
        updated_at = excluded.updated_at
    `,
    [
      userId,
      provider,
      encrypted.encryptedKey,
      encrypted.iv,
      encrypted.authTag,
      now,
      now,
    ],
  );

  return { provider, isConfigured: true, updatedAt: now };
}

async function deleteUserAiKey(userId, providerValue) {
  const provider = normalizeProvider(providerValue);
  if (!provider) return;
  await execute("DELETE FROM ai_api_keys WHERE user_id = ? AND provider = ?", [
    userId,
    provider,
  ]);
}

async function getUserAiDefaults(userId) {
  const result = await execute(
    "SELECT provider, model, base_url, updated_at FROM user_ai_defaults WHERE user_id = ?",
    [userId],
  );
  const row = firstRow(result);
  if (!row) return null;

  return {
    provider: valueAt(row, 0),
    model: valueAt(row, 1),
    baseUrl: valueAt(row, 2) || undefined,
    updatedAt: valueAt(row, 3),
  };
}

async function upsertUserAiDefaults(userId, input) {
  const selection = {
    provider: normalizeProvider(input.provider) || "openai",
    model: String(input.model || "").trim(),
    baseUrl:
      input.provider === "lmstudio" && input.baseUrl
        ? String(input.baseUrl).trim()
        : null,
  };

  if (!selection.model) throw new Error("Model is required.");

  const now = new Date().toISOString();
  await execute(
    `
      INSERT INTO user_ai_defaults (user_id, provider, model, base_url, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        provider = excluded.provider,
        model = excluded.model,
        base_url = excluded.base_url,
        updated_at = excluded.updated_at
    `,
    [userId, selection.provider, selection.model, selection.baseUrl, now],
  );

  return {
    ...selection,
    baseUrl: selection.baseUrl || undefined,
    updatedAt: now,
  };
}

async function listConfiguredProviderModels(providerValue, userId) {
  const provider = normalizeProvider(providerValue);
  if (!provider) throw new Error("Unsupported AI provider.");
  const userApiKey = await getDecryptedUserAiKey(userId, provider);
  return fetchProviderModels(provider, userApiKey);
}

async function fetchProviderModels(provider, userApiKey) {
  if (provider === "openai") {
    const apiKey = userApiKey || process.env.OPENAI_API_KEY;
    if (!apiKey) return [];
    const response = await fetch("https://api.openai.com/v1/models", {
      headers: { authorization: `Bearer ${apiKey}` },
    });
    return extractModelIds(await response.json());
  }

  if (provider === "openrouter") {
    const apiKey = userApiKey || process.env.OPENROUTER_API_KEY;
    if (!apiKey) return [];
    const response = await fetch("https://openrouter.ai/api/v1/models", {
      headers: { authorization: `Bearer ${apiKey}` },
    });
    return extractModelIds(await response.json());
  }

  if (provider === "anthropic") {
    return ["claude-sonnet-4-5", "claude-haiku-4-5"];
  }

  if (provider === "lmstudio") {
    return [];
  }

  return [];
}

async function listLmStudioModels(baseUrl) {
  const normalizedBaseUrl = String(
    baseUrl || process.env.LM_STUDIO_BASE_URL || "http://127.0.0.1:1234/v1",
  ).replace(/\/$/, "");
  const response = await fetch(`${normalizedBaseUrl}/models`, {
    headers: {
      authorization: `Bearer ${process.env.LM_STUDIO_API_KEY || "lm-studio"}`,
    },
  });
  if (!response.ok) return [];
  return extractModelIds(await response.json());
}

async function listBriefs(userId) {
  const result = userId
    ? await execute(
        "SELECT * FROM briefs WHERE user_id = ? OR id = ? ORDER BY created_at DESC",
        [userId, sampleBriefId],
      )
    : await execute(
        "SELECT * FROM briefs WHERE user_id IS NULL OR id = ? ORDER BY created_at DESC",
        [sampleBriefId],
      );
  return rows(result).map(mapBriefRow);
}

async function getBrief(briefId, userId) {
  const result = await execute(
    `
      SELECT * FROM briefs
      WHERE id = ?
        AND (visibility IN ('unlisted', 'public') OR user_id IS NULL OR user_id = ? OR id = ?)
    `,
    [briefId, userId || "", sampleBriefId],
  );
  const row = firstRow(result);
  return row ? mapBriefRow(row) : null;
}

async function getBriefRecord(briefId) {
  const result = await execute("SELECT * FROM briefs WHERE id = ?", [briefId]);
  const row = firstRow(result);
  return row ? mapBriefRow(row) : null;
}

async function getPublicBrief(briefId) {
  const result = await execute(
    "SELECT * FROM briefs WHERE id = ? AND visibility IN ('unlisted', 'public')",
    [briefId],
  );
  const row = firstRow(result);
  return row ? mapBriefRow(row) : null;
}

async function createBrief(input, userId, ai) {
  const brief = await buildBrief(input, userId, ai);
  await execute(
    `
      INSERT INTO briefs (
        id, user_id, title, category, jurisdiction, source_text, summary,
        key_points, affected_groups, concerns, citizen_questions, next_steps,
        ai_error, visibility, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
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
    ],
  );
  return brief;
}

async function updateBriefVisibility(briefId, userId, visibility) {
  if (!["private", "unlisted", "public"].includes(visibility)) return null;
  if (briefId === sampleBriefId) return { ok: true, visibility: "public" };

  const result = await execute(
    "SELECT * FROM briefs WHERE id = ? AND (user_id = ? OR user_id IS NULL OR id = ?)",
    [briefId, userId || "", sampleBriefId],
  );
  if (!firstRow(result)) return null;

  await execute("UPDATE briefs SET visibility = ? WHERE id = ?", [
    visibility,
    briefId,
  ]);
  return { ok: true, visibility };
}

async function deleteBrief(briefId, userId) {
  if (briefId === sampleBriefId) return { status: "sample" };

  const result = await execute("SELECT user_id FROM briefs WHERE id = ?", [
    briefId,
  ]);
  const row = firstRow(result);
  if (!row) return { status: "not_found" };
  const ownerId = valueAt(row, 0);
  if (ownerId && ownerId !== userId) return { status: "forbidden" };

  await pipeline([
    { sql: "DELETE FROM chat_messages WHERE brief_id = ?", args: [briefId] },
    { sql: "DELETE FROM civic_actions WHERE brief_id = ?", args: [briefId] },
    { sql: "DELETE FROM briefs WHERE id = ?", args: [briefId] },
  ]);
  return { ok: true };
}

async function listMessages(briefId) {
  const result = await execute(
    "SELECT * FROM chat_messages WHERE brief_id = ? ORDER BY created_at ASC",
    [briefId],
  );
  return rows(result).map(mapMessageRow);
}

async function sendMessage(briefId, content, ai, userId) {
  const userMessage = {
    id: crypto.randomUUID(),
    briefId,
    role: "user",
    content: String(content || ""),
    createdAt: new Date().toISOString(),
  };
  await insertMessage(userMessage);

  const assistantMessage = {
    id: crypto.randomUUID(),
    briefId,
    role: "assistant",
    ...(await buildChatReply(briefId, content, ai, userId)),
    createdAt: new Date().toISOString(),
  };
  await insertMessage(assistantMessage);
  return assistantMessage;
}

async function insertMessage(message) {
  await execute(
    `
      INSERT INTO chat_messages (id, brief_id, role, content, ai_error, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    [
      message.id,
      message.briefId,
      message.role,
      message.content,
      message.aiError || null,
      message.createdAt,
    ],
  );
}

async function clearMessages(briefId) {
  await execute("DELETE FROM chat_messages WHERE brief_id = ?", [briefId]);
}

async function listActions(briefId) {
  const result = await execute(
    "SELECT * FROM civic_actions WHERE brief_id = ? ORDER BY created_at DESC",
    [briefId],
  );
  return rows(result).map(mapActionRow);
}

async function createAction(briefId, input, userId) {
  const action = {
    id: crypto.randomUUID(),
    briefId,
    actionType: actionTypes.includes(input.actionType)
      ? input.actionType
      : "email",
    tone: actionTones.includes(input.tone) ? input.tone : "Respectful",
    audience: String(input.audience || "County official"),
    extraContext: input.extraContext || "",
    ...(await buildActionDraft(briefId, input, userId)),
    createdAt: new Date().toISOString(),
  };

  await execute(
    `
      INSERT INTO civic_actions (
        id, brief_id, action_type, tone, audience, extra_context,
        content, ai_error, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      action.id,
      action.briefId,
      action.actionType,
      action.tone,
      action.audience,
      action.extraContext || null,
      action.content,
      action.aiError || null,
      action.createdAt,
    ],
  );

  return action;
}

async function deleteAction(briefId, actionId) {
  const existing = await execute(
    "SELECT id FROM civic_actions WHERE id = ? AND brief_id = ?",
    [actionId, briefId],
  );
  if (!firstRow(existing)) return null;
  await execute("DELETE FROM civic_actions WHERE id = ? AND brief_id = ?", [
    actionId,
    briefId,
  ]);
  return { ok: true };
}

async function canAccessBrief(briefId, userId) {
  return Boolean(await getBrief(briefId, userId));
}

async function buildBrief(input, userId, ai) {
  const title = validateText(input?.title, "Untitled civic document");
  const category = categories.includes(input?.category)
    ? input.category
    : "Other";
  const jurisdiction = validateText(input?.jurisdiction, "Kenya");
  const documentText = validateText(input?.documentText, "");
  const createdAt = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    title,
    category,
    jurisdiction,
    visibility: "private",
    sourceText: documentText,
    ...(await generateBriefWithAi(
      { title, category, jurisdiction, documentText },
      ai,
      userId,
    )),
    createdAt,
  };
}

async function generateBriefWithAi(input) {
  return {
    summary: `This ${input.category.toLowerCase()} document for ${input.jurisdiction} needs public review. The app could not reach a configured AI provider in this Netlify function yet, so this draft highlights the source text and asks citizens to verify details before acting.`,
    keyPoints: [
      "Review the source document for deadlines, affected services, and decision-makers.",
      "Identify what residents are being asked to comment on or approve.",
      "Compare claims in the document against official county or national sources.",
    ],
    affectedGroups: [
      "Residents",
      "Community organizations",
      "Public officials",
    ],
    concerns: [
      "The document may omit practical details citizens need to participate.",
      "AI-generated guidance should be checked against the original document.",
    ],
    citizenQuestions: [
      "What decision is being made and by whom?",
      "What is the deadline for public input?",
      "Which residents or services are most affected?",
    ],
    nextSteps: [
      "Read the original document closely.",
      "Prepare a short public comment or question.",
      "Share the plain-language summary with affected community members.",
    ],
    aiError: "Prototype Netlify response. Full AI generation is not yet moved.",
  };
}

async function buildChatReply(briefId, content) {
  const brief = await getBriefRecord(briefId);
  return {
    content: `Based on "${brief?.title || "this brief"}", focus on what the document says directly, what is unclear, and what citizens can ask next. Your question was: ${content}`,
    aiError: "Prototype Netlify response. Full AI chat is not yet moved.",
  };
}

async function buildActionDraft(briefId, input) {
  const brief = await getBriefRecord(briefId);
  const typeLabel = formatActionType(input.actionType || "email");
  return {
    content: `${typeLabel}

Audience: ${input.audience || "Relevant public official"}
Tone: ${input.tone || "Respectful"}

I am writing about ${brief?.title || "this civic document"} in ${brief?.jurisdiction || "my jurisdiction"}.

Please clarify the key public participation steps, the deadline for citizen input, and how residents can verify that their concerns are considered.

${input.extraContext ? `Additional context: ${input.extraContext}` : ""}`.trim(),
    aiError:
      "Prototype Netlify response. Full AI action generation is not yet moved.",
  };
}

function mapBriefRow(row) {
  return {
    id: value(row, "id", 0),
    title: value(row, "title", 2),
    category: value(row, "category", 3),
    jurisdiction: value(row, "jurisdiction", 4),
    visibility: value(row, "visibility", 15) || "private",
    summary: value(row, "summary", 6),
    keyPoints: parseJsonArray(value(row, "key_points", 7)),
    affectedGroups: parseJsonArray(value(row, "affected_groups", 8)),
    concerns: parseJsonArray(value(row, "concerns", 9)),
    citizenQuestions: parseJsonArray(value(row, "citizen_questions", 10)),
    nextSteps: parseJsonArray(value(row, "next_steps", 11)),
    aiError: value(row, "ai_error", 12) || undefined,
    createdAt: value(row, "created_at", 14),
  };
}

function mapMessageRow(row) {
  return {
    id: value(row, "id", 0),
    briefId: value(row, "brief_id", 1),
    role: value(row, "role", 2),
    content: value(row, "content", 3),
    aiError: value(row, "ai_error", 4) || undefined,
    createdAt: value(row, "created_at", 5),
  };
}

function mapActionRow(row) {
  return {
    id: value(row, "id", 0),
    briefId: value(row, "brief_id", 1),
    actionType: value(row, "action_type", 2),
    tone: value(row, "tone", 3),
    audience: value(row, "audience", 4),
    extraContext: value(row, "extra_context", 5) || "",
    content: value(row, "content", 6),
    aiError: value(row, "ai_error", 7) || undefined,
    createdAt: value(row, "created_at", 8),
  };
}

async function execute(sql, args = []) {
  const [result] = await pipeline([{ sql, args }]);
  return result;
}

async function pipeline(statements) {
  const databaseUrl = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!databaseUrl || !authToken) {
    throw new Error(
      "TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be configured for Netlify API storage.",
    );
  }

  const response = await fetch(
    `${normalizeTursoUrl(databaseUrl)}/v2/pipeline`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${authToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        requests: [
          ...statements.map((statement) => ({
            type: "execute",
            stmt: {
              sql: statement.sql,
              args: (statement.args || []).map(toTursoArg),
            },
          })),
          { type: "close" },
        ],
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Turso request failed with ${response.status}.`);
  }

  const payload = await response.json();
  const results = payload.results || [];
  const executeResults = results.slice(0, statements.length);

  for (const result of executeResults) {
    if (result.type !== "ok") {
      throw new Error(result.error?.message || "Turso query failed.");
    }
  }

  return executeResults.map((result) => result.response?.result ?? {});
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(), "content-type": "application/json" },
  });
}

function corsHeaders() {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,PUT,DELETE,OPTIONS",
    "access-control-allow-headers":
      "content-type, authorization, x-mwananchi-user-id",
  };
}

async function readJson(request) {
  const raw = await request.text();
  return raw ? JSON.parse(raw) : {};
}

function getRequiredRequestUserId(request) {
  return getRequestUserId(request);
}

function getRequestUserId(request) {
  const headerUserId = request.headers.get("x-mwananchi-user-id");
  if (headerUserId) return headerUserId;

  const bearerToken = request.headers
    .get("authorization")
    ?.match(/^Bearer\s+(.+)$/i)?.[1];
  return bearerToken ? readJwtSubject(bearerToken) : undefined;
}

function readJwtSubject(token) {
  try {
    const [, payloadSegment] = token.split(".");
    const payload = JSON.parse(
      Buffer.from(payloadSegment, "base64url").toString("utf8"),
    );
    return typeof payload.sub === "string" ? payload.sub : undefined;
  } catch {
    return undefined;
  }
}

function encryptSecret(value) {
  const key = getApiKeyEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  return {
    encryptedKey: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
  };
}

function decryptSecret(row) {
  const decipher = createDecipheriv(
    "aes-256-gcm",
    getApiKeyEncryptionKey(),
    Buffer.from(valueAt(row, 1), "base64"),
  );
  decipher.setAuthTag(Buffer.from(valueAt(row, 2), "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(valueAt(row, 0), "base64")),
    decipher.final(),
  ]).toString("utf8");
}

async function getDecryptedUserAiKey(userId, providerValue) {
  const provider = normalizeProvider(providerValue);
  if (!provider) return null;

  const result = await execute(
    "SELECT encrypted_key, iv, auth_tag FROM ai_api_keys WHERE user_id = ? AND provider = ?",
    [userId, provider],
  );
  const row = firstRow(result);
  if (!row) return null;

  try {
    return decryptSecret(row);
  } catch {
    return null;
  }
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
  return providerIds.includes(provider) ? provider : null;
}

function normalizeTursoUrl(value) {
  return value
    .trim()
    .replace(/^libsql:\/\//, "https://")
    .replace(/\/+$/, "")
    .replace(/\/v2\/pipeline$/, "");
}

function toTursoArg(value) {
  if (value === null || value === undefined) return { type: "null" };
  if (Number.isInteger(value)) return { type: "integer", value: String(value) };
  if (typeof value === "number") return { type: "float", value: String(value) };
  return { type: "text", value: String(value) };
}

function rows(result) {
  return result.rows || [];
}

function firstRow(result) {
  return rows(result)[0] || null;
}

function valueAt(row, index) {
  const value = Array.isArray(row) ? row[index] : Object.values(row)[index];
  if (value && typeof value === "object" && "value" in value) {
    return value.value;
  }
  return value ?? null;
}

function value(row, name, index) {
  if (Array.isArray(row)) return valueAt(row, index);
  return row[name]?.value ?? row[name] ?? valueAt(row, index);
}

function parseJsonArray(value) {
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function extractModelIds(payload) {
  if (!Array.isArray(payload?.data)) return [];
  return payload.data
    .map((model) => (typeof model.id === "string" ? model.id : ""))
    .filter(Boolean);
}

function validateText(value, fallback) {
  const trimmed = String(value || "").trim();
  return trimmed || fallback;
}

function formatActionType(actionType) {
  return String(actionType)
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function buildSampleBrief() {
  return {
    id: sampleBriefId,
    title: "County Budget Public Notice",
    category: "Budget",
    jurisdiction: "Nairobi County",
    visibility: "public",
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
}

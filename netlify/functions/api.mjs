export default async function handler(request) {
  try {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(),
      });
    }

    if (request.method === "GET" && url.pathname === "/api/health") {
      return json({ ok: true });
    }

    if (request.method === "POST" && url.pathname === "/api/users") {
      await ensureSchema();
      return json(await upsertUser(await readJson(request)));
    }

    if (url.pathname === "/api/users/me/ai-defaults") {
      const userId = getRequestUserId(request);
      if (!userId) return json({ error: "Authentication required" }, 401);

      await ensureSchema();

      if (request.method === "GET") {
        return json(await getUserAiDefaults(userId));
      }

      if (request.method === "PUT") {
        return json(
          await upsertUserAiDefaults(userId, await readJson(request)),
        );
      }
    }

    return json(
      {
        error:
          "Netlify API function is wired, but this route still needs to be moved into the serverless handler.",
      },
      501,
    );
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

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(),
      "content-type": "application/json",
    },
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

let schemaReady = false;

async function ensureSchema() {
  if (schemaReady) return;

  await tursoPipeline([
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

  await tursoExecute(
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

async function getUserAiDefaults(userId) {
  const result = await tursoExecute(
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
  await tursoExecute(
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

async function tursoExecute(sql, args = []) {
  const [result] = await tursoPipeline([{ sql, args }]);
  return result;
}

async function tursoPipeline(statements) {
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

function toTursoArg(value) {
  if (value === null || value === undefined) return { type: "null" };
  if (Number.isInteger(value)) return { type: "integer", value: String(value) };
  if (typeof value === "number") return { type: "float", value: String(value) };
  return { type: "text", value: String(value) };
}

function normalizeTursoUrl(value) {
  return value
    .trim()
    .replace(/^libsql:\/\//, "https://")
    .replace(/\/+$/, "")
    .replace(/\/v2\/pipeline$/, "");
}

function firstRow(result) {
  const rows = result.rows || [];
  return rows[0] || null;
}

function valueAt(row, index) {
  const value = Array.isArray(row) ? row[index] : Object.values(row)[index];
  if (value && typeof value === "object" && "value" in value) {
    return value.value;
  }
  return value ?? null;
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

function normalizeProvider(provider) {
  return ["openai", "openrouter", "anthropic", "lmstudio", "custom"].includes(
    provider,
  )
    ? provider
    : null;
}

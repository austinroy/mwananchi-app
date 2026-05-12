export default async function handler(request) {
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

  return json(
    {
      error:
        "Netlify API function is wired, but the Mwananchi API routes still need to be moved into this handler.",
    },
    501,
  );
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

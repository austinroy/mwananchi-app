import {
  createAction,
  createBrief,
  getBrief,
  listBriefs,
  listMessages,
  sendMessage,
  upsertUser,
} from '../../server/netlifyDb.mjs';

const jsonHeaders = {
  'content-type': 'application/json',
};

export default async function handler(request) {
  try {
    const url = new URL(request.url);
    const path = url.pathname.replace(/^\/\.netlify\/functions\/api/, '') || '/';

    if (request.method === 'GET' && path === '/health') {
      return json({ ok: true });
    }

    if (request.method === 'POST' && path === '/users') {
      return json(await upsertUser(await request.json()));
    }

    if (request.method === 'GET' && path === '/briefs') {
      return json(await listBriefs(url.searchParams.get('userId') ?? undefined));
    }

    if (request.method === 'POST' && path === '/briefs') {
      const body = await request.json();
      return json(await createBrief(body.input, body.userId));
    }

    const briefMessagesMatch = path.match(/^\/briefs\/([^/]+)\/messages$/);
    if (briefMessagesMatch && request.method === 'GET') {
      return json(await listMessages(briefMessagesMatch[1]));
    }

    if (briefMessagesMatch && request.method === 'POST') {
      const body = await request.json();
      return json(await sendMessage(briefMessagesMatch[1], body.content));
    }

    const briefActionsMatch = path.match(/^\/briefs\/([^/]+)\/actions$/);
    if (briefActionsMatch && request.method === 'POST') {
      return json(await createAction(briefActionsMatch[1], await request.json()));
    }

    const briefMatch = path.match(/^\/briefs\/([^/]+)$/);
    if (briefMatch && request.method === 'GET') {
      const brief = await getBrief(briefMatch[1]);
      return brief ? json(brief) : json({ error: 'Brief not found' }, 404);
    }

    return json({ error: 'Not found' }, 404);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Server error' }, 500);
  }
}

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: jsonHeaders,
  });
}

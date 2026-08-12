const MODEL = process.env.NVIDIA_MODEL || 'nvidia/nemotron-nano-12b-v2-vl';
const NVIDIA_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store');
}

function sendJson(res, status, body) {
  cors(res);
  return res.status(status).json(body);
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  const route = req.query?.route;

  if (req.method === 'GET' && route === 'models') {
    return sendJson(res, 200, {
      object: 'list',
      data: [{ id: MODEL, object: 'model', created: Math.floor(Date.now() / 1000), owned_by: 'litellm', permission: [] }],
    });
  }

  if (req.method === 'GET' && route === 'info') {
    return sendJson(res, 200, {
      engine: 'nvidia', model: MODEL, configured: Boolean(process.env.NVIDIA_API_KEY), api: 'NVIDIA NIM OpenAI-compatible API',
    });
  }

  if (req.method === 'GET' && route === 'recommended-model') {
    return sendJson(res, 200, { model: MODEL, reason: 'Configured NVIDIA model' });
  }

  if (req.method === 'GET' && route === 'health') {
    return sendJson(res, 200, { ok: true, engine: 'nvidia', model: MODEL, configured: Boolean(process.env.NVIDIA_API_KEY) });
  }

  if (req.method === 'GET') {
    return sendJson(res, 200, { ok: true, service: 'JARVIS AI backend', model: MODEL, configured: Boolean(process.env.NVIDIA_API_KEY) });
  }

  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' });
  if (!process.env.NVIDIA_API_KEY) return sendJson(res, 503, { error: 'NVIDIA_API_KEY is not configured on the server.' });

  try {
    const body = req.body || {};
    const isOpenJarvis = route === 'chat';
    const legacyMessage = typeof body.message === 'string' ? body.message.trim() : '';
    const history = Array.isArray(body.messages)
      ? body.messages.filter(item => item && ['system', 'user', 'assistant'].includes(item.role) && typeof item.content === 'string').slice(-12)
      : [];

    const messages = isOpenJarvis
      ? history
      : [
          { role: 'system', content: 'You are JARVIS, a concise, capable personal AI assistant. Speak naturally, warmly, and confidently. Never claim an external action happened unless a connected tool actually performed it.' },
          ...history.filter(item => item.role !== 'system'),
          ...(legacyMessage ? [{ role: 'user', content: legacyMessage }] : []),
        ];

    if (!messages.length) return sendJson(res, 400, { error: 'messages is required' });

    const stream = isOpenJarvis ? body.stream !== false : false;
    const payload = {
      model: MODEL, messages,
      temperature: typeof body.temperature === 'number' ? body.temperature : 0.6,
      max_tokens: typeof body.max_tokens === 'number' ? body.max_tokens : 700,
      stream,
    };

    const upstream = await fetch(NVIDIA_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.NVIDIA_API_KEY}`,
        'Content-Type': 'application/json',
        Accept: stream ? 'text/event-stream' : 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!upstream.ok) {
      const text = await upstream.text().catch(() => '');
      let message = text;
      try { message = JSON.parse(text)?.error?.message || message; } catch {}
      return sendJson(res, upstream.status, { error: message || `NVIDIA API request failed (${upstream.status})` });
    }

    if (!stream) {
      const data = await upstream.json().catch(() => ({}));
      const reply = data?.choices?.[0]?.message?.content?.trim();
      if (!reply) return sendJson(res, 502, { error: 'NVIDIA returned no assistant message' });
      return sendJson(res, 200, { reply, model: MODEL });
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(decoder.decode(value, { stream: true }));
      }
    } finally {
      reader.releaseLock();
    }
    return res.end();
  } catch (error) {
    console.error('JARVIS backend error', error);
    if (!res.headersSent) return sendJson(res, 500, { error: error instanceof Error ? error.message : 'JARVIS backend error' });
    return res.end();
  }
}

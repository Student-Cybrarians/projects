const MODEL = process.env.NVIDIA_MODEL || 'nvidia/nemotron-nano-12b-v2-vl';
const NVIDIA_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store');
}

function json(res, status, body) {
  cors(res);
  return res.status(status).json(body);
}

export default async function handler(req, res) {
  cors(res);

  if (req.method === 'OPTIONS') return res.status(204).end();

  // OpenJarvis browser compatibility routes. vercel.json rewrites these
  // routes here so the existing frontend can use its native /v1 API shape.
  const route = req.query?.route;
  if (req.method === 'GET' && route === 'models') {
    return json(res, 200, {
      object: 'list',
      data: [{
        id: MODEL,
        object: 'model',
        created: Math.floor(Date.now() / 1000),
        owned_by: 'nvidia',
        permission: [],
      }],
    });
  }

  if (req.method === 'GET' && route === 'info') {
    return json(res, 200, {
      engine: 'nvidia',
      model: MODEL,
      configured: Boolean(process.env.NVIDIA_API_KEY),
      api: 'NVIDIA NIM OpenAI-compatible API',
    });
  }

  if (req.method === 'GET' && route === 'recommended-model') {
    return json(res, 200, { model: MODEL, reason: 'Configured NVIDIA model' });
  }

  if (req.method === 'GET' && route === 'health') {
    return json(res, 200, { ok: true, engine: 'nvidia', model: MODEL, configured: Boolean(process.env.NVIDIA_API_KEY) });
  }

  // Existing JARVIS health endpoint.
  if (req.method === 'GET') {
    return json(res, 200, {
      ok: true,
      service: 'JARVIS AI backend',
      model: MODEL,
      configured: Boolean(process.env.NVIDIA_API_KEY),
    });
  }

  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  if (!process.env.NVIDIA_API_KEY) {
    return json(res, 503, { error: 'NVIDIA_API_KEY is not configured on the server.' });
  }

  try {
    const body = req.body || {};
    const routeMessages = Array.isArray(body.messages) ? body.messages : [];
    const legacyMessage = typeof body.message === 'string' ? body.message.trim() : '';

    const messages = route === 'chat'
      ? routeMessages
      : [
          {
            role: 'system',
            content: 'You are JARVIS, a concise, capable personal AI assistant. Speak naturally, warmly, and confidently. Never claim an external action happened unless a connected tool actually performed it.'
          },
          ...(Array.isArray(body.messages)
            ? body.messages.filter(item => item && ['user', 'assistant'].includes(item.role) && typeof item.content === 'string').slice(-12)
            : []),
          ...(legacyMessage ? [{ role: 'user', content: legacyMessage }] : []),
        ];

    if (!messages.length) return json(res, 400, { error: 'messages is required' });

    const stream = route === 'chat' ? body.stream !== false : false;
    const payload = {
      model: MODEL,
      messages,
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

    const data = await upstream.json().catch(() => null);

    if (!upstream.ok) {
      console.error('NVIDIA error', upstream.status, data);
      return json(res, upstream.status, {
        error: data?.error?.message || `NVIDIA API request failed (${upstream.status})`
      });
    }

    // Non-streaming legacy JARVIS endpoint.
    if (!stream) {
      const reply = data?.choices?.[0]?.message?.content?.trim();
      if (!reply) return json(res, 502, { error: 'NVIDIA returned no assistant message' });
      return json(res, 200, { reply, model: MODEL });
    }

    // This branch is intentionally unreachable because json() above consumes
    // the upstream body. OpenJarvis should use /nvidia-api/v1/chat/completions
    // for streaming; the compatibility endpoint remains for model discovery.
    return json(res, 200, data);
  } catch (error) {
    console.error('JARVIS backend error', error);
    return json(res, 500, { error: error instanceof Error ? error.message : 'JARVIS backend error' });
  }
}

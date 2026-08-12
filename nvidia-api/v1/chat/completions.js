const NVIDIA_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';
const MODEL = process.env.NVIDIA_MODEL || 'nvidia/nemotron-nano-12b-v2-vl';

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store');
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!process.env.NVIDIA_API_KEY) {
    return res.status(503).json({ error: 'NVIDIA_API_KEY is not configured on the server.' });
  }

  try {
    const body = req.body || {};
    const messages = Array.isArray(body.messages) ? body.messages : [];
    if (!messages.length) return res.status(400).json({ error: 'messages is required' });

    const payload = {
      model: MODEL,
      messages,
      temperature: typeof body.temperature === 'number' ? body.temperature : 0.7,
      max_tokens: typeof body.max_tokens === 'number' ? body.max_tokens : 1024,
      stream: body.stream !== false,
    };

    const upstream = await fetch(NVIDIA_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.NVIDIA_API_KEY}`,
        'Content-Type': 'application/json',
        Accept: payload.stream ? 'text/event-stream' : 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!upstream.ok) {
      const text = await upstream.text().catch(() => '');
      let detail = text;
      try {
        const parsed = JSON.parse(text);
        detail = parsed?.error?.message || parsed?.message || text;
      } catch {}
      return res.status(upstream.status).json({ error: detail || `NVIDIA API request failed (${upstream.status})` });
    }

    if (!payload.stream) {
      const data = await upstream.json();
      return res.status(200).json(data);
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
    console.error('NVIDIA proxy error', error);
    if (!res.headersSent) {
      return res.status(500).json({ error: error instanceof Error ? error.message : 'NVIDIA proxy error' });
    }
    return res.end();
  }
}

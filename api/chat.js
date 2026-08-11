const MODEL = process.env.NVIDIA_MODEL || 'nvidia/nemotron-nano-12b-v2-vl';
const NVIDIA_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://student-cybrarians.github.io');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');
}

export default async function handler(req, res) {
  cors(res);

  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method === 'GET') {
    return res.status(200).json({
      ok: true,
      service: 'JARVIS AI backend',
      model: MODEL,
      configured: Boolean(process.env.NVIDIA_API_KEY),
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.NVIDIA_API_KEY) {
    return res.status(503).json({
      error: 'NVIDIA_API_KEY is not configured on the server.'
    });
  }

  try {
    const body = req.body || {};
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    const history = Array.isArray(body.messages) ? body.messages : [];

    if (!message) {
      return res.status(400).json({ error: 'message is required' });
    }

    const safeHistory = history
      .filter(item => item && ['user', 'assistant'].includes(item.role) && typeof item.content === 'string')
      .slice(-12)
      .map(item => ({
        role: item.role,
        content: item.content.slice(0, 8000)
      }));

    const messages = [
      {
        role: 'system',
        content:
          'You are JARVIS, a concise, capable personal AI assistant. Speak naturally, warmly, and confidently. Keep normal answers short enough to be spoken aloud. Never claim an external action happened unless a connected tool actually performed it. If the user asks to play music but no music tool is connected, explain that you can help choose music but cannot directly control playback yet.'
      },
      ...safeHistory,
      { role: 'user', content: message }
    ];

    const upstream = await fetch(NVIDIA_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.NVIDIA_API_KEY}`,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        temperature: 0.6,
        max_tokens: 700,
        stream: false
      })
    });

    const data = await upstream.json().catch(() => ({}));

    if (!upstream.ok) {
      console.error('NVIDIA error', upstream.status, data);
      return res.status(upstream.status).json({
        error: data?.error?.message || `NVIDIA API request failed (${upstream.status})`
      });
    }

    const reply = data?.choices?.[0]?.message?.content?.trim();

    if (!reply) {
      return res.status(502).json({
        error: 'NVIDIA returned no assistant message'
      });
    }

    return res.status(200).json({ reply, model: MODEL });
  } catch (error) {
    console.error('JARVIS backend error', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'JARVIS backend error'
    });
  }
}

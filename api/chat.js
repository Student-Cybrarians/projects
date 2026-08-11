const MODEL = process.env.NVIDIA_MODEL || 'nvidia/nemotron-nano-12b-v2-vl';
const NVIDIA_URL = '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';

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://student-cybrarians.github.io');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!process.env.NVIDIA_API_KEY) return res.status(503).json({ error: 'NVIDIA_API_KEY is not configured on the server.' });

  try {
    const { message } = req.body || {};
    if (!message || typeof message !== 'string') return res.status(400).json({ error: 'message is required' });

    const upstream = await fetch(NVIDIA_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.NVIDIA_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: 'You are JARVIS, a concise, capable personal AI assistant. Answer naturally and helpfully. Do not claim to have executed an external action unless a connected tool actually executed it.' },
          { role: 'user', content: message }
        ],
        temperature: 0.6,
        max_tokens: 700
      })
    });

    const data = await upstream.json();
    if (!upstream.ok) return res.status(upstream.status).json({ error: data?.error?.message || 'NVIDIA API request failed' });

    const reply = data?.choices?.[0]?.message?.content;
    if (!reply) return res.status(502).json({ error: 'NVIDIA returned no assistant message' });
    return res.status(200).json({ reply, model: MODEL });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'JARVIS backend error' });
  }
}

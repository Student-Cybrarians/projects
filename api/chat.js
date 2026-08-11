const MODEL = process.env.NVIDIA_MODEL || 'nvidia/nemotron-nano-12b-v2-vl';
const NVIDIA_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';
const ALLOWED_ORIGIN = 'https://student-cybrarians.github.io';

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'no-store',
  };
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(),
      'Content-Type': 'application/json; charset=utf-8',
    },
  });
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

export async function GET() {
  return json({
    ok: true,
    service: 'JARVIS AI backend',
    model: MODEL,
    configured: Boolean(process.env.NVIDIA_API_KEY),
  });
}

export async function POST(request) {
  if (!process.env.NVIDIA_API_KEY) {
    return json({
      error: 'NVIDIA_API_KEY is not configured on the server.',
    }, 503);
  }

  try {
    const body = await request.json();
    const message = typeof body?.message === 'string' ? body.message.trim() : '';

    if (!message) {
      return json({ error: 'message is required' }, 400);
    }

    const upstream = await fetch(NVIDIA_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.NVIDIA_API_KEY}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: 'system',
            content:
              'You are JARVIS, a concise, capable personal AI assistant. Speak naturally, warmly, and confidently. Keep normal answers short enough to be spoken aloud. Never claim that an external action happened unless a connected tool actually performed it. If the user asks to play music but no music tool is connected, explain that you can help choose music but cannot start playback yet.',
          },
          { role: 'user', content: message },
        ],
        temperature: 0.6,
        max_tokens: 700,
        stream: false,
      }),
    });

    const data = await upstream.json().catch(() => ({}));

    if (!upstream.ok) {
      console.error('NVIDIA error', upstream.status, data);
      return json({
        error: data?.error?.message || `NVIDIA API request failed (${upstream.status})`,
      }, upstream.status);
    }

    const reply = data?.choices?.[0]?.message?.content?.trim();

    if (!reply) {
      return json({ error: 'NVIDIA returned no assistant message' }, 502);
    }

    return json({ reply, model: MODEL });
  } catch (error) {
    console.error('JARVIS backend error', error);
    return json({
      error: error instanceof Error ? error.message : 'JARVIS backend error',
    }, 500);
  }
}

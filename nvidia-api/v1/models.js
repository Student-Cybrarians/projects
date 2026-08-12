const MODEL = process.env.NVIDIA_MODEL || 'nvidia/nemotron-nano-12b-v2-vl';

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store');
}

export default function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  return res.status(200).json({
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

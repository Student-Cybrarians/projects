const MODEL = process.env.NVIDIA_MODEL || 'nvidia/nemotron-nano-12b-v2-vl';

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({
    ok: true,
    engine: 'nvidia',
    model: MODEL,
    configured: Boolean(process.env.NVIDIA_API_KEY),
  });
}

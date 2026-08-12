const fs = require('node:fs');
const { execSync } = require('node:child_process');

const apiFile = 'OpenJarvis/frontend/src/lib/api.ts';
let source = fs.readFileSync(apiFile, 'utf8');

// OpenJarvis normally preloads non-cloud models through local Ollama. NVIDIA
// NIM is a remote provider, so make the web build treat owner=nvidia as cloud.
source = source.replace(
  "if (owner === 'litellm' || _CLOUD_PREFIXES.some(p => modelName.startsWith(p))) {",
  "if (owner === 'litellm' || owner === 'nvidia' || _CLOUD_PREFIXES.some(p => modelName.startsWith(p))) {",
);

// If the API is temporarily unavailable during initial page load, keep the
// NVIDIA model selectable rather than presenting an empty model picker.
source = source.replace(
  "  const res = await apiFetch(`/v1/models`);\n  if (!res.ok) throw new Error(`Failed to fetch models: ${res.status}`);\n  const data = await res.json();\n  return data.data || [];",
  "  const res = await apiFetch(`/v1/models`);\n  if (!res.ok) return [{ id: 'nvidia/nemotron-nano-12b-v2-vl', object: 'model', created: 0, owned_by: 'nvidia', permission: [] } as ModelInfo];\n  const data = await res.json();\n  const models = data.data || [];\n  return models.length ? models : [{ id: 'nvidia/nemotron-nano-12b-v2-vl', object: 'model', created: 0, owned_by: 'nvidia', permission: [] } as ModelInfo];",
);

fs.writeFileSync(apiFile, source);
console.log('Patched OpenJarvis web build for NVIDIA NIM.');
execSync('npm --prefix OpenJarvis/frontend run build', { stdio: 'inherit' });

# MCP Provider Gateway

A self-hostable MCP server that exposes multiple AI providers through one MCP interface.

Supported:
- NVIDIA NIM / NVIDIA hosted OpenAI-compatible APIs
- OpenAI
- Google Gemini through its OpenAI-compatible endpoint
- Anthropic Messages API
- Additional OpenAI-compatible providers through environment configuration

Multiple authorized API keys can be configured per provider. Keys are selected round-robin for ordinary requests. The gateway does **not** rotate keys after a 429; do not use key rotation to bypass quotas, rate limits, billing limits, or safety controls.

## Quick start

```bash
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
cp .env.example .env
python -m app.http
```

HTTP MCP endpoint: `http://localhost:8000/mcp`

Health endpoint: `http://localhost:8000/health`

Set `MCP_AUTH_TOKEN` for remote HTTP access.

## MCP tools

- `chat` — send a request through a configured provider
- `list_providers` — list providers and safe key counts
- `list_models` — query OpenAI-compatible provider models
- `provider_status` — safe configuration status

## Every Code / Codespaces

```bash
pip install -e .
cp .env.example .env
python -m app.http
```

Forward port 8000 in Codespaces and configure your MCP client to use the forwarded HTTPS URL ending in `/mcp`.

## Docker

```bash
docker compose up --build
```

## Tests

```bash
pytest
```

## Security

- Keep API keys server-side.
- Use HTTPS for internet-facing deployments.
- Use `MCP_AUTH_TOKEN` for HTTP authentication.
- Never commit `.env`.
- Do not use multiple keys to evade provider limits.
- For production, add a reverse proxy/WAF and rotate credentials.

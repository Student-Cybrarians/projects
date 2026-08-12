# NVIDIA API bridge for OpenJarvis

This directory is a small server-side OpenAI-compatible bridge for the OpenJarvis web frontend.

It exposes:

- `GET /health`
- `GET /v1/models`
- `GET /v1/info`
- `GET /v1/recommended-model`
- `POST /v1/chat/completions`

The bridge keeps `NVIDIA_API_KEY` server-side and proxies chat requests to NVIDIA NIM at `https://integrate.api.nvidia.com/v1/chat/completions`.

## Vercel configuration

Create a Vercel project from `Student-Cybrarians/projects` with **Root Directory** set to `nvidia-api`.

Set these Production environment variables:

- `NVIDIA_API_KEY` = your NVIDIA API key
- `NVIDIA_MODEL` = `nvidia/nemotron-nano-12b-v2-vl` (or another NVIDIA model ID you want to expose)

After deployment, configure OpenJarvis **Settings → Connection → API URL** to the deployed API origin, for example:

`https://your-nvidia-api.vercel.app`

The OpenJarvis model picker will then receive the configured NVIDIA model from `/v1/models` and chat through `/v1/chat/completions`.

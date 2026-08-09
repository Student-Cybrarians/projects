from __future__ import annotations

from typing import Any

import httpx

from .catalog import get_api


class ApiRouterError(RuntimeError):
    pass


# Only APIs with a concrete adapter should be enabled in production.
# Environment variables contain the credentials; this registry contains no secrets.
ADAPTERS = {
    "NVIDIA_NIM_API": {"env_key": "NVIDIA_API_KEY", "base_url_env": "NVIDIA_BASE_URL"},
    "DEEPSEEK_API": {"env_key": "DEEPSEEK_API_KEY", "base_url_env": "DEEPSEEK_BASE_URL"},
    "QWEN_API": {"env_key": "QWEN_API_KEY", "base_url_env": "QWEN_BASE_URL"},
    "GITHUB_API": {"env_key": "GITHUB_TOKEN", "base_url": "https://api.github.com"},
    "GITHUB_ACTIONS_API": {"env_key": "GITHUB_TOKEN", "base_url": "https://api.github.com"},
    "SENTRY_API": {"env_key": "SENTRY_AUTH_TOKEN", "base_url_env": "SENTRY_BASE_URL"},
    "STRIPE_API": {"env_key": "STRIPE_API_KEY", "base_url": "https://api.stripe.com"},
    "SENDGRID_API": {"env_key": "SENDGRID_API_KEY", "base_url": "https://api.sendgrid.com"},
    "AWS_S3_API": {"env_key": "AWS_ACCESS_KEY_ID", "base_url_env": "AWS_S3_BASE_URL"},
}


def resolve(api_id: str) -> dict[str, Any]:
    item = get_api(api_id)
    if item is None:
        raise ApiRouterError(f"Unknown API label: {api_id}")
    if not item.get("enabled", False):
        raise ApiRouterError(f"API is disabled: {item['id']}")
    adapter = ADAPTERS.get(item["id"])
    if adapter is None:
        raise ApiRouterError(f"No adapter has been implemented for: {item['id']}")
    return {"catalog": item, "adapter": adapter}


async def request_labeled(
    api_id: str,
    *,
    method: str,
    path: str,
    headers: dict[str, str] | None = None,
    params: dict[str, Any] | None = None,
    json_body: Any = None,
) -> dict[str, Any]:
    resolved = resolve(api_id)
    adapter = resolved["adapter"]
    import os

    key = os.getenv(adapter["env_key"])
    if not key:
        raise ApiRouterError(f"Missing credential environment variable: {adapter['env_key']}")

    base_url = adapter.get("base_url") or os.getenv(adapter.get("base_url_env", ""))
    if not base_url:
        raise ApiRouterError(f"Missing base URL for {api_id}")

    request_headers = dict(headers or {})
    request_headers.setdefault("Accept", "application/json")

    # Adapters can be expanded per API. This generic mode is intentionally conservative.
    if api_id.startswith("GITHUB"):
        request_headers["Authorization"] = f"Bearer {key}"
        request_headers.setdefault("X-GitHub-Api-Version", "2022-11-28")
    elif api_id == "STRIPE_API":
        request_headers["Authorization"] = f"Bearer {key}"
    elif api_id == "SENDGRID_API":
        request_headers["Authorization"] = f"Bearer {key}"
    elif api_id == "SENTRY_API":
        request_headers["Authorization"] = f"Bearer {key}"
    else:
        request_headers["Authorization"] = f"Bearer {key}"

    url = base_url.rstrip("/") + "/" + path.lstrip("/")
    async with httpx.AsyncClient(timeout=120) as client:
        response = await client.request(
            method.upper(), url, headers=request_headers, params=params, json=json_body
        )

    try:
        body = response.json()
    except Exception:
        body = response.text[:10000]
    return {"api": resolved["catalog"]["id"], "status_code": response.status_code, "body": body}

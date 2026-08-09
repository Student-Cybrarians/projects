from __future__ import annotations
import json
import logging
from typing import Any
from mcp.server.fastmcp import FastMCP
from .config import get_settings
from .providers import ProviderError, ProviderRegistry

settings = get_settings()
logging.basicConfig(level=getattr(logging, settings.log_level.upper(), logging.INFO), format="%(asctime)s %(levelname)s %(name)s %(message)s")
logger = logging.getLogger("mcp-provider-gateway")
registry = ProviderRegistry(settings)
mcp = FastMCP("MCP Provider Gateway", stateless_http=True, json_response=True)


def dump(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, indent=2, default=str)


@mcp.tool()
async def chat(provider: str, model: str, messages: list[dict[str, Any]], temperature: float | None = None, max_tokens: int | None = None, extra_body: dict[str, Any] | None = None) -> str:
    """Send a chat request through a configured AI provider."""
    try:
        return dump(await registry.chat(provider, model=model, messages=messages, temperature=temperature, max_tokens=max_tokens, extra_body=extra_body))
    except ProviderError as exc:
        logger.warning("Provider request failed: %s", exc)
        raise


@mcp.tool()
def list_providers() -> str:
    """List providers, default models and configured key counts without secrets."""
    return dump([{"provider": i.name, "kind": i.kind, "base_url": i.base_url, "key_count": i.key_count, "default_model": i.default_model} for i in registry.infos()])


@mcp.tool()
async def list_models(provider: str) -> str:
    """List models reported by an OpenAI-compatible provider."""
    selected = registry.get(provider)
    if not hasattr(selected, "models"):
        return dump({"provider": provider, "models": []})
    return dump(await selected.models())


@mcp.tool()
def provider_status() -> str:
    """Return safe provider configuration status."""
    return dump([{"provider": i.name, "configured": i.key_count > 0, "key_count": i.key_count, "kind": i.kind} for i in registry.infos()])


def main() -> None:
    mcp.run()


if __name__ == "__main__":
    main()

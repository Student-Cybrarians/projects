from __future__ import annotations

from dataclasses import dataclass
from typing import Any
import httpx
from .config import Settings
from .key_pool import KeyPool


class ProviderError(RuntimeError):
    def __init__(self, provider: str, status_code: int | None, message: str):
        self.provider = provider
        self.status_code = status_code
        super().__init__(f"{provider}: {message}")


@dataclass
class ProviderInfo:
    name: str
    kind: str
    base_url: str
    key_count: int
    default_model: str


class OpenAICompatibleProvider:
    def __init__(self, name: str, settings: Settings):
        self.name = name
        self.settings = settings
        self.base_url = settings.base_url_for(name).rstrip("/")
        self.default_model = settings.default_model_for(name)
        self.keys = KeyPool(settings.keys_for(name), settings.key_cooldown_seconds)

    def info(self) -> ProviderInfo:
        return ProviderInfo(self.name, "openai-compatible", self.base_url, self.keys.size, self.default_model)

    async def chat(self, *, model: str, messages: list[dict[str, Any]], temperature: float | None = None, max_tokens: int | None = None, extra_body: dict[str, Any] | None = None) -> dict[str, Any]:
        model = model or self.default_model
        if not model:
            raise ProviderError(self.name, None, "No model specified")
        key = self.keys.next_key()
        payload: dict[str, Any] = {"model": model, "messages": messages}
        if temperature is not None:
            payload["temperature"] = temperature
        if max_tokens is not None:
            payload["max_tokens"] = max_tokens
        if extra_body:
            payload.update(extra_body)
        try:
            async with httpx.AsyncClient(timeout=self.settings.http_timeout_seconds) as client:
                response = await client.post(f"{self.base_url}/chat/completions", headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"}, json=payload)
        except httpx.HTTPError as exc:
            raise ProviderError(self.name, None, str(exc)) from exc
        if response.status_code >= 400:
            if response.status_code >= 500:
                self.keys.cooldown(key)
            try:
                detail = response.json()
            except Exception:
                detail = response.text[:2000]
            raise ProviderError(self.name, response.status_code, str(detail))
        return response.json()

    async def models(self) -> dict[str, Any]:
        key = self.keys.next_key()
        try:
            async with httpx.AsyncClient(timeout=self.settings.http_timeout_seconds) as client:
                response = await client.get(f"{self.base_url}/models", headers={"Authorization": f"Bearer {key}"})
        except httpx.HTTPError as exc:
            raise ProviderError(self.name, None, str(exc)) from exc
        if response.status_code >= 400:
            try:
                detail = response.json()
            except Exception:
                detail = response.text[:2000]
            raise ProviderError(self.name, response.status_code, str(detail))
        return response.json()


class AnthropicProvider:
    def __init__(self, settings: Settings):
        self.name = "anthropic"
        self.settings = settings
        self.base_url = settings.anthropic_base_url.rstrip("/")
        self.default_model = settings.anthropic_model
        self.keys = KeyPool(settings.keys_for("anthropic"), settings.key_cooldown_seconds)

    def info(self) -> ProviderInfo:
        return ProviderInfo(self.name, "anthropic-messages", self.base_url, self.keys.size, self.default_model)

    async def chat(self, *, model: str, messages: list[dict[str, Any]], temperature: float | None = None, max_tokens: int | None = None, extra_body: dict[str, Any] | None = None) -> dict[str, Any]:
        model = model or self.default_model
        if not model:
            raise ProviderError(self.name, None, "No model specified")
        key = self.keys.next_key()
        payload: dict[str, Any] = {"model": model, "max_tokens": max_tokens or 4096, "messages": messages}
        if temperature is not None:
            payload["temperature"] = temperature
        if extra_body:
            payload.update(extra_body)
        try:
            async with httpx.AsyncClient(timeout=self.settings.http_timeout_seconds) as client:
                response = await client.post(f"{self.base_url}/v1/messages", headers={"x-api-key": key, "anthropic-version": self.settings.anthropic_version, "content-type": "application/json"}, json=payload)
        except httpx.HTTPError as exc:
            raise ProviderError(self.name, None, str(exc)) from exc
        if response.status_code >= 400:
            if response.status_code >= 500:
                self.keys.cooldown(key)
            try:
                detail = response.json()
            except Exception:
                detail = response.text[:2000]
            raise ProviderError(self.name, response.status_code, str(detail))
        data = response.json()
        text = "".join(block.get("text", "") for block in data.get("content", []) if block.get("type") == "text")
        return {"provider": self.name, "model": data.get("model", model), "text": text, "usage": data.get("usage", {}), "raw": data}


class ProviderRegistry:
    def __init__(self, settings: Settings):
        self.providers: dict[str, Any] = {name: OpenAICompatibleProvider(name, settings) for name in settings.provider_names()}
        self.providers["anthropic"] = AnthropicProvider(settings)

    def get(self, name: str):
        name = name.lower().strip()
        provider = self.providers.get(name)
        if provider is None:
            raise ProviderError(name, None, "Provider is not configured")
        if provider.keys.size == 0:
            raise ProviderError(name, None, "No API key is configured")
        return provider

    def infos(self) -> list[ProviderInfo]:
        return [p.info() for p in self.providers.values()]

    async def chat(self, provider: str, **kwargs):
        return await self.get(provider).chat(**kwargs)

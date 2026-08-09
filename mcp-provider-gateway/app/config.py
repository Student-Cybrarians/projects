from __future__ import annotations

import os
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore", case_sensitive=False)

    host: str = "0.0.0.0"
    port: int = 8000
    mcp_auth_token: str | None = None
    log_level: str = "INFO"
    http_timeout_seconds: float = 120.0
    key_cooldown_seconds: float = 30.0
    openai_compatible_providers: str = "nvidia,openai,gemini"

    nvidia_base_url: str = "https://integrate.api.nvidia.com/v1"
    nvidia_model: str = ""
    openai_base_url: str = "https://api.openai.com/v1"
    openai_model: str = ""
    gemini_base_url: str = "https://generativelanguage.googleapis.com/v1beta/openai/"
    gemini_model: str = "gemini-3.6-flash"
    anthropic_base_url: str = "https://api.anthropic.com"
    anthropic_version: str = "2023-06-01"
    anthropic_model: str = "claude-sonnet-4-6"

    def provider_names(self) -> list[str]:
        return [p.strip().lower() for p in self.openai_compatible_providers.split(",") if p.strip()]

    def base_url_for(self, provider: str) -> str:
        return getattr(self, f"{provider.lower()}_base_url")

    def default_model_for(self, provider: str) -> str:
        return getattr(self, f"{provider.lower()}_model", "")

    def keys_for(self, provider: str) -> list[str]:
        prefix = provider.upper()
        pairs: list[tuple[int, str]] = []
        for name, value in os.environ.items():
            if name.startswith(prefix + "_API_KEY_") and value:
                try:
                    index = int(name[len(prefix + "_API_KEY_"):])
                except ValueError:
                    continue
                pairs.append((index, value))
        pairs.sort()
        conventional = os.getenv(f"{prefix}_API_KEY")
        if conventional:
            pairs.append((0, conventional))
        result, seen = [], set()
        for _, key in pairs:
            if key not in seen:
                result.append(key)
                seen.add(key)
        return result


@lru_cache
def get_settings() -> Settings:
    return Settings()

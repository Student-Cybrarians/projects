from app.config import Settings


def test_key_discovery(monkeypatch):
    monkeypatch.setenv("NVIDIA_API_KEY_2", "two")
    monkeypatch.setenv("NVIDIA_API_KEY_1", "one")
    settings = Settings()
    assert settings.keys_for("nvidia") == ["one", "two"]


def test_provider_names():
    settings = Settings(openai_compatible_providers="nvidia, openai,gemini")
    assert settings.provider_names() == ["nvidia", "openai", "gemini"]

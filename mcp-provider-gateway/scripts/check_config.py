from app.config import get_settings
from app.providers import ProviderRegistry

registry = ProviderRegistry(get_settings())
for info in registry.infos():
    print(f"{info.name}: keys={info.key_count} default_model={info.default_model or '-'}")

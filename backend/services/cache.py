from typing import Dict, Any, Optional

class QueryCache:
    def __init__(self):
        # Maps query_text (lowercased/stripped) -> full pipeline result dict
        self._cache: Dict[str, Dict[str, Any]] = {}

    def _normalize_key(self, text: str) -> str:
        return text.strip().lower()

    def get(self, text: str) -> Optional[Dict[str, Any]]:
        key = self._normalize_key(text)
        return self._cache.get(key)

    def set(self, text: str, data: Dict[str, Any]) -> None:
        key = self._normalize_key(text)
        self._cache[key] = data

    def clear(self) -> None:
        self._cache.clear()

# Global cache instance
query_cache = QueryCache()

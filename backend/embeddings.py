from typing import Optional

from sentence_transformers import SentenceTransformer

from config import EMBEDDING_MODEL

_model: Optional[SentenceTransformer] = None


def get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        _model = SentenceTransformer(EMBEDDING_MODEL)
    return _model


def embed_text(text: str) -> list[float]:
    """Embed a single text string. Returns normalized 384-dim vector."""
    return get_model().encode(text, normalize_embeddings=True).tolist()


def embed_batch(texts: list[str]) -> list[list[float]]:
    """Embed multiple texts in one call. Returns list of normalized vectors."""
    return get_model().encode(texts, normalize_embeddings=True).tolist()

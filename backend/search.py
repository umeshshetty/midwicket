import re
import time
import logging
from typing import Optional, List, Dict, Tuple

from rank_bm25 import BM25Okapi

from embeddings import embed_text
from vector_store import vector_search, get_all_texts, get_total_count
from models import SearchResult

logger = logging.getLogger(__name__)


def _tokenize(text: str) -> List[str]:
    """Simple whitespace + lowercase tokenizer."""
    return re.findall(r"\w+", text.lower())


# ─── Cached BM25 index ──────────────────────────────────────────────────────
# Rebuilt only when the document count changes or TTL expires.
_bm25_cache: Optional[Tuple[BM25Okapi, List[Dict], int]] = None
_cache_built_at: float = 0
_CACHE_TTL = 10.0  # seconds — force refresh after TTL even if count matches


def _get_bm25_index() -> Tuple[BM25Okapi, List[Dict]]:
    """Return a cached BM25 index, rebuilding only when documents change."""
    global _bm25_cache, _cache_built_at

    current_count = get_total_count()
    now = time.monotonic()

    if (
        _bm25_cache is not None
        and _bm25_cache[2] == current_count
        and (now - _cache_built_at) < _CACHE_TTL
    ):
        return _bm25_cache[0], _bm25_cache[1]

    all_docs = get_all_texts()
    if not all_docs:
        _bm25_cache = None
        return BM25Okapi([[""]]), []

    corpus = [_tokenize(f"{d['title']} {d['text']}") for d in all_docs]
    bm25 = BM25Okapi(corpus)
    _bm25_cache = (bm25, all_docs, current_count)
    _cache_built_at = now
    logger.info(f"BM25 index rebuilt: {len(all_docs)} docs")
    return bm25, all_docs


def invalidate_bm25_cache() -> None:
    """Call after upsert/delete to force a BM25 rebuild on next search."""
    global _bm25_cache
    _bm25_cache = None


def _bm25_search(
    query: str,
    limit: int = 20,
    exclude_ids: Optional[List[str]] = None,
) -> List[Dict]:
    """BM25 keyword search over all stored note texts (uses cached index)."""
    bm25, all_docs = _get_bm25_index()
    if not all_docs:
        return []

    exclude_set = set(exclude_ids) if exclude_ids else set()

    query_tokens = _tokenize(query)
    if not query_tokens:
        return []

    scores = bm25.get_scores(query_tokens)

    scored = [
        (all_docs[i], scores[i])
        for i in range(len(all_docs))
        if scores[i] > 0 and all_docs[i]["id"] not in exclude_set
    ]
    scored.sort(key=lambda x: -x[1])

    return [
        {"id": d["id"], "title": d["title"], "text": d["text"], "score": s}
        for d, s in scored[:limit]
    ]


def _reciprocal_rank_fusion(
    rankings: List[List[Dict]],
    k: int = 60,
) -> List[Dict]:
    """Fuse multiple rankings using RRF. Returns sorted list of {id, title, text, score}."""
    scores: Dict[str, float] = {}
    meta: Dict[str, Dict] = {}

    for ranking in rankings:
        for rank, item in enumerate(ranking):
            nid = item["id"]
            scores[nid] = scores.get(nid, 0.0) + 1.0 / (k + rank + 1)
            if nid not in meta:
                meta[nid] = {"title": item["title"], "text": item["text"]}

    fused = [
        {"id": nid, "title": meta[nid]["title"], "text": meta[nid]["text"], "score": score}
        for nid, score in scores.items()
    ]
    fused.sort(key=lambda x: -x["score"])
    return fused


def hybrid_search(
    query: str,
    limit: int = 10,
    exclude_ids: Optional[List[str]] = None,
) -> List[SearchResult]:
    """
    Hybrid search: BM25 keyword + vector semantic, fused with RRF.
    Returns ranked SearchResult list.
    """
    exclude = exclude_ids or []

    # 1. Vector (semantic) search
    query_vec = embed_text(query)
    vec_results = vector_search(query_vec, limit=20, exclude_ids=exclude)

    # 2. BM25 (keyword) search
    bm25_results = _bm25_search(query, limit=20, exclude_ids=exclude)

    # 3. Fuse with Reciprocal Rank Fusion
    fused = _reciprocal_rank_fusion([vec_results, bm25_results])

    # Build final results
    results = []
    for item in fused[:limit]:
        snippet = item["text"][:200]
        results.append(SearchResult(
            note_id=item["id"],
            title=item["title"],
            score=round(item["score"], 6),
            snippet=snippet,
        ))

    return results

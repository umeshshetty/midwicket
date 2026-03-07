import re
from typing import Optional, List, Dict

import lancedb
import pyarrow as pa

from config import LANCEDB_PATH, EMBEDDING_DIM
from embeddings import embed_text, embed_batch

TABLE_NAME = "notes"

# Only allow UUID-like IDs (alphanumeric + hyphens) to prevent injection
_SAFE_ID_RE = re.compile(r"^[a-zA-Z0-9_-]+$")


def _safe_id(note_id: str) -> str:
    """Validate and return a safe note ID for use in filter expressions."""
    if not note_id or not _SAFE_ID_RE.match(note_id):
        raise ValueError(f"Invalid note ID: {note_id!r}")
    return note_id


def _delete_by_id(table: lancedb.table.Table, note_id: str) -> None:
    """Safely delete a row by ID with proper escaping."""
    safe = _safe_id(note_id)
    table.delete(f"id = '{safe}'")

_db: Optional[lancedb.DBConnection] = None


def get_db() -> lancedb.DBConnection:
    global _db
    if _db is None:
        _db = lancedb.connect(LANCEDB_PATH)
    return _db


def _get_schema() -> pa.Schema:
    return pa.schema([
        pa.field("id", pa.string()),
        pa.field("title", pa.string()),
        pa.field("text", pa.string()),
        pa.field("vector", pa.list_(pa.float32(), EMBEDDING_DIM)),
        pa.field("tags", pa.string()),
        pa.field("created_at", pa.string()),
        pa.field("updated_at", pa.string()),
    ])


def _ensure_table() -> lancedb.table.Table:
    db = get_db()
    if TABLE_NAME in db.table_names():
        return db.open_table(TABLE_NAME)
    return db.create_table(TABLE_NAME, schema=_get_schema())


def upsert_note(
    note_id: str,
    title: str,
    plain_text: str,
    tags: list[str],
    created_at: str,
    updated_at: str,
) -> None:
    """Embed and upsert a note into the vector store."""
    table = _ensure_table()
    text_to_embed = f"{title} {plain_text}"
    vector = embed_text(text_to_embed)

    row = {
        "id": note_id,
        "title": title,
        "text": plain_text[:500],  # Store snippet for search results
        "vector": vector,
        "tags": ",".join(tags),
        "created_at": created_at,
        "updated_at": updated_at,
    }

    # Delete existing row if present, then add new one
    try:
        _delete_by_id(table, note_id)
    except Exception:
        pass  # Row doesn't exist yet

    table.add([row])


def upsert_batch(notes: list[dict]) -> int:
    """Embed and upsert multiple notes. Returns count of notes indexed."""
    if not notes:
        return 0

    table = _ensure_table()

    texts = [f"{n['title']} {n['plain_text']}" for n in notes]
    vectors = embed_batch(texts)

    rows = []
    ids_to_delete = []
    for n, vec in zip(notes, vectors):
        ids_to_delete.append(n["id"])
        rows.append({
            "id": n["id"],
            "title": n["title"],
            "text": n["plain_text"][:500],
            "vector": vec,
            "tags": ",".join(n.get("tags", [])),
            "created_at": n["created_at"],
            "updated_at": n["updated_at"],
        })

    # Batch delete existing rows
    for nid in ids_to_delete:
        try:
            _delete_by_id(table, nid)
        except Exception:
            pass

    table.add(rows)
    return len(rows)


def delete_note(note_id: str) -> None:
    """Remove a note from the vector store."""
    table = _ensure_table()
    try:
        _delete_by_id(table, note_id)
    except Exception:
        pass


def vector_search(
    query_vector: List[float],
    limit: int = 20,
    exclude_ids: Optional[List[str]] = None,
) -> List[Dict]:
    """Search by vector similarity. Returns list of {id, title, text, score}."""
    table = _ensure_table()

    try:
        results = (
            table.search(query_vector)
            .metric("cosine")
            .limit(limit + len(exclude_ids or []))
            .to_list()
        )
    except Exception:
        return []

    filtered = []
    for r in results:
        if exclude_ids and r["id"] in exclude_ids:
            continue
        filtered.append({
            "id": r["id"],
            "title": r["title"],
            "text": r["text"],
            "score": 1.0 - r.get("_distance", 0.0),  # Convert distance to similarity
        })
        if len(filtered) >= limit:
            break

    return filtered


def get_total_count() -> int:
    """Return total number of indexed notes."""
    try:
        table = _ensure_table()
        return table.count_rows()
    except Exception:
        return 0


def get_all_texts() -> list[dict]:
    """Return all stored texts for BM25 indexing. Returns list of {id, title, text}."""
    try:
        table = _ensure_table()
        results = table.to_pandas()[["id", "title", "text"]].to_dict("records")
        return results
    except Exception:
        return []

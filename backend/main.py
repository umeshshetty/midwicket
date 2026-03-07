import logging

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from config import CORS_ORIGINS, HOST, PORT, EMBEDDING_MODEL
from models import (
    NoteSync,
    BulkSyncRequest,
    SearchRequest,
    SearchResponse,
    HealthResponse,
)
from vector_store import upsert_note, upsert_batch, delete_note, get_total_count
from search import hybrid_search, invalidate_bm25_cache

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(title="Midwicket Semantic Search", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    logger.info("Loading embedding model (first request may be slow)...")
    # Pre-load the model on startup
    from embeddings import get_model
    get_model()
    total = get_total_count()
    logger.info(f"Ready. {total} notes indexed. Model: {EMBEDDING_MODEL}")


@app.get("/api/health", response_model=HealthResponse)
async def health():
    return HealthResponse(
        status="ok",
        total_indexed=get_total_count(),
        embedding_model=EMBEDDING_MODEL,
    )


@app.post("/api/notes/sync")
async def sync_note(note: NoteSync):
    """Embed and upsert a single note."""
    try:
        upsert_note(
            note_id=note.id,
            title=note.title,
            plain_text=note.plain_text,
            tags=note.tags,
            created_at=note.created_at,
            updated_at=note.updated_at,
        )
        invalidate_bm25_cache()
        logger.info(f"Synced note {note.id[:8]}... ({len(note.plain_text)} chars)")
        return {"status": "ok", "note_id": note.id}
    except Exception as e:
        logger.error(f"Failed to sync note {note.id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/notes/{note_id}")
async def remove_note(note_id: str):
    """Remove a note from the search index."""
    try:
        delete_note(note_id)
        invalidate_bm25_cache()
        logger.info(f"Deleted note {note_id[:8]}...")
        return {"status": "ok", "note_id": note_id}
    except Exception as e:
        logger.error(f"Failed to delete note {note_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/notes/bulk-sync")
async def bulk_sync(request: BulkSyncRequest):
    """Embed and upsert multiple notes in one call."""
    try:
        notes_data = [
            {
                "id": n.id,
                "title": n.title,
                "plain_text": n.plain_text,
                "tags": n.tags,
                "created_at": n.created_at,
                "updated_at": n.updated_at,
            }
            for n in request.notes
        ]
        count = upsert_batch(notes_data)
        invalidate_bm25_cache()
        logger.info(f"Bulk synced {count} notes")
        return {"status": "ok", "count": count}
    except Exception as e:
        logger.error(f"Bulk sync failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/search", response_model=SearchResponse)
async def search(request: SearchRequest):
    """Hybrid semantic + keyword search."""
    try:
        results = hybrid_search(
            query=request.query,
            limit=request.limit,
            exclude_ids=request.exclude_ids,
        )
        return SearchResponse(
            results=results,
            total_indexed=get_total_count(),
        )
    except Exception as e:
        logger.error(f"Search failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=HOST, port=PORT, reload=True)

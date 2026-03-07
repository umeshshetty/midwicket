from __future__ import annotations

from pydantic import BaseModel


class NoteSync(BaseModel):
    id: str
    title: str
    plain_text: str
    created_at: str
    updated_at: str
    tags: list[str] = []


class BulkSyncRequest(BaseModel):
    notes: list[NoteSync]


class SearchRequest(BaseModel):
    query: str
    limit: int = 10
    exclude_ids: list[str] = []


class SearchResult(BaseModel):
    note_id: str
    title: str
    score: float
    snippet: str


class SearchResponse(BaseModel):
    results: list[SearchResult]
    total_indexed: int


class HealthResponse(BaseModel):
    status: str
    total_indexed: int
    embedding_model: str

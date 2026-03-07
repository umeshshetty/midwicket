import os

LANCEDB_PATH = os.path.join(os.path.dirname(__file__), "data", "lancedb")
EMBEDDING_MODEL = "all-MiniLM-L6-v2"
EMBEDDING_DIM = 384
CORS_ORIGINS = ["http://localhost:5173", "http://localhost:5174"]
HOST = "0.0.0.0"
PORT = 8000

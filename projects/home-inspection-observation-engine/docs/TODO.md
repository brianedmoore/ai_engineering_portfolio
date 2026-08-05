# Future Optimizations

## Queue Processing — Parallelization

Currently `POST /inspections/{id}/process-queue` runs observations sequentially (one at a time).
This was intentional for MVP: SQLite can't handle concurrent writes, and sequential is simpler to build and debug.

**Future:** When migrating to PostgreSQL, switch to bounded parallel processing (2-3 simultaneous LLM calls).
This would reduce processing time from ~80s (8 × 10s) to ~20-30s for a typical inspection.
Options: `asyncio.gather` with a semaphore in FastAPI, or a task queue (Celery, ARQ).

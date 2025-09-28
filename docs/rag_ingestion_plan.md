## RAG Ingestion & Retrieval Plan (ChromaDB local, OpenAI embeddings, OCR fallback)

This document describes the implementation plan for a local-first RAG pipeline using a data folder, ChromaDB for vector search, OpenAI `text-embedding-3-small` for embeddings (with local switch), and hierarchical chunking with coarse→fine retrieval. It integrates pragmatic recommendations to ensure quality, traceability, and low cost.

### Goals
- Local-first, privacy-preserving ingestion and vector search
- High-quality OCR with cost control (local-first OCR, VLM fallback)
- Hierarchical chunking for high precision retrieval and readable citations
- Separation of concerns: ingestion vs. vectorization vs. querying
- Reliable factual numbers from structured extracts; RAG for explanations + citations

### Data Layout (UserData/)
- `raw/`: user-dropped inputs (CSV, PDF scans, IFU, statements)
- `staging/`: normalized artifacts (text PDFs, unified CSV)
- `extracts/`: structured JSON/SQLite (transactions, positions, fees, yields)
- `vectorstore/`: Chroma persistent data (`UserData/vectorstore/chroma`)
- `cache/`: embeddings cache, thumbnails, temporary assets

### Core Components
- ChromaDB server (Docker) with a persisted volume
- OCR pipeline: OCRmyPDF (Tesseract) first; Mistral/Pixtral fallback per low-confidence page
- Embeddings: OpenAI `text-embedding-3-small`
- Watcher for `raw/` to orchestrate ingest → normalize → extract → chunk → embed → index
- RAG agent executing hierarchical coarse→fine retrieval with filters and citations

### Ingestion Flow
1. Detection: watch `UserData/raw/` for new/changed files
2. Deduplication: `sha256(bytes)` + size + mtime; version `doc_id` if same name different hash
3. Classification:
   - PDF with text → extract text (pdfminer/pdf-parse)
   - Image/scanned PDF → rasterize per page → OCR
   - CSV → normalize schema (ISO dates, decimals, currency)
4. OCR:
   - Run OCRmyPDF (Tesseract) by default
   - Page-level confidence; if `< threshold` or layout is difficult → call VLM OCR (Mistral/Pixtral) on targeted pages only
5. Extraction (structured):
   - Rules and regex for simple tables (transactions/positions)
   - Optional LLM extractors for complex fields
   - Persist in `extracts/` (JSON and/or SQLite/DuckDB)
6. Hierarchical Chunking:
   - Levels: Document → Section → Paragraph → Sentence
   - Prefer structural segmentation (headings, font size, numbering). Fall back to semantic grouping
   - Target sizes: Section (1–2k tokens), Paragraph (300–600), Sentence (≤120)
   - Maintain `parent_id`, `sibling_index`, and order
7. Embeddings:
   - Compute embeddings for Section + Paragraph (Sentence optional for dense text)
   - Batch requests; cache by `(model_id, sha256(text))` in `cache/`
   - Store `embedding_model_id` and `dim` with each record
8. Indexing (Chroma):
   - Collections per level: `chunks_sections`, `chunks_paragraphs`, `chunks_sentences`
   - Rich metadata for filtering and citations

Example metadata per chunk:
```json
{
  "doc_id": "releve_PEA_2024-01#7.3",
  "level": "paragraph",
  "parent_id": "releve_PEA_2024-01#7",
  "source": "releve_PEA_2024-01.pdf",
  "page": 7,
  "account": "PEA Boursorama",
  "product_type": "ETF",
  "isin": "FR0014002WK3",
  "period": "2024-01",
  "labels": ["fees", "dividends"],
  "embedding_model": "text-embedding-3-small",
  "content_hash": "sha256:...",
  "sibling_index": 3
}
```

### Querying (RAG) Flow
1. Normalize user question with hard filters (account, period, ISIN)
2. Coarse search on `chunks_sections` (k≈20) with filters
3. Drill-down to `chunks_paragraphs` within matched parents (aggregate k≈100)
4. Re-ranking: apply a local cross-encoder (e.g., `bge-reranker-base`) on top 50 → keep top 8
5. Passage builder: merge ±1 sibling around the best paragraph(s) within token budget
6. Answer generation: include mandatory citations (source, page). If numeric/tabular, prefer SQL from `extracts/` then add citation to source page

### Hybrid Search (BM25 + Vector)
- Maintain a sparse/BM25 field in the searchable view to catch exact labels (ISIN, identifiers)
- Combine sparse and dense scores (simple weighted or learning-to-rank later)

### Index Schema (logical)
- `documents`:
  - `doc_id`, `hash`, `source_path`, `type`, `period`, `account`, `ocr_stats`, `version`, `deleted_at`
- `chunks_[level]`:
  - `id`, `doc_id`, `parent_id`, `sibling_index`, `page`, `text`, `vector`, `meta_json`
- Materialized searchable view with normalized filter columns: `account`, `period`, `isin`, `labels`

### Tombstones & GC
- When a file disappears from `raw/`, mark as deleted (tombstone) and schedule GC to purge all related chunks
- Prevent orphan “zombie” records in Chroma

### Observability (minimal)
- Per-file JSON log: `pages_total`, `pages_ocr`, `ocr_ms`, `embed_ms`, `cache_hit_rate`, `chunks_count`
- Simple in-app dashboard to monitor latency and errors

### Security & Privacy
- Encrypt `extracts/` and `cache/` at rest (Windows DPAPI or OS keychain)
- Mask PII (IBAN, contracts) in logs and never send full identifiers to embedding APIs
- Store API keys in OS secure storage

### Reindexing Strategy
- Keep `embedding_model_id` on each record
- Reindex only records where `embedding_model_id != current_model_id`
- Deduplicate at chunk level via `content_hash`

### WSL/Windows Notes
- Run ChromaDB Docker under Windows or WSL; expose `--host 0.0.0.0` if needed and access via `localhost`
- Electron app communicates with Chroma over HTTP
- Local OCR (OCRmyPDF) may run in WSL; orchestrate via CLI/IPC bridge if preferred

### Roadmap (POC → Hardening)
- Day 1: Chroma Docker + `UserData/` + watcher + PDF text path → chunk → embed (OpenAI) → index (sections/paragraphs)
- Day 2: Conditional OCR (OCRmyPDF → VLM fallback) + embeddings cache + metadata filters + hierarchical retrieval
- Day 3: CSV → `extracts/` + SQL fusion for numbers + UI citations
- Day 4: Reindex job, quality dashboards, tombstones/GC, cleanup routines

### QA & Decision Policies
- 20–30 QA prompts covering: PEA cash %, UC fees > 2%, PER remaining allowance, YTD euro fund returns, etc.
- Local “policy prompts” to decide: tabular → SQL vs. free text → RAG
- Track precision, correct citation rate, and end-to-end latency

### Rationale for Key Choices
- Hierarchical coarse→fine retrieval improves precision and readability of citations
- Local-first OCR and hybrid search reduce costs and catch exact identifiers
- Structured facts live outside RAG for reliability; RAG explains and cites

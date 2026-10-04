# Teacher notes and quiz generation

This feature extends the existing `src/gemini` services. `BackblazeStorageService`
uses the native B2 authorization/upload APIs. No AWS S3 SDK or S3 endpoint is needed.

## Environment and setup

| Variable | Purpose |
| --- | --- |
| `B2_KEY_ID` | Application key ID (`B2_APPLICATION_KEY_ID` is also accepted) |
| `B2_APPLICATION_KEY` | Application key; existing legacy key aliases remain accepted |
| `B2_BUCKET_NAME` | Private bucket name; may come from a bucket-restricted key |
| `B2_BUCKET_ID` | Required for unrestricted keys; otherwise obtained during authorization |
| `PINECONE_API_KEY` | Pinecone API key |
| `PINECONE_INDEX_NAME` | Existing **768-dimensional cosine** index dedicated to this embedding model |
| `GEMINI_API_KEY` | Gemini API key (`GEMINI_KEY` remains accepted) |
| `GEMINI_MODEL` | Optional quiz model; existing default is `gemini-2.5-flash` |
| `GEMINI_EMBEDDING_MODEL` | Optional embedding model; default `gemini-embedding-001` at 768 dimensions |
| `DB_URL` | Existing PostgreSQL connection; also used for note records and operation locks |

`B2_ENDPOINT` is not required. Keep the bucket private. The application key needs
`listFiles`, `readFiles`, `writeFiles`, `deleteFiles`, and `shareFiles`, scoped to the
chosen bucket and `teachers/` prefix. Downloads use a filename-prefix authorization
token valid for 900 seconds; account/upload tokens never leave the backend.

Google retired `text-embedding-004` on January 14, 2026, so the implementation uses
its supported text-only replacement. Use a fresh index and re-upload notes when
changing embedding models. The server validates index dimension and cosine metric
at startup. See [Google model lifecycle](https://ai.google.dev/gemini-api/docs/deprecations)
and [Google embeddings](https://ai.google.dev/gemini-api/docs/embeddings).

From `Backend`, install dependencies and apply the additive migration before startup:

```sh
npm ci
npm run migration:notes
npm run build
```

The migration creates `teacher_notes`, leaves quiz tables unchanged, and does not
run automatically on startup. Set `DB_URL` for the intended environment first.
Its datasource follows the existing application's database TLS configuration.
No database migration or live cloud mutation was performed during implementation.

## API

All routes require an authenticated teacher. Identity comes from the JWT, never
from a client-supplied teacher ID.

| Route | Request / response |
| --- | --- |
| `GET /v1/teacher-notes` | `{ notes, usedBytes, limitBytes }` |
| `POST /v1/teacher-notes` | Multipart `file`; returns `{ fileId, fileName, size, status, createdAt }` |
| `GET /v1/teacher-notes/:fileId/download` | `{ url, expiresIn: 900 }` |
| `DELETE /v1/teacher-notes/:fileId` | 204; safe to retry |
| `POST /v1/quiz-generations` | JSON/multipart: `topic`, `questionCount` (1-50), optional `difficulty`, `gradeLevel`, `fileId` or uploaded `file` |

`numQuestions` remains accepted; `questionCount` takes precedence. The existing
`/quiz-generations/rag` compatibility route accepts an upload or saved file ID.
A selected file limits generation to that note. Topic-only requests search all
ready notes belonging to the teacher. Without an upload, a topic is required.

Quiz responses contain `title`, `description`, and `questions`. Each question has
`id`, `question`, `options: { A, B, C, D }`, `correctAnswer` (A-D), `explanation`, and
`source` (`teacher_notes` or `general_knowledge`). The frontend adapts this to the
existing quiz editor/save API. Source badges and original explanations appear
during review; the existing saved-quiz schema is unchanged.

## Behavior and recovery

- Each file is limited to 25 MB; each teacher to 200 x 1024 x 1024 bytes. Quota
  accounting scans every native B2 listing page under `teachers/{teacherId}/`.
  New files use `teachers/{teacherId}/notes/{fileId}-{safeFileName}`.
- A PostgreSQL advisory lock serializes each teacher's quota scan/upload across
  instances. All application uploads must use this service; external uploads
  bypass this coordination. No local-success fallback hides storage failures.
- The existing parser and recursive splitter use 1000-character excerpts with
  200-character overlap and paragraph/sentence separators. All excerpts are
  indexed in bounded batches without silently truncating long documents.
- Every Pinecone operation uses `teacher_{teacherId}`. Vector IDs are
  `{fileId}#chunk_{index}`; metadata includes file ID/name, teacher ID, text, and index.
- Durable records track `processing`, `ready`, `failed`, and `deleting`. Counts
  are stored before indexing. Partial uploads remain visible for removal and are
  excluded from quizzes. After a crashed process releases its lock, delete the
  unfinished note and upload again. Repeated uploads create independent notes.
- Deletion first marks the record unavailable, then deletes deterministic vector
  IDs, then permanently removes all exact-name B2 versions. Failure retains the
  record for retry. Per-file locks prevent upload/delete overlap. These provider
  operations are not a distributed transaction; retry completes partial deletion.
- Retrieval requests exactly N scored matches, filters on ready file IDs and
  cosine score >= 0.3, and rechecks note status afterward. Provider outages fail
  the request rather than being treated as absent notes. Pinecone's eventual
  consistency can temporarily reduce matches immediately after upload.
- Prompts request one note-based question per passing excerpt and use general
  knowledge for the remainder. Validation enforces exact counts, source split,
  sequential IDs, four distinct nonempty options, and explanations. This checks
  structure and source labels, not factual truth; teacher review is still needed.
- Operation locks hold database connections during external work. Size the DB
  pool and HTTP/proxy timeouts for upload concurrency. At larger scale, ingestion
  should move to durable background jobs with explicit status.
- Legacy B2 files count toward quota but lack new registry records. Inventory or
  migrate those separately before removing old storage. Legacy Pinecone records
  are excluded by ready-file filters and are never automatically deleted.

## Verification

```sh
cd Backend
npm test -- --runInBand
npm run build
cd ../Frontend
npx tsc --noEmit
```

Cloud calls are mocked in automated tests. Tests cover quota pagination/boundaries,
identity scoping, native download tokens/version deletion, deterministic IDs,
partial failures, exact retrieval limits, and question source distributions.
Live verification requires credentials and the applied database migration.

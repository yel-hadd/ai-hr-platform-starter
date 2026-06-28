# Knowledge Base — architecture

> Jira: HARI-58 (HrDocument model) · HARI-59 (chunks ↔ documents, version + access
> tier) · HARI-62 (validation & archiving — what feeds the RAG). Parent: HARI-5.

The governed knowledge base behind the `/kb` reader, the admin authoring console,
and the assistant's handbook answers. This is the document/collection layer and the
**hybrid retrieval** that sits on top of the RAG storage described in
[`hr-rag-architecture.md`](./hr-rag-architecture.md); access-control rules are the
same ones in [`authorization-invariants.md`](./authorization-invariants.md).

## Why

The handbook is reference content that HR needs to author, govern, and keep
accurate. The KB turns the original flat, seed-only corpus into editable
**documents** grouped into **collections**, with a draft/publish lifecycle, a
per-document access tier, and answers the assistant can cite down to the exact
section — all on the same Postgres that holds the relational HR data.

## Data model

`collection → document → chunk`. The chunk is the existing RAG row, now attached
to its document and carrying a denormalized access tier for fast filtered retrieval.

```prisma
enum DocStatus     { DRAFT PUBLISHED ARCHIVED }
enum DocVisibility { ALL_EMPLOYEES MANAGERS HR_ONLY }

model KbCollection { id  slug @unique  name  description?  order  documents HrDocument[] }

model HrDocument {                         // HARI-58
  id  slug @unique  title
  content     String                       // HTML source of truth (authored in BlockNote)
  status      DocStatus     @default(DRAFT)
  visibility  DocVisibility @default(ALL_EMPLOYEES)
  version     Int           @default(1)    // bumped each publish (HARI-59)
  tags        String[]
  viewCount   Int           @default(0)
  collection  KbCollection  @relation(...)
  chunks      HandbookChunk[]
  createdBy / updatedBy  User?             // authorship, shown on reader + admin
  feedback    KbFeedback[]                 // "was this helpful?"
  publishedAt DateTime?
}

model HandbookChunk {                      // HARI-59: attached to its document
  id  section  anchor  content  chunkIndex
  embedding   Unsupported("halfvec(384)")?  // semantic vector (HNSW index)
  contentTsv  Unsupported("tsvector")?      // lexical vector (GIN index) — generated
  document    HrDocument?  @relation(...)   // onDelete: Cascade
  version  Int            // snapshot of the doc version at index time
  visibility DocVisibility // denormalized from the document for hot-path filtering
}

model KbFeedback { id  document  voter(User)  helpful Boolean  @@unique([documentId, voterId]) }
```

Prisma can't model the pgvector/tsvector column types, their generated
expressions, or the indexes over them, so those live in migration SQL (see
[Operational notes](#operational-notes)).

## Lifecycle — what feeds the RAG (HARI-62)

`DRAFT → PUBLISHED → ARCHIVED` (and back). **Only PUBLISHED documents are indexed**,
enforced at two layers so a draft can never reach the chatbot:

1. **Not indexed** — chunks are (re)built only on **publish** (`ingestDocument`,
   `src/lib/kb/ingest.ts`). A DRAFT/ARCHIVED doc has **zero** `HandbookChunk` rows.
2. **Filtered anyway** — retrieval also constrains `status = 'PUBLISHED'`, so even a
   stale chunk can't surface.

`publishDocument` bumps `version` and indexes **before** flipping status (a failed
embed never leaves a published-but-uncitable doc); `archiveDocument` /
`unpublishToDraft` drop the chunks. Editing a published doc bumps the version and
re-indexes. The data layer is `src/lib/kb.ts`; admin actions in
`src/app/(dashboard)/kb/admin/actions.ts`.

## Access control (HARI-59)

Three tiers — `ALL_EMPLOYEES` / `MANAGERS` / `HR_ONLY` — mapped to roles by
`visibleDocTiers(role)` (`src/lib/rbac.ts`), derived from the existing directory
permissions so KB access tracks the rest of the app. Enforced **server-side at
every entry point**:

| Surface | Gate |
|---|---|
| Reader list / article / collection page | `status='PUBLISHED' AND visibility ∈ visibleDocTiers(role)`; a hidden/draft URL → `null` → `notFound()` (IDOR-safe) |
| Retrieval (chat + search) | same filter, in the SQL (`src/lib/rag.ts`) |
| Reader access | `handbook:read` (every role) |
| Authoring (CRUD + lifecycle) | `kb:manage` (HR Admin + Super Admin), re-checked in every server action **and** every `lib/kb` admin fn |

Invariant: **the chatbot can never read more than the reader would show that
role** — both go through `visibleDocTiers` + `PUBLISHED`.

## Ingestion & embedding

`ingestDocument(id)` (`src/lib/kb/ingest.ts`): `chunkHtml(content)` splits the
stored HTML at `<h2>`/`<h3>` (recursively) into one chunk per section, embeds them
in one batch (`src/lib/ai/embeddings.ts`), and atomically replaces the document's
chunks (delete + insert + raw `UPDATE … ::halfvec` for the embedding). Each chunk
carries the document's `version` and denormalized `visibility`, and an `anchor` =
the heading slug. Keyless-safe: with no `OPENROUTER_API_KEY` it skips embedding.

## Hybrid retrieval (vector + lexical + RRF)

`searchHandbook(query, k, caller)` (`src/lib/rag.ts`) — used by both the
`searchHandbook` AI tool and the `/kb` ⌘K search (`searchKb` in `lib/kb.ts`):

- **Semantic** — pgvector cosine (`embedding <=> $vec`) over `halfvec(384)`, HNSW
  index. Catches paraphrase / synonyms.
- **Lexical** — Postgres full-text (`contentTsv @@ websearch_to_tsquery('simple', …)`
  ranked by `ts_rank_cd`), GIN index. Catches exact terms embeddings miss —
  acronyms, names, IDs ("PTO", "401k").
- **Fusion** — each signal contributes a ranked candidate list; they're merged by
  **Reciprocal Rank Fusion** (`Σ 1/(k + rankᵢ)`, k=60). RRF fuses by *rank*, so
  cosine and `ts_rank` need no score normalization.

Both halves apply the same tier + status filter, so hybrid never widens access. The
query is one CTE (`vec` / `lex` / `fused`) returning the top-k with the cosine
`similarity` (for the match-% display) and the article/collection slugs + anchor.

Why Postgres FTS rather than a BM25 extension (ParadeDB `pg_search`): the
`pgvector/pgvector` image has no such extension, and native `tsvector` + `ts_rank_cd`
gives a strong lexical signal with zero new infrastructure. The `'simple'` config
(no stemming) is bilingual-safe for EN/FR keyword matching; per-document
`english`/`french` configs are a future refinement.

> Scaling: HNSW filters its candidate set, so a much larger corpus could return
> < k in-tier rows; raise `hnsw.ef_search` or enable `hnsw.iterative_scan`
> (pgvector ≥ 0.8) if the KB grows.

## Anchor-precise citations

A chunk's `anchor` is the slug of its heading, produced by the shared
`createSlugger` (`src/lib/kb/markdown.ts`). The reader assigns the **same** ids to
its headings (`rehypeKbAnchors`, used by `article-content.tsx`) and `extractToc`
builds the "On this page" nav from them — all three walk headings in document order
with the same slugger, so they stay in lock-step. The `searchHandbook` tool returns
a DB-built URL `/kb/{collection}/{article}#{anchor}`; the assistant attributes each
claim with a `[n]` marker that the chat renderer turns into a link to that URL
(`src/components/chat/citations-rehype.ts`), and a sources panel lists the same
deep links (`src/components/chat/generative/citations.tsx`). URLs are always
DB-derived — never model-authored — so they can't be hallucinated.

## Authoring & reader UI

- **Editor** — `src/components/kb/article-editor*.tsx`: a Notion-style BlockNote
  editor (slash menu, drag, inline toolbar), client-only, storing **sanitized
  HTML**. Its chrome is localized via BlockNote's `dictionary` (en/fr).
- **Admin** — `/kb/admin`: documents with status/tier/views, filter + sort,
  lifecycle actions with confirmation dialogs and toasts; collections CRUD; slug
  live-preview + change warning.
- **Reader** — `/kb`, `/kb/[collection]`, `/kb/[collection]/[article]`: collections,
  breadcrumb, "On this page" TOC, tags, reading time, author, related articles,
  "was this helpful?", and the ⌘K search palette.

## i18n

Every user-facing string is a next-intl key in **both** `messages/{en,fr}.json`
(namespaces `kb`, `kbStatus`, `kbVisibility`, plus `nav`/`permissions` additions);
the editor chrome uses BlockNote's bundled dictionaries. Article *content* is
single-language (authored per document).

## Testing

- `tests/rbac.test.ts` — `kb:manage` nesting; `visibleDocTiers` per role.
- `tests/kb.integration.test.ts` — tier scoping (reader + retrieval), status
  gating, reader IDOR, admin defense-in-depth, search scoping, and **hybrid lexical
  recall** (a keyword query surfaced by the FTS half).
- `tests/kb-markdown.test.ts` — slugger + `chunkHtml` (incl. nested-heading walk).
- `tests/citations-rehype.test.ts` — inline `[n]` linkification.
- `tests/rag.live.test.ts` — live hybrid retrieval returns anchored hits.

## Operational notes

- **Migrations** live under `prisma/migrations/` and include hand-written SQL for
  what Prisma can't model. Every KB migration **recreates the HNSW and GIN
  indexes**, because `prisma migrate` drops indexes on the `Unsupported` halfvec /
  tsvector columns each time — see the `CREATE INDEX` tails in the migration files.
- **Edit the seed** (`prisma/handbook.ts`, authored in markdown → stored as HTML) →
  `npm run db:reset` (seeding skips when documents already exist).
- **One key** powers chat, embeddings, and search; without it the app still boots
  and the KB still reads — only retrieval returns nothing until a key is set and the
  corpus is re-seeded.

## Source map

| Concern | File |
|---|---|
| Schema (collections, documents, chunks, feedback) | `prisma/schema.prisma` |
| Indexes (HNSW, GIN), generated tsvector, halfvec | `prisma/migrations/**` |
| Role-scoped data layer (reader + admin + search) | `src/lib/kb.ts` |
| Markdown slugger (shared anchors) | `src/lib/kb/markdown.ts` |
| HTML chunker + TOC | `src/lib/kb/html.ts` |
| Ingestion / embedding | `src/lib/kb/ingest.ts` |
| Hybrid retrieval (vector + FTS + RRF) | `src/lib/rag.ts` |
| Visibility tiers / `kb:manage` | `src/lib/rbac.ts` |
| AI tool + prompt | `src/lib/ai/tools.ts`, `src/app/api/chat/route.ts` |
| Citations (sources + inline `[n]`) | `src/components/chat/generative/citations.tsx`, `src/components/chat/citations-rehype.ts` |
| Reader / admin / search / editor UI | `src/app/(dashboard)/kb/**`, `src/components/kb/**` |
| Tests | `tests/kb.integration.test.ts`, `tests/kb-markdown.test.ts`, `tests/rbac.test.ts`, `tests/citations-rehype.test.ts`, `tests/rag.live.test.ts` |

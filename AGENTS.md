# HARI — contributor & agent guide

AI-powered HR platform **starter**. The showcase is the `/chat` page: an assistant with
RBAC-gated tools, handbook RAG (pgvector), streaming reasoning, tool-call UI, and generative
UI. See `README.md` for the full architecture and diagrams.

## Stack
Next.js 16 (App Router, React 19) · TypeScript · Tailwind v4 + shadcn/ui · Vercel AI SDK v6 ·
OpenRouter (chat + embeddings) · Postgres + pgvector (`halfvec` + HNSW) · Prisma · Auth.js v5.

> Next.js 16 / React 19 are recent majors — when an API surprises you, check the official docs
> for that version rather than assuming older behavior.

## Commands
- `docker compose up --build` — full stack (db + adminer + app); migrates + seeds on boot.
- `npm run dev` — app only (expects Postgres on `:5432`).
- `npm run db:migrate` / `db:deploy` / `db:reset` — Prisma migrations (schema lives in migrations, **not** `db push`).
- `npm run db:seed` — demo data (idempotent; won't re-embed if the handbook already exists — use `db:reset` after editing it).
- `npm test` — vitest **deterministic** suite (RBAC unit + tool/RBAC integration); no network/keys (needs a running Postgres for the integration test).
- `npm run test:live` / `test:all` — live OpenRouter + RAG smoke (`*.live.test.ts`, needs `OPENROUTER_API_KEY`) / both.

## Conventions / where things live
- **Authorization is always server-side.** `lib/rbac.ts` is the single permission matrix; it gates
  the UI (`sidebar.tsx`, pages), the data layer, and the AI tools. Never trust a client-supplied role.
- **`lib/hr.ts` is the one role-scoped data layer** — both dashboard pages and AI tools call it, so
  the chatbot can never read more than the UI would show for that role.
- **AI tools** (`lib/ai/tools.ts`) wrap `execute` with `withPermission(...)`; on denial they return
  `{ denied: true }` (rendered as a card) instead of throwing.
- **Embeddings** (`lib/ai/embeddings.ts`): model is env-selectable (`EMBEDDING_MODEL`) but the
  dimension is fixed by the migration (`halfvec(384)`). Changing the dimension = a new migration +
  updating `EMBEDDING_DIMENSIONS`; a mismatch fails loudly at runtime.
- **Schema changes** go through `prisma migrate` and are committed under `prisma/migrations/`. The
  pgvector extension, the `halfvec` column, and the HNSW index live in the migration SQL (Prisma
  can't model an index on an `Unsupported` column).
- Secrets stay in `.env` (git-ignored) and are read only in server code / Route Handlers.

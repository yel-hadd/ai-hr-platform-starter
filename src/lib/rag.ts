// Retrieval over the knowledge base using pgvector cosine distance (`<=>`) on the
// halfvec(384) column, accelerated by the HNSW index created in migration SQL.
//
// Authorization is enforced here in the query, not the prompt: only chunks of
// PUBLISHED documents whose visibility tier the caller may read are returned —
// the same "a tool can't see more than the UI" invariant as lib/hr.ts. Drafts
// and archived docs have no chunks at all (see lib/kb/ingest.ts); the status
// filter is belt-and-suspenders for any stale row.
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { embedText, toVectorLiteral } from "@/lib/ai/embeddings";
import { visibleDocTiers, type Role } from "@/lib/rbac";

export type HandbookHit = {
  id: string;
  section: string;
  anchor: string;
  content: string;
  similarity: number; // 1 = identical, 0 = unrelated (cosine)
  articleTitle: string;
  articleSlug: string;
  collectionSlug: string;
};

export async function searchHandbook(
  query: string,
  k = 4,
  caller: { role: Role },
): Promise<HandbookHit[]> {
  const embedding = await embedText(query);
  const vec = toVectorLiteral(embedding);
  const tiers = visibleDocTiers(caller.role);

  // `${vec}` bound as text → cast to halfvec; tiers bound as text[] → enum array.
  // ORDER BY uses the HNSW index; we expose cosine *similarity* (1 - distance).
  // HNSW filters its candidate set, so a much larger corpus could return < k
  // in-tier rows; if the KB grows, raise hnsw.ef_search or enable iterative_scan.
  const rows = await prisma.$queryRaw<HandbookHit[]>(
    Prisma.sql`
      SELECT hc.id, hc.section, hc.anchor, hc.content,
             1 - (hc.embedding <=> ${vec}::halfvec) AS similarity,
             d.title AS "articleTitle",
             d.slug AS "articleSlug",
             col.slug AS "collectionSlug"
      FROM "HandbookChunk" hc
      JOIN "HrDocument" d ON d.id = hc."documentId"
      JOIN "KbCollection" col ON col.id = d."collectionId"
      WHERE d.status = 'PUBLISHED'
        AND hc.embedding IS NOT NULL
        AND hc.visibility = ANY(${tiers}::"DocVisibility"[])
      ORDER BY hc.embedding <=> ${vec}::halfvec
      LIMIT ${k}
    `,
  );
  return rows;
}

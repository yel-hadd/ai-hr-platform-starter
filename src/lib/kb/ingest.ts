// ─────────────────────────────────────────────────────────────────────────
// KB indexing pipeline. Turns a PUBLISHED HrDocument's markdown into embedded
// RAG chunks. Mirrors the atomic seed pattern in prisma/seed.ts: chunks are
// inserted and their halfvec embedding set via raw SQL inside one transaction,
// so a mid-batch failure rolls back instead of leaving a partial corpus.
//
// HARI-62 invariant: only PUBLISHED documents are ever indexed. Drafts/archived
// docs are never passed here, so they have zero chunks and the chatbot can't see
// them (retrieval also filters status='PUBLISHED' as defense in depth).
// ─────────────────────────────────────────────────────────────────────────
import { prisma } from "@/lib/prisma";
import { embedTexts, toVectorLiteral } from "@/lib/ai/embeddings";
import { chunkHtml } from "@/lib/kb/html";

/** Delete all RAG chunks for a document (used on unpublish/archive/re-ingest). */
export async function removeDocumentChunks(documentId: string): Promise<void> {
  await prisma.handbookChunk.deleteMany({ where: { documentId } });
}

/**
 * (Re)build a document's RAG chunks from its current HTML, replacing existing ones
 * atomically. Keyless-safe: with no API key we drop chunks and skip (doc still
 * reads in /kb; RAG surfaces it once a key is set and it's re-published).
 */
export async function ingestDocument(documentId: string): Promise<void> {
  const doc = await prisma.hrDocument.findUnique({ where: { id: documentId } });
  if (!doc) return;

  const chunks = chunkHtml(doc.content);

  if (!process.env.OPENROUTER_API_KEY || chunks.length === 0) {
    if (!process.env.OPENROUTER_API_KEY) {
      // eslint-disable-next-line no-console
      console.warn(`⚠ No OPENROUTER_API_KEY — "${doc.slug}" indexed without embeddings.`);
    }
    await removeDocumentChunks(documentId);
    return;
  }

  // Embed section title + body together so the heading contributes to the vector
  // (same convention as the seed's `${section}\n${content}`).
  const vectors = await embedTexts(chunks.map((c) => `${c.section}\n${c.content}`));

  await prisma.$transaction(
    async (tx) => {
      await tx.handbookChunk.deleteMany({ where: { documentId } });
      for (let i = 0; i < chunks.length; i++) {
        const c = chunks[i];
        const row = await tx.handbookChunk.create({
          data: {
            documentId,
            section: c.section,
            anchor: c.anchor,
            content: c.content,
            chunkIndex: c.chunkIndex,
            version: doc.version,
            visibility: doc.visibility,
          },
        });
        await tx.$executeRawUnsafe(
          `UPDATE "HandbookChunk" SET embedding = $1::halfvec WHERE id = $2`,
          toVectorLiteral(vectors[i]),
          row.id,
        );
      }
    },
    { timeout: 20_000 },
  );
}

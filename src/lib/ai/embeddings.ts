// RAG embeddings via OpenRouter's OpenAI-compatible /embeddings endpoint.
//
// MODEL and EMBEDDING_DIMENSIONS are paired and MUST be changed together — the
// dimension also drives the `halfvec(N)` column (prisma/seed.ts enforces it).
// To switch models, edit BOTH constants below, then `npm run db:seed` (the seed
// migrates the column + re-embeds). Options (model -> dimension):
//   sentence-transformers/all-minilm-l6-v2    -> 384   ~free, lightweight (default)
//   baai/bge-base-en-v1.5                     -> 768   ~free, stronger English
//   baai/bge-m3                               -> 1024  ~free, multilingual
//   nvidia/llama-nemotron-embed-vl-1b-v2:free -> 2048  $0 free tier
//   openai/text-embedding-3-small             -> 1536  highest quality, ~$0.02/1M
const MODEL = "sentence-transformers/all-minilm-l6-v2";
export const EMBEDDING_DIMENSIONS = 384;

type EmbeddingResponse = {
  data?: { embedding: number[]; index: number }[];
  error?: { message?: string } | string;
};

// Returns embeddings in input order. Throws a clear error on any unexpected
// shape (OpenRouter can return a 200 with an error body) or dimension mismatch.
async function embed(input: string[]): Promise<number[][]> {
  const res = await fetch("https://openrouter.ai/api/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
    },
    body: JSON.stringify({ model: MODEL, input }),
  });

  const body = (await res.json().catch(() => null)) as EmbeddingResponse | null;
  if (!res.ok || !body || !Array.isArray(body.data)) {
    const detail =
      (body && (typeof body.error === "string" ? body.error : body.error?.message)) ??
      `HTTP ${res.status}`;
    throw new Error(`OpenRouter embeddings failed: ${detail}`);
  }
  if (body.data.length !== input.length) {
    throw new Error(
      `OpenRouter embeddings returned ${body.data.length} vectors for ${input.length} inputs`,
    );
  }

  const ordered = [...body.data].sort((a, b) => a.index - b.index).map((d) => d.embedding);
  for (const v of ordered) {
    if (!Array.isArray(v) || v.length !== EMBEDDING_DIMENSIONS) {
      throw new Error(
        `Embedding dimension mismatch: model "${MODEL}" returned ${v?.length} dims, ` +
          `expected ${EMBEDDING_DIMENSIONS}. Update MODEL/EMBEDDING_DIMENSIONS together.`,
      );
    }
  }
  return ordered;
}

export async function embedText(text: string): Promise<number[]> {
  return (await embed([text]))[0];
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  return embed(texts);
}

/** pgvector literal, e.g. "[0.1,0.2,...]" — cast to ::halfvec in SQL. */
export function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}

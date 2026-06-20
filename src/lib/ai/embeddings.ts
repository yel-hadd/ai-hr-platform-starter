// RAG embeddings via OpenRouter's OpenAI-compatible /embeddings endpoint.
// OpenRouter serves many embedding models, so swapping is a one-liner — BUT the
// dimension must match the `halfvec(N)` column in prisma/schema.prisma.
//
// To change models, update MODEL + EMBEDDING_DIMENSIONS here AND the halfvec
// size in the schema, then `npm run db:push && npm run db:seed`. Options:
//   sentence-transformers/all-minilm-l6-v2   384   ~free, lightweight (default)
//   baai/bge-base-en-v1.5                     768   ~free, stronger English
//   baai/bge-m3                              1024   ~free, multilingual
//   nvidia/llama-nemotron-embed-vl-1b-v2:free 2048  $0 free tier
//   openai/text-embedding-3-small            1536   highest quality, ~$0.02/1M

const MODEL = process.env.EMBEDDING_MODEL ?? "sentence-transformers/all-minilm-l6-v2";
export const EMBEDDING_DIMENSIONS = 384;

// Returns embeddings in input order.
async function embed(input: string[]): Promise<number[][]> {
  const res = await fetch("https://openrouter.ai/api/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
    },
    body: JSON.stringify({ model: MODEL, input }),
  });
  if (!res.ok) {
    throw new Error(`OpenRouter embeddings ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  const json = (await res.json()) as { data: { embedding: number[]; index: number }[] };
  return json.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
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

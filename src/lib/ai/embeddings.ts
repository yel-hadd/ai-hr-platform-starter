// Cloud embeddings (OpenRouter has no embeddings API, so we use OpenAI —
// directly or via the Vercel AI Gateway). text-embedding-3-small -> 1536 dims,
// matching the halfvec(1536) column in the Prisma schema.
import { createOpenAI } from "@ai-sdk/openai";
import { createGateway } from "@ai-sdk/gateway";
import { embed, embedMany, type EmbeddingModel } from "ai";

export const EMBEDDING_DIMENSIONS = 1536;
const MODEL = "text-embedding-3-small";

function embeddingModel(): EmbeddingModel {
  const provider = process.env.EMBEDDING_PROVIDER ?? "openai";
  if (provider === "gateway") {
    const gateway = createGateway({ apiKey: process.env.AI_GATEWAY_API_KEY });
    return gateway.textEmbeddingModel(`openai/${MODEL}`);
  }
  const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return openai.textEmbeddingModel(MODEL);
}

export async function embedText(text: string): Promise<number[]> {
  const { embedding } = await embed({ model: embeddingModel(), value: text });
  return embedding;
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const { embeddings } = await embedMany({ model: embeddingModel(), values: texts });
  return embeddings;
}

/** pgvector literal, e.g. "[0.1,0.2,...]" — cast to ::halfvec in SQL. */
export function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}

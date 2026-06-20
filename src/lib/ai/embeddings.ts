// Cloud embeddings for RAG. text-embedding-3-small -> 1536 dims, matching the
// halfvec(1536) column in the Prisma schema. Default provider is OpenRouter, so
// RAG works with the SAME key as chat (no extra key needed).
import { createOpenAI } from "@ai-sdk/openai";
import { createGateway } from "@ai-sdk/gateway";
import { embed, embedMany, type EmbeddingModel } from "ai";

export const EMBEDDING_DIMENSIONS = 1536;
const MODEL = "text-embedding-3-small";

const provider = () => process.env.EMBEDDING_PROVIDER ?? "openrouter";

// OpenRouter's AI-SDK provider has a flaky embedding path, but its HTTP API is
// plain OpenAI-compatible — so we call /embeddings directly. Returns vectors in
// input order.
async function embedViaOpenRouter(input: string[]): Promise<number[][]> {
  const res = await fetch("https://openrouter.ai/api/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
    },
    body: JSON.stringify({ model: `openai/${MODEL}`, input }),
  });
  if (!res.ok) {
    throw new Error(`OpenRouter embeddings ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  const json = (await res.json()) as { data: { embedding: number[]; index: number }[] };
  return json.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
}

// Alternative providers go through the AI SDK.
function aiSdkModel(): EmbeddingModel {
  if (provider() === "gateway") {
    return createGateway({ apiKey: process.env.AI_GATEWAY_API_KEY }).textEmbeddingModel(
      `openai/${MODEL}`,
    );
  }
  return createOpenAI({ apiKey: process.env.OPENAI_API_KEY }).textEmbeddingModel(MODEL);
}

export async function embedText(text: string): Promise<number[]> {
  if (provider() === "openrouter") return (await embedViaOpenRouter([text]))[0];
  const { embedding } = await embed({ model: aiSdkModel(), value: text });
  return embedding;
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (provider() === "openrouter") return embedViaOpenRouter(texts);
  const { embeddings } = await embedMany({ model: aiSdkModel(), values: texts });
  return embeddings;
}

/** pgvector literal, e.g. "[0.1,0.2,...]" — cast to ::halfvec in SQL. */
export function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}

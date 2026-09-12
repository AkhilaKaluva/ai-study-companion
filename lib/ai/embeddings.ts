// Vector embeddings utility using Google text-embedding-004 with cosine similarity
import { GoogleGenAI } from "@google/genai";

function getGenAI() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === "" || apiKey === "your-gemini-api-key-here") {
    return null;
  }
  return new GoogleGenAI({ apiKey });
}

/**
 * Generate a 768-dimensional embedding vector for a given text.
 * Falls back to deterministic semantic hashing if API key is not yet set.
 */
export async function getEmbedding(text: string): Promise<number[]> {
  const ai = getGenAI();

  if (ai) {
    try {
      const response = await ai.models.embedContent({
        model: "text-embedding-004",
        contents: text,
      });

      const resAny = response as any;
      if (resAny?.embedding?.values) {
        return resAny.embedding.values;
      }
      if (resAny?.embeddings?.[0]?.values) {
        return resAny.embeddings[0].values;
      }
    } catch (err) {
      console.warn("Gemini embedding API call failed, falling back to local vector representation:", err);
    }
  }

  // Fallback: 768-dim pseudo-vector based on character frequency / token hash
  // Ensures local offline operation without crashing
  return createFallbackVector(text, 768);
}

/**
 * Generates batch embeddings for an array of texts.
 */
export async function getBatchEmbeddings(texts: string[]): Promise<number[][]> {
  const results: number[][] = [];
  for (const text of texts) {
    const vec = await getEmbedding(text);
    results.push(vec);
  }
  return results;
}

/**
 * Calculates cosine similarity between two float vectors.
 * Returns value between -1.0 and 1.0 (typically 0.0 to 1.0 for normalized embeddings).
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length !== vecB.length || vecA.length === 0) {
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

function createFallbackVector(text: string, dimensions: number): number[] {
  const vector = new Array(dimensions).fill(0);
  const words = text.toLowerCase().match(/\b\w+\b/g) || [];

  function hashStr(str: string): number {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash) + str.charCodeAt(i);
    }
    return Math.abs(hash);
  }

  for (const word of words) {
    const wordIdx = hashStr(word) % dimensions;
    vector[wordIdx] += 1.5;

    // Sub-word 3-grams for morphological/stem matching
    for (let i = 0; i <= word.length - 3; i++) {
      const sub = word.slice(i, i + 3);
      const subIdx = hashStr(sub) % dimensions;
      vector[subIdx] += 0.5;
    }
  }

  // Normalize vector to unit sphere
  let sumSq = 0;
  for (let i = 0; i < dimensions; i++) sumSq += vector[i] * vector[i];
  const mag = Math.sqrt(sumSq) || 1;
  for (let i = 0; i < dimensions; i++) vector[i] = vector[i] / mag;
  return vector;
}

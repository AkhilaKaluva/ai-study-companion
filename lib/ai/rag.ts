// RAG Retrieval Service with Project-Level Data Isolation
import { prisma } from "../db/prisma";
import { getEmbedding, cosineSimilarity } from "./embeddings";

export interface RetrievedChunk {
  materialName: string;
  pageNumber: number;
  content: string;
  similarity: number;
  materialId?: string;
  chunkId?: string;
  pageCount?: number;
}

/**
 * Retrieves the most semantically relevant chunks for a user query strictly within a Project.
 * Implements strict tenant/project isolation.
 */
export async function retrieveProjectContext(
  projectId: string,
  query: string,
  topK: number = 4,
  minThreshold: number = 0.15
): Promise<{ chunks: RetrievedChunk[]; maxSimilarity: number }> {
  // 1. Fetch all material chunks belonging to this project
  const materials = await prisma.material.findMany({
    where: { projectId, status: "READY" },
    include: {
      chunks: true,
    },
  });

  if (!materials || materials.length === 0) {
    return { chunks: [], maxSimilarity: 0 };
  }

  // 2. Generate query embedding
  const queryEmbedding = await getEmbedding(query);

  // 3. Score every chunk in the project
  const scoredChunks: RetrievedChunk[] = [];

  for (const material of materials) {
    for (const chunk of material.chunks) {
      try {
        const chunkEmbedding: number[] = JSON.parse(chunk.embedding);
        const similarity = cosineSimilarity(queryEmbedding, chunkEmbedding);

        scoredChunks.push({
          materialId: material.id,
          chunkId: chunk.id,
          materialName: material.name,
          pageNumber: chunk.pageNumber,
          content: chunk.content,
          similarity,
          pageCount: material.pageCount,
        });
      } catch (err) {
        console.warn(`Failed to parse chunk embedding for chunk ${chunk.id}:`, err);
      }
    }
  }

  // 4. Sort descending by similarity
  scoredChunks.sort((a, b) => b.similarity - a.similarity);

  const maxSimilarity = scoredChunks[0]?.similarity || 0;

  // 5. Filter topK that meet the minimum threshold
  const filtered = scoredChunks
    .filter((chunk) => chunk.similarity >= minThreshold)
    .slice(0, topK);

  return {
    chunks: filtered,
    maxSimilarity,
  };
}

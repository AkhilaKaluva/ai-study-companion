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

export async function retrieveProjectContext(
  projectId: string,
  query: string,
  topK: number = 4,
  minThreshold: number = 0.15
): Promise<{ chunks: RetrievedChunk[]; maxSimilarity: number }> {
  const materials = await prisma.material.findMany({
    where: { projectId, status: "READY" },
    include: {
      chunks: true,
    },
  });

  if (!materials || materials.length === 0) {
    return { chunks: [], maxSimilarity: 0 };
  }

  const queryEmbedding = await getEmbedding(query);

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

  scoredChunks.sort((a, b) => b.similarity - a.similarity);

  const maxSimilarity = scoredChunks[0]?.similarity || 0;

  const filtered = scoredChunks
    .filter((chunk) => chunk.similarity >= minThreshold)
    .slice(0, topK);

  return {
    chunks: filtered,
    maxSimilarity,
  };
}

import { prisma } from "@/lib/db/prisma";
import { parseAndChunkPdf } from "@/lib/pdf/parser";
import { getBatchEmbeddings } from "@/lib/ai/embeddings";
import { extractConceptsFromText } from "@/lib/ai/gemini";
import { after } from "next/server";
import fs from "fs";
import path from "path";

export interface IngestionResult {
  success: boolean;
  pageCount?: number;
  chunkCount?: number;
  conceptsCount?: number;
  aborted?: boolean;
  error?: string;
}

/**
 * Schedules background ingestion for a material using Next.js after() when available,
 * with fallback to asynchronous execution for non-request scopes (e.g. tests or direct scripts).
 */
export function scheduleMaterialIngestion(materialId: string): void {
  try {
    after(async () => {
      await processMaterialIngestion(materialId);
    });
  } catch (err: any) {
    console.warn(
      `[Background Ingestion] 'after()' not available in current execution context (${err?.message}), falling back to asynchronous execution.`
    );
    setImmediate(async () => {
      try {
        await processMaterialIngestion(materialId);
      } catch (fallbackErr) {
        console.error("[Background Ingestion] Fallback background execution error:", fallbackErr);
      }
    });
  }
}

/**
 * Executes the complete PDF knowledge ingestion pipeline in the background:
 * 1. Checks material existence and prevents duplicate runs if already READY.
 * 2. Ensures status is confirmed as PROCESSING.
 * 3. Reads PDF file securely from disk.
 * 4. Extracts text page-by-page preserving page numbers (250 words / 40 overlap).
 * 5. Periodically verifies material hasn't been deleted (race condition prevention).
 * 6. Generates 768-dimensional vector embeddings in batch.
 * 7. Atomically purges partial chunks and persists new page-bounded chunks.
 * 8. Extracts foundational concepts using AI and associates with project.
 * 9. Transitions material status to READY with pageCount and clears error messages.
 * 10. Records MATERIAL_PROCESSED activity event.
 * 11. On any failure, cleans up partial chunks and transitions status to FAILED with a safe message.
 */
export async function processMaterialIngestion(materialId: string): Promise<IngestionResult> {
  console.log(`[Background Ingestion] Starting background ingestion for materialId: ${materialId}`);

  // 1. Fetch material and verify existence
  const material = await prisma.material.findUnique({
    where: { id: materialId },
    include: { project: true },
  });

  if (!material) {
    console.log(`[Background Ingestion] Material ${materialId} not found or was deleted. Aborting.`);
    return { success: false, aborted: true, error: "Material not found or deleted" };
  }

  // Idempotency: skip if already READY
  if (material.status === "READY") {
    console.log(`[Background Ingestion] Material ${materialId} is already READY. Skipping duplicate ingestion.`);
    const chunkCount = await prisma.materialChunk.count({ where: { materialId } });
    return { success: true, pageCount: material.pageCount, chunkCount, conceptsCount: 0 };
  }

  // 2. Ensure status is PROCESSING in DB
  if (material.status !== "PROCESSING") {
    await prisma.material.update({
      where: { id: materialId },
      data: { status: "PROCESSING", errorMessage: null },
    });
  }

  try {
    // 3. Resolve and read PDF file safely
    const relativePath = material.filePath.startsWith("/")
      ? material.filePath.slice(1)
      : material.filePath;
    const resolvedDiskPath = path.resolve(process.cwd(), "public", relativePath);

    if (!fs.existsSync(resolvedDiskPath)) {
      throw new Error("Uploaded PDF file not found on disk.");
    }

    const buffer = fs.readFileSync(resolvedDiskPath);

    // 4. Check deletion race condition before parsing
    const check1 = await prisma.material.findUnique({ where: { id: materialId } });
    if (!check1) {
      console.log(`[Background Ingestion] Material ${materialId} was deleted before parsing. Aborting.`);
      return { success: false, aborted: true };
    }

    // 5. Extract text page-by-page and create chunks (preserving 250 words / 40 overlap)
    const parsed = await parseAndChunkPdf(buffer, 250, 40);

    // 6. Check deletion race condition after parsing
    const check2 = await prisma.material.findUnique({ where: { id: materialId } });
    if (!check2) {
      console.log(`[Background Ingestion] Material ${materialId} was deleted during parsing. Aborting.`);
      return { success: false, aborted: true };
    }

    // 7. Batch compute embeddings (768 dimensions)
    const chunkTexts = parsed.chunks.map((c) => c.content);
    const embeddings = await getBatchEmbeddings(chunkTexts);

    // 8. Check deletion race condition before chunk persistence
    const check3 = await prisma.material.findUnique({ where: { id: materialId } });
    if (!check3) {
      console.log(`[Background Ingestion] Material ${materialId} was deleted before chunk persistence. Aborting.`);
      return { success: false, aborted: true };
    }

    // 9. Clean up any existing chunks for this material (guard against duplicates/retries)
    await prisma.materialChunk.deleteMany({
      where: { materialId: material.id },
    });

    // 10. Persist chunks
    for (let i = 0; i < parsed.chunks.length; i++) {
      const chunk = parsed.chunks[i];
      const emb = embeddings[i] || [];

      // Check existence to handle race condition mid-loop
      const checkLoop = await prisma.material.findUnique({ where: { id: materialId } });
      if (!checkLoop) {
        console.log(`[Background Ingestion] Material ${materialId} was deleted during chunk creation. Aborting.`);
        return { success: false, aborted: true };
      }

      await prisma.materialChunk.create({
        data: {
          materialId: material.id,
          pageNumber: chunk.pageNumber,
          chunkIndex: chunk.chunkIndex,
          content: chunk.content,
          embedding: JSON.stringify(emb),
        },
      });
    }

    // 11. Extract concepts
    const check4 = await prisma.material.findUnique({ where: { id: materialId } });
    if (!check4) {
      console.log(`[Background Ingestion] Material ${materialId} was deleted before concept extraction. Aborting.`);
      return { success: false, aborted: true };
    }

    const extractedConcepts = await extractConceptsFromText(
      parsed.fullText,
      material.project.userId
    );

    for (const c of extractedConcepts) {
      // Check if project still exists
      const proj = await prisma.project.findUnique({ where: { id: material.projectId } });
      if (!proj) break;

      const existing = await prisma.concept.findFirst({
        where: { projectId: material.projectId, name: c.name },
      });

      if (!existing) {
        await prisma.concept.create({
          data: {
            projectId: material.projectId,
            name: c.name,
            description: c.description,
            masteryScore: 0.0,
            status: "NEEDS_ATTENTION",
          },
        });
      }
    }

    // 12. Final check before updating status to READY
    const check5 = await prisma.material.findUnique({ where: { id: materialId } });
    if (!check5) {
      console.log(`[Background Ingestion] Material ${materialId} was deleted before marking READY. Aborting.`);
      return { success: false, aborted: true };
    }

    // Update Material to READY
    await prisma.material.update({
      where: { id: material.id },
      data: {
        status: "READY",
        pageCount: parsed.pageCount,
        errorMessage: null,
      },
    });

    // 13. Log activity event
    await prisma.activityEvent.create({
      data: {
        userId: material.project.userId,
        projectId: material.projectId,
        type: "MATERIAL_PROCESSED",
        description: `Processed "${material.name}" (${parsed.pageCount} pages, ${parsed.chunks.length} chunks, ${extractedConcepts.length} concepts).`,
      },
    });

    console.log(
      `[Background Ingestion] Completed background ingestion for material ${material.id} (${parsed.pageCount} pages, ${parsed.chunks.length} chunks, ${extractedConcepts.length} concepts)`
    );

    return {
      success: true,
      pageCount: parsed.pageCount,
      chunkCount: parsed.chunks.length,
      conceptsCount: extractedConcepts.length,
    };
  } catch (processError: any) {
    console.error(`[Background Ingestion] Ingestion failed for material ${materialId}:`, processError);

    // Safe error handling & cleanup
    try {
      const mat = await prisma.material.findUnique({ where: { id: materialId } });
      if (mat) {
        // Clean up any partially created chunks so data is not left inconsistent
        await prisma.materialChunk.deleteMany({
          where: { materialId },
        });

        // Format user-safe error message without secrets or stack traces
        const rawMsg =
          typeof processError?.message === "string"
            ? processError.message
            : "Failed to parse PDF content.";
        const safeMsg = rawMsg
          .replace(/([a-zA-Z]:\\[^\s]+|\/[^\s]+)/g, "[file]")
          .slice(0, 200);

        await prisma.material.update({
          where: { id: materialId },
          data: {
            status: "FAILED",
            errorMessage: safeMsg || "Failed to parse PDF content.",
          },
        });
      }
    } catch (cleanupErr) {
      console.error(`[Background Ingestion] Failure cleanup error for ${materialId}:`, cleanupErr);
    }

    return {
      success: false,
      error: processError?.message || "Failed to parse PDF content.",
    };
  }
}

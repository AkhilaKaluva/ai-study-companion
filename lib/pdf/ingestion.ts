import { prisma } from "@/lib/db/prisma";
import { parseAndChunkPdf } from "@/lib/pdf/parser";
import { getBatchEmbeddings } from "@/lib/ai/embeddings";
import { extractConceptsFromText } from "@/lib/ai/gemini";
import { readMaterialFile } from "@/lib/storage";
import { after } from "next/server";

export interface IngestionResult {
  success: boolean;
  pageCount?: number;
  chunkCount?: number;
  conceptsCount?: number;
  aborted?: boolean;
  error?: string;
}

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

export async function processMaterialIngestion(materialId: string): Promise<IngestionResult> {
  console.log(`[Background Ingestion] Starting background ingestion for materialId: ${materialId}`);

  const material = await prisma.material.findUnique({
    where: { id: materialId },
    include: { project: true },
  });

  if (!material) {
    console.log(`[Background Ingestion] Material ${materialId} not found or was deleted. Aborting.`);
    return { success: false, aborted: true, error: "Material not found or deleted" };
  }

  if (material.status === "READY") {
    console.log(`[Background Ingestion] Material ${materialId} is already READY. Skipping duplicate ingestion.`);
    const chunkCount = await prisma.materialChunk.count({ where: { materialId } });
    return { success: true, pageCount: material.pageCount, chunkCount, conceptsCount: 0 };
  }

  if (material.status !== "PROCESSING") {
    await prisma.material.update({
      where: { id: materialId },
      data: { status: "PROCESSING", errorMessage: null },
    });
  }

  try {
    const buffer = await readMaterialFile(material.filePath);

    const check1 = await prisma.material.findUnique({ where: { id: materialId } });
    if (!check1) {
      console.log(`[Background Ingestion] Material ${materialId} was deleted before parsing. Aborting.`);
      return { success: false, aborted: true };
    }

    const parsed = await parseAndChunkPdf(buffer, 250, 40);

    const check2 = await prisma.material.findUnique({ where: { id: materialId } });
    if (!check2) {
      console.log(`[Background Ingestion] Material ${materialId} was deleted during parsing. Aborting.`);
      return { success: false, aborted: true };
    }

    const chunkTexts = parsed.chunks.map((c) => c.content);
    const embeddings = await getBatchEmbeddings(chunkTexts);

    const check3 = await prisma.material.findUnique({ where: { id: materialId } });
    if (!check3) {
      console.log(`[Background Ingestion] Material ${materialId} was deleted before chunk persistence. Aborting.`);
      return { success: false, aborted: true };
    }

    await prisma.materialChunk.deleteMany({
      where: { materialId: material.id },
    });

    for (let i = 0; i < parsed.chunks.length; i++) {
      const chunk = parsed.chunks[i];
      const emb = embeddings[i] || [];

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

    const check5 = await prisma.material.findUnique({ where: { id: materialId } });
    if (!check5) {
      console.log(`[Background Ingestion] Material ${materialId} was deleted before marking READY. Aborting.`);
      return { success: false, aborted: true };
    }

    await prisma.material.update({
      where: { id: material.id },
      data: {
        status: "READY",
        pageCount: parsed.pageCount,
        errorMessage: null,
      },
    });

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

    try {
      const mat = await prisma.material.findUnique({ where: { id: materialId } });
      if (mat) {
        await prisma.materialChunk.deleteMany({
          where: { materialId },
        });

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

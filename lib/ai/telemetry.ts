import { prisma } from "../db/prisma";

export interface LogAiCallParams {
  userId?: string;
  projectId?: string;
  feature: "TUTOR_CHAT" | "CONCEPT_EXTRACTION" | "QUIZ_GEN" | "AI_GRADING" | "RECOMMENDATION" | "EVAL" | string;
  model: string;
  latencyMs: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens?: number;
  estimatedCost?: number;
  success?: boolean;
  errorMessage?: string;
}

export async function logAiCall(params: LogAiCallParams) {
  try {
    const promptTokens = params.promptTokens;
    const completionTokens = params.completionTokens;
    const totalTokens = params.totalTokens ?? (promptTokens + completionTokens);

    const promptCost = (promptTokens / 1_000_000) * 0.075;
    const completionCost = (completionTokens / 1_000_000) * 0.3;
    const estimatedCost =
      params.estimatedCost !== undefined
        ? params.estimatedCost
        : parseFloat((promptCost + completionCost).toFixed(7));

    await prisma.aiLog.create({
      data: {
        userId: params.userId || null,
        projectId: params.projectId || null,
        feature: params.feature,
        model: params.model,
        latencyMs: params.latencyMs,
        promptTokens,
        completionTokens,
        totalTokens,
        estimatedCost,
        success: params.success !== false,
        errorMessage: params.errorMessage || null,
      },
    });
  } catch (err) {
    console.error("Failed to record AI telemetry log:", err);
  }
}

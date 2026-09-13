import { prisma } from "../db/prisma";

export type ConceptStatus = "NEEDS_ATTENTION" | "DEVELOPING" | "STRONG";

export function classifyStatus(score: number): ConceptStatus {
  if (score >= 75) return "STRONG";
  if (score >= 50) return "DEVELOPING";
  return "NEEDS_ATTENTION";
}

export interface MasteryUpdateResult {
  conceptId: string;
  conceptName: string;
  previousScore: number;
  newScore: number;
  status: ConceptStatus;
  trend: "Improving" | "Declining" | "Stable";
}

export async function updateConceptMastery(params: {
  conceptId: string;
  userId: string;
  projectId: string;
  performancePercentage: number;
  reason: "QUIZ_MCQ" | "OPEN_ENDED_ASSESSMENT";
}): Promise<MasteryUpdateResult | null> {
  const { conceptId, userId, projectId, performancePercentage, reason } = params;

  const concept = await prisma.concept.findUnique({
    where: { id: conceptId },
  });

  if (!concept) return null;

  const previousScore = concept.masteryScore;
  const newScore = parseFloat(
    (previousScore * 0.4 + performancePercentage * 0.6).toFixed(1)
  );
  const status = classifyStatus(newScore);

  let trend: "Improving" | "Declining" | "Stable" = "Stable";
  if (newScore > previousScore + 2) trend = "Improving";
  else if (newScore < previousScore - 2) trend = "Declining";

  await prisma.concept.update({
    where: { id: conceptId },
    data: {
      masteryScore: newScore,
      status,
    },
  });

  await prisma.masteryHistory.create({
    data: {
      conceptId: concept.id,
      userId,
      score: newScore,
      previousScore,
      delta: parseFloat((newScore - previousScore).toFixed(1)),
      reason,
    },
  });

  await prisma.activityEvent.create({
    data: {
      userId,
      projectId,
      type: "MASTERY_UPDATED",
      description: `Mastery for "${concept.name}" updated to ${newScore}% (${status}).`,
    },
  });

  let recText = "";
  if (newScore < 50) {
    recText = `Your understanding of ${concept.name} is at ${Math.round(
      newScore
    )}%. Review the relevant study materials and take a targeted quiz.`;
  } else if (newScore < 75) {
    recText = `Good progress on ${concept.name} (${Math.round(
      newScore
    )}%). Continue practicing with adaptive assessments to reach strong mastery.`;
  } else {
    recText = `You have achieved strong mastery in ${concept.name} (${Math.round(
      newScore
    )}%). Advance to review subsequent topics or test comprehensive edge cases.`;
  }

  await prisma.recommendation.updateMany({
    where: { projectId, status: "ACTIVE" },
    data: { status: "COMPLETED" },
  });

  await prisma.recommendation.create({
    data: {
      projectId,
      conceptId: concept.id,
      text: recText,
      status: "ACTIVE",
    },
  });

  return {
    conceptId: concept.id,
    conceptName: concept.name,
    previousScore,
    newScore,
    status,
    trend,
  };
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { gradeOpenEndedAnswer, generateNextRecommendation } from "@/lib/ai/gemini";
import { updateConceptMastery } from "@/lib/mastery/engine";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { quizId, answers } = body;

    if (!quizId || !Array.isArray(answers)) {
      return NextResponse.json({ error: "Missing quizId or answers array" }, { status: 400 });
    }

    // 1. Fetch Quiz, Questions, and Project
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        project: {
          include: {
            concepts: true,
          },
        },
        questions: {
          include: {
            concept: true,
          },
        },
      },
    });

    if (!quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    // Verify ownership
    if (user.role !== "admin" && quiz.project.userId !== user.id) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    // 2. Evaluate answers
    const evaluationResults: Array<{
      questionId: string;
      conceptId: string;
      conceptName: string;
      type: string;
      userAnswer: string;
      isCorrect: boolean;
      score: number;
      feedback: string;
      strengths?: string[];
      weaknesses?: string[];
      correctAnswer?: string | null;
    }> = [];

    let totalScoreSum = 0;
    const conceptScores: Record<string, { scores: number[]; reason: "QUIZ_MCQ" | "OPEN_ENDED_ASSESSMENT" }> = {};

    for (const ans of answers) {
      const question = quiz.questions.find((q) => q.id === ans.questionId);
      if (!question) continue;

      let isCorrect = false;
      let score = 0;
      let feedback = "";
      let strengths: string[] = [];
      let weaknesses: string[] = [];

      if (question.type === "MCQ") {
        isCorrect =
          ans.answer?.trim().toLowerCase() === question.correctAnswer?.trim().toLowerCase();
        score = isCorrect ? 100 : 0;
        feedback = isCorrect
          ? "Correct! You successfully identified the accurate principle."
          : `Incorrect. The correct answer was: "${question.correctAnswer}".`;

        if (!conceptScores[question.conceptId]) {
          conceptScores[question.conceptId] = { scores: [], reason: "QUIZ_MCQ" };
        }
        conceptScores[question.conceptId].scores.push(score);
      } else {
        // Open-ended grading via AI
        const grading = await gradeOpenEndedAnswer({
          prompt: question.prompt,
          studentAnswer: ans.answer || "(No response provided)",
          rubric: question.rubric || undefined,
          userId: user.id,
        });

        score = grading.score;
        isCorrect = score >= 70;
        feedback = grading.feedback;
        strengths = grading.keyConceptsCovered || [];
        weaknesses = grading.missingConcepts || [];

        if (!conceptScores[question.conceptId]) {
          conceptScores[question.conceptId] = { scores: [], reason: "OPEN_ENDED_ASSESSMENT" };
        }
        conceptScores[question.conceptId].scores.push(score);

        // Store separate AssessmentAttempt
        await prisma.assessmentAttempt.create({
          data: {
            projectId: quiz.projectId,
            userId: user.id,
            conceptId: question.conceptId,
            prompt: question.prompt,
            studentAnswer: ans.answer || "",
            score,
            feedback,
            strengths: JSON.stringify(strengths),
            weaknesses: JSON.stringify(weaknesses),
          },
        });
      }

      totalScoreSum += score;

      evaluationResults.push({
        questionId: question.id,
        conceptId: question.conceptId,
        conceptName: question.concept.name,
        type: question.type,
        userAnswer: ans.answer,
        isCorrect,
        score,
        feedback,
        strengths,
        weaknesses,
        correctAnswer: question.correctAnswer,
      });
    }

    const overallScore =
      evaluationResults.length > 0
        ? Math.round(totalScoreSum / evaluationResults.length)
        : 0;

    // 3. Update concept mastery scores using Mastery Engine
    const masteryUpdates = [];
    for (const [conceptId, info] of Object.entries(conceptScores)) {
      const avgPerformance = info.scores.reduce((a, b) => a + b, 0) / info.scores.length;
      const result = await updateConceptMastery({
        conceptId,
        userId: user.id,
        projectId: quiz.projectId,
        performancePercentage: avgPerformance,
        reason: info.reason,
      });
      if (result) masteryUpdates.push(result);
    }

    // 4. Save QuizAttempt with user linkage
    const attempt = await prisma.quizAttempt.create({
      data: {
        quizId,
        userId: user.id,
        score: overallScore,
        answers: JSON.stringify(evaluationResults),
      },
    });

    // 5. Track QUIZ_COMPLETED activity event
    await prisma.activityEvent.create({
      data: {
        userId: user.id,
        projectId: quiz.projectId,
        type: "QUIZ_COMPLETED",
        description: `Completed adaptive quiz with an overall score of ${overallScore}%.`,
      },
    });

    // 6. Fetch updated recommendation
    const activeRec = await prisma.recommendation.findFirst({
      where: { projectId: quiz.projectId, status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      attemptId: attempt.id,
      overallScore,
      evaluations: evaluationResults,
      masteryUpdates,
      recommendation: activeRec?.text || "Keep up the practice!",
    });
  } catch (err: any) {
    console.error("POST /api/quiz/submit error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

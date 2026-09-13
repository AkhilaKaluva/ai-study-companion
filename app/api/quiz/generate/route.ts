import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { generateTargetedQuiz } from "@/lib/ai/gemini";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { projectId } = body;

    if (!projectId) {
      return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
    }

    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        ...(user.role === "admin" ? {} : { userId: user.id }),
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const concepts = await prisma.concept.findMany({
      where: { projectId },
      orderBy: { masteryScore: "asc" },
      take: 4,
    });

    if (concepts.length === 0) {
      return NextResponse.json(
        { error: "No concepts found for this project yet. Please upload a study document first." },
        { status: 400 }
      );
    }

    const sampleChunks = await prisma.materialChunk.findMany({
      where: { material: { projectId, status: "READY" } },
      take: 6,
      select: { content: true },
    });

    const contextText = sampleChunks.map((c) => c.content).join("\n\n");

    const generatedQuestions = await generateTargetedQuiz({
      concepts,
      contextText,
      userId: user.id,
    });

    const quiz = await prisma.quiz.create({
      data: {
        projectId,
        title: `Adaptive Diagnostic Assessment (${new Date().toLocaleDateString()})`,
        questions: {
          create: generatedQuestions.map((q) => ({
            conceptId: q.conceptId,
            type: q.type,
            prompt: q.prompt,
            options: q.options ? JSON.stringify(q.options) : null,
            correctAnswer: q.correctAnswer || null,
            rubric: q.rubric || null,
          })),
        },
      },
      include: {
        questions: {
          include: {
            concept: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    const clientQuestions = quiz.questions.map((q) => ({
      id: q.id,
      conceptId: q.conceptId,
      conceptName: q.concept.name,
      type: q.type,
      prompt: q.prompt,
      options: q.options ? JSON.parse(q.options) : null,
    }));

    return NextResponse.json({
      quizId: quiz.id,
      title: quiz.title,
      questions: clientQuestions,
    });
  } catch (err: any) {
    console.error("POST /api/quiz/generate error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

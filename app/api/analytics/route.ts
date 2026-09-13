import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    if (projectId) {
      const project = await prisma.project.findFirst({
        where: {
          id: projectId,
          ...(user.role === "admin" ? {} : { userId: user.id }),
        },
        include: {
          materials: {
            include: {
              chunks: true,
            },
          },
          concepts: true,
          quizzes: {
            include: {
              attempts: true,
            },
          },
          conversations: {
            include: {
              messages: true,
            },
          },
          assessments: true,
          activities: {
            orderBy: { createdAt: "desc" },
            take: 10,
          },
        },
      });

      if (!project) {
        return NextResponse.json({ error: "Project not found" }, { status: 404 });
      }

      const totalPages = project.materials.reduce((sum, m) => sum + m.pageCount, 0);
      const totalChunks = project.materials.reduce((sum, m) => sum + m.chunks.length, 0);
      const allAttempts = project.quizzes.flatMap((q) => q.attempts);
      const avgQuizScore =
        allAttempts.length > 0
          ? Math.round(allAttempts.reduce((sum, a) => sum + a.score, 0) / allAttempts.length)
          : 0;

      const tutorMessages = project.conversations.flatMap((c) =>
        c.messages.filter((m) => m.role === "user")
      );

      const avgMastery =
        project.concepts.length > 0
          ? Math.round(
              project.concepts.reduce((sum, c) => sum + c.masteryScore, 0) /
                project.concepts.length
            )
          : 0;

      return NextResponse.json({
        metrics: {
          materialsCount: project.materials.length,
          pagesProcessed: totalPages,
          chunksCount: totalChunks,
          conceptsCount: project.concepts.length,
          overallMastery: avgMastery,
          quizAttemptsCount: allAttempts.length,
          avgQuizScore,
          tutorQuestionsCount: tutorMessages.length,
          assessmentsCount: project.assessments.length,
        },
        concepts: project.concepts,
        recentActivity: project.activities,
      });
    }

    const spaces = await prisma.space.findMany({
      where: { userId: user.id },
      include: {
        projects: {
          include: {
            concepts: true,
            materials: true,
            quizzes: {
              include: { attempts: true },
            },
            conversations: {
              include: { messages: true },
            },
          },
        },
      },
    });

    const allProjects = spaces.flatMap((s) => s.projects);
    const allConcepts = allProjects.flatMap((p) => p.concepts);
    const allAttempts = allProjects.flatMap((p) => p.quizzes.flatMap((q) => q.attempts));
    const allTutorMessages = allProjects.flatMap((p) =>
      p.conversations.flatMap((c) => c.messages.filter((m) => m.role === "user"))
    );

    const totalPages = allProjects.reduce(
      (sum, p) => sum + p.materials.reduce((mSum, m) => mSum + m.pageCount, 0),
      0
    );

    const avgMastery =
      allConcepts.length > 0
        ? Math.round(allConcepts.reduce((sum, c) => sum + c.masteryScore, 0) / allConcepts.length)
        : 0;

    const avgQuizScore =
      allAttempts.length > 0
        ? Math.round(allAttempts.reduce((sum, a) => sum + a.score, 0) / allAttempts.length)
        : 0;

    return NextResponse.json({
      global: {
        spacesCount: spaces.length,
        projectsCount: allProjects.length,
        materialsCount: allProjects.reduce((s, p) => s + p.materials.length, 0),
        pagesProcessed: totalPages,
        conceptsCount: allConcepts.length,
        overallMastery: avgMastery,
        quizAttemptsCount: allAttempts.length,
        avgQuizScore,
        tutorQuestionsCount: allTutorMessages.length,
      },
      concepts: allConcepts,
    });
  } catch (err: any) {
    console.error("GET /api/analytics error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

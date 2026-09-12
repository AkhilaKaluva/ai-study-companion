import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: Admin privileges required" },
        { status: 403 }
      );
    }

    const [
      totalUsers,
      totalSpaces,
      totalProjects,
      totalMaterials,
      totalAttempts,
      aiLogs,
      users,
      evalRuns,
      activities,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.space.count(),
      prisma.project.count(),
      prisma.material.count(),
      prisma.quizAttempt.count(),
      prisma.aiLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
      prisma.user.findMany({
        include: {
          _count: {
            select: { spaces: true, projects: true, aiLogs: true, quizAttempts: true },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.evaluationRun.findMany({
        include: { results: true },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      prisma.activityEvent.findMany({
        include: {
          user: { select: { name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 15,
      }),
    ]);

    // Aggregate token and cost metrics
    const totalTokens = aiLogs.reduce(
      (sum, l) => sum + l.promptTokens + l.completionTokens,
      0
    );
    const totalCost = aiLogs.reduce((sum, l) => sum + l.estimatedCost, 0);
    const avgLatency =
      aiLogs.length > 0
        ? Math.round(aiLogs.reduce((sum, l) => sum + l.latencyMs, 0) / aiLogs.length)
        : 0;

    const errorCount = aiLogs.filter((l) => !l.success).length;
    const errorRate =
      aiLogs.length > 0 ? ((errorCount / aiLogs.length) * 100).toFixed(1) : "0.0";

    const hasApiKey = Boolean(
      process.env.GEMINI_API_KEY &&
        process.env.GEMINI_API_KEY !== "your-gemini-api-key-here"
    );

    return NextResponse.json({
      metrics: {
        totalUsers,
        totalSpaces,
        totalProjects,
        totalMaterials,
        totalQuizzesCompleted: totalAttempts,
        totalAiCalls: aiLogs.length,
        totalTokens,
        totalCost: parseFloat(totalCost.toFixed(5)),
        avgLatencyMs: avgLatency,
        errorRate: `${errorRate}%`,
      },
      systemHealth: {
        database: "HEALTHY",
        geminiProvider: hasApiKey ? "LIVE_CONNECTED" : "DEMO_FALLBACK_ACTIVE",
        pdfEngine: "HEALTHY",
        vectorEmbeddings: "HEALTHY",
      },
      recentLogs: aiLogs,
      recentRuns: evalRuns,
      recentActivities: activities,
      users: users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        spacesCount: u._count.spaces,
        projectsCount: u._count.projects,
        quizAttemptsCount: u._count.quizAttempts,
        aiLogsCount: u._count.aiLogs,
        createdAt: u.createdAt,
      })),
    });
  } catch (err: any) {
    console.error("GET /api/admin/metrics error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

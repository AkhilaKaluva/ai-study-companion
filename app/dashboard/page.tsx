import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { MasteryBar } from "@/components/mastery-bar";
import {
  Sparkles,
  Layers,
  FolderKanban,
  BookOpen,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  Clock,
  Plus,
  Compass,
  FileUp,
  MessageSquare,
  HelpCircle,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role === "admin") {
    redirect("/admin");
  }

  const spaces = await prisma.space.findMany({
    where: { userId: user.id },
    include: {
      projects: {
        include: {
          concepts: true,
          materials: true,
          recommendations: {
            where: { status: "ACTIVE" },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
        orderBy: { updatedAt: "desc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const activities = await prisma.activityEvent.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 6,
  });

  const totalQuizAttempts = await prisma.quizAttempt.count({
    where: { userId: user.id },
  });

  const allProjects = spaces.flatMap((s) => s.projects);
  const allConcepts = allProjects.flatMap((p) => p.concepts);

  const weakConcepts = allConcepts
    .filter((c) => c.masteryScore < 50 || c.status === "NEEDS_ATTENTION")
    .slice(0, 4);

  const overallAvgMastery =
    allConcepts.length > 0
      ? Math.round(allConcepts.reduce((acc, c) => acc + c.masteryScore, 0) / allConcepts.length)
      : 0;

  const activeRecommendation =
    allProjects.find((p) => p.recommendations.length > 0)?.recommendations[0] || null;
  const recommendedProject = activeRecommendation
    ? allProjects.find((p) => p.id === activeRecommendation.projectId)
    : allProjects[0] || null;

  if (spaces.length === 0 && allProjects.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 md:p-12 transition-colors">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-6">
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">
              Welcome to AI Study Companion, {user.name}
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Your personalized workspace for grounded learning, AI tutoring, and concept mastery.
            </p>
          </div>

          <div className="rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 sm:p-12 text-center space-y-6">
            <div className="h-16 w-16 mx-auto rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-xs">
              <Compass className="h-8 w-8" />
            </div>

            <div className="space-y-2 max-w-md mx-auto">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Start your learning journey
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                Organize your study domains into <strong>Spaces</strong>, add focused <strong>Projects</strong>, and upload course materials to unlock the grounded AI Tutor.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link
                href="/spaces"
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-5 py-2.5 text-sm shadow-sm transition"
              >
                <Plus className="h-4 w-4" /> Create Your First Space
              </Link>
              <Link
                href="/#how-it-works"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold px-5 py-2.5 text-sm transition"
              >
                Explore How It Works
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-16 transition-colors">
      <div className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 transition-colors">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 px-3 py-1 text-xs font-semibold text-indigo-700 dark:text-indigo-300 mb-2">
                <Sparkles className="h-3.5 w-3.5" />
                Student Learning Workspace
              </div>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                Welcome back, {user.name}
              </h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Track your active learning journey, practice targeted assessments, and advance concept mastery.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <Link
                href="/spaces"
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-3.5 py-2 text-xs font-semibold shadow-2xs transition"
              >
                <Layers className="h-3.5 w-3.5 text-slate-400" />
                Spaces
              </Link>
              <Link
                href="/projects"
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 text-xs font-semibold shadow-sm transition"
              >
                <FolderKanban className="h-3.5 w-3.5" />
                All Projects
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        {activeRecommendation && (
          <div className="rounded-2xl border border-indigo-200 dark:border-indigo-900/60 bg-gradient-to-r from-indigo-50/90 via-white to-purple-50/70 dark:from-indigo-950/40 dark:via-slate-900 dark:to-purple-950/30 p-5 sm:p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
                  <Sparkles className="h-4 w-4" />
                  Recommended Next Step
                </div>
                <p className="text-sm sm:text-base font-semibold text-slate-800 dark:text-slate-200 leading-snug">
                  {activeRecommendation.text}
                </p>
              </div>

              {recommendedProject && (
                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href={`/project/${recommendedProject.id}/quiz`}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2 text-xs shadow-xs transition"
                  >
                    Take Adaptive Quiz <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                  <Link
                    href={`/project/${recommendedProject.id}/tutor`}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold px-3 py-2 text-xs shadow-2xs transition"
                  >
                    Ask Tutor
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Overall Mastery</div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
                {overallAvgMastery}%
              </span>
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-0.5">
                <TrendingUp className="h-3.5 w-3.5" /> Dynamic
              </span>
            </div>
            <div className="mt-1 text-xs text-slate-400">Across {allConcepts.length} tracked concepts</div>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Focused Projects</div>
            <div className="mt-2 text-3xl font-extrabold text-slate-900 dark:text-white">
              {allProjects.length}
            </div>
            <div className="mt-1 text-xs text-slate-400">In {spaces.length} learning spaces</div>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Quizzes Completed</div>
            <div className="mt-2 text-3xl font-extrabold text-slate-900 dark:text-white">
              {totalQuizAttempts}
            </div>
            <div className="mt-1 text-xs text-slate-400">Adaptive assessments evaluated</div>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Learning Activity</div>
            <div className="mt-2 text-3xl font-extrabold text-slate-900 dark:text-white">
              {activities.length}
            </div>
            <div className="mt-1 text-xs text-slate-400">Events tracked this period</div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Continue Learning</h2>
              <Link
                href="/projects"
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
              >
                View all projects <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="space-y-3">
              {allProjects.map((project) => {
                const avgProjMastery =
                  project.concepts.length > 0
                    ? Math.round(
                        project.concepts.reduce((a, b) => a + b.masteryScore, 0) /
                          project.concepts.length
                      )
                    : 0;

                return (
                  <div
                    key={project.id}
                    className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs hover:border-indigo-400 dark:hover:border-indigo-600 transition"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <Link
                          href={`/project/${project.id}`}
                          className="font-bold text-base text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition"
                        >
                          {project.name}
                        </Link>
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                          {project.learningGoal}
                        </p>
                        <div className="flex items-center gap-3 pt-2 text-xs text-slate-400">
                          <span>{project.materials.length} Materials</span>
                          <span>&bull;</span>
                          <span>{project.concepts.length} Concepts</span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                          {avgProjMastery}%
                        </span>
                        <div className="mt-1 h-2 w-24 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                          <div
                            className="h-full bg-indigo-600 rounded-full"
                            style={{ width: `${avgProjMastery}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/project/${project.id}/tutor`}
                          className="rounded-lg bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800/80 px-2.5 py-1 text-xs font-semibold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900 transition"
                        >
                          AI Tutor
                        </Link>
                        <Link
                          href={`/project/${project.id}/quiz`}
                          className="rounded-lg bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                        >
                          Take Quiz
                        </Link>
                      </div>

                      <Link
                        href={`/project/${project.id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        Workspace <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-3">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-500" />
                Areas Needing Attention
              </h2>

              {weakConcepts.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 text-center shadow-xs">
                  <CheckCircle2 className="mx-auto h-7 w-7 text-emerald-500" />
                  <p className="mt-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
                    All concepts in strong standing
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    No concepts currently below 50% mastery.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {weakConcepts.map((concept) => (
                    <MasteryBar
                      key={concept.id}
                      name={concept.name}
                      description={concept.description}
                      score={concept.masteryScore}
                      status={concept.status}
                      showDetails={false}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Clock className="h-4 w-4 text-slate-400" />
                Recent Activity
              </h2>

              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs divide-y divide-slate-100 dark:divide-slate-800">
                {activities.length === 0 ? (
                  <p className="text-xs text-slate-400 py-3 text-center">No recent activity recorded.</p>
                ) : (
                  activities.map((act) => (
                    <div key={act.id} className="py-2.5 first:pt-0 last:pb-0">
                      <p className="text-xs font-medium text-slate-800 dark:text-slate-200">
                        {act.description}
                      </p>
                      <span className="text-[10px] text-slate-400">
                        {new Date(act.createdAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

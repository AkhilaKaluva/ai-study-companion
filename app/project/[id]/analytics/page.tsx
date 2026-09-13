"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BarChart3,
  BookOpen,
  FileText,
  BrainCircuit,
  TrendingUp,
  HelpCircle,
  MessageSquare,
  Loader2,
  Award,
  Layers,
} from "lucide-react";

export default function ProjectAnalyticsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const projectId = resolvedParams.id;

  const [data, setData] = useState<any>(null);
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const [projRes, analyticsRes] = await Promise.all([
          fetch(`/api/projects?projectId=${projectId}`),
          fetch(`/api/analytics?projectId=${projectId}`),
        ]);

        if (projRes.ok) {
          const pData = await projRes.json();
          setProject(pData.project);
        }

        if (analyticsRes.ok) {
          const aData = await analyticsRes.json();
          setData(aData);
        }
      } catch (err) {
        console.error("Failed to load analytics:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [projectId]);

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600 dark:text-indigo-400" />
      </div>
    );
  }

  const m = data?.metrics || {
    materialsCount: 0,
    pagesProcessed: 0,
    chunksCount: 0,
    conceptsCount: 0,
    overallMastery: 0,
    quizAttemptsCount: 0,
    avgQuizScore: 0,
    tutorQuestionsCount: 0,
    assessmentsCount: 0,
  };

  const concepts = data?.concepts || [];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20 transition-colors">
      <div className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-4 sm:px-6">
        <div className="mx-auto max-w-5xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href={`/project/${projectId}`}
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-white transition"
              title="Back to Project"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-slate-900 dark:text-white text-base">
                  Project Learning Analytics
                </h1>
                <span className="rounded-md bg-blue-50 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 px-2 py-0.5 text-[10px] font-bold uppercase">
                  Telemetry Scoped
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-md">
                Project: {project?.name}
              </p>
            </div>
          </div>

          <Link
            href={`/project/${projectId}/growth`}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-3 py-1.5 text-xs font-semibold shadow-2xs transition"
          >
            <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
            Growth View
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 space-y-8">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Overall Mastery</div>
            <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              {m.overallMastery}%
            </div>
            <div className="mt-1 text-[11px] text-slate-400">Across {m.conceptsCount} concepts</div>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Pages Processed</div>
            <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              {m.pagesProcessed}
            </div>
            <div className="mt-1 text-[11px] text-slate-400">{m.chunksCount} vectorized chunks</div>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Avg Quiz Score</div>
            <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              {m.avgQuizScore}%
            </div>
            <div className="mt-1 text-[11px] text-slate-400">{m.quizAttemptsCount} attempts recorded</div>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Tutor Questions</div>
            <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              {m.tutorQuestionsCount}
            </div>
            <div className="mt-1 text-[11px] text-slate-400">Grounded Q&amp;A sessions</div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-xs space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BrainCircuit className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              Concept Mastery Breakdown
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Granular evaluation of each concept identified in this project&apos;s learning materials.
            </p>
          </div>

          {concepts.length === 0 ? (
            <p className="text-xs text-slate-400">No concepts identified yet.</p>
          ) : (
            <div className="space-y-4">
              {concepts.map((c: any) => (
                <div key={c.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {c.name}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">{c.status}</span>
                      <span className="font-extrabold text-slate-900 dark:text-white">
                        {Math.round(c.masteryScore)}%
                      </span>
                    </div>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        c.masteryScore >= 75
                          ? "bg-emerald-500"
                          : c.masteryScore >= 50
                          ? "bg-indigo-600 dark:bg-indigo-500"
                          : "bg-amber-500"
                      }`}
                      style={{ width: `${Math.round(c.masteryScore)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-xs space-y-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Award className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            Recent Project Activity Events
          </h3>

          {data?.recentActivity?.length === 0 ? (
            <p className="text-xs text-slate-400">No activity events recorded yet.</p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {data?.recentActivity?.map((act: any) => (
                <div key={act.id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                      {act.description}
                    </p>
                    <span className="text-[10px] text-slate-400">Event: {act.type}</span>
                  </div>
                  <span className="text-slate-400 text-[11px]">
                    {new Date(act.createdAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

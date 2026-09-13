"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  Activity,
  Cpu,
  Users,
  Database,
  Loader2,
  RefreshCw,
  Sparkles,
  Layers,
  FolderKanban,
  BookOpen,
  HelpCircle,
  Coins,
  CheckCircle2,
  ArrowRight,
  AlertTriangle,
} from "lucide-react";

export default function AdminOverviewPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = async () => {
    try {
      const res = await fetch("/api/admin/metrics");
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (res.status === 403) {
        setError("Admin privileges required. Please sign in with an admin account.");
        return;
      }
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      console.error(err);
      setError("Failed to load platform metrics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600 dark:text-purple-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
        <div className="w-full max-w-md rounded-3xl border border-red-200 dark:border-red-900/50 bg-white dark:bg-slate-900 p-8 text-center shadow-lg space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 dark:bg-red-950 text-red-600 mb-2">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Access Denied</h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">{error}</p>
          <div className="pt-2 flex flex-col gap-2">
            <Link
              href="/login"
              className="w-full rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2.5 text-xs transition"
            >
              Sign In as Admin
            </Link>
            <Link
              href="/dashboard"
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            >
              Return to Student Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const m = data?.metrics || {};
  const health = data?.systemHealth || {};
  const activities = data?.recentActivities || [];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20 transition-colors">
      <div className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                <ShieldCheck className="h-4 w-4" /> Platform Administration
              </div>
              <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                Platform Overview
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Cross-tenant platform observability, AI usage telemetry, system health, and learner operations.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={fetchMetrics}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition shadow-2xs"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Refresh
              </button>

              <Link
                href="/admin/evaluation"
                className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white px-3.5 py-2 text-xs font-semibold shadow-xs transition"
              >
                <Sparkles className="h-3.5 w-3.5" /> Run Benchmark
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 text-xs font-semibold">
          <span className="text-slate-400 uppercase tracking-wider text-[10px]">
            System Diagnostics:
          </span>

          <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-3 py-1 rounded-full">
            <Database className="h-3.5 w-3.5" /> Database: {health.database || "HEALTHY"}
          </div>

          <div className="flex items-center gap-1.5 text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 px-3 py-1 rounded-full">
            <Cpu className="h-3.5 w-3.5" /> Gemini API: {health.geminiProvider || "ACTIVE"}
          </div>

          <div className="flex items-center gap-1.5 text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 px-3 py-1 rounded-full">
            <Activity className="h-3.5 w-3.5" /> PDF Pipeline: {health.pdfEngine || "HEALTHY"}
          </div>

          <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 px-3 py-1 rounded-full">
            <Sparkles className="h-3.5 w-3.5" /> Vector Engine: {health.vectorEmbeddings || "HEALTHY"}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
            <div className="text-xs text-slate-500 dark:text-slate-400">Total Users</div>
            <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              {m.totalUsers}
            </div>
            <div className="mt-1 text-[10px] text-slate-400">Students &amp; Admins</div>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
            <div className="text-xs text-slate-500 dark:text-slate-400">Spaces</div>
            <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              {m.totalSpaces}
            </div>
            <div className="mt-1 text-[10px] text-slate-400">Domain domains</div>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
            <div className="text-xs text-slate-500 dark:text-slate-400">Projects</div>
            <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              {m.totalProjects}
            </div>
            <div className="mt-1 text-[10px] text-slate-400">Learning journeys</div>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
            <div className="text-xs text-slate-500 dark:text-slate-400">Materials</div>
            <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              {m.totalMaterials}
            </div>
            <div className="mt-1 text-[10px] text-slate-400">PDFs processed</div>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
            <div className="text-xs text-slate-500 dark:text-slate-400">Quizzes Evaluated</div>
            <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              {m.totalQuizzesCompleted}
            </div>
            <div className="mt-1 text-[10px] text-slate-400">Adaptive tests</div>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
            <div className="text-xs text-slate-500 dark:text-slate-400">Estimated AI Cost</div>
            <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
              ${m.totalCost?.toFixed(5) || "0.00000"}
            </div>
            <div className="mt-1 text-[10px] text-slate-400">{m.totalTokens} tokens</div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href="/admin/users"
            className="group rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs hover:border-purple-400 dark:hover:border-purple-600 transition"
          >
            <div className="flex items-center justify-between">
              <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              <ArrowRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 transition" />
            </div>
            <h3 className="mt-3 font-bold text-sm text-slate-900 dark:text-white">User Directory</h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Inspect registered learners, their spaces, projects, and activities.
            </p>
          </Link>

          <Link
            href="/admin/analytics"
            className="group rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs hover:border-purple-400 dark:hover:border-purple-600 transition"
          >
            <div className="flex items-center justify-between">
              <Activity className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              <ArrowRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 transition" />
            </div>
            <h3 className="mt-3 font-bold text-sm text-slate-900 dark:text-white">Global Analytics</h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Platform-wide learning engagement, quiz accuracies, and struggle points.
            </p>
          </Link>

          <Link
            href="/admin/ai-usage"
            className="group rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs hover:border-purple-400 dark:hover:border-purple-600 transition"
          >
            <div className="flex items-center justify-between">
              <Cpu className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <ArrowRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 transition" />
            </div>
            <h3 className="mt-3 font-bold text-sm text-slate-900 dark:text-white">AI Telemetry &amp; Cost</h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Inspect request latencies, token consumption, and model pricing breakdown.
            </p>
          </Link>

          <Link
            href="/admin/evaluation"
            className="group rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs hover:border-purple-400 dark:hover:border-purple-600 transition"
          >
            <div className="flex items-center justify-between">
              <Sparkles className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <ArrowRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 transition" />
            </div>
            <h3 className="mt-3 font-bold text-sm text-slate-900 dark:text-white">Regression Benchmark</h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Run automated AI regression tests on grounding, refusal, and rubrics.
            </p>
          </Link>
        </div>

        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Activity className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              Platform-Wide Activity Stream
            </h3>
            <span className="text-xs text-slate-400">Real-time audit log</span>
          </div>

          {activities.length === 0 ? (
            <p className="text-xs text-slate-400">No activity events recorded yet.</p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {activities.map((act: any) => (
                <div key={act.id} className="py-3 flex items-center justify-between text-xs">
                  <div className="space-y-0.5">
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                      {act.description}
                    </p>
                    <div className="text-[11px] text-slate-400 flex items-center gap-2">
                      <span>User: {act.user?.name || "System"}</span>
                      <span>&bull;</span>
                      <span>Event: {act.type}</span>
                    </div>
                  </div>
                  <span className="text-slate-400 text-[11px] shrink-0">
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

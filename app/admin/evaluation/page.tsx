"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Sparkles,
  PlayCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  History,
  ShieldCheck,
  RotateCcw,
} from "lucide-react";

export default function AdminEvaluationPage() {
  const [evaluating, setEvaluating] = useState(false);
  const [evalResults, setEvalResults] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const fetchHistory = async () => {
    try {
      const res = await fetch("/api/admin/metrics");
      if (res.ok) {
        const data = await res.json();
        setHistory(data.recentRuns || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const runBenchmark = async () => {
    setEvaluating(true);
    try {
      const res = await fetch("/api/eval/run", { method: "POST" });
      const json = await res.json();
      setEvalResults(json);
      fetchHistory(); // Refresh history table
    } catch (err) {
      console.error(err);
    } finally {
      setEvaluating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20 transition-colors">
      <div className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <Link
            href="/admin"
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white mb-3 transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Admin Overview
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                <Sparkles className="h-4 w-4" /> AI Safety &amp; Quality
              </div>
              <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                Regression Benchmark Suite
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                1-Click automated test runner evaluating Grounded Q&amp;A, Citation Accuracy, Unsupported Refusal, Adaptive Quiz Gen, and Rubric Grading.
              </p>
            </div>

            <button
              type="button"
              disabled={evaluating}
              onClick={runBenchmark}
              className="inline-flex items-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-5 py-2.5 text-xs font-semibold shadow-xs transition self-start sm:self-auto"
            >
              {evaluating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Running Benchmark Suite...
                </>
              ) : (
                <>
                  <PlayCircle className="h-4 w-4" />
                  Run Regression Benchmark
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        {/* Active Test Run Outcome */}
        {evalResults && (
          <div className="rounded-3xl border border-purple-200 dark:border-purple-900/60 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                  Execution Complete
                </span>
                <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-0.5">
                  Outcome: {evalResults.passedCount} of {evalResults.totalTests} Tests Passed
                </h2>
              </div>

              <div className="flex items-center gap-3">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    evalResults.passedCount === evalResults.totalTests
                      ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300"
                      : "bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300"
                  }`}
                >
                  {evalResults.overallStatus}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {evalResults.totalDurationMs} ms
                </span>
              </div>
            </div>

            {/* Individual Test Cases */}
            <div className="space-y-3">
              {evalResults.results?.map((t: any) => (
                <div
                  key={t.id}
                  className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950 p-4 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {t.status === "PASS" ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <XCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                      )}
                      <span className="font-bold text-slate-900 dark:text-white">{t.testName}</span>
                      <span className="rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                        {t.category}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-mono text-slate-400">{t.latencyMs} ms</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          t.status === "PASS"
                            ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                            : "bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300"
                        }`}
                      >
                        {t.status}
                      </span>
                    </div>
                  </div>

                  <p className="text-slate-600 dark:text-slate-400 pl-6 leading-relaxed">
                    {t.details}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Historical Regression Benchmark Runs */}
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <History className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              Historical Benchmark Runs
            </h3>
            <span className="text-xs text-slate-400">Persisted in database</span>
          </div>

          {loadingHistory ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
            </div>
          ) : history.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">
              No previous benchmark runs found. Click &ldquo;Run Regression Benchmark&rdquo; to execute the suite.
            </p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {history.map((run) => (
                <div key={run.id} className="py-3.5 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-slate-800 dark:text-slate-200">{run.name}</div>
                    <span className="text-[11px] text-slate-400">
                      Duration: {run.durationMs}ms &bull;{" "}
                      {new Date(run.createdAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        run.passCount === run.totalCount
                          ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300"
                          : "bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300"
                      }`}
                    >
                      {run.passCount}/{run.totalCount} Passed
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

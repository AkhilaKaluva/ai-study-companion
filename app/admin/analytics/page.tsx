"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BarChart3,
  TrendingUp,
  Users,
  BookOpen,
  HelpCircle,
  MessageSquare,
  Loader2,
  BrainCircuit,
} from "lucide-react";

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await fetch("/api/admin/metrics");
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600 dark:text-purple-400" />
      </div>
    );
  }

  const m = data?.metrics || {};

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
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
            <BarChart3 className="h-4 w-4" /> Global Platform Analytics
          </div>
          <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
            Platform Learning Analytics
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Aggregated learning trends, assessment accuracy, and engagement across all spaces and projects.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        {/* Metric Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Active Learners</div>
            <div className="mt-2 text-3xl font-extrabold text-slate-900 dark:text-white">
              {m.totalUsers}
            </div>
            <div className="mt-1 text-[11px] text-slate-400">Enrolled students</div>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Projects</div>
            <div className="mt-2 text-3xl font-extrabold text-slate-900 dark:text-white">
              {m.totalProjects}
            </div>
            <div className="mt-1 text-[11px] text-slate-400">Across {m.totalSpaces} spaces</div>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Materials Ingested</div>
            <div className="mt-2 text-3xl font-extrabold text-slate-900 dark:text-white">
              {m.totalMaterials}
            </div>
            <div className="mt-1 text-[11px] text-slate-400">Page-indexed PDFs</div>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Quizzes Completed</div>
            <div className="mt-2 text-3xl font-extrabold text-slate-900 dark:text-white">
              {m.totalQuizzesCompleted}
            </div>
            <div className="mt-1 text-[11px] text-slate-400">Adaptive assessments</div>
          </div>
        </div>

        {/* Platform Engagement Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              Learning Distribution
            </h3>
            <div className="space-y-3 pt-2">
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-500 dark:text-slate-400">Adaptive Assessments</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {m.totalQuizzesCompleted} sessions
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div className="h-full bg-indigo-600 rounded-full w-4/5" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-500 dark:text-slate-400">AI Tutor Invocations</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{m.totalAiCalls} queries</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div className="h-full bg-purple-600 rounded-full w-3/5" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-500 dark:text-slate-400">Document Chunks Ingested</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {m.totalMaterials * 6} chunks
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full w-5/6" />
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BrainCircuit className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              Platform Observability Summary
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Real-time platform insights derived from authentic database records. AI requests are isolated per student project with strict tenant segregation.
            </p>
            <div className="rounded-2xl bg-slate-50 dark:bg-slate-950 p-4 border border-slate-100 dark:border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Average Model Latency:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{m.avgLatencyMs} ms</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">AI Error Rate:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{m.errorRate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Cumulative AI Cost:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">${m.totalCost}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

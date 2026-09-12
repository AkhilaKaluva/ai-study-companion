"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  TrendingUp,
  Award,
  AlertCircle,
  Clock,
  HelpCircle,
  Loader2,
  Calendar,
  CheckCircle2,
  BarChart2,
} from "lucide-react";
import { MasteryBar } from "@/components/mastery-bar";

export default function GrowthPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const projectId = resolvedParams.id;

  const [project, setProject] = useState<any>(null);
  const [masteryHistory, setMasteryHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGrowthData = async () => {
      try {
        const res = await fetch(`/api/projects?projectId=${projectId}`);
        if (res.ok) {
          const data = await res.json();
          setProject(data.project);
        }

        // Fetch concept mastery history
        const histRes = await fetch(`/api/mastery?projectId=${projectId}`);
        if (histRes.ok) {
          const histData = await histRes.json();
          setMasteryHistory(histData.history || []);
        }
      } catch (err) {
        console.error("Failed to load growth data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchGrowthData();
  }, [projectId]);

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600 dark:text-indigo-400" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-20 text-center text-slate-800 dark:text-white">
        Project not found.
      </div>
    );
  }

  const concepts = project.concepts || [];
  // Sort strongest vs weakest
  const sortedConcepts = [...concepts].sort((a, b) => b.masteryScore - a.masteryScore);
  const strongest = sortedConcepts.slice(0, 3);
  const weakest = [...sortedConcepts].reverse().slice(0, 3);

  // Quiz history
  const quizAttempts = project.quizzes?.flatMap((q: any) => q.attempts || []) || [];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20 transition-colors">
      {/* Top Header */}
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
                  Growth &amp; Mastery Analysis
                </h1>
                <span className="rounded-md bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 text-[10px] font-bold uppercase">
                  Longitudinal
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-md">
                Project: {project.name}
              </p>
            </div>
          </div>

          <Link
            href={`/project/${projectId}/quiz`}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-1.5 text-xs font-semibold shadow-xs transition"
          >
            <HelpCircle className="h-3.5 w-3.5" />
            Take Diagnostic Quiz
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 space-y-8">
        {/* Strongest vs Weakest Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Strongest Concepts */}
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
              <Award className="h-5 w-5" /> Strongest Concepts
            </div>
            {strongest.length === 0 ? (
              <p className="text-xs text-slate-400">No concepts evaluated yet.</p>
            ) : (
              <div className="space-y-3">
                {strongest.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950"
                  >
                    <div>
                      <span className="font-semibold text-xs text-slate-800 dark:text-slate-200">
                        {c.name}
                      </span>
                      <div className="text-[10px] text-slate-400">{c.status}</div>
                    </div>
                    <span className="font-extrabold text-sm text-emerald-600 dark:text-emerald-400">
                      {Math.round(c.masteryScore)}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Weakest Concepts */}
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-amber-500 font-bold text-sm">
              <AlertCircle className="h-5 w-5" /> Concepts Requiring Attention
            </div>
            {weakest.length === 0 ? (
              <p className="text-xs text-slate-400">All concepts currently stable.</p>
            ) : (
              <div className="space-y-3">
                {weakest.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950"
                  >
                    <div>
                      <span className="font-semibold text-xs text-slate-800 dark:text-slate-200">
                        {c.name}
                      </span>
                      <div className="text-[10px] text-slate-400">{c.status}</div>
                    </div>
                    <span className="font-extrabold text-sm text-amber-600 dark:text-amber-400">
                      {Math.round(c.masteryScore)}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Longitudinal Mastery History Table / Feed */}
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                Concept Evolution Timeline
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Mathematical trajectory of concept score adjustments over time.
              </p>
            </div>
          </div>

          {masteryHistory.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-8 text-center text-xs text-slate-500 dark:text-slate-400 space-y-2">
              <BarChart2 className="h-8 w-8 text-slate-400 mx-auto" />
              <p className="font-semibold text-slate-700 dark:text-slate-300">
                Complete more assessments to unlock your growth trend.
              </p>
              <p className="text-[11px]">
                As you take adaptive quizzes and answer open-ended questions, your mathematical growth trajectory will appear here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {masteryHistory.map((h) => (
                <div key={h.id} className="py-3 flex items-center justify-between text-xs">
                  <div className="space-y-0.5">
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {h.concept?.name || "Concept"}
                    </span>
                    <div className="text-[11px] text-slate-400 flex items-center gap-2">
                      <span>Reason: {h.reason}</span>
                      <span>&bull;</span>
                      <span>
                        {new Date(h.createdAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-slate-400">{h.previousScore}% &rarr;</span>
                    <span className="font-bold text-slate-900 dark:text-white">{h.score}%</span>
                    <span
                      className={`font-bold px-2 py-0.5 rounded-md text-[10px] ${
                        h.delta >= 0
                          ? "bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                          : "bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                      }`}
                    >
                      {h.delta >= 0 ? `+${h.delta}%` : `${h.delta}%`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Quiz Scores */}
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-xs space-y-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            Recent Assessment Scores
          </h3>

          {quizAttempts.length === 0 ? (
            <p className="text-xs text-slate-400">No quizzes completed yet in this project.</p>
          ) : (
            <div className="space-y-2">
              {quizAttempts.map((attempt: any) => (
                <div
                  key={attempt.id}
                  className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950 text-xs"
                >
                  <div className="space-y-0.5">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      Adaptive Assessment
                    </span>
                    <div className="text-[11px] text-slate-400">
                      {new Date(attempt.createdAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                      {Math.round(attempt.score)}%
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

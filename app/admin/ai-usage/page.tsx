"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Cpu,
  Coins,
  Clock,
  Activity,
  CheckCircle2,
  XCircle,
  Loader2,
  Filter,
} from "lucide-react";

export default function AdminAiUsagePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedFeature, setSelectedFeature] = useState<string>("ALL");

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
  const logs = data?.recentLogs || [];

  const filteredLogs =
    selectedFeature === "ALL"
      ? logs
      : logs.filter((l: any) => l.feature === selectedFeature);

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
            <Cpu className="h-4 w-4" /> AI Observability &amp; Cost
          </div>
          <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
            AI Telemetry &amp; Token Consumption
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Fine-grained telemetry capturing model latency, prompt/completion token volumes, and estimated API spend.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Total AI Requests</div>
            <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              {m.totalAiCalls}
            </div>
            <div className="mt-1 text-[11px] text-slate-400">Across all platform users</div>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Cumulative Tokens</div>
            <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              {m.totalTokens}
            </div>
            <div className="mt-1 text-[11px] text-slate-400">Prompt &amp; completion tokens</div>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Avg Model Latency</div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                {m.avgLatencyMs}
              </span>
              <span className="text-xs text-slate-400">ms</span>
            </div>
            <div className="mt-1 text-[11px] text-slate-400">Roundtrip inference duration</div>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Estimated AI Cost</div>
            <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
              ${m.totalCost?.toFixed(5)}
            </div>
            <div className="mt-1 text-[11px] text-slate-400">Configured model pricing</div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-xs font-semibold text-slate-400 flex items-center gap-1 shrink-0">
            <Filter className="h-3.5 w-3.5" /> Filter Feature:
          </span>
          {["ALL", "TUTOR_CHAT", "CONCEPT_EXTRACTION", "QUIZ_GEN", "AI_GRADING", "EVAL"].map(
            (feat) => (
              <button
                key={feat}
                onClick={() => setSelectedFeature(feat)}
                className={`rounded-lg px-3 py-1 text-xs font-medium transition shrink-0 ${
                  selectedFeature === feat
                    ? "bg-purple-600 text-white"
                    : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                {feat}
              </button>
            )
          )}
        </div>

        {/* Telemetry Trace Table */}
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
          <div className="border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              AI Request Tracing Stream ({filteredLogs.length})
            </h3>
            <span className="text-xs text-slate-400">Showing recent executions</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-3.5">Feature</th>
                  <th className="px-6 py-3.5">Model</th>
                  <th className="px-6 py-3.5">Latency</th>
                  <th className="px-6 py-3.5">Input Tokens</th>
                  <th className="px-6 py-3.5">Output Tokens</th>
                  <th className="px-6 py-3.5">Est. Cost</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-slate-400">
                      No matching AI telemetry logs recorded.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log: any) => (
                    <tr
                      key={log.id}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition"
                    >
                      <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">
                        {log.feature}
                      </td>
                      <td className="px-6 py-4 font-mono text-slate-500 dark:text-slate-400 text-[11px]">
                        {log.model}
                      </td>
                      <td className="px-6 py-4 font-mono">{log.latencyMs}ms</td>
                      <td className="px-6 py-4 font-mono">{log.promptTokens}</td>
                      <td className="px-6 py-4 font-mono">{log.completionTokens}</td>
                      <td className="px-6 py-4 font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                        ${log.estimatedCost?.toFixed(6)}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            log.success
                              ? "bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                              : "bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                          }`}
                        >
                          {log.success ? (
                            <CheckCircle2 className="h-3 w-3" />
                          ) : (
                            <XCircle className="h-3 w-3" />
                          )}
                          {log.success ? "SUCCESS" : "FAILED"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-400">
                        {new Date(log.createdAt).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

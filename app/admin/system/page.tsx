"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Activity,
  Database,
  Cpu,
  FileText,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Loader2,
} from "lucide-react";

export default function AdminSystemHealthPage() {
  const [checks, setChecks] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchHealth = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/system");
      if (res.ok) {
        const json = await res.json();
        setChecks(json.checks);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "HEALTHY":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-3 py-1 text-xs font-bold">
            <CheckCircle2 className="h-3.5 w-3.5" /> Healthy
          </span>
        );
      case "WARNING":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 px-3 py-1 text-xs font-bold">
            <AlertTriangle className="h-3.5 w-3.5" /> Warning / Resilient Mode
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 px-3 py-1 text-xs font-bold">
            <XCircle className="h-3.5 w-3.5" /> Unavailable
          </span>
        );
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
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                <Activity className="h-4 w-4" /> Operational Diagnostics
              </div>
              <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                System Health &amp; Subsystems
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Real-time health verification across Database, AI provider, PDF extraction, and Vector Embeddings.
              </p>
            </div>

            <button
              onClick={fetchHealth}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition shadow-2xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Run Diagnostics
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        {loading && !checks ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-purple-600 dark:text-purple-400" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 font-bold text-slate-900 dark:text-white text-base">
                  <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                    <Database className="h-5 w-5" />
                  </div>
                  <span>Database Layer (SQLite / Prisma)</span>
                </div>
                {getStatusBadge(checks?.database?.status || "HEALTHY")}
              </div>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {checks?.database?.message}
              </p>
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-400 flex items-center justify-between">
                <span>Response latency</span>
                <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                  {checks?.database?.latencyMs} ms
                </span>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 font-bold text-slate-900 dark:text-white text-base">
                  <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400">
                    <Cpu className="h-5 w-5" />
                  </div>
                  <span>AI Engine (Google Gemini)</span>
                </div>
                {getStatusBadge(checks?.geminiProvider?.status || "HEALTHY")}
              </div>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {checks?.geminiProvider?.message}
              </p>
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-400 flex items-center justify-between">
                <span>Active Mode</span>
                <span className="font-semibold text-purple-600 dark:text-purple-400">
                  {checks?.geminiProvider?.mode}
                </span>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 font-bold text-slate-900 dark:text-white text-base">
                  <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
                    <FileText className="h-5 w-5" />
                  </div>
                  <span>PDF Ingestion Pipeline</span>
                </div>
                {getStatusBadge(checks?.pdfEngine?.status || "HEALTHY")}
              </div>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {checks?.pdfEngine?.message}
              </p>
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-400 flex items-center justify-between">
                <span>Parser Architecture</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Page-Bounded Extraction
                </span>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 font-bold text-slate-900 dark:text-white text-base">
                  <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <span>Vector Embedding Service</span>
                </div>
                {getStatusBadge(checks?.vectorEmbeddings?.status || "HEALTHY")}
              </div>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {checks?.vectorEmbeddings?.message}
              </p>
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-400 flex items-center justify-between">
                <span>Embedding Vector Dimensions</span>
                <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                  {checks?.vectorEmbeddings?.dimensions || 768} dims
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

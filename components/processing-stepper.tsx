import React from "react";
import { CheckCircle, Clock, Loader2, XCircle } from "lucide-react";

export type IngestionStep =
  | "UPLOADING"
  | "QUEUED"
  | "EXTRACTING_TEXT"
  | "CREATING_CHUNKS"
  | "GENERATING_EMBEDDINGS"
  | "IDENTIFYING_CONCEPTS"
  | "PROCESSING"
  | "EXTRACTING"
  | "READY"
  | "FAILED";

interface ProcessingStepperProps {
  status: IngestionStep | string;
  pageCount?: number;
  errorMessage?: string;
}

export function ProcessingStepper({ status, pageCount, errorMessage }: ProcessingStepperProps) {
  const steps = [
    { key: "UPLOADING", label: "Uploading PDF" },
    { key: "EXTRACTING_TEXT", label: "Extracting page-aware text" },
    { key: "CREATING_CHUNKS", label: "Creating knowledge chunks" },
    { key: "GENERATING_EMBEDDINGS", label: "Generating vector embeddings" },
    { key: "IDENTIFYING_CONCEPTS", label: "Identifying core concepts" },
    { key: "READY", label: "Knowledge base ready" },
  ];

  const getStepState = (stepKey: string) => {
    if (status === "FAILED") return "failed";
    if (status === "READY") return "completed";

    const currentNormalized =
      status === "QUEUED"
        ? "UPLOADING"
        : status === "PROCESSING"
        ? "EXTRACTING_TEXT"
        : status === "EXTRACTING"
        ? "GENERATING_EMBEDDINGS"
        : status;

    const order = [
      "UPLOADING",
      "EXTRACTING_TEXT",
      "CREATING_CHUNKS",
      "GENERATING_EMBEDDINGS",
      "IDENTIFYING_CONCEPTS",
      "READY",
    ];

    const currentIndex = order.indexOf(currentNormalized);
    const stepIndex = order.indexOf(stepKey);

    if (currentIndex === -1) {
      return stepIndex === 0 ? "active" : "pending";
    }

    if (stepIndex < currentIndex) return "completed";
    if (stepIndex === currentIndex) return "active";
    return "pending";
  };

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/70 p-4 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          6-Stage PDF Knowledge Ingestion Pipeline
        </h4>
        {pageCount ? (
          <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 px-2.5 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
            {pageCount} Pages Processed
          </span>
        ) : null}
      </div>

      <div className="space-y-2">
        {steps.map((s, idx) => {
          const state = getStepState(s.key);

          return (
            <div key={s.key} className="flex items-center gap-2.5 text-xs">
              {state === "completed" && (
                <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              )}
              {state === "active" && (
                <Loader2 className="h-4 w-4 text-indigo-600 dark:text-indigo-400 animate-spin shrink-0" />
              )}
              {state === "pending" && (
                <Clock className="h-4 w-4 text-slate-300 dark:text-slate-600 shrink-0" />
              )}
              {state === "failed" && (
                <XCircle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0" />
              )}

              <span
                className={`font-medium ${
                  state === "completed"
                    ? "text-slate-800 dark:text-slate-200"
                    : state === "active"
                    ? "text-indigo-700 dark:text-indigo-400 font-semibold"
                    : state === "failed"
                    ? "text-rose-600 dark:text-rose-400"
                    : "text-slate-400 dark:text-slate-500"
                }`}
              >
                {idx + 1}. {s.label}
              </span>
            </div>
          );
        })}
      </div>

      {status === "FAILED" && errorMessage && (
        <div className="mt-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 p-2.5 text-xs text-rose-700 dark:text-rose-300">
          <strong>Processing Error:</strong> {errorMessage}
        </div>
      )}
    </div>
  );
}

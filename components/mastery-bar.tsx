import React from "react";
import { AlertCircle, CheckCircle2, TrendingUp } from "lucide-react";

interface MasteryBarProps {
  name: string;
  description?: string;
  score: number;
  status: "NEEDS_ATTENTION" | "DEVELOPING" | "STRONG" | "STABLE" | "MASTERED" | string;
  showDetails?: boolean;
}

export function MasteryBar({ name, description, score, status, showDetails = true }: MasteryBarProps) {
  const roundedScore = Math.min(100, Math.max(0, Math.round(score)));

  let colorClass = "bg-amber-500";
  let badgeClass = "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800";
  let label = "Needs Attention";
  let Icon = AlertCircle;

  if (roundedScore >= 75 || status === "STRONG" || status === "MASTERED") {
    colorClass = "bg-emerald-500";
    badgeClass = "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
    label = "Strong";
    Icon = CheckCircle2;
  } else if (roundedScore >= 50 || status === "DEVELOPING" || status === "STABLE") {
    colorClass = "bg-indigo-600 dark:bg-indigo-500";
    badgeClass = "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800";
    label = "Developing";
    Icon = TrendingUp;
  }

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-0.5">
          <h4 className="font-semibold text-slate-900 dark:text-white text-sm">{name}</h4>
          {showDetails && description && (
            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{description}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{roundedScore}%</span>
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${badgeClass}`}
          >
            <Icon className="h-3 w-3" />
            {label}
          </span>
        </div>
      </div>

      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div
          className={`h-full transition-all duration-500 rounded-full ${colorClass}`}
          style={{ width: `${roundedScore}%` }}
        />
      </div>
    </div>
  );
}

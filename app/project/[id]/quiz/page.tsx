"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Sparkles,
  HelpCircle,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Loader2,
  AlertCircle,
  RotateCcw,
  BookOpen,
  ArrowRight,
  Send,
  MessageSquare,
} from "lucide-react";

interface Question {
  id: string;
  conceptId: string;
  conceptName: string;
  type: "MCQ" | "OPEN_ENDED";
  prompt: string;
  options?: string[];
}

export default function QuizPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const projectId = resolvedParams.id;

  const [project, setProject] = useState<any>(null);
  const [quizId, setQuizId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loadingQuiz, setLoadingQuiz] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generateQuiz = async () => {
    setLoadingQuiz(true);
    setResults(null);
    setAnswers({});
    setError(null);

    try {
      const projRes = await fetch(`/api/projects?projectId=${projectId}`);
      if (projRes.ok) {
        const projData = await projRes.json();
        setProject(projData.project);
      }

      const res = await fetch("/api/quiz/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to generate quiz");
      }

      setQuizId(data.quizId);
      setQuestions(data.questions || []);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load quiz.");
    } finally {
      setLoadingQuiz(false);
    }
  };

  useEffect(() => {
    generateQuiz();
  }, [projectId]);

  const handleSelectOption = (questionId: string, option: string) => {
    if (results) return;
    setAnswers((prev) => ({ ...prev, [questionId]: option }));
  };

  const handleTextAnswer = (questionId: string, text: string) => {
    if (results) return;
    setAnswers((prev) => ({ ...prev, [questionId]: text }));
  };

  const handleSubmitQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quizId || submitting) return;

    const unanswered = questions.some((q) => !answers[q.id] || answers[q.id].trim() === "");
    if (unanswered) {
      if (!confirm("You have unanswered questions. Do you still want to submit?")) {
        return;
      }
    }

    setSubmitting(true);
    setError(null);

    const payloadAnswers = questions.map((q) => ({
      questionId: q.id,
      answer: answers[q.id] || "",
    }));

    try {
      const res = await fetch("/api/quiz/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quizId,
          answers: payloadAnswers,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to evaluate quiz");
      }

      setResults(data);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
      setError(err.message || "Submission failed.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingQuiz) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-6 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600 dark:text-indigo-400" />
        <div className="text-center space-y-1">
          <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">
            Synthesizing Adaptive Diagnostic Quiz
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Targeting demonstrated weak concepts using grounded project knowledge...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20 transition-colors">
      <div className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-4 sm:px-6">
        <div className="mx-auto max-w-4xl flex items-center justify-between">
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
                  Adaptive Diagnostic Assessment
                </h1>
                <span className="rounded-md bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 text-[10px] font-bold uppercase">
                  Adaptive AI
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-md">
                {project?.name} &bull; 2 Multiple Choice + 1 Open-Ended AI-Graded Question
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={generateQuiz}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-3 py-1.5 text-xs font-semibold shadow-2xs transition"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            New Quiz
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 space-y-6">
        {error && (
          <div className="rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/40 p-4 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {results && (
          <div className="rounded-3xl border border-indigo-200 dark:border-indigo-900/60 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-md space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  Assessment Completed
                </span>
                <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">
                  Overall Score: {results.overallScore}%
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Your concept mastery levels have been mathematically updated based on this evidence.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={generateQuiz}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2.5 text-xs shadow-xs transition"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Take Another Quiz
                </button>
                <Link
                  href={`/project/${projectId}`}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold px-3.5 py-2.5 text-xs shadow-2xs transition"
                >
                  Workspace
                </Link>
              </div>
            </div>

            {results.recommendation && (
              <div className="rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/80 p-4 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-indigo-700 dark:text-indigo-300">
                  <Sparkles className="h-4 w-4" /> Next Recommended Action:
                </div>
                <p className="text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                  {results.recommendation}
                </p>
              </div>
            )}

            {results.masteryUpdates && results.masteryUpdates.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                  Concept Mastery Evolution:
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {results.masteryUpdates.map((m: any) => (
                    <div
                      key={m.conceptId}
                      className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between font-semibold text-slate-900 dark:text-white">
                        <span>{m.conceptName}</span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            m.trend === "Improving"
                              ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                              : "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          {m.trend}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[11px]">
                        <span>Previous: {m.previousScore}%</span>
                        <span className="font-bold text-indigo-600 dark:text-indigo-400">
                          Current: {m.newScore}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmitQuiz} className="space-y-6">
          {questions.map((q, idx) => {
            const evalResult = results?.evaluations?.find((e: any) => e.questionId === q.id);

            return (
              <div
                key={q.id}
                className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-xs space-y-4 transition-colors"
              >
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold text-xs">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      Target Concept:{" "}
                      <strong className="text-slate-800 dark:text-slate-200">{q.conceptName}</strong>
                    </span>
                  </div>

                  <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                    {q.type === "MCQ" ? "Multiple Choice" : "Open-Ended (AI Graded)"}
                  </span>
                </div>

                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-snug">
                  {q.prompt}
                </h3>

                {q.type === "MCQ" && q.options && (
                  <div className="space-y-2 pt-2">
                    {q.options.map((opt, optIdx) => {
                      const isSelected = answers[q.id] === opt;
                      const isSubmitted = !!results;
                      const isCorrectAnswer =
                        evalResult && evalResult.correctAnswer?.toLowerCase() === opt.toLowerCase();

                      let optionStyle =
                        "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-800";

                      if (isSelected) {
                        optionStyle =
                          "border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/50 text-indigo-900 dark:text-indigo-200 ring-1 ring-indigo-500";
                      }

                      if (isSubmitted) {
                        if (isCorrectAnswer) {
                          optionStyle =
                            "border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 ring-1 ring-emerald-500 font-semibold";
                        } else if (isSelected && !evalResult.isCorrect) {
                          optionStyle =
                            "border-red-500 bg-red-50/70 dark:bg-red-950/60 text-red-900 dark:text-red-200 ring-1 ring-red-500";
                        }
                      }

                      return (
                        <button
                          key={optIdx}
                          type="button"
                          disabled={isSubmitted}
                          onClick={() => handleSelectOption(q.id, opt)}
                          className={`w-full text-left rounded-2xl border p-4 text-xs sm:text-sm transition flex items-start gap-3 ${optionStyle}`}
                        >
                          <div className="flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 dark:border-slate-700 text-xs font-bold shrink-0 mt-0.5">
                            {String.fromCharCode(65 + optIdx)}
                          </div>
                          <span className="flex-1 leading-relaxed">{opt}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {q.type === "OPEN_ENDED" && (
                  <div className="pt-2 space-y-2">
                    <textarea
                      rows={4}
                      disabled={!!results}
                      value={answers[q.id] || ""}
                      onChange={(e) => handleTextAnswer(q.id, e.target.value)}
                      placeholder="Explain in your own words based on your understanding of the study material..."
                      className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition disabled:opacity-80"
                    />
                    <div className="text-[11px] text-slate-400">
                      Evaluated using rubric criteria and project evidence by Google Gemini AI.
                    </div>
                  </div>
                )}

                {evalResult && (
                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {evalResult.isCorrect ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 px-2.5 py-0.5 text-xs font-bold">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Correct / Mastered
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 px-2.5 py-0.5 text-xs font-bold">
                            <XCircle className="h-3.5 w-3.5" /> Needs Practice ({evalResult.score}%)
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-bold text-slate-500">
                        Score: {evalResult.score}/100
                      </span>
                    </div>

                    <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800 leading-relaxed">
                      {evalResult.feedback}
                    </p>

                    {evalResult.strengths && evalResult.strengths.length > 0 && (
                      <div className="text-xs space-y-1">
                        <strong className="text-emerald-600 dark:text-emerald-400">What you did well:</strong>
                        <ul className="list-disc list-inside text-slate-600 dark:text-slate-400">
                          {evalResult.strengths.map((s: string, i: number) => (
                            <li key={i}>{s}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {evalResult.weaknesses && evalResult.weaknesses.length > 0 && (
                      <div className="text-xs space-y-1">
                        <strong className="text-amber-600 dark:text-amber-400">Areas to improve:</strong>
                        <ul className="list-disc list-inside text-slate-600 dark:text-slate-400">
                          {evalResult.weaknesses.map((w: string, i: number) => (
                            <li key={i}>{w}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {!results && (
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-3.5 text-sm shadow-sm transition disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Evaluating With AI Rubric...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" /> Submit Assessment
                  </>
                )}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

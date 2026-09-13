"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sparkles, LogIn, AlertCircle, ArrowRight, KeyRound, Mail } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Invalid email or password.");
        setLoading(false);
        return;
      }

      window.dispatchEvent(new Event("auth_state_changed"));

      router.push(data.redirectTo || "/dashboard");
      router.refresh();
    } catch (err: any) {
      setError("An unexpected network error occurred. Please try again.");
      setLoading(false);
    }
  };

  const fillDemoAccount = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50 dark:bg-slate-950 transition-colors">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-500/20">
            <Sparkles className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Welcome back
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Sign in to continue your personalized learning journey
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-sm">
          {error && (
            <div className="mb-5 flex items-center gap-2 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/40 p-3 text-xs text-red-700 dark:text-red-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex@demo.edu"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 pl-9 pr-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Password
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 pl-9 pr-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold py-2.5 text-sm shadow-xs transition"
            >
              {loading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <>
                  <LogIn className="h-4 w-4" /> Log In
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">
            Don&apos;t have an account?{" "}
            <Link
              href="/signup"
              className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Sign Up
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-900/40 p-4 text-xs space-y-2">
          <div className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <span>Course Evaluator Demo Accounts:</span>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={() => fillDemoAccount("alex@demo.edu", "student123")}
              className="text-left rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 hover:border-indigo-400 transition"
            >
              <div className="font-semibold text-indigo-600 dark:text-indigo-400">Alex (Student)</div>
              <div className="text-[11px] text-slate-400">alex@demo.edu</div>
              <div className="text-[10px] text-slate-400">pwd: student123</div>
            </button>

            <button
              type="button"
              onClick={() => fillDemoAccount("admin@demo.edu", "admin123")}
              className="text-left rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 hover:border-purple-400 transition"
            >
              <div className="font-semibold text-purple-600 dark:text-purple-400">Dr. Vance (Admin)</div>
              <div className="text-[11px] text-slate-400">admin@demo.edu</div>
              <div className="text-[10px] text-slate-400">pwd: admin123</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

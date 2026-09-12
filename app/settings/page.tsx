"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  Mail,
  Shield,
  Sun,
  Moon,
  Monitor,
  LogOut,
  Loader2,
  Check,
  Sparkles,
} from "lucide-react";
import { useTheme } from "@/components/theme-provider";

export default function SettingsPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMe = async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        } else {
          router.push("/login");
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchMe();
  }, [router]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      window.dispatchEvent(new Event("auth_state_changed"));
      router.push("/");
      router.refresh();
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600 dark:text-indigo-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20 transition-colors">
      <div className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            <Sparkles className="h-4 w-4" /> Preferences &amp; Profile
          </div>
          <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
            Account Settings
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Manage your profile, theme mode, and authentication session.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 space-y-6">
        {/* Profile Card */}
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-xs space-y-6">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <User className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            User Profile
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950 p-4 space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">Full Name</span>
              <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">{user?.name}</p>
            </div>

            <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950 p-4 space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">Email</span>
              <p className="font-bold text-slate-800 dark:text-slate-200 text-sm truncate">
                {user?.email}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950 p-4 space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">Assigned Role</span>
              <div>
                <span
                  className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold uppercase ${
                    user?.role === "admin"
                      ? "bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300"
                      : "bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300"
                  }`}
                >
                  {user?.role}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Theme Preferences */}
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sun className="h-5 w-5 text-amber-500" />
              Interface Theme
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Select your visual preference. Persists across refresh, browser sessions, and pages.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Light Mode */}
            <button
              type="button"
              onClick={() => setTheme("light")}
              className={`rounded-2xl border p-4 text-left transition flex items-center justify-between ${
                theme === "light"
                  ? "border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 ring-1 ring-indigo-600"
                  : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
            >
              <div className="flex items-center gap-3">
                <Sun className="h-5 w-5 text-amber-500" />
                <div>
                  <div className="font-bold text-xs">Light Mode</div>
                  <div className="text-[11px] text-slate-400">Crisp white &amp; high contrast</div>
                </div>
              </div>
              {theme === "light" && <Check className="h-4 w-4 text-indigo-600" />}
            </button>

            {/* Dark Mode */}
            <button
              type="button"
              onClick={() => setTheme("dark")}
              className={`rounded-2xl border p-4 text-left transition flex items-center justify-between ${
                theme === "dark"
                  ? "border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 ring-1 ring-indigo-600"
                  : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
            >
              <div className="flex items-center gap-3">
                <Moon className="h-5 w-5 text-indigo-400" />
                <div>
                  <div className="font-bold text-xs">Dark Mode</div>
                  <div className="text-[11px] text-slate-400">Deep slate &amp; easy on eyes</div>
                </div>
              </div>
              {theme === "dark" && <Check className="h-4 w-4 text-indigo-600" />}
            </button>

            {/* System Mode */}
            <button
              type="button"
              onClick={() => setTheme("system")}
              className={`rounded-2xl border p-4 text-left transition flex items-center justify-between ${
                theme === "system"
                  ? "border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 ring-1 ring-indigo-600"
                  : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
            >
              <div className="flex items-center gap-3">
                <Monitor className="h-5 w-5 text-slate-500" />
                <div>
                  <div className="font-bold text-xs">System Preference</div>
                  <div className="text-[11px] text-slate-400">Sync with OS appearance</div>
                </div>
              </div>
              {theme === "system" && <Check className="h-4 w-4 text-indigo-600" />}
            </button>
          </div>
        </div>

        {/* Session / Logout */}
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Active Session</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                You are currently logged in with a cryptographically secure HTTP-only cookie.
              </p>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 text-xs font-semibold shadow-xs transition"
            >
              <LogOut className="h-4 w-4" />
              Sign Out Of Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

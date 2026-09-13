"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  Sparkles,
  Layers,
  LayoutDashboard,
  ShieldCheck,
  LogOut,
  LogIn,
  User,
  Menu,
  X,
  FolderKanban,
  Settings,
  Users,
  BarChart3,
  Cpu,
  Activity,
  CheckCircle,
} from "lucide-react";
import { ThemeToggle } from "./theme-toggle";

interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: "student" | "admin";
}

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const fetchSession = async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.user);
      } else {
        setCurrentUser(null);
      }
    } catch {
      setCurrentUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();
    const handleAuthChange = () => fetchSession();
    window.addEventListener("auth_state_changed", handleAuthChange);
    return () => window.removeEventListener("auth_state_changed", handleAuthChange);
  }, [pathname]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setCurrentUser(null);
      window.dispatchEvent(new Event("auth_state_changed"));
      router.push("/");
      router.refresh();
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  const isPublicPage = pathname === "/" || pathname === "/login" || pathname === "/signup";

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md transition-colors">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6">
          <Link
            href={currentUser ? (currentUser.role === "admin" ? "/admin" : "/dashboard") : "/"}
            className="flex items-center gap-2.5 font-bold text-lg text-slate-900 dark:text-white group"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition">
              <Sparkles className="h-5 w-5" />
            </div>
            <span className="tracking-tight">
              AI Study <span className="text-indigo-600 dark:text-indigo-400">Companion</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
            {currentUser && currentUser.role === "student" && (
              <>
                <Link
                  href="/dashboard"
                  className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5 ${
                    pathname === "/dashboard"
                      ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold"
                      : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </Link>
                <Link
                  href="/spaces"
                  className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5 ${
                    pathname?.startsWith("/spaces")
                      ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold"
                      : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <Layers className="h-4 w-4" />
                  Spaces
                </Link>
                <Link
                  href="/projects"
                  className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5 ${
                    pathname?.startsWith("/projects") || pathname?.startsWith("/project/")
                      ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold"
                      : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <FolderKanban className="h-4 w-4" />
                  Projects
                </Link>
              </>
            )}

            {currentUser && currentUser.role === "admin" && (
              <>
                <Link
                  href="/admin"
                  className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5 ${
                    pathname === "/admin"
                      ? "bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-semibold"
                      : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <ShieldCheck className="h-4 w-4" />
                  Overview
                </Link>
                <Link
                  href="/admin/users"
                  className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5 ${
                    pathname?.startsWith("/admin/users")
                      ? "bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-semibold"
                      : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <Users className="h-4 w-4" />
                  Users
                </Link>
                <Link
                  href="/admin/analytics"
                  className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5 ${
                    pathname?.startsWith("/admin/analytics")
                      ? "bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-semibold"
                      : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <BarChart3 className="h-4 w-4" />
                  Analytics
                </Link>
                <Link
                  href="/admin/ai-usage"
                  className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5 ${
                    pathname?.startsWith("/admin/ai-usage")
                      ? "bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-semibold"
                      : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <Cpu className="h-4 w-4" />
                  AI Usage
                </Link>
                <Link
                  href="/admin/system"
                  className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5 ${
                    pathname?.startsWith("/admin/system")
                      ? "bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-semibold"
                      : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <Activity className="h-4 w-4" />
                  Health
                </Link>
                <Link
                  href="/admin/evaluation"
                  className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5 ${
                    pathname?.startsWith("/admin/evaluation")
                      ? "bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-semibold"
                      : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <CheckCircle className="h-4 w-4" />
                  Evaluation
                </Link>
              </>
            )}

            {!currentUser && pathname === "/" && (
              <>
                <a
                  href="#features"
                  className="px-3 py-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                >
                  Features
                </a>
                <a
                  href="#how-it-works"
                  className="px-3 py-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                >
                  How it Works
                </a>
                <a
                  href="#ai-tutor"
                  className="px-3 py-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                >
                  AI Tutor
                </a>
                <a
                  href="#analytics"
                  className="px-3 py-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                >
                  Analytics
                </a>
              </>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />

          {!loading && !currentUser && (
            <div className="hidden sm:flex items-center gap-2">
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-xs hover:bg-slate-50 dark:hover:bg-slate-700 transition"
              >
                <LogIn className="h-3.5 w-3.5" />
                Log In
              </Link>
              <Link
                href="/signup"
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 text-xs font-semibold shadow-sm transition"
              >
                Get Started
              </Link>
            </div>
          )}

          {!loading && currentUser && (
            <div className="hidden sm:flex items-center gap-2.5">
              <Link
                href="/settings"
                className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-xs hover:bg-slate-100 dark:hover:bg-slate-700 transition"
              >
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 font-bold text-[10px]">
                  {currentUser.name.charAt(0)}
                </div>
                <span className="font-medium text-slate-800 dark:text-slate-200">{currentUser.name}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                    currentUser.role === "admin"
                      ? "bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300"
                      : "bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300"
                  }`}
                >
                  {currentUser.role}
                </span>
              </Link>

              <Link
                href="/settings"
                className="rounded-lg p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                title="Settings"
              >
                <Settings className="h-4 w-4" />
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                className="rounded-lg p-2 text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 transition"
                title="Log Out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden rounded-lg p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 pt-2 pb-4 space-y-1">
          {currentUser && currentUser.role === "student" && (
            <>
              <Link
                href="/dashboard"
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <LayoutDashboard className="h-4 w-4" /> Dashboard
              </Link>
              <Link
                href="/spaces"
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <Layers className="h-4 w-4" /> Spaces
              </Link>
              <Link
                href="/projects"
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <FolderKanban className="h-4 w-4" /> Projects
              </Link>
              <Link
                href="/settings"
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <Settings className="h-4 w-4" /> Settings
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 text-left"
              >
                <LogOut className="h-4 w-4" /> Log Out
              </button>
            </>
          )}

          {currentUser && currentUser.role === "admin" && (
            <>
              <Link
                href="/admin"
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <ShieldCheck className="h-4 w-4" /> Admin Overview
              </Link>
              <Link
                href="/admin/users"
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <Users className="h-4 w-4" /> User Directory
              </Link>
              <Link
                href="/admin/analytics"
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <BarChart3 className="h-4 w-4" /> Analytics
              </Link>
              <Link
                href="/admin/ai-usage"
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <Cpu className="h-4 w-4" /> AI Telemetry
              </Link>
              <Link
                href="/admin/system"
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <Activity className="h-4 w-4" /> System Health
              </Link>
              <Link
                href="/admin/evaluation"
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <CheckCircle className="h-4 w-4" /> Regression Benchmark
              </Link>
              <Link
                href="/settings"
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <Settings className="h-4 w-4" /> Settings
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 text-left"
              >
                <LogOut className="h-4 w-4" /> Log Out
              </button>
            </>
          )}

          {!currentUser && (
            <div className="pt-2 pb-1 space-y-2">
              <Link
                href="/login"
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-800 dark:text-slate-200"
              >
                <LogIn className="h-4 w-4" /> Log In
              </Link>
              <Link
                href="/signup"
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-sm font-semibold text-white shadow-xs"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}

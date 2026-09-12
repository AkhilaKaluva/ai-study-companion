import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import {
  Sparkles,
  ArrowRight,
  BookOpen,
  FileText,
  BrainCircuit,
  Target,
  TrendingUp,
  Compass,
  BarChart3,
  Shield,
  Layers,
  CheckCircle2,
  Quote,
  Zap,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  const user = await getCurrentUser();

  // If already logged in, redirect to respective dashboard
  if (user) {
    if (user.role === "admin") {
      redirect("/admin");
    } else {
      redirect("/dashboard");
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 selection:bg-indigo-500 selection:text-white transition-colors duration-200">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-28 border-b border-slate-200 dark:border-slate-800">
        {/* Background glow effects */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -z-10 w-full max-w-7xl h-96 bg-gradient-to-b from-indigo-100/60 via-purple-50/20 to-transparent dark:from-indigo-950/30 dark:via-purple-950/10 dark:to-transparent blur-3xl pointer-events-none" />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center space-y-6">
          {/* Tagline Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 dark:border-indigo-800 bg-indigo-50/80 dark:bg-indigo-950/60 px-4 py-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 shadow-xs">
            <Sparkles className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
            AI-Powered Learning &amp; Growth Workspace
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white max-w-4xl mx-auto leading-tight">
            Learn smarter with an AI tutor{" "}
            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              grounded in your own study material.
            </span>
          </h1>

          {/* Subheadline */}
          <p className="text-base sm:text-lg md:text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Upload your learning materials, ask questions with page-accurate citations, practice with adaptive assessments, and track how your understanding grows.
          </p>

          {/* Call to Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              href="/signup"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-3.5 text-sm shadow-md shadow-indigo-500/25 transition transform hover:-translate-y-0.5"
            >
              Get Started <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold px-6 py-3.5 text-sm shadow-xs transition"
            >
              Log In
            </Link>
          </div>

          {/* Product Preview Mockup */}
          <div className="pt-12 max-w-5xl mx-auto">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 sm:p-4 shadow-xl dark:shadow-slate-950/80">
              <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 p-4 sm:p-6 text-left">
                {/* Header of preview */}
                <div className="flex flex-wrap items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 gap-2">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-red-400 inline-block" />
                    <span className="h-3 w-3 rounded-full bg-amber-400 inline-block" />
                    <span className="h-3 w-3 rounded-full bg-emerald-400 inline-block" />
                    <span className="text-xs font-semibold text-slate-400 ml-2">Distributed Systems / Raft Consensus Protocol</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 px-2.5 py-0.5 text-[11px] font-semibold">
                      Grounded AI RAG
                    </span>
                    <span className="rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-2.5 py-0.5 text-[11px] font-semibold">
                      Mastery: 72%
                    </span>
                  </div>
                </div>

                {/* Simulated Tutor Query & Citation */}
                <div className="mt-4 space-y-3">
                  <div className="flex justify-end">
                    <div className="max-w-md rounded-2xl rounded-tr-xs bg-indigo-600 text-white p-3 text-xs sm:text-sm">
                      How does Raft ensure split-brain doesn't occur during leader election?
                    </div>
                  </div>

                  <div className="flex justify-start">
                    <div className="max-w-xl rounded-2xl rounded-tl-xs border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 text-xs sm:text-sm text-slate-800 dark:text-slate-200 space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                        <Sparkles className="h-3.5 w-3.5" /> AI Study Companion
                      </div>
                      <p className="leading-relaxed">
                        Raft guarantees that at most one leader can be elected in a given term by enforcing two invariants: <strong>(1)</strong> each server can vote for at most one candidate per term on a first-come-first-served basis, and <strong>(2)</strong> a candidate must receive votes from a strict <strong>majority of cluster servers</strong>. Because any two majorities must overlap by at least one server, no two candidates can simultaneously win in the same term.
                      </p>
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                        <span className="text-[11px] text-slate-400">Supporting Evidence:</span>
                        <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 px-2 py-0.5 text-[11px] font-medium text-indigo-700 dark:text-indigo-300">
                          <Quote className="h-3 w-3" /> Raft Consensus Paper &bull; Page 6
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Sections */}
      <section id="features" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            Engineered For Authentic Learning
          </h2>
          <h3 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">
            Everything connects into one continuous loop.
          </h3>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
            No disconnected chatbot tabs or generic quizzes. Your materials form the evidence base for tutoring, targeted assessment, and mastery growth.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Feature 1: Grounded AI Tutor */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs hover:border-indigo-400 dark:hover:border-indigo-600 transition">
            <div className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4">
              <Sparkles className="h-5 w-5" />
            </div>
            <h4 className="text-lg font-bold text-slate-900 dark:text-white">1. Grounded AI Tutor</h4>
            <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Every answer is synthesized strictly from your uploaded materials. Responses cite exact document titles and page numbers so you can verify the source.
            </p>
          </div>

          {/* Feature 2: Learn from PDFs */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs hover:border-indigo-400 dark:hover:border-indigo-600 transition">
            <div className="h-10 w-10 rounded-xl bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-4">
              <FileText className="h-5 w-5" />
            </div>
            <h4 className="text-lg font-bold text-slate-900 dark:text-white">2. Learn from PDFs</h4>
            <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Upload lecture slides, textbooks, course notes, and research papers. Our page-aware parser chunks and embeds the content for rapid semantic search.
            </p>
          </div>

          {/* Feature 3: Adaptive Practice */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs hover:border-indigo-400 dark:hover:border-indigo-600 transition">
            <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4">
              <Target className="h-5 w-5" />
            </div>
            <h4 className="text-lg font-bold text-slate-900 dark:text-white">3. Adaptive Practice</h4>
            <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Assessments are dynamically generated to target your demonstrated weak spots rather than random trivia, ensuring maximum revision efficiency.
            </p>
          </div>

          {/* Feature 4: Concept Mastery */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs hover:border-indigo-400 dark:hover:border-indigo-600 transition">
            <div className="h-10 w-10 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4">
              <BrainCircuit className="h-5 w-5" />
            </div>
            <h4 className="text-lg font-bold text-slate-900 dark:text-white">4. Concept Mastery</h4>
            <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Track your understanding at a granular concept level. Visual progress indicators classify concepts into Needs Attention, Developing, or Strong.
            </p>
          </div>

          {/* Feature 5: Growth Analysis */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs hover:border-indigo-400 dark:hover:border-indigo-600 transition">
            <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4">
              <TrendingUp className="h-5 w-5" />
            </div>
            <h4 className="text-lg font-bold text-slate-900 dark:text-white">5. Growth Analysis</h4>
            <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Inspect historical improvements over time. Review how quiz performance and open-ended feedback evolve across multiple study sessions.
            </p>
          </div>

          {/* Feature 6: Actionable Recommendations */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs hover:border-indigo-400 dark:hover:border-indigo-600 transition">
            <div className="h-10 w-10 rounded-xl bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-4">
              <Compass className="h-5 w-5" />
            </div>
            <h4 className="text-lg font-bold text-slate-900 dark:text-white">6. Personalized Recommendations</h4>
            <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Answer the question: "What should I study next?" Get immediate, context-driven guidance pinpointing the exact materials and topics to revisit.
            </p>
          </div>
        </div>
      </section>

      {/* How it Works Stepper */}
      <section id="how-it-works" className="py-20 bg-slate-100/70 dark:bg-slate-900/50 border-y border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Structured Workflow
            </h2>
            <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white">
              How AI Study Companion Works
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              A 6-step cohesive journey that transforms raw study documents into measurable mastery.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                step: "01",
                title: "Create a Space",
                desc: "Organize broad academic or professional domains like Distributed Systems or Machine Learning.",
              },
              {
                step: "02",
                title: "Create a Project",
                desc: "Define a focused learning journey with clear goals, such as Raft Consensus or Attention Mechanisms.",
              },
              {
                step: "03",
                title: "Upload Material",
                desc: "Ingest course notes, papers, or textbooks. The system extracts text, chunks by page, and computes vector embeddings.",
              },
              {
                step: "04",
                title: "Ask the Tutor",
                desc: "Explore concepts interactively with grounded answers that cite exact pages, and reject out-of-scope queries.",
              },
              {
                step: "05",
                title: "Practice Adaptively",
                desc: "Take 3-question diagnostic quizzes (MCQ + open-ended) evaluated with AI rubrics against project context.",
              },
              {
                step: "06",
                title: "Track Growth",
                desc: "Watch concept mastery bars update in real time and receive precise recommendations for your next study step.",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="relative rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs"
              >
                <div className="text-3xl font-black text-indigo-100 dark:text-indigo-950/70 absolute top-4 right-5 select-none">
                  {item.step}
                </div>
                <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mb-1">
                  Step {item.step}
                </div>
                <h4 className="text-base font-bold text-slate-900 dark:text-white">{item.title}</h4>
                <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Observability & Admin Section */}
      <section id="analytics" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-indigo-900 via-slate-900 to-purple-950 text-white p-8 sm:p-12 shadow-2xl relative overflow-hidden">
          <div className="relative z-10 max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1 text-xs font-semibold backdrop-blur-md">
              <Shield className="h-3.5 w-3.5 text-indigo-300" />
              Full Enterprise Observability
            </div>
            <h3 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Transparent AI Telemetry &amp; Regression Testing
            </h3>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              Administrators have full visibility into model latencies, token consumption, estimated costs, and real-time health checks. The built-in 1-click regression benchmark rigorously verifies groundedness, page citation fidelity, and refusal safety before every release.
            </p>
            <div className="pt-4 flex flex-wrap gap-4">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 rounded-xl bg-white text-slate-900 font-semibold px-5 py-3 text-xs sm:text-sm hover:bg-slate-100 transition shadow-md"
              >
                Create Free Student Account <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-12 text-center text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-7xl mx-auto px-4 space-y-2">
          <p className="font-bold text-slate-700 dark:text-slate-300">
            AI Study Companion &bull; AI-Powered Learning &amp; Growth Workspace
          </p>
          <p>
            Built with Next.js, Prisma, SQLite, Tailwind CSS, Google Gemini API, and Vector RAG.
          </p>
        </div>
      </footer>
    </div>
  );
}

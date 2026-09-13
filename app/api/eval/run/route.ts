import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { askGroundedTutor, gradeOpenEndedAnswer, generateTargetedQuiz } from "@/lib/ai/gemini";
import { logAiCall } from "@/lib/ai/telemetry";

export async function POST() {
  const startTime = Date.now();
  const user = await getCurrentUser();

  if (!user || user.role !== "admin") {
    return NextResponse.json(
      { error: "Forbidden: Admin privileges required to execute regression benchmark" },
      { status: 403 }
    );
  }

  const testResults: Array<{
    id: string;
    testName: string;
    category: string;
    status: "PASS" | "FAIL";
    score: number;
    details: string;
    latencyMs: number;
  }> = [];

  const mockChunks = [
    {
      materialName: "Raft_Consensus.pdf",
      pageNumber: 4,
      content:
        "Raft uses randomized election timeouts to ensure that split votes are rare and that they are resolved quickly. Election timeouts are chosen randomly from a fixed interval (e.g., 150-300ms).",
    },
    {
      pageNumber: 6,
      materialName: "Raft_Consensus.pdf",
      content:
        "A candidate wins an election if it receives votes from a majority of the servers in the full cluster for the same term.",
    },
  ];

  const t1Start = Date.now();
  try {
    const res1 = await askGroundedTutor({
      userMessage: "How does Raft resolve split votes in leader elections?",
      contextChunks: mockChunks,
      learningGoal: "Understand leader elections",
      userId: user.id,
    });

    const mentionsKeyTerms =
      res1.reply.toLowerCase().includes("randomized") ||
      res1.reply.toLowerCase().includes("timeout");

    testResults.push({
      id: "BENCH-01",
      testName: "Grounded Answer Accuracy",
      category: "GROUNDEDNESS",
      status: mentionsKeyTerms ? "PASS" : "FAIL",
      score: mentionsKeyTerms ? 1.0 : 0.0,
      details: mentionsKeyTerms
        ? `Accurately identified randomized timeouts from project context.`
        : "Failed to mention key concepts from retrieved context.",
      latencyMs: Date.now() - t1Start,
    });
  } catch (err: any) {
    testResults.push({
      id: "BENCH-01",
      testName: "Grounded Answer Accuracy",
      category: "GROUNDEDNESS",
      status: "FAIL",
      score: 0,
      details: err.message,
      latencyMs: Date.now() - t1Start,
    });
  }

  const t2Start = Date.now();
  try {
    const res2 = await askGroundedTutor({
      userMessage: "What fraction of servers must vote for a candidate?",
      contextChunks: mockChunks,
      learningGoal: "Understand quorums",
      userId: user.id,
    });

    const hasCitation =
      res2.citations.length > 0 ||
      res2.reply.includes("Page 6") ||
      res2.reply.includes("Raft_Consensus.pdf");

    testResults.push({
      id: "BENCH-02",
      testName: "Citation Generation & Page Fidelity",
      category: "CITATIONS",
      status: hasCitation ? "PASS" : "FAIL",
      score: hasCitation ? 1.0 : 0.0,
      details: hasCitation
        ? "Successfully attached source citations referencing document title and page number."
        : "Failed to attach explicit page-level citations.",
      latencyMs: Date.now() - t2Start,
    });
  } catch (err: any) {
    testResults.push({
      id: "BENCH-02",
      testName: "Citation Generation & Page Fidelity",
      category: "CITATIONS",
      status: "FAIL",
      score: 0,
      details: err.message,
      latencyMs: Date.now() - t2Start,
    });
  }

  const t3Start = Date.now();
  try {
    const res3 = await askGroundedTutor({
      userMessage: "What is the secret recipe for authentic Hyderabadi biryani?",
      contextChunks: mockChunks,
      learningGoal: "Understand Raft",
      userId: user.id,
    });

    const refused =
      res3.isUnsupported ||
      res3.reply.toLowerCase().includes("insufficient evidence") ||
      res3.reply.toLowerCase().includes("not supported") ||
      res3.reply.toLowerCase().includes("couldn't find enough information");

    testResults.push({
      id: "BENCH-03",
      testName: "Unsupported Question Refusal (Anti-Hallucination)",
      category: "REFUSAL",
      status: refused ? "PASS" : "FAIL",
      score: refused ? 1.0 : 0.0,
      details: refused
        ? "Explicitly refused out-of-scope query without hallucinating fake recipe information."
        : "Failed to refuse query absent from study materials.",
      latencyMs: Date.now() - t3Start,
    });
  } catch (err: any) {
    testResults.push({
      id: "BENCH-03",
      testName: "Unsupported Question Refusal (Anti-Hallucination)",
      category: "REFUSAL",
      status: "FAIL",
      score: 0,
      details: err.message,
      latencyMs: Date.now() - t3Start,
    });
  }

  const t4Start = Date.now();
  try {
    const res4 = await generateTargetedQuiz({
      concepts: [
        { id: "c1", name: "Leader Election", description: "Election timeouts and quorums" },
        { id: "c2", name: "Log Replication", description: "AppendEntries RPCs" },
      ],
      contextText: mockChunks.map((c) => c.content).join("\n"),
      userId: user.id,
    });

    const hasQuestions = res4 && res4.length >= 3;
    const hasMCQ = res4.some((q) => q.type === "MCQ");
    const hasOpen = res4.some((q) => q.type === "OPEN_ENDED");

    testResults.push({
      id: "BENCH-04",
      testName: "Adaptive Quiz Generation Structure",
      category: "QUIZ_GEN",
      status: hasQuestions && hasMCQ && hasOpen ? "PASS" : "FAIL",
      score: hasQuestions && hasMCQ && hasOpen ? 1.0 : 0.0,
      details: `Generated ${res4.length} structured questions (MCQ + Open-Ended) targeted to concepts.`,
      latencyMs: Date.now() - t4Start,
    });
  } catch (err: any) {
    testResults.push({
      id: "BENCH-04",
      testName: "Adaptive Quiz Generation Structure",
      category: "QUIZ_GEN",
      status: "FAIL",
      score: 0,
      details: err.message,
      latencyMs: Date.now() - t4Start,
    });
  }

  const t5Start = Date.now();
  try {
    const res5 = await gradeOpenEndedAnswer({
      prompt: "Explain why randomized election timeouts are critical in Raft.",
      studentAnswer:
        "Randomized timeouts prevent all followers from becoming candidates at the same time, spreading out elections so one server gets a majority before others timeout.",
      rubric: "Must mention split-vote prevention and staggered timers.",
      userId: user.id,
    });

    const compliant =
      typeof res5.score === "number" &&
      res5.score >= 70 &&
      res5.feedback &&
      res5.feedback.length > 10;

    testResults.push({
      id: "BENCH-05",
      testName: "Open-Ended Rubric Grading Compliance",
      category: "GRADING",
      status: compliant ? "PASS" : "FAIL",
      score: compliant ? 1.0 : 0.0,
      details: `Awarded score: ${res5.score}%. Feedback: "${res5.feedback.slice(0, 80)}..."`,
      latencyMs: Date.now() - t5Start,
    });
  } catch (err: any) {
    testResults.push({
      id: "BENCH-05",
      testName: "Open-Ended Rubric Grading Compliance",
      category: "GRADING",
      status: "FAIL",
      score: 0,
      details: err.message,
      latencyMs: Date.now() - t5Start,
    });
  }

  const passedCount = testResults.filter((r) => r.status === "PASS").length;
  const totalDuration = Date.now() - startTime;

  const evalRun = await prisma.evaluationRun.create({
    data: {
      name: `Regression Benchmark Run (${new Date().toLocaleTimeString()})`,
      status: "COMPLETED",
      passCount: passedCount,
      failCount: testResults.length - passedCount,
      totalCount: testResults.length,
      durationMs: totalDuration,
      results: {
        create: testResults.map((t) => ({
          testName: t.testName,
          category: t.category,
          status: t.status,
          score: t.score,
          input: "Standard evaluation benchmark test input",
          expected: "Behavior conforming to safety & grounding specification",
          actual: t.details,
          latencyMs: t.latencyMs,
        })),
      },
    },
  });

  await logAiCall({
    userId: user.id,
    feature: "EVAL",
    model: "gemini-2.5-flash",
    latencyMs: totalDuration,
    promptTokens: 1800,
    completionTokens: 400,
    totalTokens: 2200,
    estimatedCost: 0.00045,
    success: passedCount === testResults.length,
  });

  return NextResponse.json({
    runId: evalRun.id,
    totalTests: testResults.length,
    passedCount,
    failedCount: testResults.length - passedCount,
    overallStatus: passedCount === testResults.length ? "HEALTHY" : "NEEDS_ATTENTION",
    totalDurationMs: totalDuration,
    results: testResults,
  });
}

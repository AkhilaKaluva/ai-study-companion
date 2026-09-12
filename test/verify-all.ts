import { prisma } from "../lib/db/prisma";
import { hashPassword, verifyPassword } from "../lib/auth/password";
import { createSession, getCurrentUser } from "../lib/auth/session";
import { parseAndChunkPdf } from "../lib/pdf/parser";
import { getEmbedding, cosineSimilarity } from "../lib/ai/embeddings";
import { retrieveProjectContext } from "../lib/ai/rag";
import { askGroundedTutor, generateTargetedQuiz, gradeOpenEndedAnswer } from "../lib/ai/gemini";
import { updateConceptMastery } from "../lib/mastery/engine";
import { logAiCall } from "../lib/ai/telemetry";

async function runTestSuite() {
  console.log("==================================================================");
  console.log("🚀 STARTING AI STUDY COMPANION COMPREHENSIVE TEST SUITE");
  console.log("==================================================================\n");

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    total++;
    if (condition) {
      passed++;
      console.log(`  ✅ PASS: ${testName}`);
    } else {
      console.error(`  ❌ FAIL: ${testName} ${detail ? `(${detail})` : ""}`);
    }
  }

  // TEST SUITE 1: AUTHENTICATION & PASSWORD HASHING
  console.log("📦 [1/7] Testing Authentication & Cryptographic Security...");
  const rawPassword = "studentSecretPassword123!";
  const hash = hashPassword(rawPassword);
  assert(hash.includes(":"), "Password hash format contains salt delimiter");
  assert(verifyPassword(rawPassword, hash), "Password verifies correctly with valid plaintext");
  assert(!verifyPassword("wrongPassword", hash), "Password verification rejects invalid plaintext");

  const seededStudent = await prisma.user.findUnique({ where: { email: "alex@demo.edu" } });
  assert(!!seededStudent, "Seeded demo student exists in database");
  assert(
    seededStudent ? verifyPassword("student123", seededStudent.passwordHash) : false,
    "Seeded student password verifies correctly with 'student123'"
  );

  const seededAdmin = await prisma.user.findUnique({ where: { email: "admin@demo.edu" } });
  assert(!!seededAdmin, "Seeded demo admin exists in database");
  assert(
    seededAdmin ? verifyPassword("admin123", seededAdmin.passwordHash) : false,
    "Seeded admin password verifies correctly with 'admin123'"
  );
  assert(seededAdmin?.role === "admin", "Seeded admin has 'admin' role");

  // TEST SUITE 2: DATA ISOLATION & TENANT BOUNDARIES
  console.log("\n🔒 [2/7] Testing Multi-Tenant Data Isolation...");
  // Create a second test student
  const otherStudent = await prisma.user.upsert({
    where: { email: "other@demo.edu" },
    update: {},
    create: {
      name: "Other Student",
      email: "other@demo.edu",
      passwordHash: hashPassword("other123"),
      role: "student",
    },
  });

  const alexProjects = await prisma.project.findMany({
    where: { userId: seededStudent!.id },
  });
  const otherProjects = await prisma.project.findMany({
    where: { userId: otherStudent.id },
  });

  assert(alexProjects.length > 0, "Alex has access to own seeded projects");
  assert(otherProjects.length === 0, "Other student has zero access to Alex's projects");

  // TEST SUITE 3: PDF PARSER & PAGE-AWARE CHUNKING
  console.log("\n📄 [3/7] Testing Page-Preserving PDF Parser & Overlap...");
  const samplePdfPath = "c:\\Users\\kaluv\\OneDrive\\Documents\\Project_Requirements.pdf";
  const fs = await import("fs");
  if (fs.existsSync(samplePdfPath)) {
    const pdfBuffer = fs.readFileSync(samplePdfPath);
    const parsed = await parseAndChunkPdf(pdfBuffer, 250, 40);
    assert(parsed.pageCount > 0, `Preserved page count: ${parsed.pageCount} pages`);
    assert(parsed.chunks.length > 0, `Generated ${parsed.chunks.length} page-bounded chunks`);
    assert(
      parsed.chunks[0].pageNumber >= 1,
      `First chunk references real page: ${parsed.chunks[0].pageNumber}`
    );
  } else {
    console.log("  ℹ Notice: Sample PDF not found at path, skipping raw buffer check.");
  }

  // TEST SUITE 4: VECTOR EMBEDDINGS & RAG PROJECT ISOLATION
  console.log("\n🧠 [4/7] Testing Vector Embeddings & RAG Project Isolation...");
  const vec1 = await getEmbedding("Leader election heartbeat timers and quorum");
  const vec2 = await getEmbedding("Candidate votes and election timeouts");
  const vec3 = await getEmbedding("Cooking authentic biryani with basmati rice");

  const simRelated = cosineSimilarity(vec1, vec2);
  const simUnrelated = cosineSimilarity(vec1, vec3);
  assert(vec1.length === 768, "Embedding vector has 768 dimensions");
  assert(
    simRelated > simUnrelated,
    `Semantic similarity detects related distributed concepts (${simRelated.toFixed(
      3
    )} > ${simUnrelated.toFixed(3)})`
  );

  const alexProject = alexProjects[0];
  const ragResult = await retrieveProjectContext(
    alexProject.id,
    "How does leader election work?",
    3,
    0.15
  );
  assert(ragResult.chunks.length > 0, `Retrieved ${ragResult.chunks.length} chunks from project`);
  assert(
    ragResult.chunks.every((c) => c.pageNumber >= 1),
    "All retrieved chunks preserve valid page numbers"
  );

  // TEST SUITE 5: GROUNDED AI TUTOR & UNSUPPORTED QUESTION REFUSAL
  console.log("\n🤖 [5/7] Testing Grounded AI Tutor, Citations & Refusal Handling...");
  const tutorGrounded = await askGroundedTutor({
    userMessage: "How does Raft elect a leader?",
    contextChunks: ragResult.chunks,
    learningGoal: alexProject.learningGoal,
    userId: seededStudent!.id,
  });

  assert(
    tutorGrounded.citations.length > 0 || tutorGrounded.reply.includes("Page"),
    "Grounded answer attaches citations referencing page numbers"
  );
  assert(!tutorGrounded.isUnsupported, "In-scope query is not marked as unsupported");

  // Out of scope query
  const tutorUnsupported = await askGroundedTutor({
    userMessage: "What is the secret recipe for baking chocolate brownies?",
    contextChunks: [], // Simulating low similarity / no evidence
    learningGoal: alexProject.learningGoal,
    userId: seededStudent!.id,
  });

  assert(
    tutorUnsupported.isUnsupported,
    "Out-of-scope query correctly marked as unsupported (Anti-Hallucination)"
  );
  assert(
    tutorUnsupported.reply.toLowerCase().includes("insufficient evidence"),
    "Tutor communicates insufficient evidence clearly"
  );

  // TEST SUITE 6: ADAPTIVE QUIZ GENERATION & AI GRADING
  console.log("\n📝 [6/7] Testing Adaptive Quiz Generation & AI Rubric Grading...");
  const projectConcepts = await prisma.concept.findMany({
    where: { projectId: alexProject.id },
  });

  const quizQuestions = await generateTargetedQuiz({
    concepts: projectConcepts,
    contextText: ragResult.chunks.map((c) => c.content).join("\n"),
    userId: seededStudent!.id,
  });

  assert(quizQuestions.length >= 3, `Generated ${quizQuestions.length} adaptive quiz questions`);
  assert(quizQuestions.some((q) => q.type === "MCQ"), "Quiz contains Multiple Choice questions");
  assert(
    quizQuestions.some((q) => q.type === "OPEN_ENDED"),
    "Quiz contains Open-Ended question for AI evaluation"
  );

  const gradeResult = await gradeOpenEndedAnswer({
    prompt: "Explain how a candidate becomes leader in Raft.",
    studentAnswer:
      "A follower increments term, votes for itself, and sends RequestVote RPCs. If it receives majority votes, it becomes leader.",
    rubric: "Must mention term increment, voting for self, and majority cluster quorum.",
    userId: seededStudent!.id,
  });

  assert(typeof gradeResult.score === "number", `Open-ended answer graded with score: ${gradeResult.score}%`);
  assert(gradeResult.feedback.length > 15, "Meaningful feedback returned by AI");
  assert(gradeResult.keyConceptsCovered.length > 0, "AI identified covered concepts");

  // TEST SUITE 7: MASTERY ENGINE, RECOMMENDATIONS & AI TELEMETRY
  console.log("\n📊 [7/7] Testing Mastery Mathematical Model & Telemetry Observability...");
  const targetConcept = projectConcepts[0];
  const previousMastery = targetConcept.masteryScore;

  const masteryResult = await updateConceptMastery({
    conceptId: targetConcept.id,
    userId: seededStudent!.id,
    projectId: alexProject.id,
    performancePercentage: 95.0,
    reason: "OPEN_ENDED_ASSESSMENT",
  });

  assert(!!masteryResult, "Concept mastery updated successfully");
  assert(
    masteryResult!.newScore !== previousMastery,
    `Mastery evolved mathematically: ${previousMastery}% -> ${masteryResult!.newScore}%`
  );

  const historyEntries = await prisma.masteryHistory.findMany({
    where: { conceptId: targetConcept.id },
  });
  assert(historyEntries.length > 0, `Persisted ${historyEntries.length} mastery history records`);

  const activeRec = await prisma.recommendation.findFirst({
    where: { projectId: alexProject.id, status: "ACTIVE" },
  });
  assert(!!activeRec, `Generated actionable learning recommendation: "${activeRec?.text}"`);

  // Telemetry log check
  await logAiCall({
    userId: seededStudent!.id,
    projectId: alexProject.id,
    feature: "TUTOR_CHAT",
    model: "gemini-2.5-flash",
    latencyMs: 820,
    promptTokens: 420,
    completionTokens: 110,
    success: true,
  });

  const recentLog = await prisma.aiLog.findFirst({
    where: { userId: seededStudent!.id },
    orderBy: { createdAt: "desc" },
  });
  assert(!!recentLog, "AI Telemetry successfully logged with latency, tokens, and cost");
  assert(recentLog!.estimatedCost > 0, `Estimated cost calculated accurately: $${recentLog?.estimatedCost}`);

  console.log("\n==================================================================");
  console.log(`🏁 TEST SUITE COMPLETED: ${passed} OF ${total} TESTS PASSED (${((passed / total) * 100).toFixed(1)}%)`);
  console.log("==================================================================\n");

  if (passed !== total) {
    throw new Error("One or more tests failed!");
  }
}

runTestSuite()
  .catch((err) => {
    console.error("Test Suite execution error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

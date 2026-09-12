import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../lib/auth/password";
import { getEmbedding } from "../lib/ai/embeddings";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database with production demo data...");

  // Clear existing test data cleanly in order of relations
  try {
    await prisma.evaluationResult.deleteMany();
    await prisma.evaluationRun.deleteMany();
    await prisma.aiLog.deleteMany();
    await prisma.activityEvent.deleteMany();
    await prisma.recommendation.deleteMany();
    await prisma.assessmentAttempt.deleteMany();
    await prisma.quizAttempt.deleteMany();
    await prisma.quizQuestion.deleteMany();
    await prisma.quiz.deleteMany();
    await prisma.chatMessage.deleteMany();
    await prisma.conversation.deleteMany();
    await prisma.masteryHistory.deleteMany();
    await prisma.concept.deleteMany();
    await prisma.materialChunk.deleteMany();
    await prisma.material.deleteMany();
    await prisma.project.deleteMany();
    await prisma.space.deleteMany();
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();
  } catch (err) {
    console.log("Database reset note:", err);
  }

  // 1. Seed Student: Alex Mercer
  const studentPassword = hashPassword("student123");
  const student = await prisma.user.create({
    data: {
      id: "demo-student-alex",
      email: "alex@demo.edu",
      name: "Alex Mercer",
      passwordHash: studentPassword,
      role: "student",
    },
  });

  // 2. Seed Admin: Dr. Sarah Vance
  const adminPassword = hashPassword("admin123");
  const admin = await prisma.user.create({
    data: {
      id: "demo-admin-sarah",
      email: "admin@demo.edu",
      name: "Dr. Sarah Vance",
      passwordHash: adminPassword,
      role: "admin",
    },
  });

  // 3. Seed Space
  const space = await prisma.space.create({
    data: {
      id: "space-dist-sys",
      name: "Distributed Systems",
      description: "Core algorithms for consensus, replication, and fault tolerance across distributed state machines.",
      userId: student.id,
    },
  });

  // 4. Seed Project
  const project = await prisma.project.create({
    data: {
      id: "project-raft-consensus",
      name: "Raft Consensus Protocol",
      description: "Comprehensive study of leader election, log replication, terms, and safety guarantees in distributed systems.",
      learningGoal: "Master consensus, split-brain resolution, and quorum safety invariants in distributed replicated logs.",
      spaceId: space.id,
      userId: student.id,
    },
  });

  // 5. Seed Concepts with initial mastery
  const conceptLeader = await prisma.concept.create({
    data: {
      name: "Leader Election",
      description: "Heartbeat timers, randomized election timeouts (150-300ms), and candidate voting quorums.",
      masteryScore: 82.0,
      status: "STRONG",
      projectId: project.id,
    },
  });

  const conceptLog = await prisma.concept.create({
    data: {
      name: "Log Replication",
      description: "AppendEntries RPCs, leader log ordering, commitIndex advancement, and majority replication.",
      masteryScore: 61.0,
      status: "DEVELOPING",
      projectId: project.id,
    },
  });

  const conceptSafety = await prisma.concept.create({
    data: {
      name: "Safety Invariants",
      description: "Election safety, leader completeness, state machine safety, and up-to-date log voting rules.",
      masteryScore: 45.0,
      status: "NEEDS_ATTENTION",
      projectId: project.id,
    },
  });

  const conceptCompaction = await prisma.concept.create({
    data: {
      name: "Log Compaction & Snapshots",
      description: "Discarding committed log prefixes, installing snapshots on lagging followers, and memory management.",
      masteryScore: 28.0,
      status: "NEEDS_ATTENTION",
      projectId: project.id,
    },
  });

  // 6. Seed Material & Knowledge Chunks
  const material = await prisma.material.create({
    data: {
      id: "material-raft-paper",
      name: "In Search of an Understandable Consensus Algorithm (Raft).pdf",
      filePath: "/materials/raft-extended.pdf",
      fileSizeBytes: 485000,
      pageCount: 18,
      status: "READY",
      projectId: project.id,
    },
  });

  const sampleChunks = [
    {
      pageNumber: 4,
      chunkIndex: 0,
      content:
        "Raft achieves consensus by first electing a distinguished leader, then giving the leader complete responsibility for managing the replicated log. The leader accepts log entries from clients, replicates them on other servers, and tells servers when it is safe to apply log entries to their state machines. A leader can fail or become disconnected, in which case a new leader is elected.",
    },
    {
      pageNumber: 5,
      chunkIndex: 1,
      content:
        "Raft divides time into terms of arbitrary length. Terms are numbered with consecutive integers. Each term begins with an election, in which one or more candidates attempt to become leader as in Section 5.2. If a candidate wins the election, then it serves as leader for the rest of the term. In some situations an election will result in a split vote. In this case the term will end with no leader; a new term (and a new election) will begin shortly. Raft ensures that there is at most one leader in a given term.",
    },
    {
      pageNumber: 6,
      chunkIndex: 2,
      content:
        "To begin an election, a follower increments its current term and transitions to candidate state. It then votes for itself and issues RequestVote RPCs in parallel to each of the other servers in the cluster. A candidate continues in this state until one of three things happens: (a) it wins the election, (b) another server establishes itself as leader, or (c) a period of time goes by with no winner. A candidate wins an election if it receives votes from a majority of the servers in the full cluster for the same term.",
    },
    {
      pageNumber: 8,
      chunkIndex: 3,
      content:
        "Once a leader has been elected, it begins servicing client requests. Each client request contains a command to be executed by the replicated state machines. The leader appends the command to its log as a new entry, then issues AppendEntries RPCs in parallel to each of the other servers to replicate the entry. When the entry has been safely replicated (by a majority of servers), the leader applies the entry to its state machine and returns the result of that execution to the client.",
    },
    {
      pageNumber: 11,
      chunkIndex: 4,
      content:
        "Raft uses the voting process to prevent a candidate from winning an election unless its log contains all committed entries. A candidate must contact a majority of the cluster in order to be elected, which means that every committed entry must be present in at least one of those servers. If the candidate's log is at least as up-to-date as any other server in that majority, then it will hold all committed entries. The RequestVote RPC implements this restriction: the RPC includes information about the candidate's log, and the voter denies its vote if its own log is more up-to-date than that of the candidate.",
    },
    {
      pageNumber: 14,
      chunkIndex: 5,
      content:
        "Snapshotting is the simplest approach to compaction. In snapshotting, the entire current system state is written to a snapshot on stable storage, then the entire log up through that point is discarded. The leader occasionally sends InstallSnapshot RPCs to followers that lag too far behind, for example when the leader has already discarded the next log entry that needs to be sent to the follower.",
    },
  ];

  for (const chunk of sampleChunks) {
    const embedding = await getEmbedding(chunk.content);
    await prisma.materialChunk.create({
      data: {
        materialId: material.id,
        pageNumber: chunk.pageNumber,
        chunkIndex: chunk.chunkIndex,
        content: chunk.content,
        embedding: JSON.stringify(embedding),
      },
    });
  }

  // 7. Seed Recommendation
  await prisma.recommendation.create({
    data: {
      projectId: project.id,
      text: "Safety Invariants is at 45% mastery. Review how RequestVote RPC prevents electing leaders with missing committed entries, then take a targeted assessment.",
      conceptId: conceptSafety.id,
      status: "ACTIVE",
    },
  });

  // 8. Seed Mastery History
  await prisma.masteryHistory.create({
    data: {
      conceptId: conceptLeader.id,
      userId: student.id,
      score: 82.0,
      previousScore: 70.0,
      delta: 12.0,
      reason: "QUIZ_MCQ",
    },
  });

  await prisma.masteryHistory.create({
    data: {
      conceptId: conceptSafety.id,
      userId: student.id,
      score: 45.0,
      previousScore: 40.0,
      delta: 5.0,
      reason: "OPEN_ENDED_ASSESSMENT",
    },
  });

  // 9. Seed Initial Activity Events
  await prisma.activityEvent.createMany({
    data: [
      {
        userId: student.id,
        type: "SIGNUP",
        description: "Student Alex Mercer registered on AI Study Companion.",
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
      },
      {
        userId: student.id,
        projectId: project.id,
        type: "SPACE_CREATED",
        description: 'Created space "Distributed Systems".',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
      },
      {
        userId: student.id,
        projectId: project.id,
        type: "PROJECT_CREATED",
        description: 'Created project "Raft Consensus Protocol".',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2 + 1000 * 60),
      },
      {
        userId: student.id,
        projectId: project.id,
        type: "MATERIAL_PROCESSED",
        description: 'Processed "In Search of an Understandable Consensus Algorithm (Raft).pdf" (18 pages, 6 chunks indexed).',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
      },
      {
        userId: student.id,
        projectId: project.id,
        type: "MASTERY_UPDATED",
        description: "Updated mastery for Leader Election to 82% (Strong).",
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 4),
      },
    ],
  });

  // 10. Seed AI Telemetry Logs
  await prisma.aiLog.createMany({
    data: [
      {
        userId: student.id,
        projectId: project.id,
        feature: "CONCEPT_EXTRACTION",
        model: "gemini-2.5-flash",
        latencyMs: 1350,
        promptTokens: 1800,
        completionTokens: 290,
        totalTokens: 2090,
        estimatedCost: 0.00034,
        success: true,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
      },
      {
        userId: student.id,
        projectId: project.id,
        feature: "TUTOR_CHAT",
        model: "gemini-2.5-flash",
        latencyMs: 980,
        promptTokens: 750,
        completionTokens: 210,
        totalTokens: 960,
        estimatedCost: 0.00018,
        success: true,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12),
      },
      {
        userId: student.id,
        projectId: project.id,
        feature: "QUIZ_GEN",
        model: "gemini-2.5-flash",
        latencyMs: 1620,
        promptTokens: 1420,
        completionTokens: 460,
        totalTokens: 1880,
        estimatedCost: 0.00039,
        success: true,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5),
      },
    ],
  });

  console.log("Database successfully seeded!");
  console.log("-----------------------------------------");
  console.log("Student User: alex@demo.edu / student123");
  console.log("Admin User:   admin@demo.edu / admin123");
  console.log("-----------------------------------------");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import { prisma } from "../lib/db/prisma";
import { getEmbedding } from "../lib/ai/embeddings";

const BASE_URL = "http://127.0.0.1:3000";

interface Result {
  test: string;
  passed: boolean;
  status: number;
  message: string;
}

const results: Result[] = [];

function check(test: string, passed: boolean, status: number, message: string) {
  results.push({ test, passed, status, message });
  const icon = passed ? "✅" : "❌";
  console.log(`${icon} ${test} (HTTP ${status}): ${message}`);
}

async function runTests() {
  console.log("================================================================================");
  console.log("🔍 TESTING KNOWLEDGE EXPLORER / SEARCH API (GET /api/search) & SECURITY");
  console.log("================================================================================\n");

  // 1. Unauthenticated request -> Must return 401
  try {
    const res = await fetch(`${BASE_URL}/api/search?projectId=project-raft-consensus&q=election`);
    const json = await res.json();
    const passed = Boolean(res.status === 401 && json.error === "Unauthorized");
    check("1. Unauthenticated GET /api/search", passed, res.status, json.error || JSON.stringify(json));
  } catch (e: any) {
    check("1. Unauthenticated GET /api/search", false, 0, e.message);
  }

  // 2. Invalid session token -> Must return 401
  try {
    const res = await fetch(`${BASE_URL}/api/search?projectId=project-raft-consensus&q=election`, {
      headers: { Cookie: "study_session=fake_invalid_token_9999" },
    });
    const json = await res.json();
    const passed = Boolean(res.status === 401 && json.error === "Unauthorized");
    check("2. Invalid session token GET /api/search", passed, res.status, json.error || JSON.stringify(json));
  } catch (e: any) {
    check("2. Invalid session token GET /api/search", false, 0, e.message);
  }

  // Log in Student A (Alex: alex@demo.edu / student123)
  const loginAlexRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "alex@demo.edu", password: "student123" }),
  });
  const alexCookie = loginAlexRes.headers.get("set-cookie")?.split(";")[0] || "";

  // 3. Missing projectId -> Must return 400
  try {
    const res = await fetch(`${BASE_URL}/api/search?q=consensus`, {
      headers: { Cookie: alexCookie },
    });
    const json = await res.json();
    const passed = Boolean(res.status === 400 && json.error === "Missing projectId");
    check("3. Missing projectId GET /api/search", passed, res.status, json.error || JSON.stringify(json));
  } catch (e: any) {
    check("3. Missing projectId GET /api/search", false, 0, e.message);
  }

  // 4. Missing query parameter -> Must return 400
  try {
    const res = await fetch(`${BASE_URL}/api/search?projectId=project-raft-consensus`, {
      headers: { Cookie: alexCookie },
    });
    const json = await res.json();
    const passed = Boolean(res.status === 400 && json.error === "Missing search query");
    check("4. Missing search query GET /api/search", passed, res.status, json.error || JSON.stringify(json));
  } catch (e: any) {
    check("4. Missing search query GET /api/search", false, 0, e.message);
  }

  // 5. Empty / whitespace-only query -> Must return 400
  try {
    const res = await fetch(`${BASE_URL}/api/search?projectId=project-raft-consensus&q=%20%20%20`, {
      headers: { Cookie: alexCookie },
    });
    const json = await res.json();
    const passed = Boolean(res.status === 400 && json.error === "Search query cannot be empty");
    check("5. Empty query GET /api/search", passed, res.status, json.error || JSON.stringify(json));
  } catch (e: any) {
    check("5. Empty query GET /api/search", false, 0, e.message);
  }

  // 6. Overly long query (> 500 characters) -> Must return 400
  try {
    const longQuery = "a".repeat(501);
    const res = await fetch(`${BASE_URL}/api/search?projectId=project-raft-consensus&q=${longQuery}`, {
      headers: { Cookie: alexCookie },
    });
    const json = await res.json();
    const passed = Boolean(
      res.status === 400 &&
      json.error?.includes("exceeds maximum allowed length")
    );
    check("6. Overly long query (>500 chars) GET /api/search", passed, res.status, json.error || JSON.stringify(json));
  } catch (e: any) {
    check("6. Overly long query (>500 chars) GET /api/search", false, 0, e.message);
  }

  // 7. Nonexistent project ID -> Must return 404
  try {
    const res = await fetch(`${BASE_URL}/api/search?projectId=nonexistent-project-99999&q=election`, {
      headers: { Cookie: alexCookie },
    });
    const json = await res.json();
    const passed = Boolean(res.status === 404 && json.error === "Project not found");
    check("7. Nonexistent project GET /api/search", passed, res.status, json.error || JSON.stringify(json));
  } catch (e: any) {
    check("7. Nonexistent project GET /api/search", false, 0, e.message);
  }

  // 8. Student A searches own project -> Returns 200
  let searchResults: any[] = [];
  try {
    const res = await fetch(`${BASE_URL}/api/search?projectId=project-raft-consensus&q=leader%20election%20timeout`, {
      headers: { Cookie: alexCookie },
    });
    const json = await res.json();
    searchResults = json.results || [];
    const passed = Boolean(
      res.status === 200 &&
      Array.isArray(json.results) &&
      json.results.length > 0 &&
      json.totalCount === json.results.length &&
      json.query === "leader election timeout"
    );
    check(
      "8. Student A searches own project",
      passed,
      res.status,
      passed ? `Found ${json.results.length} result(s) for query "${json.query}"` : JSON.stringify(json)
    );
  } catch (e: any) {
    check("8. Student A searches own project", false, 0, e.message);
  }

  // 9. Search results are ranked by similarity descending
  try {
    let isDescending = true;
    for (let i = 1; i < searchResults.length; i++) {
      if (searchResults[i].similarity > searchResults[i - 1].similarity) {
        isDescending = false;
        break;
      }
    }
    const passed = Boolean(searchResults.length > 0 && isDescending);
    check(
      "9. Results are ranked by similarity descending",
      passed,
      200,
      passed
        ? `Top similarity: ${searchResults[0]?.similarity}, Last: ${searchResults[searchResults.length - 1]?.similarity}`
        : "Results not sorted descending"
    );
  } catch (e: any) {
    check("9. Results are ranked by similarity descending", false, 0, e.message);
  }

  // 10. Result contains all required fields (chunkId, materialId, materialName, pageNumber, content, similarity)
  try {
    const first = searchResults[0];
    const passed = Boolean(
      first &&
      typeof first.chunkId === "string" && first.chunkId.length > 0 &&
      typeof first.materialId === "string" && first.materialId.length > 0 &&
      typeof first.materialName === "string" && first.materialName.length > 0 &&
      typeof first.pageNumber === "number" && first.pageNumber >= 1 &&
      typeof first.content === "string" && first.content.length > 0 &&
      typeof first.similarity === "number" && first.similarity >= 0
    );
    check(
      "10. Result contains chunkId, materialId, materialName, pageNumber, content, similarity",
      passed,
      200,
      passed
        ? `Material: "${first.materialName}", Page: ${first.pageNumber}, Sim: ${first.similarity}`
        : JSON.stringify(first)
    );
  } catch (e: any) {
    check("10. Result contains all required fields", false, 0, e.message);
  }

  // 11. Result does NOT contain embedding or filePath
  try {
    const hasEmbedding = searchResults.some((r) => r.embedding !== undefined);
    const hasFilePath = searchResults.some((r) => r.filePath !== undefined);
    const passed = Boolean(!hasEmbedding && !hasFilePath);
    check(
      "11. Result does NOT leak embedding vectors or filesystem paths",
      passed,
      200,
      passed ? "Vector embeddings and internal file paths are strictly hidden" : `Embedding: ${hasEmbedding}, FilePath: ${hasFilePath}`
    );
  } catch (e: any) {
    check("11. Result does NOT leak embedding vectors or paths", false, 0, e.message);
  }

  // Setup Student B
  const studentBEmail = `student_b_search_${Date.now()}@demo.edu`;
  const signupBRes = await fetch(`${BASE_URL}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Student B Search",
      email: studentBEmail,
      password: "password123",
      confirmPassword: "password123",
    }),
  });
  const studentBCookie = signupBRes.headers.get("set-cookie")?.split(";")[0] || "";

  // 12. Student B cannot search Student A's project -> Must return 404
  try {
    const res = await fetch(`${BASE_URL}/api/search?projectId=project-raft-consensus&q=leader`, {
      headers: { Cookie: studentBCookie },
    });
    const json = await res.json();
    const passed = Boolean(res.status === 404 && json.error === "Project not found");
    check(
      "12. Cross-tenant search blocked (Student B searching Student A's project)",
      passed,
      res.status,
      passed ? "404 Project not found (No data or existence leaked)" : JSON.stringify(json)
    );
  } catch (e: any) {
    check("12. Cross-tenant search blocked", false, 0, e.message);
  }

  // 13. Admin can search Student A's project -> Must return 200
  const loginAdminRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@demo.edu", password: "admin123" }),
  });
  const adminCookie = loginAdminRes.headers.get("set-cookie")?.split(";")[0] || "";

  try {
    const res = await fetch(`${BASE_URL}/api/search?projectId=project-raft-consensus&q=leader`, {
      headers: { Cookie: adminCookie },
    });
    const json = await res.json();
    const passed = Boolean(res.status === 200 && Array.isArray(json.results));
    check(
      "13. Admin RBAC can search student's project",
      passed,
      res.status,
      passed ? `Admin retrieved ${json.results.length} results` : JSON.stringify(json)
    );
  } catch (e: any) {
    check("13. Admin RBAC can search student's project", false, 0, e.message);
  }

  // 14. Valid query with no matches -> Must return 200 with empty results
  // Create an empty project for Student A without materials
  let alexSpace = await prisma.space.findFirst({ where: { userId: "demo-student-alex" } });
  if (!alexSpace) {
    alexSpace = await prisma.space.create({
      data: { name: "Alex Test Space", userId: "demo-student-alex" },
    });
  }

  const emptyProject = await prisma.project.create({
    data: {
      name: "Empty Test Project For Search",
      learningGoal: "Validate zero results handling",
      spaceId: alexSpace.id,
      userId: "demo-student-alex",
    },
  });

  try {
    const res = await fetch(`${BASE_URL}/api/search?projectId=${emptyProject.id}&q=anything`, {
      headers: { Cookie: alexCookie },
    });
    const json = await res.json();
    const passed = Boolean(
      res.status === 200 &&
      Array.isArray(json.results) &&
      json.results.length === 0 &&
      json.totalCount === 0 &&
      json.query === "anything"
    );
    check(
      "14. Valid query with no matches returns 200 and empty results array",
      passed,
      res.status,
      passed ? "Returned 200 with results: [], totalCount: 0" : JSON.stringify(json)
    );
  } catch (e: any) {
    check("14. Valid query with no matches returns 200", false, 0, e.message);
  }

  // 15. Results remain strictly project-scoped
  // Create a project for Student B with distinct material & chunk
  const spaceBRes = await fetch(`${BASE_URL}/api/spaces`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: studentBCookie },
    body: JSON.stringify({ name: "Student B Space", description: "Test space" }),
  });
  const spaceB = await spaceBRes.json();

  const projectBRes = await fetch(`${BASE_URL}/api/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: studentBCookie },
    body: JSON.stringify({
      name: "Botanical Photosynthesis Project",
      learningGoal: "Chloroplast light reactions",
      spaceId: spaceB.space.id,
    }),
  });
  const projectB = await projectBRes.json();
  const projectBId = projectB.project.id;

  // Insert a distinct chunk in Student B's project
  const chloroplastEmbedding = await getEmbedding(
    "Chloroplasts contain chlorophyll pigments that absorb light in the thylakoid membrane."
  );

  const materialB = await prisma.material.create({
    data: {
      name: "Photosynthesis_Biology.pdf",
      filePath: "/uploads/photosynthesis_biology_test.pdf",
      fileSizeBytes: 1024,
      pageCount: 5,
      status: "READY",
      projectId: projectBId,
      chunks: {
        create: [
          {
            chunkIndex: 0,
            pageNumber: 3,
            content: "Chloroplasts contain chlorophyll pigments that absorb light in the thylakoid membrane.",
            embedding: JSON.stringify(chloroplastEmbedding),
          },
        ],
      },
    },
  });

  try {
    // Student A searches for "chloroplasts" in Alex's Raft consensus project
    const resA = await fetch(`${BASE_URL}/api/search?projectId=project-raft-consensus&q=chloroplasts`, {
      headers: { Cookie: alexCookie },
    });
    const jsonA = await resA.json();
    const leakFound = jsonA.results?.some((r: any) =>
      r.content?.includes("Chloroplasts") || r.materialName?.includes("Photosynthesis")
    );

    // Student B searches in Project B
    const resB = await fetch(`${BASE_URL}/api/search?projectId=${projectBId}&q=chloroplasts`, {
      headers: { Cookie: studentBCookie },
    });
    const jsonB = await resB.json();
    const studentBFoundOwn = jsonB.results?.some((r: any) =>
      r.materialName?.includes("Photosynthesis_Biology.pdf")
    );

    const passed = Boolean(!leakFound && studentBFoundOwn);
    check(
      "15. Strict project scope enforcement (no cross-project chunk leakage)",
      passed,
      200,
      passed
        ? "Alex cannot see Student B's chunks; Student B sees own chunks"
        : `Leak: ${leakFound}, Student B found own: ${studentBFoundOwn}`
    );
  } catch (e: any) {
    check("15. Strict project scope enforcement", false, 0, e.message);
  }

  // Cleanup test records
  try {
    await prisma.material.deleteMany({ where: { id: materialB.id } });
    await prisma.project.deleteMany({ where: { id: { in: [emptyProject.id, projectBId] } } });
  } catch (cleanupErr) {
    console.warn("Cleanup error (ignored):", cleanupErr);
  }

  console.log("\n================================================================================");
  const passCount = results.filter((r) => r.passed).length;
  const totalCount = results.length;
  console.log(`🏁 TESTS COMPLETED: ${passCount} OF ${totalCount} PASSED (${((passCount / totalCount) * 100).toFixed(1)}%)`);
  console.log("================================================================================\n");

  if (passCount !== totalCount) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});

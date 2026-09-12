import { prisma } from "../lib/db/prisma";

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
  console.log("🔒 TESTING PROJECT EDITING (PUT /api/projects) & SECURITY CONVENTIONS");
  console.log("================================================================================\n");

  // 1. Unauthenticated request -> Must fail with 401
  try {
    const res = await fetch(`${BASE_URL}/api/projects`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: "some-proj-id", name: "Hacked Project", learningGoal: "Tamper" }),
    });
    const json = await res.json();
    const passed = res.status === 401 && json.error === "Unauthorized";
    check("1. Unauthenticated PUT /api/projects", passed, res.status, json.error || JSON.stringify(json));
  } catch (e: any) {
    check("1. Unauthenticated PUT /api/projects", false, 0, e.message);
  }

  // 2. Invalid session token -> Must fail with 401
  try {
    const res = await fetch(`${BASE_URL}/api/projects`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Cookie: "study_session=fake_invalid_token_9999",
      },
      body: JSON.stringify({ id: "some-proj-id", name: "Hacked Project", learningGoal: "Tamper" }),
    });
    const json = await res.json();
    const passed = res.status === 401 && json.error === "Unauthorized";
    check("2. Invalid session cookie PUT /api/projects", passed, res.status, json.error || JSON.stringify(json));
  } catch (e: any) {
    check("2. Invalid session cookie PUT /api/projects", false, 0, e.message);
  }

  // Log in Student A (Alex)
  const loginAlexRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "alex@demo.edu", password: "student123" }),
  });
  const alexCookie = loginAlexRes.headers.get("set-cookie")?.split(";")[0] || "";

  // 3. Authenticated request missing project ID -> Must fail with 400
  try {
    const res = await fetch(`${BASE_URL}/api/projects`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Cookie: alexCookie },
      body: JSON.stringify({ name: "No ID Project", learningGoal: "Missing ID" }),
    });
    const json = await res.json();
    const passed = res.status === 400 && json.error === "Missing project id";
    check("3. Missing project ID PUT /api/projects", passed, res.status, json.error || JSON.stringify(json));
  } catch (e: any) {
    check("3. Missing project ID PUT /api/projects", false, 0, e.message);
  }

  // 4. Authenticated request with non-existent project ID -> Must return 404
  try {
    const res = await fetch(`${BASE_URL}/api/projects`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Cookie: alexCookie },
      body: JSON.stringify({
        id: "non-existent-project-uuid-99999",
        name: "Ghost Project",
        learningGoal: "Nonexistent",
      }),
    });
    const json = await res.json();
    const passed = res.status === 404 && json.error === "Project not found";
    check("4. Non-existent project ID PUT /api/projects", passed, res.status, json.error || JSON.stringify(json));
  } catch (e: any) {
    check("4. Non-existent project ID PUT /api/projects", false, 0, e.message);
  }

  // Find or create a space for Student A to host our test project
  let alexSpace = await prisma.space.findFirst({
    where: { userId: "demo-student-alex" },
  });
  if (!alexSpace) {
    alexSpace = await prisma.space.create({
      data: {
        id: "test-space-alex",
        name: "Alex's Space",
        userId: "demo-student-alex",
      },
    });
  }

  // 5. Student A creates a dedicated test Project via POST /api/projects
  let testProjectId = "";
  try {
    const res = await fetch(`${BASE_URL}/api/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: alexCookie },
      body: JSON.stringify({
        name: "Step 5 Original Project",
        description: "Initial description for testing",
        learningGoal: "Initial learning goal",
        spaceId: alexSpace.id,
      }),
    });
    const json = await res.json();
    testProjectId = json.project?.id;
    const passed = res.status === 201 && !!testProjectId;
    check("5. Student A creates test project (POST /api/projects)", passed, res.status, `Created project ID: ${testProjectId}`);
  } catch (e: any) {
    check("5. Student A creates test project", false, 0, e.message);
  }

  // Create child concept and material to test relationship preservation
  const testConcept = await prisma.concept.create({
    data: {
      name: "Raft Terminology",
      description: "Basic terms in Raft",
      projectId: testProjectId,
      masteryScore: 85.0,
    },
  });

  const testMaterial = await prisma.material.create({
    data: {
      name: "Raft-Spec.pdf",
      filePath: "/uploads/raft-spec.pdf",
      projectId: testProjectId,
      status: "READY",
    },
  });

  // 6. Validation: Empty project name -> Must fail with 400
  try {
    const res = await fetch(`${BASE_URL}/api/projects`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Cookie: alexCookie },
      body: JSON.stringify({
        id: testProjectId,
        name: "   ",
        learningGoal: "Some goal",
      }),
    });
    const json = await res.json();
    const passed = res.status === 400 && json.error === "Project name is required";
    check("6. Validation: Empty project name returns 400", passed, res.status, json.error || JSON.stringify(json));
  } catch (e: any) {
    check("6. Validation: Empty project name", false, 0, e.message);
  }

  // 7. Validation: Empty learning goal -> Must fail with 400
  try {
    const res = await fetch(`${BASE_URL}/api/projects`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Cookie: alexCookie },
      body: JSON.stringify({
        id: testProjectId,
        name: "Valid Name",
        learningGoal: "   ",
      }),
    });
    const json = await res.json();
    const passed = res.status === 400 && json.error === "Learning goal is required";
    check("7. Validation: Empty learning goal returns 400", passed, res.status, json.error || JSON.stringify(json));
  } catch (e: any) {
    check("7. Validation: Empty learning goal", false, 0, e.message);
  }

  // 8. Student A edits Student A's own Project -> Succeeds (HTTP 200)
  try {
    const res = await fetch(`${BASE_URL}/api/projects`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Cookie: alexCookie },
      body: JSON.stringify({
        id: testProjectId,
        name: "Step 5 Renamed Project",
        description: "Updated description by Student A",
        learningGoal: "Master consensus safety invariants",
      }),
    });
    const json = await res.json();
    const dbProj = await prisma.project.findUnique({ where: { id: testProjectId } });
    const passed =
      res.status === 200 &&
      json.project?.name === "Step 5 Renamed Project" &&
      dbProj?.name === "Step 5 Renamed Project" &&
      dbProj?.description === "Updated description by Student A" &&
      dbProj?.learningGoal === "Master consensus safety invariants";
    check(
      "8. Student A successfully edits Student A's Project",
      passed,
      res.status,
      passed ? `Project updated in DB: "${dbProj?.name}" - "${dbProj?.learningGoal}"` : JSON.stringify(json)
    );
  } catch (e: any) {
    check("8. Student A successfully edits Student A's Project", false, 0, e.message);
  }

  // 9. Activity logging: Verify PROJECT_UPDATED event recorded in ActivityEvent table
  try {
    const event = await prisma.activityEvent.findFirst({
      where: {
        projectId: testProjectId,
        type: "PROJECT_UPDATED",
      },
      orderBy: { createdAt: "desc" },
    });
    const passed = !!event && event.type === "PROJECT_UPDATED" && event.description.includes("Step 5 Renamed Project");
    check(
      "9. Activity event PROJECT_UPDATED logged in database",
      passed,
      200,
      passed ? `Event ID: ${event?.id}, description: "${event?.description}"` : "Event not found"
    );
  } catch (e: any) {
    check("9. Activity event PROJECT_UPDATED", false, 0, e.message);
  }

  // Create Student B (Jordan)
  const studentBEmail = `student_b_p5_${Date.now()}@demo.edu`;
  const signupBRes = await fetch(`${BASE_URL}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Student B",
      email: studentBEmail,
      password: "password123",
      confirmPassword: "password123",
    }),
  });
  const studentBCookie = signupBRes.headers.get("set-cookie")?.split(";")[0] || "";

  // 10. Student B attempts to edit Student A's Project -> Must be Forbidden (403 or 404)
  try {
    const res = await fetch(`${BASE_URL}/api/projects`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Cookie: studentBCookie },
      body: JSON.stringify({
        id: testProjectId,
        name: "Malicious Tampering by Student B",
        description: "Hacked",
        learningGoal: "Malicious Goal",
      }),
    });
    const json = await res.json();
    const dbProj = await prisma.project.findUnique({ where: { id: testProjectId } });
    const passed =
      (res.status === 403 || res.status === 404) &&
      dbProj?.name === "Step 5 Renamed Project" && // Verified unchanged in DB
      dbProj?.learningGoal === "Master consensus safety invariants";
    check(
      "10. Student B cannot edit Student A's Project (Cross-tenant security)",
      passed,
      res.status,
      passed ? `Access denied with HTTP ${res.status}. DB project unchanged: "${dbProj?.name}"` : JSON.stringify(json)
    );
  } catch (e: any) {
    check("10. Student B cannot edit Student A's Project", false, 0, e.message);
  }

  // 11. Security: Attempting to tamper with ownership (userId) via PUT -> Must be ignored/forbidden
  try {
    const studentBUser = await prisma.user.findUnique({ where: { email: studentBEmail } });
    const res = await fetch(`${BASE_URL}/api/projects`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Cookie: alexCookie },
      body: JSON.stringify({
        id: testProjectId,
        name: "Ownership Tamper Test",
        learningGoal: "Attempting to change owner",
        userId: studentBUser?.id, // Attempt to transfer ownership
      }),
    });
    const dbProj = await prisma.project.findUnique({ where: { id: testProjectId } });
    const passed = dbProj?.userId === "demo-student-alex"; // Ownership was NOT transferred
    check(
      "11. Project ownership (userId) cannot be transferred via PUT",
      passed,
      res.status,
      passed ? `Owner remains: ${dbProj?.userId}` : "Ownership transfer occurred!"
    );
  } catch (e: any) {
    check("11. Ownership tamper test", false, 0, e.message);
  }

  // 12. Admin edits Student A's Project -> Succeeds (Admin RBAC convention)
  const loginAdminRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@demo.edu", password: "admin123" }),
  });
  const adminCookie = loginAdminRes.headers.get("set-cookie")?.split(";")[0] || "";

  try {
    const res = await fetch(`${BASE_URL}/api/projects`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Cookie: adminCookie },
      body: JSON.stringify({
        id: testProjectId,
        name: "Admin Supervised Project",
        description: "Supervised by Dr. Vance",
        learningGoal: "Comprehensive Distributed Systems Curriculum",
      }),
    });
    const json = await res.json();
    const dbProj = await prisma.project.findUnique({ where: { id: testProjectId } });
    const passed =
      res.status === 200 &&
      json.project?.name === "Admin Supervised Project" &&
      dbProj?.name === "Admin Supervised Project";
    check(
      "12. Admin role can edit Project (RBAC convention)",
      passed,
      res.status,
      passed ? `Admin update verified in DB: "${dbProj?.name}"` : JSON.stringify(json)
    );
  } catch (e: any) {
    check("12. Admin role can edit Project", false, 0, e.message);
  }

  // 13. Relationship Regression Check: Concepts, Materials, and Space remain intact
  try {
    const fullProj = await prisma.project.findUnique({
      where: { id: testProjectId },
      include: {
        space: true,
        concepts: true,
        materials: true,
      },
    });
    const passed =
      fullProj?.spaceId === alexSpace.id &&
      fullProj?.concepts.some((c) => c.id === testConcept.id) &&
      fullProj?.materials.some((m) => m.id === testMaterial.id) &&
      fullProj?.concepts.length === 1 &&
      fullProj?.materials.length === 1;
    check(
      "13. Relationship Regression: Space, Concepts, Materials preserved intact",
      passed,
      200,
      passed
        ? `Space: ${fullProj?.space.name}, Concepts: ${fullProj?.concepts.length}, Materials: ${fullProj?.materials.length}`
        : "Relationships broken or lost!"
    );
  } catch (e: any) {
    check("13. Relationship Regression", false, 0, e.message);
  }

  // 14. GET /api/projects?projectId=... reflects the updated project
  try {
    const res = await fetch(`${BASE_URL}/api/projects?projectId=${testProjectId}`, {
      headers: { Cookie: alexCookie },
    });
    const json = await res.json();
    const passed = res.status === 200 && json.project?.name === "Admin Supervised Project";
    check(
      "14. GET /api/projects?projectId reflects updated project",
      passed,
      res.status,
      passed ? `Fetched project name: "${json.project?.name}"` : JSON.stringify(json)
    );
  } catch (e: any) {
    check("14. GET /api/projects?projectId", false, 0, e.message);
  }

  // 15. Clean up: DELETE /api/projects deletes the test project
  try {
    const res = await fetch(`${BASE_URL}/api/projects?id=${testProjectId}`, {
      method: "DELETE",
      headers: { Cookie: alexCookie },
    });
    const json = await res.json();
    const dbProj = await prisma.project.findUnique({ where: { id: testProjectId } });
    const passed = res.status === 200 && json.success === true && dbProj === null;
    check(
      "15. DELETE /api/projects still functions correctly",
      passed,
      res.status,
      passed ? "Test project deleted and confirmed absent in DB" : JSON.stringify(json)
    );
  } catch (e: any) {
    check("15. DELETE /api/projects still functions correctly", false, 0, e.message);
  }

  console.log("\n================================================================================");
  const passCount = results.filter((r) => r.passed).length;
  const totalCount = results.length;
  console.log(`🏁 STEP 5 TESTS COMPLETED: ${passCount} OF ${totalCount} PASSED (${((passCount / totalCount) * 100).toFixed(1)}%)`);
  console.log("================================================================================\n");

  if (passCount !== totalCount) {
    process.exit(1);
  }
}

runTests()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

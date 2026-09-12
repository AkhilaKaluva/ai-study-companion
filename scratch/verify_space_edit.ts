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
  console.log("🔒 TESTING SPACE EDITING (PUT /api/spaces) & SECURITY CONVENTIONS");
  console.log("================================================================================\n");

  // 1. Unauthenticated request -> Must fail with 401
  try {
    const res = await fetch(`${BASE_URL}/api/spaces`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: "some-space-id", name: "Hacked Space" }),
    });
    const json = await res.json();
    const passed = res.status === 401 && json.error === "Unauthorized";
    check("1. Unauthenticated PUT /api/spaces", passed, res.status, json.error || JSON.stringify(json));
  } catch (e: any) {
    check("1. Unauthenticated PUT /api/spaces", false, 0, e.message);
  }

  // 2. Invalid session token -> Must fail with 401
  try {
    const res = await fetch(`${BASE_URL}/api/spaces`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Cookie: "study_session=fake_invalid_token_9999",
      },
      body: JSON.stringify({ id: "some-space-id", name: "Hacked Space" }),
    });
    const json = await res.json();
    const passed = res.status === 401 && json.error === "Unauthorized";
    check("2. Invalid session cookie PUT /api/spaces", passed, res.status, json.error || JSON.stringify(json));
  } catch (e: any) {
    check("2. Invalid session cookie PUT /api/spaces", false, 0, e.message);
  }

  // Log in Student A (Alex)
  const loginAlexRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "alex@demo.edu", password: "student123" }),
  });
  const alexCookie = loginAlexRes.headers.get("set-cookie")?.split(";")[0] || "";

  // 3. Authenticated request missing space ID -> Must fail with 400
  try {
    const res = await fetch(`${BASE_URL}/api/spaces`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Cookie: alexCookie },
      body: JSON.stringify({ name: "No ID Space" }),
    });
    const json = await res.json();
    const passed = res.status === 400 && json.error === "Missing space id";
    check("3. Missing space ID PUT /api/spaces", passed, res.status, json.error || JSON.stringify(json));
  } catch (e: any) {
    check("3. Missing space ID PUT /api/spaces", false, 0, e.message);
  }

  // 4. Authenticated request with non-existent space ID -> Must return 404
  try {
    const res = await fetch(`${BASE_URL}/api/spaces`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Cookie: alexCookie },
      body: JSON.stringify({ id: "non-existent-space-uuid-12345", name: "Ghost Space" }),
    });
    const json = await res.json();
    const passed = res.status === 404 && json.error === "Space not found";
    check("4. Non-existent space ID PUT /api/spaces", passed, res.status, json.error || JSON.stringify(json));
  } catch (e: any) {
    check("4. Non-existent space ID PUT /api/spaces", false, 0, e.message);
  }

  // 5. Student A creates a dedicated test space via POST /api/spaces
  let testSpaceId = "";
  try {
    const res = await fetch(`${BASE_URL}/api/spaces`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: alexCookie },
      body: JSON.stringify({
        name: "Step 4 Original Space",
        description: "Initial description for testing",
      }),
    });
    const json = await res.json();
    testSpaceId = json.space?.id;
    const passed = res.status === 201 && !!testSpaceId;
    check("5. Student A creates test space (POST /api/spaces)", passed, res.status, `Created space ID: ${testSpaceId}`);
  } catch (e: any) {
    check("5. Student A creates test space", false, 0, e.message);
  }

  // 6. Validation: Empty name -> Must fail with 400
  try {
    const res = await fetch(`${BASE_URL}/api/spaces`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Cookie: alexCookie },
      body: JSON.stringify({ id: testSpaceId, name: "   ", description: "Empty name test" }),
    });
    const json = await res.json();
    const passed = res.status === 400 && json.error === "Space name is required";
    check("6. Validation: Empty space name returns 400", passed, res.status, json.error || JSON.stringify(json));
  } catch (e: any) {
    check("6. Validation: Empty space name", false, 0, e.message);
  }

  // 7. Student A edits Student A's own Space -> Succeeds (HTTP 200)
  try {
    const res = await fetch(`${BASE_URL}/api/spaces`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Cookie: alexCookie },
      body: JSON.stringify({
        id: testSpaceId,
        name: "Step 4 Renamed Space",
        description: "Updated description by Student A",
      }),
    });
    const json = await res.json();
    const dbSpace = await prisma.space.findUnique({ where: { id: testSpaceId } });
    const passed =
      res.status === 200 &&
      json.space?.name === "Step 4 Renamed Space" &&
      dbSpace?.name === "Step 4 Renamed Space" &&
      dbSpace?.description === "Updated description by Student A";
    check(
      "7. Student A successfully edits Student A's Space",
      passed,
      res.status,
      passed ? `Space updated in DB: "${dbSpace?.name}" - "${dbSpace?.description}"` : JSON.stringify(json)
    );
  } catch (e: any) {
    check("7. Student A successfully edits Student A's Space", false, 0, e.message);
  }

  // 8. Activity logging: Verify SPACE_UPDATED event recorded in ActivityEvent table
  try {
    const event = await prisma.activityEvent.findFirst({
      where: {
        type: "SPACE_UPDATED",
        description: { contains: "Step 4 Renamed Space" },
      },
      orderBy: { createdAt: "desc" },
    });
    const passed = !!event && event.type === "SPACE_UPDATED";
    check(
      "8. Activity event SPACE_UPDATED logged in database",
      passed,
      200,
      passed ? `Event ID: ${event?.id}, description: "${event?.description}"` : "Event not found"
    );
  } catch (e: any) {
    check("8. Activity event SPACE_UPDATED", false, 0, e.message);
  }

  // Create Student B (Jordan)
  const studentBEmail = `student_b_${Date.now()}@demo.edu`;
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

  // 9. Student B attempts to edit Student A's Space -> Must be Forbidden (403 or 404)
  try {
    const res = await fetch(`${BASE_URL}/api/spaces`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Cookie: studentBCookie },
      body: JSON.stringify({
        id: testSpaceId,
        name: "Malicious Tampering by Student B",
        description: "Hacked",
      }),
    });
    const json = await res.json();
    const dbSpace = await prisma.space.findUnique({ where: { id: testSpaceId } });
    const passed =
      (res.status === 403 || res.status === 404) &&
      dbSpace?.name === "Step 4 Renamed Space"; // Verified space unchanged in DB
    check(
      "9. Student B cannot edit Student A's Space (Cross-tenant security)",
      passed,
      res.status,
      passed ? `Access denied with HTTP ${res.status}. DB space unchanged: "${dbSpace?.name}"` : JSON.stringify(json)
    );
  } catch (e: any) {
    check("9. Student B cannot edit Student A's Space", false, 0, e.message);
  }

  // 10. Admin edits Student A's Space -> Succeeds (Admin RBAC convention)
  const loginAdminRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@demo.edu", password: "admin123" }),
  });
  const adminCookie = loginAdminRes.headers.get("set-cookie")?.split(";")[0] || "";

  try {
    const res = await fetch(`${BASE_URL}/api/spaces`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Cookie: adminCookie },
      body: JSON.stringify({
        id: testSpaceId,
        name: "Admin Supervised Space",
        description: "Edited by platform admin",
      }),
    });
    const json = await res.json();
    const dbSpace = await prisma.space.findUnique({ where: { id: testSpaceId } });
    const passed =
      res.status === 200 &&
      json.space?.name === "Admin Supervised Space" &&
      dbSpace?.name === "Admin Supervised Space";
    check(
      "10. Admin role can edit Space (RBAC convention)",
      passed,
      res.status,
      passed ? `Admin update verified in DB: "${dbSpace?.name}"` : JSON.stringify(json)
    );
  } catch (e: any) {
    check("10. Admin role can edit Space", false, 0, e.message);
  }

  // 11. Create a project under the test space and edit space again to ensure relationships are preserved
  let testProjectId = "";
  try {
    const projRes = await fetch(`${BASE_URL}/api/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: alexCookie },
      body: JSON.stringify({
        name: "Test Project Under Space",
        learningGoal: "Testing relationships preservation",
        spaceId: testSpaceId,
      }),
    });
    const projJson = await projRes.json();
    testProjectId = projJson.project?.id;

    // Now edit space once more
    const res = await fetch(`${BASE_URL}/api/spaces`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Cookie: alexCookie },
      body: JSON.stringify({
        id: testSpaceId,
        name: "Preserved Relations Space",
        description: "Has child projects",
      }),
    });
    const json = await res.json();
    const updatedProjects = json.space?.projects;
    const passed =
      res.status === 200 &&
      Array.isArray(updatedProjects) &&
      updatedProjects.some((p: any) => p.id === testProjectId);
    check(
      "11. Relationships preserved on edit (Child projects retained)",
      passed,
      res.status,
      passed ? `Returned space includes ${updatedProjects.length} project(s)` : JSON.stringify(json)
    );
  } catch (e: any) {
    check("11. Relationships preserved on edit", false, 0, e.message);
  }

  // 12. GET /api/spaces returns the updated space
  try {
    const res = await fetch(`${BASE_URL}/api/spaces`, {
      headers: { Cookie: alexCookie },
    });
    const json = await res.json();
    const found = json.spaces?.find((s: any) => s.id === testSpaceId);
    const passed = res.status === 200 && found?.name === "Preserved Relations Space";
    check(
      "12. GET /api/spaces reflects updated space",
      passed,
      res.status,
      passed ? `Found space in list: "${found?.name}"` : "Not found in list"
    );
  } catch (e: any) {
    check("12. GET /api/spaces reflects updated space", false, 0, e.message);
  }

  // 13. Clean up: DELETE /api/spaces deletes the test space
  try {
    const res = await fetch(`${BASE_URL}/api/spaces?id=${testSpaceId}`, {
      method: "DELETE",
      headers: { Cookie: alexCookie },
    });
    const json = await res.json();
    const dbSpace = await prisma.space.findUnique({ where: { id: testSpaceId } });
    const passed = res.status === 200 && json.success === true && dbSpace === null;
    check(
      "13. DELETE /api/spaces still functions correctly",
      passed,
      res.status,
      passed ? "Test space deleted and confirmed absent in DB" : JSON.stringify(json)
    );
  } catch (e: any) {
    check("13. DELETE /api/spaces still functions correctly", false, 0, e.message);
  }

  console.log("\n================================================================================");
  const passCount = results.filter((r) => r.passed).length;
  const totalCount = results.length;
  console.log(`🏁 STEP 4 TESTS COMPLETED: ${passCount} OF ${totalCount} PASSED (${((passCount / totalCount) * 100).toFixed(1)}%)`);
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

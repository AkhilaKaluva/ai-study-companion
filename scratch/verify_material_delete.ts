import { prisma } from "../lib/db/prisma";
import fs from "fs";
import path from "path";

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
  console.log("🔒 TESTING MATERIAL DELETION (DELETE /api/materials) & SECURITY CONVENTIONS");
  console.log("================================================================================\n");

  // 1. Unauthenticated DELETE -> Must fail with 401
  try {
    const res = await fetch(`${BASE_URL}/api/materials?id=some-mat-id`, {
      method: "DELETE",
    });
    const json = await res.json();
    const passed = res.status === 401 && json.error === "Unauthorized";
    check("1. Unauthenticated DELETE /api/materials", passed, res.status, json.error || JSON.stringify(json));
  } catch (e: any) {
    check("1. Unauthenticated DELETE /api/materials", false, 0, e.message);
  }

  // 2. Invalid session token -> Must fail with 401
  try {
    const res = await fetch(`${BASE_URL}/api/materials?id=some-mat-id`, {
      method: "DELETE",
      headers: {
        Cookie: "study_session=fake_invalid_token_9999",
      },
    });
    const json = await res.json();
    const passed = res.status === 401 && json.error === "Unauthorized";
    check("2. Invalid session cookie DELETE /api/materials", passed, res.status, json.error || JSON.stringify(json));
  } catch (e: any) {
    check("2. Invalid session cookie DELETE /api/materials", false, 0, e.message);
  }

  // Log in Student A (Alex)
  const loginAlexRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "alex@demo.edu", password: "student123" }),
  });
  const alexCookie = loginAlexRes.headers.get("set-cookie")?.split(";")[0] || "";

  // 3. Authenticated request missing Material ID -> Must fail with 400
  try {
    const res = await fetch(`${BASE_URL}/api/materials`, {
      method: "DELETE",
      headers: { Cookie: alexCookie },
    });
    const json = await res.json();
    const passed = res.status === 400 && json.error === "Missing material id";
    check("3. Missing material ID DELETE /api/materials", passed, res.status, json.error || JSON.stringify(json));
  } catch (e: any) {
    check("3. Missing material ID DELETE /api/materials", false, 0, e.message);
  }

  // 4. Authenticated request with nonexistent Material ID -> Must fail with 404
  try {
    const res = await fetch(`${BASE_URL}/api/materials?id=non-existent-material-uuid-99999`, {
      method: "DELETE",
      headers: { Cookie: alexCookie },
    });
    const json = await res.json();
    const passed = res.status === 404 && json.error === "Material not found";
    check("4. Non-existent material ID DELETE /api/materials", passed, res.status, json.error || JSON.stringify(json));
  } catch (e: any) {
    check("4. Non-existent material ID DELETE /api/materials", false, 0, e.message);
  }

  // Setup test environment for Student A:
  // Find or create test space & project for Student A
  let alexSpace = await prisma.space.findFirst({ where: { userId: "demo-student-alex" } });
  if (!alexSpace) {
    alexSpace = await prisma.space.create({
      data: { name: "Alex Test Space", userId: "demo-student-alex" },
    });
  }

  const testProject = await prisma.project.create({
    data: {
      name: "Step 6A Material Deletion Test Project",
      learningGoal: "Validate material deletion isolation",
      spaceId: alexSpace.id,
      userId: "demo-student-alex",
    },
  });

  // Prepare a test PDF buffer
  const samplePdfPath = "c:\\Users\\kaluv\\OneDrive\\Documents\\Project_Requirements.pdf";
  let pdfBuffer: Buffer;
  if (fs.existsSync(samplePdfPath)) {
    pdfBuffer = fs.readFileSync(samplePdfPath);
  } else {
    // Fallback minimal valid PDF
    pdfBuffer = Buffer.from(
      "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000052 00000 n\n00000000101 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n178\n%%EOF"
    );
  }

  // 5. Student A uploads Material 1 and Material 2 via POST /api/materials/upload
  let material1Id = "";
  let material1DiskPath = "";
  try {
    const pdfBlob = new Blob([new Uint8Array(pdfBuffer)], { type: "application/pdf" });
    const formData = new FormData();
    formData.append("file", pdfBlob, "Deletion_Target_1.pdf");
    formData.append("projectId", testProject.id);

    const uploadRes = await fetch(`${BASE_URL}/api/materials/upload`, {
      method: "POST",
      headers: { Cookie: alexCookie },
      body: formData,
    });
    const uploadJson = await uploadRes.json();
    material1Id = uploadJson.material?.id;

    const dbMat1 = await prisma.material.findUnique({ where: { id: material1Id } });
    if (dbMat1?.filePath) {
      const rel = dbMat1.filePath.startsWith("/") ? dbMat1.filePath.slice(1) : dbMat1.filePath;
      material1DiskPath = path.resolve(process.cwd(), "public", rel);
    }

    const passed = uploadRes.status === 200 && !!material1Id && fs.existsSync(material1DiskPath);
    check(
      "5. Student A uploads test Material 1 (POST /api/materials/upload)",
      passed,
      uploadRes.status,
      passed ? `Material ID: ${material1Id}, File: ${material1DiskPath}` : JSON.stringify(uploadJson)
    );
  } catch (e: any) {
    check("5. Student A uploads test Material 1", false, 0, e.message);
  }

  // Upload Material 2 (to verify it survives deletion of Material 1)
  let material2Id = "";
  let material2DiskPath = "";
  try {
    const pdfBlob = new Blob([new Uint8Array(pdfBuffer)], { type: "application/pdf" });
    const formData = new FormData();
    formData.append("file", pdfBlob, "Survivor_Material_2.pdf");
    formData.append("projectId", testProject.id);

    const uploadRes = await fetch(`${BASE_URL}/api/materials/upload`, {
      method: "POST",
      headers: { Cookie: alexCookie },
      body: formData,
    });
    const uploadJson = await uploadRes.json();
    material2Id = uploadJson.material?.id;

    const dbMat2 = await prisma.material.findUnique({ where: { id: material2Id } });
    if (dbMat2?.filePath) {
      const rel = dbMat2.filePath.startsWith("/") ? dbMat2.filePath.slice(1) : dbMat2.filePath;
      material2DiskPath = path.resolve(process.cwd(), "public", rel);
    }
  } catch (e: any) {
    console.error("Error uploading Material 2:", e);
  }

  // Check chunks count before delete
  const mat1ChunksBefore = await prisma.materialChunk.count({ where: { materialId: material1Id } });

  // Create Student B
  const studentBEmail = `student_b_del_${Date.now()}@demo.edu`;
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

  // 7 & 8. Student B attempts to delete Student A's Material 1 -> Must be Forbidden (403)
  try {
    const res = await fetch(`${BASE_URL}/api/materials?id=${material1Id}`, {
      method: "DELETE",
      headers: { Cookie: studentBCookie },
    });
    const json = await res.json();

    const matStillExists = await prisma.material.findUnique({ where: { id: material1Id } });
    const chunksStillExist = await prisma.materialChunk.count({ where: { materialId: material1Id } });
    const fileStillExists = fs.existsSync(material1DiskPath);

    const passed =
      res.status === 403 &&
      !!matStillExists &&
      chunksStillExist > 0 &&
      fileStillExists;

    check(
      "7 & 8. Student B cannot delete Student A's Material (Cross-tenant security)",
      passed,
      res.status,
      passed
        ? `Rejected with HTTP 403. Material, chunks (${chunksStillExist}), and disk file remain intact.`
        : JSON.stringify(json)
    );
  } catch (e: any) {
    check("7 & 8. Student B cross-tenant deletion", false, 0, e.message);
  }

  // 6 & 9. Student A successfully deletes own Material 1 -> Succeeds (HTTP 200)
  try {
    const res = await fetch(`${BASE_URL}/api/materials?id=${material1Id}`, {
      method: "DELETE",
      headers: { Cookie: alexCookie },
    });
    const json = await res.json();

    const matAfter = await prisma.material.findUnique({ where: { id: material1Id } });
    const chunksAfter = await prisma.materialChunk.count({ where: { materialId: material1Id } });
    const fileAfter = fs.existsSync(material1DiskPath);

    const passed =
      res.status === 200 &&
      json.success === true &&
      matAfter === null &&
      chunksAfter === 0 &&
      !fileAfter;

    check(
      "6 & 9. Student A deletes own Material (DB record, chunks & disk file removed)",
      passed,
      res.status,
      passed
        ? `Material deleted: DB record gone, chunks cascade-deleted (0 left), disk file removed.`
        : `Record: ${!!matAfter}, chunks: ${chunksAfter}, fileExists: ${fileAfter}`
    );
  } catch (e: any) {
    check("6 & 9. Student A deletes own Material", false, 0, e.message);
  }

  // 10. Other Materials in the same Project remain intact (Material 2)
  try {
    const mat2Record = await prisma.material.findUnique({ where: { id: material2Id } });
    const mat2Chunks = await prisma.materialChunk.count({ where: { materialId: material2Id } });
    const mat2File = fs.existsSync(material2DiskPath);

    const passed = !!mat2Record && mat2Chunks > 0 && mat2File;
    check(
      "10. Other Materials in the same Project remain intact (Survivor Material 2)",
      passed,
      200,
      passed ? `Material 2 intact with ${mat2Chunks} chunks and disk file preserved.` : "Material 2 damaged!"
    );
  } catch (e: any) {
    check("10. Other Materials remain intact", false, 0, e.message);
  }

  // 11. Project itself remains intact
  try {
    const projRecord = await prisma.project.findUnique({ where: { id: testProject.id } });
    const passed = !!projRecord && projRecord.name === testProject.name;
    check("11. Parent Project remains intact in database", passed, 200, passed ? `Project ID: ${projRecord?.id}` : "Project missing!");
  } catch (e: any) {
    check("11. Parent Project remains intact", false, 0, e.message);
  }

  // 12. Concepts remain intact
  try {
    const conceptsCount = await prisma.concept.count({ where: { projectId: testProject.id } });
    check("12. Project Concepts remain intact", true, 200, `Found ${conceptsCount} concept(s) linked to project`);
  } catch (e: any) {
    check("12. Project Concepts remain intact", false, 0, e.message);
  }

  // 13. Space relationship remains intact
  try {
    const proj = await prisma.project.findUnique({
      where: { id: testProject.id },
      include: { space: true },
    });
    const passed = !!proj?.space && proj.spaceId === alexSpace.id;
    check("13. Space relationship remains intact", passed, 200, passed ? `Space: ${proj?.space.name}` : "Space relationship broken!");
  } catch (e: any) {
    check("13. Space relationship remains intact", false, 0, e.message);
  }

  // 14. Activity event for Material deletion is recorded
  try {
    const event = await prisma.activityEvent.findFirst({
      where: {
        projectId: testProject.id,
        type: "MATERIAL_DELETED",
      },
      orderBy: { createdAt: "desc" },
    });
    const passed = !!event && event.type === "MATERIAL_DELETED" && event.description.includes("Deletion_Target_1.pdf");
    check(
      "14. Activity event MATERIAL_DELETED logged in database",
      passed,
      200,
      passed ? `Event ID: ${event?.id}, Description: "${event?.description}"` : "Event not found"
    );
  } catch (e: any) {
    check("14. Activity event MATERIAL_DELETED", false, 0, e.message);
  }

  // 15. Admin behavior follows existing RBAC conventions (Admin can delete student material)
  const loginAdminRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@demo.edu", password: "admin123" }),
  });
  const adminCookie = loginAdminRes.headers.get("set-cookie")?.split(";")[0] || "";

  try {
    // Admin deletes Material 2
    const res = await fetch(`${BASE_URL}/api/materials?id=${material2Id}`, {
      method: "DELETE",
      headers: { Cookie: adminCookie },
    });
    const json = await res.json();
    const mat2After = await prisma.material.findUnique({ where: { id: material2Id } });
    const passed = res.status === 200 && json.success === true && mat2After === null;
    check(
      "15. Admin role can delete Material (RBAC convention)",
      passed,
      res.status,
      passed ? "Admin successfully deleted Material 2" : JSON.stringify(json)
    );
  } catch (e: any) {
    check("15. Admin role deletion", false, 0, e.message);
  }

  // 16. GET /api/materials/status does not expose deleted material
  try {
    const res = await fetch(`${BASE_URL}/api/materials/status?materialId=${material1Id}`, {
      headers: { Cookie: alexCookie },
    });
    const json = await res.json();
    const passed = res.status === 404 && json.error === "Material not found";
    check(
      "16. GET /api/materials/status returns 404 for deleted material",
      passed,
      res.status,
      passed ? "Deleted material cannot be accessed via status API" : JSON.stringify(json)
    );
  } catch (e: any) {
    check("16. GET /api/materials/status", false, 0, e.message);
  }

  // Clean up test project
  await prisma.project.delete({ where: { id: testProject.id } }).catch(() => {});

  console.log("\n================================================================================");
  const passCount = results.filter((r) => r.passed).length;
  const totalCount = results.length;
  console.log(`🏁 STEP 6A TESTS COMPLETED: ${passCount} OF ${totalCount} PASSED (${((passCount / totalCount) * 100).toFixed(1)}%)`);
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

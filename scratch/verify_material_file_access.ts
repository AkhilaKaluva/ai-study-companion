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
  console.log("🔒 TESTING MATERIAL FILE ACCESS (VIEW/DOWNLOAD) & CHUNK INSPECTION");
  console.log("================================================================================\n");

  // 1. Unauthenticated request -> Must return 401
  try {
    const res = await fetch(`${BASE_URL}/api/materials/file?id=some-id`);
    const json = await res.json();
    const passed = res.status === 401 && json.error === "Unauthorized";
    check("1. Unauthenticated GET /api/materials/file", passed, res.status, json.error || JSON.stringify(json));
  } catch (e: any) {
    check("1. Unauthenticated GET /api/materials/file", false, 0, e.message);
  }

  // 2. Invalid session token -> Must return 401
  try {
    const res = await fetch(`${BASE_URL}/api/materials/file?id=some-id`, {
      headers: { Cookie: "study_session=fake_invalid_token_9999" },
    });
    const json = await res.json();
    const passed = res.status === 401 && json.error === "Unauthorized";
    check("2. Invalid session token GET /api/materials/file", passed, res.status, json.error || JSON.stringify(json));
  } catch (e: any) {
    check("2. Invalid session token GET /api/materials/file", false, 0, e.message);
  }

  // Log in Student A (Alex: alex@demo.edu / student123)
  const loginAlexRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "alex@demo.edu", password: "student123" }),
  });
  const alexCookie = loginAlexRes.headers.get("set-cookie")?.split(";")[0] || "";

  // 3. Missing ID parameter -> Must return 400
  try {
    const res = await fetch(`${BASE_URL}/api/materials/file`, {
      headers: { Cookie: alexCookie },
    });
    const json = await res.json();
    const passed = res.status === 400 && json.error === "Missing material id";
    check("3. Missing material id GET /api/materials/file", passed, res.status, json.error || JSON.stringify(json));
  } catch (e: any) {
    check("3. Missing material id GET /api/materials/file", false, 0, e.message);
  }

  // 4. Nonexistent material ID -> Must return 404
  try {
    const res = await fetch(`${BASE_URL}/api/materials/file?id=non-existent-material-id-99999`, {
      headers: { Cookie: alexCookie },
    });
    const json = await res.json();
    const passed = res.status === 404 && json.error === "Material not found";
    check("4. Nonexistent material id GET /api/materials/file", passed, res.status, json.error || JSON.stringify(json));
  } catch (e: any) {
    check("4. Nonexistent material id GET /api/materials/file", false, 0, e.message);
  }

  // Setup test environment:
  // Create a real temporary test PDF in public/uploads/
  const uploadsDir = path.resolve(process.cwd(), "public", "uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const testPdfFileName = `test_file_${Date.now()}.pdf`;
  const testPdfDiskPath = path.join(uploadsDir, testPdfFileName);
  const samplePdfBytes = Buffer.from("%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000052 00000 n\n0000000101 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n178\n%%EOF");
  fs.writeFileSync(testPdfDiskPath, samplePdfBytes);

  // Find or create test space & project for Student A
  let alexSpace = await prisma.space.findFirst({ where: { userId: "demo-student-alex" } });
  if (!alexSpace) {
    alexSpace = await prisma.space.create({
      data: { name: "Alex Test Space", userId: "demo-student-alex" },
    });
  }

  const testProjectA = await prisma.project.create({
    data: {
      name: "Step 6B File Access Test Project A",
      learningGoal: "Validate secure PDF viewing and downloading",
      spaceId: alexSpace.id,
      userId: "demo-student-alex",
    },
  });

  const materialA = await prisma.material.create({
    data: {
      name: "Lecture Notes On Algorithms.pdf",
      filePath: `/uploads/${testPdfFileName}`,
      fileSizeBytes: samplePdfBytes.length,
      pageCount: 1,
      status: "READY",
      projectId: testProjectA.id,
      chunks: {
        create: [
          {
            chunkIndex: 0,
            pageNumber: 1,
            content: "Introduction to graph algorithms and Dijkstra shortest path.",
            embedding: JSON.stringify([0.1, 0.2, 0.3, 0.4]),
          },
          {
            chunkIndex: 1,
            pageNumber: 1,
            content: "Analysis of time complexity: O((V + E) log V) with min-priority queue.",
            embedding: JSON.stringify([0.5, 0.6, 0.7, 0.8]),
          },
        ],
      },
    },
  });

  // 5. Owner can view PDF -> 200, Content-Type: application/pdf, Content-Disposition: inline
  try {
    const res = await fetch(`${BASE_URL}/api/materials/file?id=${materialA.id}`, {
      headers: { Cookie: alexCookie },
    });
    const contentType = res.headers.get("content-type");
    const contentDisposition = res.headers.get("content-disposition");
    const buffer = await res.arrayBuffer();
    const passed = Boolean(
      res.status === 200 &&
      contentType === "application/pdf" &&
      contentDisposition?.includes("inline") &&
      contentDisposition?.includes("Lecture Notes On Algorithms.pdf") &&
      buffer.byteLength === samplePdfBytes.length
    );

    check(
      "5. Owner can view PDF (inline)",
      passed,
      res.status,
      passed
        ? `200 application/pdf (${buffer.byteLength} bytes, ${contentDisposition})`
        : `Status: ${res.status}, Type: ${contentType}, Disp: ${contentDisposition}`
    );
  } catch (e: any) {
    check("5. Owner can view PDF (inline)", false, 0, e.message);
  }

  // 6. Owner can download PDF -> 200, Content-Disposition: attachment
  try {
    const res = await fetch(`${BASE_URL}/api/materials/file?id=${materialA.id}&download=1`, {
      headers: { Cookie: alexCookie },
    });
    const contentType = res.headers.get("content-type");
    const contentDisposition = res.headers.get("content-disposition");
    const buffer = await res.arrayBuffer();
    const passed = Boolean(
      res.status === 200 &&
      contentType === "application/pdf" &&
      contentDisposition?.includes("attachment") &&
      contentDisposition?.includes("Lecture Notes On Algorithms.pdf") &&
      buffer.byteLength === samplePdfBytes.length
    );

    check(
      "6. Owner can download PDF (attachment)",
      passed,
      res.status,
      passed
        ? `200 application/pdf attachment (${buffer.byteLength} bytes)`
        : `Status: ${res.status}, Disp: ${contentDisposition}`
    );
  } catch (e: any) {
    check("6. Owner can download PDF (attachment)", false, 0, e.message);
  }

  // Create Student B
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

  // 7. Cross-tenant access blocked -> Student B attempts to access Student A's material -> Must return 403
  try {
    const res = await fetch(`${BASE_URL}/api/materials/file?id=${materialA.id}`, {
      headers: { Cookie: studentBCookie },
    });
    const json = await res.json();
    const passed = res.status === 403 && json.error.includes("Forbidden");
    check(
      "7. Cross-tenant access blocked (Student B accessing Student A material)",
      passed,
      res.status,
      passed ? "403 Forbidden properly returned" : JSON.stringify(json)
    );
  } catch (e: any) {
    check("7. Cross-tenant access blocked", false, 0, e.message);
  }

  // 8. Cross-tenant download blocked -> Student B attempts to download Student A's material -> Must return 403
  try {
    const res = await fetch(`${BASE_URL}/api/materials/file?id=${materialA.id}&download=1`, {
      headers: { Cookie: studentBCookie },
    });
    const json = await res.json();
    const passed = res.status === 403 && json.error.includes("Forbidden");
    check(
      "8. Cross-tenant download blocked",
      passed,
      res.status,
      passed ? "403 Forbidden properly returned" : JSON.stringify(json)
    );
  } catch (e: any) {
    check("8. Cross-tenant download blocked", false, 0, e.message);
  }

  // 9. Admin access -> Admin can view Student A's material -> 200
  const loginAdminRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@demo.edu", password: "admin123" }),
  });
  const adminCookie = loginAdminRes.headers.get("set-cookie")?.split(";")[0] || "";

  try {
    const res = await fetch(`${BASE_URL}/api/materials/file?id=${materialA.id}`, {
      headers: { Cookie: adminCookie },
    });
    const contentType = res.headers.get("content-type");
    const passed = res.status === 200 && contentType === "application/pdf";
    check(
      "9. Admin RBAC can view student material",
      passed,
      res.status,
      passed ? "200 application/pdf returned for admin" : `Status: ${res.status}`
    );
  } catch (e: any) {
    check("9. Admin RBAC can view student material", false, 0, e.message);
  }

  // 10. Path traversal prevention -> Material record pointing outside public dir
  const maliciousMaterial = await prisma.material.create({
    data: {
      name: "Malicious Traversal.pdf",
      filePath: "/../../../../etc/passwd",
      fileSizeBytes: 100,
      pageCount: 1,
      status: "READY",
      projectId: testProjectA.id,
    },
  });

  try {
    const res = await fetch(`${BASE_URL}/api/materials/file?id=${maliciousMaterial.id}`, {
      headers: { Cookie: alexCookie },
    });
    const json = await res.json();
    const passed = res.status === 403 && json.error.includes("Forbidden");
    check(
      "10. Path traversal blocked (/../../../../etc/passwd)",
      passed,
      res.status,
      passed ? "403 Forbidden - prevented directory traversal" : JSON.stringify(json)
    );
  } catch (e: any) {
    check("10. Path traversal blocked", false, 0, e.message);
  }

  // 11. Missing physical file -> Returns 404
  const missingFileMaterial = await prisma.material.create({
    data: {
      name: "Ghost Material.pdf",
      filePath: "/uploads/ghost_nonexistent_12345.pdf",
      fileSizeBytes: 100,
      pageCount: 1,
      status: "READY",
      projectId: testProjectA.id,
    },
  });

  try {
    const res = await fetch(`${BASE_URL}/api/materials/file?id=${missingFileMaterial.id}`, {
      headers: { Cookie: alexCookie },
    });
    const json = await res.json();
    const passed = res.status === 404 && json.error === "Physical file not found";
    check(
      "11. Missing physical file returns 404",
      passed,
      res.status,
      passed ? "404 Physical file not found" : JSON.stringify(json)
    );
  } catch (e: any) {
    check("11. Missing physical file returns 404", false, 0, e.message);
  }

  // 12. Chunk inspection endpoint (/api/materials/chunks) - Unauthenticated -> 401
  try {
    const res = await fetch(`${BASE_URL}/api/materials/chunks?id=${materialA.id}`);
    const json = await res.json();
    const passed = res.status === 401 && json.error === "Unauthorized";
    check("12. Unauthenticated GET /api/materials/chunks", passed, res.status, json.error || JSON.stringify(json));
  } catch (e: any) {
    check("12. Unauthenticated GET /api/materials/chunks", false, 0, e.message);
  }

  // 13. Chunk inspection endpoint - Owner can inspect chunks -> 200 with chunks (no embeddings or file paths)
  try {
    const res = await fetch(`${BASE_URL}/api/materials/chunks?id=${materialA.id}`, {
      headers: { Cookie: alexCookie },
    });
    const json = await res.json();
    const hasEmbeddings = json.chunks?.some((c: any) => c.embedding !== undefined);
    const hasFilePath = json.material?.filePath !== undefined;
    const passed =
      res.status === 200 &&
      json.material?.id === materialA.id &&
      json.material?.name === materialA.name &&
      json.material?.chunkCount === 2 &&
      Array.isArray(json.chunks) &&
      json.chunks.length === 2 &&
      json.chunks[0].chunkIndex === 0 &&
      json.chunks[0].pageNumber === 1 &&
      json.chunks[0].content.includes("graph algorithms") &&
      !hasEmbeddings &&
      !hasFilePath;

    check(
      "13. Owner can inspect chunk metadata and previews (embeddings & path hidden)",
      passed,
      res.status,
      passed
        ? `200 returned ${json.chunks.length} chunks, embeddings hidden: ${!hasEmbeddings}, filePath hidden: ${!hasFilePath}`
        : JSON.stringify(json)
    );
  } catch (e: any) {
    check("13. Owner chunk inspection", false, 0, e.message);
  }

  // 14. Chunk inspection - Cross-tenant blocked -> Student B attempts to inspect Student A's chunks -> 403
  try {
    const res = await fetch(`${BASE_URL}/api/materials/chunks?id=${materialA.id}`, {
      headers: { Cookie: studentBCookie },
    });
    const json = await res.json();
    const passed = res.status === 403 && json.error.includes("Forbidden");
    check(
      "14. Cross-tenant chunk inspection blocked",
      passed,
      res.status,
      passed ? "403 Forbidden properly returned" : JSON.stringify(json)
    );
  } catch (e: any) {
    check("14. Cross-tenant chunk inspection blocked", false, 0, e.message);
  }

  // 15. Chunk inspection - Admin access -> 200
  try {
    const res = await fetch(`${BASE_URL}/api/materials/chunks?id=${materialA.id}`, {
      headers: { Cookie: adminCookie },
    });
    const json = await res.json();
    const passed = res.status === 200 && json.material?.id === materialA.id;
    check(
      "15. Admin role can inspect chunks",
      passed,
      res.status,
      passed ? "200 Admin access verified" : JSON.stringify(json)
    );
  } catch (e: any) {
    check("15. Admin role inspect chunks", false, 0, e.message);
  }

  // 16. Delete material, then file and chunks return 404
  try {
    const deleteRes = await fetch(`${BASE_URL}/api/materials?id=${materialA.id}`, {
      method: "DELETE",
      headers: { Cookie: alexCookie },
    });
    const deleteJson = await deleteRes.json();

    const fileAfterDelete = await fetch(`${BASE_URL}/api/materials/file?id=${materialA.id}`, {
      headers: { Cookie: alexCookie },
    });
    const chunksAfterDelete = await fetch(`${BASE_URL}/api/materials/chunks?id=${materialA.id}`, {
      headers: { Cookie: alexCookie },
    });

    const passed =
      deleteRes.status === 200 &&
      deleteJson.success === true &&
      fileAfterDelete.status === 404 &&
      chunksAfterDelete.status === 404;

    check(
      "16. Deleted material returns 404 for both file and chunks",
      passed,
      fileAfterDelete.status,
      passed ? "Material deleted, file and chunks cleanly return 404" : `Delete: ${deleteRes.status}, File: ${fileAfterDelete.status}`
    );
  } catch (e: any) {
    check("16. Deleted material returns 404", false, 0, e.message);
  }

  // Cleanup remaining test DB records
  try {
    await prisma.material.deleteMany({
      where: { id: { in: [maliciousMaterial.id, missingFileMaterial.id] } },
    });
    await prisma.project.delete({ where: { id: testProjectA.id } });
    if (fs.existsSync(testPdfDiskPath)) {
      fs.unlinkSync(testPdfDiskPath);
    }
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

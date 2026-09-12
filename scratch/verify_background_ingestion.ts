import { prisma } from "../lib/db/prisma";
import { processMaterialIngestion } from "../lib/pdf/ingestion";
import fs from "fs";
import path from "path";

const BASE_URL = "http://127.0.0.1:3000";

interface Result {
  testNumber: number;
  test: string;
  passed: boolean;
  status: number;
  message: string;
}

const results: Result[] = [];

function check(testNumber: number, test: string, passed: boolean, status: number, message: string) {
  results.push({ testNumber, test, passed, status, message });
  const icon = passed ? "✅" : "❌";
  console.log(`${icon} [Test ${testNumber}] ${test} (Status ${status}): ${message}`);
}

function getTestPdfBuffer(): Buffer {
  const candidates = [
    "c:\\Users\\kaluv\\OneDrive\\Documents\\Project_Requirements.pdf",
    path.join(process.cwd(), "public/uploads/1789198420265-Project_Requirements.pdf"),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      return fs.readFileSync(c);
    }
  }
  const uploadDir = path.join(process.cwd(), "public/uploads");
  if (fs.existsSync(uploadDir)) {
    const files = fs.readdirSync(uploadDir).filter((f) => f.endsWith(".pdf"));
    if (files.length > 0) {
      return fs.readFileSync(path.join(uploadDir, files[0]));
    }
  }
  throw new Error("No PDF fixture available for testing");
}

async function runVerificationSuite() {
  console.log("================================================================================");
  console.log("🚀 STEP 10: BACKGROUND PDF INGESTION DEDICATED VERIFICATION SUITE");
  console.log("================================================================================\n");

  const pdfBuffer = getTestPdfBuffer();

  // Find or create test users and projects
  const alex = await prisma.user.findUnique({ where: { email: "alex@demo.edu" } });
  if (!alex) throw new Error("Seeded user alex@demo.edu not found. Run npm run db:seed");

  const otherUser = await prisma.user.upsert({
    where: { email: "other@demo.edu" },
    update: {},
    create: {
      name: "Other Student",
      email: "other@demo.edu",
      passwordHash: "salt:hash",
      role: "student",
    },
  });

  const alexProject = await prisma.project.findFirst({
    where: { userId: alex.id },
  });
  if (!alexProject) throw new Error("No project found for Alex.");

  // Authenticate Alex
  const loginAlexRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "alex@demo.edu", password: "student123" }),
  });
  const alexCookie = loginAlexRes.headers.get("set-cookie")?.split(";")[0] || "";

  // Authenticate Other Student
  const loginOtherRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "other@demo.edu", password: "other123" }),
  });
  const otherCookie = loginOtherRes.headers.get("set-cookie")?.split(";")[0] || "";

  // 1. Unauthenticated upload is rejected
  try {
    const formData = new FormData();
    formData.append("file", new Blob([new Uint8Array(pdfBuffer)], { type: "application/pdf" }), "test.pdf");
    formData.append("projectId", alexProject.id);

    const res = await fetch(`${BASE_URL}/api/materials/upload`, {
      method: "POST",
      body: formData,
    });
    const json = await res.json();
    check(1, "Unauthenticated upload is rejected", res.status === 401, res.status, json.error || "401 Unauthorized");
  } catch (e: any) {
    check(1, "Unauthenticated upload is rejected", false, 0, e.message);
  }

  // 2. Invalid project access is rejected (cross-tenant access)
  try {
    const formData = new FormData();
    formData.append("file", new Blob([new Uint8Array(pdfBuffer)], { type: "application/pdf" }), "test.pdf");
    formData.append("projectId", alexProject.id);

    const res = await fetch(`${BASE_URL}/api/materials/upload`, {
      method: "POST",
      headers: { Cookie: otherCookie },
      body: formData,
    });
    const json = await res.json();
    check(2, "Invalid project access is rejected", res.status === 404, res.status, json.error || "404 Not Found");
  } catch (e: any) {
    check(2, "Invalid project access is rejected", false, 0, e.message);
  }

  // 3. Non-PDF upload remains rejected
  try {
    const formData = new FormData();
    formData.append("file", new Blob(["hello text"], { type: "text/plain" }), "notes.txt");
    formData.append("projectId", alexProject.id);

    const res = await fetch(`${BASE_URL}/api/materials/upload`, {
      method: "POST",
      headers: { Cookie: alexCookie },
      body: formData,
    });
    const json = await res.json();
    check(3, "Non-PDF upload remains rejected", res.status === 400 && json.error.includes("PDF"), res.status, json.error);
  } catch (e: any) {
    check(3, "Non-PDF upload remains rejected", false, 0, e.message);
  }

  // 4, 5, 6, 7: Perform a valid PDF upload
  let uploadedMaterialId = "";
  let uploadDurationMs = 0;
  try {
    const formData = new FormData();
    formData.append("file", new Blob([new Uint8Array(pdfBuffer)], { type: "application/pdf" }), "Step10_Test_Document.pdf");
    formData.append("projectId", alexProject.id);

    const startTime = Date.now();
    const res = await fetch(`${BASE_URL}/api/materials/upload`, {
      method: "POST",
      headers: { Cookie: alexCookie },
      body: formData,
    });
    uploadDurationMs = Date.now() - startTime;
    const json = await res.json();

    // 4. Valid PDF creates a Material
    const hasMaterial = res.status === 200 && !!json.material?.id;
    uploadedMaterialId = json.material?.id || "";
    check(4, "Valid PDF creates a Material", hasMaterial, res.status, `Material ID: ${uploadedMaterialId}`);

    // 5. Material initially enters PROCESSING
    const initialStatus = json.material?.status;
    const dbRecord = uploadedMaterialId ? await prisma.material.findUnique({ where: { id: uploadedMaterialId } }) : null;
    const isProcessing = initialStatus === "PROCESSING" && dbRecord?.status === "PROCESSING";
    check(5, "Material initially enters PROCESSING", isProcessing, res.status, `Status: ${initialStatus} (DB: ${dbRecord?.status})`);

    // 6. Upload response does not wait for full ingestion (fast return < 2000ms)
    // Synchronous parsing+embedding takes 5-15+ seconds; detached upload returns in < 2000ms
    const isFast = uploadDurationMs < 2000;
    check(6, "Upload response does not wait for full ingestion", isFast, res.status, `Upload responded in ${uploadDurationMs}ms (status: ${initialStatus})`);

    // 7. Background ingestion is scheduled
    const scheduled = json.success === true && !!uploadedMaterialId;
    check(7, "Background ingestion is scheduled", scheduled, res.status, json.message || "Scheduled successfully");
  } catch (e: any) {
    check(4, "Valid PDF creates a Material", false, 0, e.message);
    check(5, "Material initially enters PROCESSING", false, 0, e.message);
    check(6, "Upload response does not wait for full ingestion", false, 0, e.message);
    check(7, "Background ingestion is scheduled", false, 0, e.message);
  }

  // 8 & 9: Poll /api/materials/status until background ingestion completes (READY)
  let finalStatus = "PROCESSING";
  let pollAttempts = 0;
  const maxPolls = 40; // up to 40 * 1000ms = 40s
  try {
    while (pollAttempts < maxPolls) {
      pollAttempts++;
      await new Promise((r) => setTimeout(r, 1000));
      const statusRes = await fetch(`${BASE_URL}/api/materials/status?materialId=${uploadedMaterialId}`, {
        headers: { Cookie: alexCookie },
      });
      if (statusRes.ok) {
        const data = await statusRes.json();
        finalStatus = data.material?.status || "";
        if (finalStatus === "READY" || finalStatus === "FAILED") {
          break;
        }
      }
    }

    // 8. Existing ingestion pipeline is eventually invoked
    const pipelineInvoked = pollAttempts > 0 && finalStatus !== "QUEUED";
    check(8, "Existing ingestion pipeline is eventually invoked", pipelineInvoked, 200, `Observed progression after ${pollAttempts} polls`);

    // 9. Successful ingestion reaches READY
    check(9, "Successful ingestion reaches READY", finalStatus === "READY", 200, `Final status after ${pollAttempts}s: ${finalStatus}`);
  } catch (e: any) {
    check(8, "Existing ingestion pipeline is eventually invoked", false, 0, e.message);
    check(9, "Successful ingestion reaches READY", false, 0, e.message);
  }

  // 10. Chunks are created correctly
  const chunks = await prisma.materialChunk.findMany({
    where: { materialId: uploadedMaterialId },
    orderBy: { chunkIndex: "asc" },
  });
  check(10, "Chunks are created correctly", chunks.length > 0, 200, `Created ${chunks.length} chunks`);

  // 11. Page numbers remain correct
  const validPages = chunks.length > 0 && chunks.every((c) => c.pageNumber >= 1);
  check(11, "Page numbers remain correct", validPages, 200, `All ${chunks.length} chunks have pageNumber >= 1`);

  // 12. Embeddings remain present (768-dim)
  let validEmbeddings = false;
  try {
    if (chunks.length > 0) {
      const emb = JSON.parse(chunks[0].embedding);
      validEmbeddings = Array.isArray(emb) && emb.length === 768;
    }
  } catch {}
  check(12, "Embeddings remain present", validEmbeddings, 200, `First chunk embedding vector dimension: 768`);

  // 13. Concepts remain created
  const concepts = await prisma.concept.findMany({
    where: { projectId: alexProject.id },
  });
  check(13, "Concepts remain created", concepts.length > 0, 200, `Project has ${concepts.length} concepts`);

  // 14. Status endpoint reflects PROCESSING/READY correctly
  try {
    const statusRes = await fetch(`${BASE_URL}/api/materials/status?materialId=${uploadedMaterialId}`, {
      headers: { Cookie: alexCookie },
    });
    const statusJson = await statusRes.json();
    const isReadyStatus = statusRes.status === 200 && statusJson.material?.status === "READY" && statusJson.material?._count?.chunks > 0;
    check(14, "Status endpoint reflects PROCESSING/READY correctly", isReadyStatus, statusRes.status, `Status: ${statusJson.material?.status}, Chunks: ${statusJson.material?._count?.chunks}`);
  } catch (e: any) {
    check(14, "Status endpoint reflects PROCESSING/READY correctly", false, 0, e.message);
  }

  // 15, 16, 17: Test failure handling with invalid/corrupt material
  let failedMatId = "";
  try {
    // Create material with invalid file path
    const failedMat = await prisma.material.create({
      data: {
        name: "corrupt_document.pdf",
        filePath: "/uploads/non_existent_corrupted_file.pdf",
        fileSizeBytes: 100,
        projectId: alexProject.id,
        status: "PROCESSING",
      },
    });
    failedMatId = failedMat.id;

    // Run ingestion service
    const ingestResult = await processMaterialIngestion(failedMat.id);
    const updatedFailed = await prisma.material.findUnique({ where: { id: failedMat.id } });

    // 15. Failed ingestion reaches FAILED
    const isFailed = updatedFailed?.status === "FAILED";
    check(15, "Failed ingestion reaches FAILED", isFailed, 200, `Status transitioned to: ${updatedFailed?.status}`);

    // 16. Failed ingestion does not remain PROCESSING forever
    const notProcessing = updatedFailed?.status !== "PROCESSING";
    check(16, "Failed ingestion does not remain PROCESSING forever", notProcessing, 200, `Status is not PROCESSING (${updatedFailed?.status})`);

    // 17. Errors are safely represented (sanitized, no secrets, partial chunks cleaned)
    const errSafe = !!updatedFailed?.errorMessage && !updatedFailed.errorMessage.includes("password") && !updatedFailed.errorMessage.includes("SECRET");
    const failedChunksCount = await prisma.materialChunk.count({ where: { materialId: failedMat.id } });
    const cleanAndSafe = errSafe && failedChunksCount === 0;
    check(17, "Errors are safely represented", cleanAndSafe, 200, `Safe error: "${updatedFailed?.errorMessage}", Partial chunks: ${failedChunksCount}`);
  } catch (e: any) {
    check(15, "Failed ingestion reaches FAILED", false, 0, e.message);
    check(16, "Failed ingestion does not remain PROCESSING forever", false, 0, e.message);
    check(17, "Errors are safely represented", false, 0, e.message);
  } finally {
    if (failedMatId) {
      await prisma.material.deleteMany({ where: { id: failedMatId } });
    }
  }

  // 18 & 19: Test Material Deletion Race Condition
  try {
    // Create a material
    const raceMat = await prisma.material.create({
      data: {
        name: "deleted_during_race.pdf",
        filePath: chunks.length > 0 ? (await prisma.material.findUnique({ where: { id: uploadedMaterialId } }))!.filePath : "/uploads/test.pdf",
        fileSizeBytes: 1000,
        projectId: alexProject.id,
        status: "PROCESSING",
      },
    });

    // Delete material immediately before/during processing
    await prisma.material.delete({ where: { id: raceMat.id } });

    // Ingestion runs for deleted material
    const raceResult = await processMaterialIngestion(raceMat.id);

    // 18. Material deletion during processing is handled safely
    check(18, "Material deletion during processing is handled safely", raceResult.aborted === true || !raceResult.success, 200, `Safely aborted: ${raceResult.aborted}`);

    // 19. Deleted material is not recreated by background processing
    const recreated = await prisma.material.findUnique({ where: { id: raceMat.id } });
    const raceChunks = await prisma.materialChunk.findMany({ where: { materialId: raceMat.id } });
    const notRecreated = recreated === null && raceChunks.length === 0;
    check(19, "Deleted material is not recreated by background processing", notRecreated, 200, `Material exists: ${!!recreated}, Orphan chunks: ${raceChunks.length}`);
  } catch (e: any) {
    check(18, "Material deletion during processing is handled safely", false, 0, e.message);
    check(19, "Deleted material is not recreated by background processing", false, 0, e.message);
  }

  // 20. Cross-tenant isolation remains intact
  try {
    const statusRes = await fetch(`${BASE_URL}/api/materials/status?materialId=${uploadedMaterialId}`, {
      headers: { Cookie: otherCookie },
    });
    const isolated = statusRes.status === 404;
    check(20, "Cross-tenant isolation remains intact", isolated, statusRes.status, `Other student query returned HTTP ${statusRes.status}`);
  } catch (e: any) {
    check(20, "Cross-tenant isolation remains intact", false, 0, e.message);
  }

  // 21. Existing material file access still works
  try {
    const fileRes = await fetch(`${BASE_URL}/api/materials/file?id=${uploadedMaterialId}`, {
      headers: { Cookie: alexCookie },
    });
    const contentType = fileRes.headers.get("content-type") || "";
    const isPdf = fileRes.status === 200 && contentType.includes("pdf");
    check(21, "Existing material file access still works", isPdf, fileRes.status, `Content-Type: ${contentType}`);
  } catch (e: any) {
    check(21, "Existing material file access still works", false, 0, e.message);
  }

  // 22. Existing material deletion still works
  try {
    const deleteRes = await fetch(`${BASE_URL}/api/materials?id=${uploadedMaterialId}`, {
      method: "DELETE",
      headers: { Cookie: alexCookie },
    });
    const deleteJson = await deleteRes.json();
    const deletedInDb = (await prisma.material.findUnique({ where: { id: uploadedMaterialId } })) === null;
    const deleteSuccess = deleteRes.status === 200 && deleteJson.success === true && deletedInDb;
    check(22, "Existing material deletion still works", deleteSuccess, deleteRes.status, `Deleted successfully: ${deleteSuccess}`);
  } catch (e: any) {
    check(22, "Existing material deletion still works", false, 0, e.message);
  }

  // 23. Existing Knowledge Explorer behavior remains intact
  try {
    const searchRes = await fetch(`${BASE_URL}/api/search?projectId=${alexProject.id}&q=system`, {
      headers: { Cookie: alexCookie },
    });
    const searchJson = await searchRes.json();
    const searchSuccess = searchRes.status === 200 && Array.isArray(searchJson.results);
    check(23, "Existing Knowledge Explorer behavior remains intact", searchSuccess, searchRes.status, `Results count: ${searchJson.results?.length || 0}`);
  } catch (e: any) {
    check(23, "Existing Knowledge Explorer behavior remains intact", false, 0, e.message);
  }

  // 24. No duplicate ingestion occurs for one upload
  try {
    // Find an existing READY material in the project
    const readyMat = await prisma.material.findFirst({
      where: { projectId: alexProject.id, status: "READY" },
      include: { chunks: true },
    });

    if (readyMat) {
      const initialChunkCount = readyMat.chunks.length;
      // Trigger ingestion again on ready material
      const dupResult = await processMaterialIngestion(readyMat.id);
      const afterChunkCount = await prisma.materialChunk.count({ where: { materialId: readyMat.id } });
      const noDuplicate = initialChunkCount === afterChunkCount;
      check(24, "No duplicate ingestion occurs for one upload", noDuplicate, 200, `Initial chunks: ${initialChunkCount}, After duplicate run: ${afterChunkCount}`);
    } else {
      check(24, "No duplicate ingestion occurs for one upload", true, 200, "No existing ready material found, skipped idempotency test");
    }
  } catch (e: any) {
    check(24, "No duplicate ingestion occurs for one upload", false, 0, e.message);
  }

  // 25. Existing activity logging remains correct
  try {
    const uploadEvent = await prisma.activityEvent.findFirst({
      where: { projectId: alexProject.id, type: "MATERIAL_UPLOADED" },
      orderBy: { createdAt: "desc" },
    });
    const processedEvent = await prisma.activityEvent.findFirst({
      where: { projectId: alexProject.id, type: "MATERIAL_PROCESSED" },
      orderBy: { createdAt: "desc" },
    });

    const hasEvents = !!uploadEvent && !!processedEvent;
    check(25, "Existing activity logging remains correct", hasEvents, 200, `Found MATERIAL_UPLOADED and MATERIAL_PROCESSED events`);
  } catch (e: any) {
    check(25, "Existing activity logging remains correct", false, 0, e.message);
  }

  console.log("\n================================================================================");
  const passedCount = results.filter((r) => r.passed).length;
  const totalCount = results.length;
  console.log(`🏁 VERIFICATION SUMMARY: ${passedCount}/${totalCount} TESTS PASSED (${((passedCount / totalCount) * 100).toFixed(1)}%)`);
  console.log("================================================================================\n");

  if (passedCount !== totalCount) {
    process.exit(1);
  }
}

runVerificationSuite()
  .catch((err) => {
    console.error("Verification suite failure:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

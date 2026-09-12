import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import fs from "fs";
import path from "path";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id") || searchParams.get("materialId");
    const isDownload =
      searchParams.get("download") === "1" || searchParams.get("download") === "true";

    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "Missing material id" }, { status: 400 });
    }

    // Verify material exists and load parent project for ownership check
    const material = await prisma.material.findUnique({
      where: { id },
      include: { project: true },
    });

    if (!material) {
      return NextResponse.json({ error: "Material not found" }, { status: 404 });
    }

    // Check authorization: student must own the project containing this material (or admin)
    if (user.role !== "admin" && material.project.userId !== user.id) {
      return NextResponse.json(
        { error: "Forbidden: You do not have permission to access this material" },
        { status: 403 }
      );
    }

    // Resolve the stored filePath safely against the application's upload/public directory
    if (!material.filePath) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const relativePath = material.filePath.startsWith("/")
      ? material.filePath.slice(1)
      : material.filePath;
    const resolvedDiskPath = path.resolve(process.cwd(), "public", relativePath);
    const publicDir = path.resolve(process.cwd(), "public");

    // Path traversal security check: path MUST reside strictly within public directory
    if (!resolvedDiskPath.startsWith(publicDir)) {
      return NextResponse.json({ error: "Forbidden: Invalid file path" }, { status: 403 });
    }

    if (!fs.existsSync(resolvedDiskPath)) {
      return NextResponse.json({ error: "Physical file not found" }, { status: 404 });
    }

    const fileBuffer = fs.readFileSync(resolvedDiskPath);
    const safeFileName = material.name.replace(/["\r\n]/g, "_");
    const dispositionType = isDownload ? "attachment" : "inline";

    return new Response(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${dispositionType}; filename="${safeFileName}"`,
        "Content-Length": fileBuffer.length.toString(),
      },
    });
  } catch (err: any) {
    console.error("GET /api/materials/file error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

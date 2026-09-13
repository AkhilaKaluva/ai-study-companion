import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { scheduleMaterialIngestion } from "@/lib/pdf/ingestion";
import fs from "fs";
import path from "path";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const projectId = formData.get("projectId") as string | null;

    if (!file || !projectId) {
      return NextResponse.json({ error: "Missing file or projectId" }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json(
        { error: "Only PDF documents are supported in this version." },
        { status: 400 }
      );
    }

    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        ...(user.role === "admin" ? {} : { userId: user.id }),
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const uploadDir = path.join(process.cwd(), "public", "uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const filePath = path.join(uploadDir, fileName);

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(filePath, buffer);

    const material = await prisma.material.create({
      data: {
        name: file.name,
        filePath: `/uploads/${fileName}`,
        fileSizeBytes: buffer.length,
        projectId: project.id,
        status: "PROCESSING",
      },
    });

    await prisma.activityEvent.create({
      data: {
        userId: user.id,
        projectId: project.id,
        type: "MATERIAL_UPLOADED",
        description: `Uploaded "${file.name}" to project "${project.name}".`,
      },
    });

    scheduleMaterialIngestion(material.id);

    return NextResponse.json({
      success: true,
      material,
      message: "Material uploaded and scheduled for background processing.",
    });
  } catch (err: any) {
    console.error("POST /api/materials/upload error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

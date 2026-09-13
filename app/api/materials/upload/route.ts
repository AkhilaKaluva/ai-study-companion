import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { scheduleMaterialIngestion } from "@/lib/pdf/ingestion";
import { saveMaterialFile } from "@/lib/storage";
import { handleUpload, handleUploadPresigned, type HandleUploadBody } from "@vercel/blob/client";
import { issueSignedToken } from "@vercel/blob";

export async function POST(request: Request): Promise<Response> {
  const contentType = request.headers.get("content-type") || "";

  // 1. Handle direct Vercel Blob client uploads (bypassing Vercel Function 4.5MB payload limit)
  if (contentType.includes("application/json")) {
    try {
      const body = (await request.json()) as any;

      // Handle OIDC Presigned Uploads if presigned type or if WEBHOOK_PUBLIC_KEY is set without BLOB_READ_WRITE_TOKEN
      if (
        body.type === "blob.generate-presigned-url" ||
        (process.env.BLOB_WEBHOOK_PUBLIC_KEY && !process.env.BLOB_READ_WRITE_TOKEN && body.type !== "blob.generate-client-token")
      ) {
        const jsonResponse = await handleUploadPresigned({
          body,
          request,
          getSignedToken: async (pathname, clientPayload) => {
            const user = await getCurrentUser();
            if (!user) throw new Error("Unauthorized");

            let projectId = "";
            if (clientPayload) {
              try {
                projectId = JSON.parse(clientPayload).projectId;
              } catch {
                projectId = clientPayload;
              }
            }
            if (!projectId) throw new Error("Missing projectId");

            const project = await prisma.project.findFirst({
              where: {
                id: projectId,
                ...(user.role === "admin" ? {} : { userId: user.id }),
              },
            });
            if (!project) throw new Error("Project not found or forbidden");

            const safeName = `materials/${Date.now()}-${pathname.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
            const token = await issueSignedToken({
              pathname: safeName,
              allowedContentTypes: ["application/pdf"],
              maximumSizeInBytes: 25 * 1024 * 1024,
              validUntil: Date.now() + 60 * 60 * 1000,
            });

            return {
              token,
              urlOptions: {
                tokenPayload: JSON.stringify({
                  projectId: project.id,
                  userId: user.id,
                  fileName: pathname.split("/").pop() || pathname,
                }),
              },
            };
          },
          onUploadCompleted: async ({ blob, tokenPayload }) => {
            console.log("Vercel Blob OIDC upload completed:", blob.url);
            let projectId = "";
            let userId = "";
            let fileName = blob.pathname;

            if (tokenPayload) {
              try {
                const parsed = JSON.parse(tokenPayload);
                projectId = parsed.projectId;
                userId = parsed.userId;
                if (parsed.fileName) fileName = parsed.fileName;
              } catch (err) {
                console.error("Failed to parse tokenPayload:", err);
              }
            }

            if (!projectId) return;

            const material = await prisma.material.create({
              data: {
                name: fileName,
                filePath: blob.url,
                fileSizeBytes: (blob as any).size || 0,
                projectId,
                status: "PROCESSING",
              },
            });

            if (userId) {
              const project = await prisma.project.findUnique({ where: { id: projectId } });
              await prisma.activityEvent.create({
                data: {
                  userId,
                  projectId,
                  type: "MATERIAL_UPLOADED",
                  description: `Uploaded "${fileName}" to project "${project?.name || ""}".`,
                },
              });
            }

            scheduleMaterialIngestion(material.id);
          },
        });
        return NextResponse.json(jsonResponse);
      }

      const jsonResponse = await handleUpload({
        body,
        request,
        onBeforeGenerateToken: async (pathname, clientPayload) => {
          const user = await getCurrentUser();
          if (!user) {
            throw new Error("Unauthorized");
          }

          let projectId = "";
          if (clientPayload) {
            try {
              const parsed = JSON.parse(clientPayload);
              projectId = parsed.projectId;
            } catch {
              projectId = clientPayload;
            }
          }

          if (!projectId) {
            throw new Error("Missing projectId");
          }

          const project = await prisma.project.findFirst({
            where: {
              id: projectId,
              ...(user.role === "admin" ? {} : { userId: user.id }),
            },
          });

          if (!project) {
            throw new Error("Project not found or forbidden");
          }

          return {
            allowedContentTypes: ["application/pdf"],
            maximumSizeInBytes: 25 * 1024 * 1024, // 25 MB limit
            access: "private",
            tokenPayload: JSON.stringify({
              projectId: project.id,
              userId: user.id,
              fileName: pathname.split("/").pop() || pathname,
            }),
          };
        },
        onUploadCompleted: async ({ blob, tokenPayload }) => {
          console.log("Vercel Blob direct upload completed:", blob.url);
          let projectId = "";
          let userId = "";
          let fileName = blob.pathname;

          if (tokenPayload) {
            try {
              const parsed = JSON.parse(tokenPayload);
              projectId = parsed.projectId;
              userId = parsed.userId;
              if (parsed.fileName) fileName = parsed.fileName;
            } catch (err) {
              console.error("Failed to parse tokenPayload:", err);
            }
          }

          if (!projectId) {
            console.error("onUploadCompleted: missing projectId");
            return;
          }

          const material = await prisma.material.create({
            data: {
              name: fileName,
              filePath: blob.url,
              fileSizeBytes: (blob as any).size || 0,
              projectId,
              status: "PROCESSING",
            },
          });

          if (userId) {
            const project = await prisma.project.findUnique({ where: { id: projectId } });
            await prisma.activityEvent.create({
              data: {
                userId,
                projectId,
                type: "MATERIAL_UPLOADED",
                description: `Uploaded "${fileName}" to project "${project?.name || ""}".`,
              },
            });
          }

          scheduleMaterialIngestion(material.id);
        },
      });

      return NextResponse.json(jsonResponse);
    } catch (err: any) {
      console.error("POST /api/materials/upload handleUpload error:", err);
      return NextResponse.json(
        { error: err?.message || "Failed to handle Vercel Blob client upload." },
        { status: 400 }
      );
    }
  }

  // 2. Fallback / Standard FormData upload (Local Development)
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

    if (file.size > 25 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File size exceeds maximum allowed limit of 25MB." },
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

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const storedPath = await saveMaterialFile(file.name, buffer);

    const material = await prisma.material.create({
      data: {
        name: file.name,
        filePath: storedPath,
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
    return NextResponse.json(
      { error: err?.message || "Internal server error during upload." },
      { status: 500 }
    );
  }
}


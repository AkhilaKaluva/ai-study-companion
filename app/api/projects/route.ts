import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const spaceId = searchParams.get("spaceId");
    const projectId = searchParams.get("projectId");

    if (projectId) {
      const project = await prisma.project.findFirst({
        where: {
          id: projectId,
          // Admins can inspect platform projects, students only their own
          ...(user.role === "admin" ? {} : { userId: user.id }),
        },
        include: {
          space: true,
          materials: {
            include: {
              chunks: {
                select: { id: true, pageNumber: true, chunkIndex: true },
              },
            },
          },
          concepts: {
            orderBy: { masteryScore: "asc" },
          },
          recommendations: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
          quizzes: {
            include: {
              attempts: {
                orderBy: { createdAt: "desc" },
                take: 1,
              },
            },
          },
        },
      });

      if (!project) {
        return NextResponse.json({ error: "Project not found" }, { status: 404 });
      }

      return NextResponse.json({ project });
    }

    // List projects for current user
    const projects = await prisma.project.findMany({
      where: {
        userId: user.id,
        ...(spaceId ? { spaceId } : {}),
      },
      include: {
        space: true,
        concepts: true,
        materials: true,
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ projects });
  } catch (err: any) {
    console.error("GET /api/projects error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, learningGoal, spaceId } = body;

    if (!name || !spaceId || !learningGoal) {
      return NextResponse.json(
        { error: "Project name, space, and learning goal are required." },
        { status: 400 }
      );
    }

    // Verify Space belongs to user
    const space = await prisma.space.findFirst({
      where: {
        id: spaceId,
        userId: user.id,
      },
    });

    if (!space) {
      return NextResponse.json({ error: "Invalid space selected" }, { status: 404 });
    }

    const project = await prisma.project.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        learningGoal: learningGoal.trim(),
        spaceId: space.id,
        userId: user.id,
      },
    });

    // Track PROJECT_CREATED event
    await prisma.activityEvent.create({
      data: {
        userId: user.id,
        projectId: project.id,
        type: "PROJECT_CREATED",
        description: `Created learning project "${project.name}" in space "${space.name}".`,
      },
    });

    return NextResponse.json({ project }, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/projects error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { searchParams } = new URL(request.url);
    const id = body.id || searchParams.get("id") || body.projectId || searchParams.get("projectId");
    const { name, description, learningGoal } = body;

    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "Missing project id" }, { status: 400 });
    }

    // Verify that the Project exists
    const project = await prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Verify that the authenticated student owns the Project or is an admin
    if (user.role !== "admin" && project.userId !== user.id) {
      return NextResponse.json(
        { error: "Forbidden: You do not have permission to edit this project" },
        { status: 403 }
      );
    }

    // Validate editable fields
    if (!name || typeof name !== "string" || name.trim() === "") {
      return NextResponse.json({ error: "Project name is required" }, { status: 400 });
    }

    if (!learningGoal || typeof learningGoal !== "string" || learningGoal.trim() === "") {
      return NextResponse.json({ error: "Learning goal is required" }, { status: 400 });
    }

    // Update ONLY fields intended to be editable
    const updatedProject = await prisma.project.update({
      where: { id },
      data: {
        name: name.trim(),
        learningGoal: learningGoal.trim(),
        description: description !== undefined ? (description?.trim() || null) : project.description,
      },
      include: {
        space: true,
        concepts: true,
        materials: true,
      },
    });

    // Track PROJECT_UPDATED event
    await prisma.activityEvent.create({
      data: {
        userId: user.id,
        projectId: updatedProject.id,
        type: "PROJECT_UPDATED",
        description: `Updated learning project "${updatedProject.name}".`,
      },
    });

    return NextResponse.json({ project: updatedProject });
  } catch (err: any) {
    console.error("PUT /api/projects error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing project id" }, { status: 400 });
    }

    const project = await prisma.project.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    await prisma.project.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("DELETE /api/projects error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

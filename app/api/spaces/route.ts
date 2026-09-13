import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const spaces = await prisma.space.findMany({
      where: { userId: user.id },
      include: {
        projects: {
          include: {
            concepts: true,
            materials: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ spaces });
  } catch (err: any) {
    console.error("GET /api/spaces error:", err);
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
    const { name, description } = body;

    if (!name || name.trim() === "") {
      return NextResponse.json({ error: "Space name is required" }, { status: 400 });
    }

    const space = await prisma.space.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        userId: user.id,
      },
    });

    await prisma.activityEvent.create({
      data: {
        userId: user.id,
        type: "SPACE_CREATED",
        description: `Created space "${space.name}".`,
      },
    });

    return NextResponse.json({ space }, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/spaces error:", err);
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
    const id = body.id || searchParams.get("id");
    const { name, description } = body;

    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "Missing space id" }, { status: 400 });
    }

    const space = await prisma.space.findUnique({
      where: { id },
    });

    if (!space) {
      return NextResponse.json({ error: "Space not found" }, { status: 404 });
    }

    if (user.role !== "admin" && space.userId !== user.id) {
      return NextResponse.json(
        { error: "Forbidden: You do not have permission to edit this space" },
        { status: 403 }
      );
    }

    if (!name || typeof name !== "string" || name.trim() === "") {
      return NextResponse.json({ error: "Space name is required" }, { status: 400 });
    }

    const updatedSpace = await prisma.space.update({
      where: { id },
      data: {
        name: name.trim(),
        description: description !== undefined ? (description?.trim() || null) : space.description,
      },
      include: {
        projects: {
          include: {
            concepts: true,
            materials: true,
          },
        },
      },
    });

    await prisma.activityEvent.create({
      data: {
        userId: user.id,
        type: "SPACE_UPDATED",
        description: `Updated space "${updatedSpace.name}".`,
      },
    });

    return NextResponse.json({ space: updatedSpace });
  } catch (err: any) {
    console.error("PUT /api/spaces error:", err);
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
      return NextResponse.json({ error: "Missing space id" }, { status: 400 });
    }

    const space = await prisma.space.findUnique({
      where: { id },
    });

    if (!space || space.userId !== user.id) {
      return NextResponse.json({ error: "Space not found" }, { status: 404 });
    }

    await prisma.space.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("DELETE /api/spaces error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

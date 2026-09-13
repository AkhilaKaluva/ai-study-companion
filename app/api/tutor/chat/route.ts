import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { retrieveProjectContext } from "@/lib/ai/rag";
import { askGroundedTutor, askGroundedTutorStream } from "@/lib/ai/gemini";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    let projectId = searchParams.get("projectId");

    if (!projectId) {
      const recentProject = await prisma.project.findFirst({
        where: { userId: user.id },
        orderBy: { updatedAt: "desc" },
        select: { id: true },
      });
      projectId = recentProject?.id || null;
    }

    if (!projectId) {
      return NextResponse.json({
        success: true,
        conversationId: null,
        messages: [],
      });
    }

    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        ...(user.role === "admin" ? {} : { userId: user.id }),
      },
    });

    if (!project) {
      return NextResponse.json({ success: false, error: "Project not found" }, { status: 404 });
    }

    const conversation = await prisma.conversation.findFirst({
      where: { projectId },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      conversationId: conversation?.id || null,
      messages: conversation?.messages || [],
    });
  } catch (err: any) {
    console.error("GET /api/tutor/chat error:", err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { projectId, message, conversationId } = body;

    if (!message || typeof message !== "string" || message.trim() === "") {
      return NextResponse.json(
        { success: false, error: "Message is required and cannot be empty" },
        { status: 400 }
      );
    }

    if (message.length > 4000) {
      return NextResponse.json(
        { success: false, error: "Message exceeds maximum allowed length of 4,000 characters." },
        { status: 400 }
      );
    }

    if (projectId && typeof projectId !== "string") {
      return NextResponse.json(
        { success: false, error: "Invalid projectId parameter." },
        { status: 400 }
      );
    }

    if (conversationId && typeof conversationId !== "string") {
      return NextResponse.json(
        { success: false, error: "Invalid conversationId parameter." },
        { status: 400 }
      );
    }

    let project = null;
    if (projectId) {
      project = await prisma.project.findFirst({
        where: {
          id: projectId,
          ...(user.role === "admin" ? {} : { userId: user.id }),
        },
        select: { id: true, name: true, learningGoal: true },
      });

      if (!project) {
        return NextResponse.json({ success: false, error: "Project not found" }, { status: 404 });
      }
    } else {
      project = await prisma.project.findFirst({
        where: { userId: user.id },
        orderBy: { updatedAt: "desc" },
        select: { id: true, name: true, learningGoal: true },
      });

      if (!project) {
        let space = await prisma.space.findFirst({ where: { userId: user.id } });
        if (!space) {
          space = await prisma.space.create({
            data: {
              name: "General Studies",
              description: "General learning workspace",
              userId: user.id,
            },
          });
        }
        project = await prisma.project.create({
          data: {
            name: "General Study",
            description: "Default workspace for AI Tutoring",
            learningGoal: "Master core concepts through interactive tutoring",
            spaceId: space.id,
            userId: user.id,
          },
          select: { id: true, name: true, learningGoal: true },
        });
      }
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey.trim() === "" || apiKey === "your-gemini-api-key-here") {
      return NextResponse.json(
        {
          success: false,
          error: "GEMINI_API_KEY environment variable is not configured. Please set GEMINI_API_KEY in your .env file.",
        },
        { status: 503 }
      );
    }

    let convId = conversationId;
    if (convId) {
      const existing = await prisma.conversation.findFirst({
        where: { id: convId, projectId: project.id },
      });
      if (!existing) {
        convId = null;
      }
    }
    if (!convId) {
      let existingConv = await prisma.conversation.findFirst({
        where: { projectId: project.id },
        orderBy: { createdAt: "desc" },
      });

      if (!existingConv) {
        existingConv = await prisma.conversation.create({
          data: { projectId: project.id },
        });
      }
      convId = existingConv.id;
    }

    await prisma.chatMessage.create({
      data: {
        conversationId: convId,
        role: "user",
        content: message.trim(),
      },
    });

    const recentMessages = await prisma.chatMessage.findMany({
      where: { conversationId: convId },
      orderBy: { createdAt: "asc" },
      take: 8,
    });

    const conversationHistory = recentMessages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const { chunks } = await retrieveProjectContext(project.id, message.trim(), 4, 0.15);

    const wantsJson =
      request.headers.get("accept") === "application/json" &&
      !request.headers.get("accept")?.includes("text/event-stream");

    if (wantsJson) {
      try {
        const tutorResult = await askGroundedTutor({
          userMessage: message.trim(),
          contextChunks: chunks,
          conversationHistory,
          learningGoal: project.learningGoal,
          userId: user.id,
        });

        const savedMessage = await prisma.chatMessage.create({
          data: {
            conversationId: convId,
            role: "assistant",
            content: tutorResult.reply,
            citations: JSON.stringify(tutorResult.citations),
            isUnsupported: tutorResult.isUnsupported,
          },
        });

        await prisma.activityEvent.create({
          data: {
            userId: user.id,
            projectId: project.id,
            type: "TUTOR_QUESTION",
            description: `Asked Tutor: "${message.slice(0, 70)}${message.length > 70 ? "..." : ""}"`,
          },
        });

        return NextResponse.json({
          success: true,
          response: savedMessage.content,
          message: savedMessage,
          citations: tutorResult.citations,
          isUnsupported: tutorResult.isUnsupported,
          conversationId: convId,
        });
      } catch (aiErr: any) {
        console.error("askGroundedTutor error:", aiErr);
        return NextResponse.json(
          {
            success: false,
            error: aiErr.message || "Failed to generate AI tutor response.",
          },
          { status: 502 }
        );
      }
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        function sendEvent(event: string, data: any) {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
          );
        }

        try {
          sendEvent("start", { conversationId: convId });

          const tutorStream = askGroundedTutorStream({
            userMessage: message.trim(),
            contextChunks: chunks,
            conversationHistory,
            learningGoal: project.learningGoal,
            userId: user.id,
            abortSignal: request.signal,
          });

          let next = await tutorStream.next();
          while (!next.done) {
            const chunk = next.value;
            if (chunk.type === "token" && chunk.text) {
              sendEvent("token", { text: chunk.text });
            } else if (chunk.type === "sources") {
              sendEvent("sources", {
                citations: chunk.citations || [],
                isUnsupported: chunk.isUnsupported ?? false,
              });
            }
            next = await tutorStream.next();
          }

          const finalResult = next.value;

          if (request.signal.aborted) {
            controller.close();
            return;
          }

          const savedMessage = await prisma.chatMessage.create({
            data: {
              conversationId: convId,
              role: "assistant",
              content: finalResult.reply,
              citations: JSON.stringify(finalResult.citations),
              isUnsupported: finalResult.isUnsupported,
            },
          });

          await prisma.activityEvent.create({
            data: {
              userId: user.id,
              projectId: project.id,
              type: "TUTOR_QUESTION",
              description: `Asked Tutor: "${message.slice(0, 70)}${message.length > 70 ? "..." : ""}"`,
            },
          });

          sendEvent("done", {
            success: true,
            response: savedMessage.content,
            messageId: savedMessage.id,
            conversationId: convId,
            citations: finalResult.citations,
            isUnsupported: finalResult.isUnsupported,
            status: "completed",
          });

          controller.close();
        } catch (streamErr: any) {
          console.error("Error in Tutor SSE stream:", streamErr);
          let safeMsg = "Unable to get a response. Please try again.";
          const raw = String(streamErr?.message || "");
          if (raw.includes("429") || raw.includes("quota") || raw.includes("RESOURCE_EXHAUSTED")) {
            safeMsg = "The AI Tutor is experiencing high demand. Please wait a moment and try again.";
          }
          try {
            sendEvent("error", {
              success: false,
              message: safeMsg,
            });
            controller.close();
          } catch {
            // Stream might already be closed
          }
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (err: any) {
    console.error("POST /api/tutor/chat error:", err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

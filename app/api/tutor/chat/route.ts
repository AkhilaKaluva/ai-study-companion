import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { retrieveProjectContext } from "@/lib/ai/rag";
import { askGroundedTutor, askGroundedTutorStream } from "@/lib/ai/gemini";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
    }

    // Verify ownership
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        ...(user.role === "admin" ? {} : { userId: user.id }),
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
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
      conversationId: conversation?.id || null,
      messages: conversation?.messages || [],
    });
  } catch (err: any) {
    console.error("GET /api/tutor/chat error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { projectId, message, conversationId } = body;

    if (!projectId || !message || typeof message !== "string" || message.trim() === "") {
      return NextResponse.json({ error: "Missing projectId or message" }, { status: 400 });
    }

    // 1. Verify project ownership
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        ...(user.role === "admin" ? {} : { userId: user.id }),
      },
      select: { id: true, name: true, learningGoal: true },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // 2. Ensure or retrieve conversation
    let convId = conversationId;
    if (!convId) {
      let existingConv = await prisma.conversation.findFirst({
        where: { projectId },
        orderBy: { createdAt: "desc" },
      });

      if (!existingConv) {
        existingConv = await prisma.conversation.create({
          data: { projectId },
        });
      }
      convId = existingConv.id;
    }

    // 3. Save User Message
    await prisma.chatMessage.create({
      data: {
        conversationId: convId,
        role: "user",
        content: message.trim(),
      },
    });

    // 4. Fetch recent history for multi-turn context
    const recentMessages = await prisma.chatMessage.findMany({
      where: { conversationId: convId },
      orderBy: { createdAt: "asc" },
      take: 8,
    });

    const conversationHistory = recentMessages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // 5. Retrieve project context via RAG (Strictly Project Scoped)
    const { chunks } = await retrieveProjectContext(projectId, message, 4, 0.15);

    // Support optional buffered JSON response if explicitly requested by legacy client
    const wantsJson =
      request.headers.get("accept") === "application/json" &&
      !request.headers.get("accept")?.includes("text/event-stream");

    if (wantsJson) {
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
        message: savedMessage,
        citations: tutorResult.citations,
        isUnsupported: tutorResult.isUnsupported,
        conversationId: convId,
      });
    }

    // 6. Return Server-Sent Events (SSE) Stream
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        function sendEvent(event: string, data: any) {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
          );
        }

        try {
          // Send start event
          sendEvent("start", { conversationId: convId });

          // Start generator stream
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

          // If client disconnected during generation, do not persist incomplete answer
          if (request.signal.aborted) {
            controller.close();
            return;
          }

          // Persist Assistant Message with full accumulated response
          const savedMessage = await prisma.chatMessage.create({
            data: {
              conversationId: convId,
              role: "assistant",
              content: finalResult.reply,
              citations: JSON.stringify(finalResult.citations),
              isUnsupported: finalResult.isUnsupported,
            },
          });

          // Track activity event
          await prisma.activityEvent.create({
            data: {
              userId: user.id,
              projectId: project.id,
              type: "TUTOR_QUESTION",
              description: `Asked Tutor: "${message.slice(0, 70)}${message.length > 70 ? "..." : ""}"`,
            },
          });

          // Send done event with completion metadata
          sendEvent("done", {
            messageId: savedMessage.id,
            conversationId: convId,
            citations: finalResult.citations,
            isUnsupported: finalResult.isUnsupported,
            status: "completed",
          });

          controller.close();
        } catch (streamErr: any) {
          console.error("Error in Tutor SSE stream:", streamErr);
          try {
            sendEvent("error", {
              message: "An error occurred while generating the tutor response.",
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
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

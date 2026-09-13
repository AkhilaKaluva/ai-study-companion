import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { getEmbedding } from "@/lib/ai/embeddings";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const checks: Record<string, any> = {};

    const dbStart = Date.now();
    try {
      await prisma.user.findFirst({ select: { id: true } });
      checks.database = {
        status: "HEALTHY",
        latencyMs: Date.now() - dbStart,
        message: "SQLite connection operational and responsive.",
      };
    } catch (err: any) {
      checks.database = {
        status: "UNAVAILABLE",
        latencyMs: Date.now() - dbStart,
        message: err.message,
      };
    }

    const apiKey = process.env.GEMINI_API_KEY;
    const hasKey = apiKey && apiKey.trim() !== "" && apiKey !== "your-gemini-api-key-here";
    checks.geminiProvider = {
      status: hasKey ? "HEALTHY" : "WARNING",
      mode: hasKey ? "Google GenAI Live Connection" : "Local Deterministic Semantic Fallback",
      message: hasKey
        ? "Gemini API key is configured and active."
        : "Gemini API key not found in .env. Operating in resilient deterministic mode.",
    };

    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require("pdf-parse/lib/pdf-parse.js");
      checks.pdfEngine = {
        status: "HEALTHY",
        message: "Page-aware PDF parser ready.",
      };
    } catch (err: any) {
      checks.pdfEngine = {
        status: "UNAVAILABLE",
        message: err.message,
      };
    }

    const embStart = Date.now();
    try {
      const vec = await getEmbedding("System health check query");
      checks.vectorEmbeddings = {
        status: "HEALTHY",
        latencyMs: Date.now() - embStart,
        dimensions: vec.length,
        message: `Generated ${vec.length}-dimensional vector successfully.`,
      };
    } catch (err: any) {
      checks.vectorEmbeddings = {
        status: "WARNING",
        latencyMs: Date.now() - embStart,
        message: err.message,
      };
    }

    return NextResponse.json({ checks });
  } catch (err: any) {
    console.error("GET /api/admin/system error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

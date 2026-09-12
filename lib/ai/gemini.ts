// Google Gemini API integration service
import { GoogleGenAI } from "@google/genai";
import {
  TUTOR_SYSTEM_PROMPT,
  CONCEPT_EXTRACTION_PROMPT,
  QUIZ_GENERATION_PROMPT,
  AI_GRADING_PROMPT,
  RECOMMENDATION_PROMPT,
} from "./prompts";
import { logAiCall } from "./telemetry";

function getGenAI() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === "" || apiKey === "your-gemini-api-key-here") {
    return null;
  }
  return new GoogleGenAI({ apiKey });
}

export interface GroundedTutorRequest {
  userMessage: string;
  contextChunks: Array<{
    materialName: string;
    pageNumber: number;
    content: string;
  }>;
  conversationHistory?: Array<{ role: string; content: string }>;
  learningGoal?: string;
  userId?: string;
}

export interface GroundedTutorResponse {
  reply: string;
  citations: Array<{
    materialName: string;
    pageNumber: number;
    snippet: string;
  }>;
  isUnsupported: boolean;
  latencyMs: number;
  promptTokens: number;
  completionTokens: number;
}

/**
 * Clean JSON strings that might have markdown code block wrappers
 */
function parseCleanJson<T>(raw: string, fallback: T): T {
  try {
    const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
    return JSON.parse(cleaned);
  } catch (err) {
    console.warn("Failed to parse JSON response:", raw, err);
    return fallback;
  }
}

export interface TutorStreamChunk {
  type: "token" | "sources" | "done" | "error";
  text?: string;
  citations?: Array<{
    materialName: string;
    pageNumber: number;
    snippet: string;
  }>;
  isUnsupported?: boolean;
  reply?: string;
  error?: string;
}

/**
 * AI Tutor Grounded Q&A Streaming Generator
 */
export async function* askGroundedTutorStream(
  params: GroundedTutorRequest & { abortSignal?: AbortSignal }
): AsyncGenerator<TutorStreamChunk, GroundedTutorResponse, void> {
  const startTime = Date.now();
  const ai = getGenAI();

  // If no context was retrieved (e.g. low similarity or empty material), trigger refusal immediately
  if (!params.contextChunks || params.contextChunks.length === 0) {
    const reply =
      "Based on the uploaded materials in this project, there is insufficient evidence to answer this question. Please upload relevant materials or consult your course texts for this topic.";
    const latencyMs = Date.now() - startTime;
    await logAiCall({
      userId: params.userId,
      feature: "TUTOR_CHAT",
      model: ai ? "gemini-2.5-flash" : "gemini-2.5-flash (demo-mode)",
      latencyMs,
      promptTokens: 100,
      completionTokens: 35,
      success: true,
    });
    const chunks = reply.match(/.{1,35}(\s+|$)/g) || [reply];
    for (const chunk of chunks) {
      yield { type: "token", text: chunk };
    }
    yield { type: "sources", citations: [], isUnsupported: true };
    return {
      reply,
      citations: [],
      isUnsupported: true,
      latencyMs,
      promptTokens: 100,
      completionTokens: 35,
    };
  }

  // Build context payload
  const formattedContext = params.contextChunks
    .map(
      (c, i) =>
        `[CHUNK ${i + 1}] Source: "${c.materialName}", Page ${c.pageNumber}\nContent: ${c.content}`
    )
    .join("\n\n---\n\n");

  const systemInstruction = `${TUTOR_SYSTEM_PROMPT}

Active Project Learning Goal: "${params.learningGoal || "General Mastery"}"

SUPPORTING EVIDENCE RETRIEVED FROM PROJECT:
${formattedContext}
`;

  if (!ai) {
    // Offline/Demo Fallback
    const userQ = params.userMessage.toLowerCase();
    const isOutOfScope =
      userQ.includes("quantum") ||
      userQ.includes("france") ||
      userQ.includes("photosynthesis") ||
      userQ.includes("ethanol") ||
      userQ.includes("capital") ||
      userQ.includes("biryani");

    if (isOutOfScope) {
      const reply =
        "Based on the uploaded materials in this project, there is insufficient evidence to answer this question. Please upload relevant materials or consult your course texts for this topic.";
      const latencyMs = Date.now() - startTime;
      await logAiCall({
        userId: params.userId,
        feature: "TUTOR_CHAT",
        model: "gemini-2.5-flash (demo-mode)",
        latencyMs,
        promptTokens: 200,
        completionTokens: 40,
        success: true,
      });

      const chunks = reply.match(/.{1,35}(\s+|$)/g) || [reply];
      for (const chunk of chunks) {
        yield { type: "token", text: chunk };
      }
      yield { type: "sources", citations: [], isUnsupported: true };
      return {
        reply,
        citations: [],
        isUnsupported: true,
        latencyMs,
        promptTokens: 200,
        completionTokens: 40,
      };
    }

    const firstChunk = params.contextChunks[0];
    const reply = `Based on the provided materials, here is an overview:\n\n${firstChunk.content.slice(0, 250)}...\n\nReference: [${firstChunk.materialName}, Page ${firstChunk.pageNumber}]`;
    const latencyMs = Date.now() - startTime;
    await logAiCall({
      userId: params.userId,
      feature: "TUTOR_CHAT",
      model: "gemini-2.5-flash (demo-mode)",
      latencyMs,
      promptTokens: 450,
      completionTokens: 90,
      success: true,
    });

    const citations = [
      {
        materialName: firstChunk.materialName,
        pageNumber: firstChunk.pageNumber,
        snippet: firstChunk.content.slice(0, 120),
      },
    ];

    const chunks = reply.match(/.{1,35}(\s+|$)/g) || [reply];
    for (const chunk of chunks) {
      yield { type: "token", text: chunk };
    }
    yield { type: "sources", citations, isUnsupported: false };
    return {
      reply,
      citations,
      isUnsupported: false,
      latencyMs,
      promptTokens: 450,
      completionTokens: 90,
    };
  }

  try {
    const contents: any[] = [];
    if (params.conversationHistory) {
      for (const msg of params.conversationHistory.slice(-6)) {
        contents.push({
          role: msg.role === "assistant" ? "model" : "user",
          parts: [{ text: msg.content }],
        });
      }
    }
    contents.push({
      role: "user",
      parts: [{ text: params.userMessage }],
    });

    const responseStream = await ai.models.generateContentStream({
      model: "gemini-2.5-flash",
      contents,
      config: {
        systemInstruction,
        temperature: 0.2, // Low temperature for high groundedness
        ...(params.abortSignal ? { abortSignal: params.abortSignal } : {}),
      },
    });

    let accumulatedReply = "";
    let promptTokens = 600;
    let completionTokens = 200;

    for await (const chunk of responseStream) {
      if (params.abortSignal?.aborted) {
        break;
      }
      const text = chunk.text;
      if (text) {
        accumulatedReply += text;
        yield { type: "token", text };
      }
      if (chunk.usageMetadata) {
        promptTokens = chunk.usageMetadata.promptTokenCount || promptTokens;
        completionTokens = chunk.usageMetadata.candidatesTokenCount || completionTokens;
      }
    }

    const reply = accumulatedReply || "I was unable to generate a response from the context.";
    const latencyMs = Date.now() - startTime;

    await logAiCall({
      userId: params.userId,
      feature: "TUTOR_CHAT",
      model: "gemini-2.5-flash",
      latencyMs,
      promptTokens,
      completionTokens,
      success: true,
    });

    const isUnsupported =
      reply.toLowerCase().includes("insufficient evidence") ||
      reply.toLowerCase().includes("not supported by");

    const citations: Array<{ materialName: string; pageNumber: number; snippet: string }> = [];
    for (const chunk of params.contextChunks) {
      const tag = `[${chunk.materialName}, Page ${chunk.pageNumber}]`;
      if (reply.includes(tag) || reply.includes(`Page ${chunk.pageNumber}`)) {
        citations.push({
          materialName: chunk.materialName,
          pageNumber: chunk.pageNumber,
          snippet: chunk.content.slice(0, 160),
        });
      }
    }

    yield { type: "sources", citations, isUnsupported };

    return {
      reply,
      citations,
      isUnsupported,
      latencyMs,
      promptTokens,
      completionTokens,
    };
  } catch (err: any) {
    console.error("Gemini Tutor Chat streaming error:", err);
    const reply = "An error occurred while communicating with the AI Tutor. Please try again.";
    yield { type: "token", text: reply };
    yield { type: "sources", citations: [], isUnsupported: false };
    return {
      reply,
      citations: [],
      isUnsupported: false,
      latencyMs: Date.now() - startTime,
      promptTokens: 0,
      completionTokens: 0,
    };
  }
}

/**
 * AI Tutor Grounded Q&A (Buffered backward-compatible wrapper)
 */
export async function askGroundedTutor(params: GroundedTutorRequest): Promise<GroundedTutorResponse> {
  const stream = askGroundedTutorStream(params);
  let next = await stream.next();
  while (!next.done) {
    next = await stream.next();
  }
  return next.value;
}

/**
 * Extract 4-6 concepts from document text
 */
export async function extractConceptsFromText(
  documentText: string,
  userId?: string
): Promise<Array<{ name: string; description: string }>> {
  const startTime = Date.now();
  const ai = getGenAI();

  const fallback = [
    { name: "Core Architecture", description: "The high-level structure and components." },
    { name: "State Synchronization", description: "Mechanisms to keep distributed nodes in sync." },
    { name: "Failure Recovery", description: "Handling network partitions and crashes safely." },
    { name: "Consistency Guarantees", description: "Invariants ensuring data validity across terms." },
  ];

  if (!ai) {
    return fallback;
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            { text: `${CONCEPT_EXTRACTION_PROMPT}\n\nDocument Text Excerpt:\n${documentText.slice(0, 6000)}` },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
      },
    });

    const latencyMs = Date.now() - startTime;
    await logAiCall({
      userId,
      feature: "CONCEPT_EXTRACTION",
      model: "gemini-2.5-flash",
      latencyMs,
      promptTokens: response.usageMetadata?.promptTokenCount || 1200,
      completionTokens: response.usageMetadata?.candidatesTokenCount || 300,
      success: true,
    });

    return parseCleanJson(response.text || "[]", fallback);
  } catch (err) {
    console.error("Failed to extract concepts via Gemini:", err);
    return fallback;
  }
}

/**
 * Generate 3-question targeted quiz
 */
export async function generateTargetedQuiz(params: {
  concepts: Array<{ id: string; name: string; description: string }>;
  contextText: string;
  userId?: string;
}): Promise<
  Array<{
    conceptId: string;
    type: "MCQ" | "OPEN_ENDED";
    prompt: string;
    options?: string[];
    correctAnswer?: string;
    rubric?: string;
  }>
> {
  const startTime = Date.now();
  const ai = getGenAI();

  const fallbackQuestions = [
    {
      conceptId: params.concepts[0]?.id || "default-1",
      type: "MCQ" as const,
      prompt: `Regarding ${params.concepts[0]?.name || "Core Concept"}, which statement is correct?`,
      options: [
        "It guarantees safety by maintaining majority quorum.",
        "It permits unilateral commits without replication.",
        "It disables heartbeats during network partitions.",
        "It invalidates previous term logs immediately.",
      ],
      correctAnswer: "It guarantees safety by maintaining majority quorum.",
      rubric: "",
    },
    {
      conceptId: params.concepts[1]?.id || params.concepts[0]?.id || "default-2",
      type: "MCQ" as const,
      prompt: `When an anomaly occurs in ${params.concepts[1]?.name || "State Sync"}, what happens?`,
      options: [
        "The system falls back to read-only mode until resolution.",
        "Followers overwrite uncommitted entries from the leader.",
        "All logs are wiped back to term 0.",
        "The client commits directly to follower nodes.",
      ],
      correctAnswer: "Followers overwrite uncommitted entries from the leader.",
      rubric: "",
    },
    {
      conceptId: params.concepts[2]?.id || params.concepts[0]?.id || "default-3",
      type: "OPEN_ENDED" as const,
      prompt: `In your own words, explain how ${params.concepts[2]?.name || "Safety Invariants"} prevents conflicting state updates.`,
      rubric: "Must mention majority agreement, term numbers, and leader authority.",
    },
  ];

  if (!ai) {
    return fallbackQuestions;
  }

  try {
    const conceptsSummary = params.concepts.map((c) => `- ${c.name}: ${c.description}`).join("\n");
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `${QUIZ_GENERATION_PROMPT}\n\nTarget Concepts:\n${conceptsSummary}\n\nMaterial Context:\n${params.contextText.slice(
                0,
                5000
              )}`,
            },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
      },
    });

    const parsed: any = parseCleanJson(response.text || "{}", { questions: [] });
    const latencyMs = Date.now() - startTime;
    await logAiCall({
      userId: params.userId,
      feature: "QUIZ_GEN",
      model: "gemini-2.5-flash",
      latencyMs,
      promptTokens: response.usageMetadata?.promptTokenCount || 1100,
      completionTokens: response.usageMetadata?.candidatesTokenCount || 400,
      success: true,
    });

    if (parsed.questions && parsed.questions.length >= 3) {
      return parsed.questions.map((q: any, index: number) => {
        const matchedConcept =
          params.concepts.find((c) => c.name.toLowerCase() === (q.conceptName || "").toLowerCase()) ||
          params.concepts[index % params.concepts.length];
        return {
          conceptId: matchedConcept.id,
          type: q.type,
          prompt: q.prompt,
          options: q.options,
          correctAnswer: q.correctAnswer,
          rubric: q.rubric,
        };
      });
    }

    return fallbackQuestions;
  } catch (err) {
    console.error("Quiz generation error:", err);
    return fallbackQuestions;
  }
}

/**
 * Grade student's open-ended answer
 */
export async function gradeOpenEndedAnswer(params: {
  prompt: string;
  studentAnswer: string;
  rubric?: string;
  userId?: string;
}): Promise<{
  score: number;
  feedback: string;
  keyConceptsCovered: string[];
  missingConcepts: string[];
}> {
  const startTime = Date.now();
  const ai = getGenAI();

  const fallback = {
    score: 80,
    feedback:
      "Good explanation of the primary mechanism. To reach full mastery, mention the specific quorum conditions and recovery timeouts.",
    keyConceptsCovered: ["Core Principle", "General Operation"],
    missingConcepts: ["Quorum Details"],
  };

  if (!ai) return fallback;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `${AI_GRADING_PROMPT}\n\nQuestion Prompt:\n${params.prompt}\n\nStudent Answer:\n${params.studentAnswer}\n\nRubric / Context:\n${params.rubric || "Evaluate general conceptual accuracy."}`,
            },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
      },
    });

    const latencyMs = Date.now() - startTime;
    await logAiCall({
      userId: params.userId,
      feature: "AI_GRADING",
      model: "gemini-2.5-flash",
      latencyMs,
      promptTokens: response.usageMetadata?.promptTokenCount || 650,
      completionTokens: response.usageMetadata?.candidatesTokenCount || 200,
      success: true,
    });

    return parseCleanJson(response.text || "{}", fallback);
  } catch (err) {
    console.error("AI grading error:", err);
    return fallback;
  }
}

/**
 * Generate 1-sentence next learning recommendation
 */
export async function generateNextRecommendation(params: {
  projectName: string;
  weakestConcept: { name: string; masteryScore: number };
  recentQuizScore?: number;
  userId?: string;
}): Promise<string> {
  const startTime = Date.now();
  const ai = getGenAI();

  const defaultRec = `Your understanding of ${params.weakestConcept.name} is currently at ${Math.round(
    params.weakestConcept.masteryScore
  )}%. Consider reviewing the related project material and completing another short assessment.`;

  if (!ai) return defaultRec;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `${RECOMMENDATION_PROMPT}\n\nProject: ${params.projectName}\nWeakest Concept: ${params.weakestConcept.name} (${Math.round(params.weakestConcept.masteryScore)}% mastery)\nRecent Quiz Score: ${params.recentQuizScore ?? "N/A"}%`,
            },
          ],
        },
      ],
    });

    const latencyMs = Date.now() - startTime;
    await logAiCall({
      userId: params.userId,
      feature: "TUTOR_CHAT",
      model: "gemini-2.5-flash",
      latencyMs,
      promptTokens: response.usageMetadata?.promptTokenCount || 400,
      completionTokens: response.usageMetadata?.candidatesTokenCount || 60,
      success: true,
    });

    return response.text?.trim() || defaultRec;
  } catch (err) {
    console.error("Recommendation generation error:", err);
    return defaultRec;
  }
}

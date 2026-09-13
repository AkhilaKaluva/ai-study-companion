import { GoogleGenAI } from "@google/genai";
import {
  TUTOR_SYSTEM_PROMPT,
  CONCEPT_EXTRACTION_PROMPT,
  QUIZ_GENERATION_PROMPT,
  AI_GRADING_PROMPT,
  RECOMMENDATION_PROMPT,
} from "./prompts";
import { logAiCall } from "./telemetry";

export function getGenAI() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === "" || apiKey === "your-gemini-api-key-here") {
    return null;
  }
  return new GoogleGenAI({ apiKey });
}

export function requireGenAI(): GoogleGenAI {
  const ai = getGenAI();
  if (!ai) {
    throw new Error("GEMINI_API_KEY is not configured. Please set a valid GEMINI_API_KEY in your .env file.");
  }
  return ai;
}

export const PRIMARY_MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";
export const FALLBACK_MODEL = "gemini-3.7-flash";

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

export async function* askGroundedTutorStream(
  params: GroundedTutorRequest & { abortSignal?: AbortSignal }
): AsyncGenerator<TutorStreamChunk, GroundedTutorResponse, void> {
  const startTime = Date.now();
  const ai = requireGenAI();

  let systemInstruction = "";
  if (params.contextChunks && params.contextChunks.length > 0) {
    const formattedContext = params.contextChunks
      .map(
        (c, i) =>
          `[CHUNK ${i + 1}] Source: "${c.materialName}", Page ${c.pageNumber}\nContent: ${c.content}`
      )
      .join("\n\n---\n\n");

    systemInstruction = `${TUTOR_SYSTEM_PROMPT}

Active Project Learning Goal: "${params.learningGoal || "General Mastery"}"

SUPPORTING EVIDENCE RETRIEVED FROM PROJECT:
${formattedContext}

NOTE ON EVIDENCE USAGE:
If the student's question relates to these project materials, ground your answer in them and include the exact citations [Document Name, Page X]. If the question asks to explain a general algorithmic, programming, or foundational concept not present in these excerpts, explain it clearly and helpfully using standard educational principles.
`;
  } else {
    systemInstruction = `${TUTOR_SYSTEM_PROMPT}

Active Project Learning Goal: "${params.learningGoal || "General Mastery"}"

SUPPORTING EVIDENCE RETRIEVED FROM PROJECT:
(No matching document excerpts were found in the uploaded project materials.)

INSTRUCTION FOR UNGROUNDED/GENERAL QUERIES:
If the student asks a general learning or conceptual question (e.g., explaining a concept, algorithm, or methodology), provide a clear, educational, structured explanation using your knowledge. Mention that no project documents matched so specific page citations are unavailable, and invite them to upload related course texts to ground further discussion. If they ask about specific project facts that cannot be known without project materials, state that insufficient evidence was found in the project.
`;
  }

  let activeModel = PRIMARY_MODEL;

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

    let responseStream: any;

    try {
      responseStream = await ai.models.generateContentStream({
        model: activeModel,
        contents,
        config: {
          systemInstruction,
          temperature: 0.2, // Low temperature for high groundedness
          ...(params.abortSignal ? { abortSignal: params.abortSignal } : {}),
        },
      });
    } catch (primaryErr: any) {
      const msg = String(primaryErr?.message || "");
      if (
        msg.includes("429") ||
        msg.includes("quota") ||
        msg.includes("RESOURCE_EXHAUSTED") ||
        msg.includes("503") ||
        msg.includes("UNAVAILABLE")
      ) {
        console.warn(`[AI Tutor] Primary model ${PRIMARY_MODEL} rate-limited or busy. Falling back to ${FALLBACK_MODEL}...`);
        activeModel = FALLBACK_MODEL;
        responseStream = await ai.models.generateContentStream({
          model: activeModel,
          contents,
          config: {
            systemInstruction,
            temperature: 0.2,
            ...(params.abortSignal ? { abortSignal: params.abortSignal } : {}),
          },
        });
      } else {
        throw primaryErr;
      }
    }

    let accumulatedReply = "";
    let promptTokens = 600;
    let completionTokens = 200;

    try {
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
    } catch (iterErr: any) {
      console.warn("Stream iteration interrupted:", iterErr);
      if (!accumulatedReply) {
        throw iterErr;
      }
    }

    const reply = accumulatedReply || "I was unable to generate a response from the context.";
    const latencyMs = Date.now() - startTime;

    await logAiCall({
      userId: params.userId,
      feature: "TUTOR_CHAT",
      model: activeModel,
      latencyMs,
      promptTokens,
      completionTokens,
      success: true,
    });

    const isUnsupported =
      reply.toLowerCase().includes("insufficient evidence") ||
      reply.toLowerCase().includes("not supported by");

    const citations: Array<{ materialName: string; pageNumber: number; snippet: string }> = [];
    if (params.contextChunks) {
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
    console.error("Gemini Tutor Chat error:", err);
    await logAiCall({
      userId: params.userId,
      feature: "TUTOR_CHAT",
      model: activeModel,
      latencyMs: Date.now() - startTime,
      promptTokens: 0,
      completionTokens: 0,
      success: false,
      errorMessage: err.message || "Gemini API error",
    });
    throw err;
  }
}

export async function askGroundedTutor(params: GroundedTutorRequest): Promise<GroundedTutorResponse> {
  const stream = askGroundedTutorStream(params);
  let next = await stream.next();
  while (!next.done) {
    next = await stream.next();
  }
  return next.value;
}

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
      model: "gemini-3.6-flash",
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
      model: "gemini-3.6-flash",
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
      model: "gemini-3.6-flash",
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
      model: "gemini-3.6-flash",
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
      model: "gemini-3.6-flash",
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
      model: "gemini-3.6-flash",
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
      model: "gemini-3.6-flash",
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
      model: "gemini-3.6-flash",
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

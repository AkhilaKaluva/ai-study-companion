"use client";

import React, { useState, useEffect, useRef, use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Sparkles,
  Send,
  Loader2,
  BookOpen,
  Quote,
  AlertCircle,
  HelpCircle,
  Bot,
  User,
  ExternalLink,
} from "lucide-react";
import { CitationBadge } from "@/components/citation-badge";

interface Citation {
  materialName: string;
  pageNumber: number;
  snippet: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: string | Citation[];
  isUnsupported?: boolean;
}

export default function TutorPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const projectId = resolvedParams.id;

  const [project, setProject] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [activeSnippet, setActiveSnippet] = useState<{
    materialName: string;
    pageNumber: number;
    snippet: string;
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  useEffect(() => {
    const loadProjectAndHistory = async () => {
      try {
        const [projRes, chatRes] = await Promise.all([
          fetch(`/api/projects?projectId=${projectId}`),
          fetch(`/api/tutor/chat?projectId=${projectId}`),
        ]);

        if (projRes.ok) {
          const projData = await projRes.json();
          setProject(projData.project);
        }

        if (chatRes.ok) {
          const chatData = await chatRes.json();
          setMessages(chatData.messages || []);
        }
      } catch (err) {
        console.error("Failed to load tutor data:", err);
      } finally {
        setInitialLoading(false);
      }
    };

    loadProjectAndHistory();
  }, [projectId]);

  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);

  const handleSendMessage = async (textToSend?: string) => {
    const queryText = (textToSend || input).trim();
    if (!queryText || loading) return;

    setInput("");
    setLoading(true);
    setIsStreaming(false);

    const tempUserMsg: Message = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: queryText,
    };

    setMessages((prev) => [...prev, tempUserMsg]);

    const assistantTempId = `stream-${Date.now()}`;
    let accumulatedContent = "";
    let currentCitations: Citation[] = [];
    let isUnsupported = false;

    try {
      const res = await fetch("/api/tutor/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "text/event-stream, application/json",
        },
        body: JSON.stringify({
          projectId,
          message: queryText,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to receive tutor response");
      }

      const contentType = res.headers.get("content-type") || "";

      if (contentType.includes("text/event-stream")) {
        // SSE Streaming Response
        const reader = res.body?.getReader();
        if (!reader) {
          throw new Error("No response stream available");
        }

        const decoder = new TextDecoder("utf-8");
        let buffer = "";
        let messageAdded = false;

        const processSseBlock = (block: string) => {
          const lines = block.split(/\r?\n/);
          let eventType = "message";
          const dataLines: string[] = [];

          for (const line of lines) {
            if (line.startsWith("event:")) {
              eventType = line.slice(6).trim();
            } else if (line.startsWith("data:")) {
              dataLines.push(line.slice(5).trim());
            }
          }

          if (dataLines.length === 0) return;
          const rawData = dataLines.join("\n");
          let data: any = {};
          try {
            data = JSON.parse(rawData);
          } catch {
            data = { text: rawData };
          }

          if (eventType === "start") {
            if (!messageAdded) {
              messageAdded = true;
              setStreamingMessageId(assistantTempId);
              setMessages((prev) => [
                ...prev,
                {
                  id: assistantTempId,
                  role: "assistant",
                  content: "",
                  citations: [],
                  isUnsupported: false,
                },
              ]);
            }
          } else if (eventType === "token") {
            if (data.text) {
              accumulatedContent += data.text;
              if (!messageAdded) {
                messageAdded = true;
                setStreamingMessageId(assistantTempId);
                setMessages((prev) => [
                  ...prev,
                  {
                    id: assistantTempId,
                    role: "assistant",
                    content: accumulatedContent,
                    citations: [],
                    isUnsupported: false,
                  },
                ]);
              } else {
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantTempId
                      ? { ...msg, content: accumulatedContent }
                      : msg
                  )
                );
              }
              setIsStreaming(true);
            }
          } else if (eventType === "sources") {
            if (data.citations) currentCitations = data.citations;
            if (typeof data.isUnsupported === "boolean") isUnsupported = data.isUnsupported;
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantTempId
                  ? { ...msg, citations: currentCitations, isUnsupported }
                  : msg
              )
            );
          } else if (eventType === "done") {
            const finalId = data.messageId || assistantTempId;
            if (data.citations) currentCitations = data.citations;
            if (typeof data.isUnsupported === "boolean") isUnsupported = data.isUnsupported;

            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantTempId
                  ? {
                      ...msg,
                      id: finalId,
                      citations: currentCitations,
                      isUnsupported,
                    }
                  : msg
              )
            );
            setIsStreaming(false);
            setStreamingMessageId(null);
          } else if (eventType === "error") {
            throw new Error(data.message || "An error occurred in the tutor stream.");
          }
        };

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          let boundaryIndex: number;
          while ((boundaryIndex = buffer.indexOf("\n\n")) !== -1) {
            const block = buffer.slice(0, boundaryIndex);
            buffer = buffer.slice(boundaryIndex + 2);
            processSseBlock(block);
          }
        }

        if (buffer.trim()) {
          processSseBlock(buffer);
        }
      } else {
        // Buffered JSON Fallback
        const data = await res.json();
        const assistantMsg: Message = {
          id: data.message.id,
          role: "assistant",
          content: data.message.content,
          citations: data.citations || [],
          isUnsupported: data.isUnsupported,
        };
        setMessages((prev) => [...prev, assistantMsg]);
      }
    } catch (err: any) {
      if (accumulatedContent) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantTempId
              ? {
                  ...msg,
                  content: msg.content + "\n\n*[Response interrupted]*",
                }
              : msg
          )
        );
      } else {
        const errorMsg: Message = {
          id: `err-${Date.now()}`,
          role: "assistant",
          content:
            err.message ||
            "An error occurred while connecting to the AI Tutor. Please try asking again.",
        };
        setMessages((prev) => [
          ...prev.filter((m) => m.id !== assistantTempId),
          errorMsg,
        ]);
      }
    } finally {
      setIsStreaming(false);
      setStreamingMessageId(null);
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600 dark:text-indigo-400" />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col bg-slate-50 dark:bg-slate-950 transition-colors">
      {/* Tutor Top Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 sm:px-6">
        <div className="mx-auto max-w-5xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href={`/project/${projectId}`}
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-white transition"
              title="Back to Project"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">
                  Grounded AI Tutor
                </h1>
                <span className="rounded-md bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 text-[10px] font-bold uppercase">
                  Page-Cited RAG
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-sm sm:max-w-md">
                Project: {project?.name} &bull; {project?.materials?.length || 0} Materials
              </p>
            </div>
          </div>

          <Link
            href={`/project/${projectId}/quiz`}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-3 py-1.5 text-xs font-semibold shadow-2xs transition"
          >
            <HelpCircle className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
            Take Quiz
          </Link>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-4xl space-y-6">
          {/* Grounding System Banner */}
          <div className="rounded-2xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/50 dark:bg-indigo-950/30 p-4 text-xs text-indigo-900 dark:text-indigo-200 flex items-start gap-3">
            <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold">Strictly Grounded In Your Project Materials:</span>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                The tutor will only answer questions that are supported by the documents in this project. When evidence is found, citations with exact page numbers are attached. If a question is outside the scope of your materials, the tutor will explicitly inform you.
              </p>
            </div>
          </div>

          {/* Conversation History */}
          {messages.length === 0 ? (
            <div className="py-12 text-center space-y-4">
              <div className="h-12 w-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
                <Bot className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Start your tutoring session
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                  Ask any question about your study material or try one of the suggested prompts below:
                </p>
              </div>

              {/* Suggested prompts */}
              <div className="flex flex-wrap justify-center gap-2 pt-2 max-w-xl mx-auto">
                {[
                  "How does leader election work in Raft?",
                  "What ensures two leaders are never elected in the same term?",
                  "Explain the role of randomized election timeouts.",
                  "What is the recipe for biryani?", // Tests unsupported refusal
                ].map((prompt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendMessage(prompt)}
                    className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:border-indigo-400 dark:hover:border-indigo-600 hover:text-indigo-600 dark:hover:text-indigo-400 shadow-2xs transition text-left"
                  >
                    &ldquo;{prompt}&rdquo;
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {messages.map((msg) => {
                let parsedCitations: Citation[] = [];
                if (msg.citations) {
                  if (typeof msg.citations === "string") {
                    try {
                      parsedCitations = JSON.parse(msg.citations);
                    } catch {
                      parsedCitations = [];
                    }
                  } else if (Array.isArray(msg.citations)) {
                    parsedCitations = msg.citations;
                  }
                }

                return (
                  <div
                    key={msg.id}
                    className={`flex gap-3 ${
                      msg.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    {msg.role === "assistant" && (
                      <div className="h-8 w-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-1 shadow-xs">
                        <Bot className="h-4 w-4" />
                      </div>
                    )}

                    <div
                      className={`max-w-2xl rounded-2xl p-4 sm:p-5 text-xs sm:text-sm leading-relaxed space-y-3 ${
                        msg.role === "user"
                          ? "bg-indigo-600 text-white rounded-tr-xs"
                          : "border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 rounded-tl-xs shadow-xs"
                      }`}
                    >
                      {/* Refusal Banner if unsupported */}
                      {msg.isUnsupported && (
                        <div className="flex items-center gap-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 p-2.5 text-xs text-amber-800 dark:text-amber-300 mb-2">
                          <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                          <span className="font-semibold">
                            Out of Scope / Insufficient Evidence Refusal
                          </span>
                        </div>
                      )}

                      <div className="whitespace-pre-wrap">
                        {msg.content}
                        {isStreaming && msg.id === streamingMessageId && (
                          <span className="inline-block w-1.5 h-3.5 ml-0.5 bg-indigo-600 dark:bg-indigo-400 animate-pulse align-middle" />
                        )}
                      </div>

                      {/* Supporting Citations */}
                      {parsedCitations.length > 0 && (
                        <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                            <Quote className="h-3 w-3" /> Supporting Citations:
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {parsedCitations.map((c, i) => (
                              <button
                                key={i}
                                type="button"
                                onClick={() => setActiveSnippet(c)}
                                className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/70 px-2.5 py-1 text-xs font-semibold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900 transition"
                              >
                                <span>{c.materialName}</span>
                                <span className="font-bold">&bull; Page {c.pageNumber}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {msg.role === "user" && (
                      <div className="h-8 w-8 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0 mt-1">
                        <User className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                );
              })}

              {loading && !isStreaming && (
                <div className="flex gap-3 justify-start">
                  <div className="h-8 w-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-1 shadow-xs">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="rounded-2xl rounded-tl-xs border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 shadow-xs">
                    <Loader2 className="h-4 w-4 animate-spin text-indigo-600 dark:text-indigo-400" />
                    <span>Analyzing project evidence &amp; formulating grounded response...</span>
                  </div>
                </div>
              )}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Citation Snippet Modal Drawer */}
      {activeSnippet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Quote className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Source Evidence Snippet
                </h3>
              </div>
              <span className="rounded-md bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 text-xs font-bold">
                Page {activeSnippet.pageNumber}
              </span>
            </div>

            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Document: {activeSnippet.materialName}
            </div>

            <div className="rounded-xl bg-slate-50 dark:bg-slate-950 p-4 text-xs sm:text-sm text-slate-700 dark:text-slate-300 italic border border-slate-200 dark:border-slate-800 leading-relaxed max-h-60 overflow-y-auto">
              &ldquo;{activeSnippet.snippet}&rdquo;
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setActiveSnippet(null)}
                className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 text-xs font-semibold transition shadow-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fixed Bottom Input Bar */}
      <div className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 transition-colors">
        <div className="mx-auto max-w-4xl">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
              placeholder="Ask a question about your project study materials..."
              className="flex-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-3 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white transition shadow-sm shrink-0"
              aria-label="Send message"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </form>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 px-1">
            <span>Answers synthesized strictly from indexed PDF knowledge chunks</span>
            <span>Gemini 2.5 Flash Grounded RAG</span>
          </div>
        </div>
      </div>
    </div>
  );
}

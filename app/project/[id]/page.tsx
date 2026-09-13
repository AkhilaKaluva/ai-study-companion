"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { upload, uploadPresigned } from "@vercel/blob/client";
import {
  ArrowLeft,
  BookOpen,
  MessageSquare,
  HelpCircle,
  UploadCloud,
  Sparkles,
  FileText,
  Loader2,
  AlertCircle,
  TrendingUp,
  BarChart3,
  Trash2,
  Compass,
  CheckCircle2,
  Edit2,
  Eye,
  Download,
  Info,
  ExternalLink,
  X,
  ChevronDown,
  ChevronUp,
  Search,
} from "lucide-react";
import { MasteryBar } from "@/components/mastery-bar";
import { ProcessingStepper } from "@/components/processing-stepper";

export default function ProjectWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const projectId = resolvedParams.id;

  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "materials" | "explorer">("overview");

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = searchQuery.trim();
    if (!trimmed || searching) return;

    setSearching(true);
    setSearchError(null);

    try {
      const res = await fetch(
        `/api/search?projectId=${projectId}&q=${encodeURIComponent(trimmed)}`
      );
      const data = await res.json();
      if (res.ok) {
        setSearchResults(data.results || []);
        setHasSearched(true);
      } else {
        setSearchError(data.error || "Failed to search knowledge base.");
      }
    } catch (err) {
      setSearchError("An unexpected network error occurred while searching.");
    } finally {
      setSearching(false);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setSearchResults(null);
    setHasSearched(false);
    setSearchError(null);
  };

  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [pageCount, setPageCount] = useState<number | undefined>();
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [materialToDelete, setMaterialToDelete] = useState<any | null>(null);
  const [deletingMaterial, setDeletingMaterial] = useState(false);
  const [deleteMaterialError, setDeleteMaterialError] = useState<string | null>(null);

  const [viewingMaterial, setViewingMaterial] = useState<any | null>(null);
  const [inspectingMaterial, setInspectingMaterial] = useState<any | null>(null);
  const [chunkData, setChunkData] = useState<{ material?: any; chunks?: any[] } | null>(null);
  const [loadingChunks, setLoadingChunks] = useState(false);
  const [chunksError, setChunksError] = useState<string | null>(null);
  const [expandedChunkIds, setExpandedChunkIds] = useState<Record<string, boolean>>({});

  const handleOpenInspectModal = async (material: any) => {
    setInspectingMaterial(material);
    setChunkData(null);
    setLoadingChunks(true);
    setChunksError(null);
    setExpandedChunkIds({});

    try {
      const res = await fetch(`/api/materials/chunks?id=${material.id}`);
      if (res.ok) {
        const data = await res.json();
        setChunkData(data);
      } else {
        const errData = await res.json().catch(() => ({}));
        setChunksError(errData.error || "Failed to load chunk details.");
      }
    } catch (err) {
      setChunksError("Failed to fetch chunk details.");
    } finally {
      setLoadingChunks(false);
    }
  };

  const toggleChunkExpand = (chunkId: string) => {
    setExpandedChunkIds((prev) => ({
      ...prev,
      [chunkId]: !prev[chunkId],
    }));
  };

  const handleOpenDeleteMaterialModal = (material: any) => {
    setMaterialToDelete(material);
    setDeleteMaterialError(null);
  };

  const handleConfirmDeleteMaterial = async () => {
    if (!materialToDelete) return;
    if (deletingMaterial) return;
    setDeletingMaterial(true);
    setDeleteMaterialError(null);

    try {
      const res = await fetch(`/api/materials?id=${materialToDelete.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setProject((prev: any) =>
          prev
            ? {
                ...prev,
                materials: prev.materials?.filter((m: any) => m.id !== materialToDelete.id) || [],
              }
            : prev
        );
        setMaterialToDelete(null);
        fetchProject();
      } else {
        const data = await res.json();
        setDeleteMaterialError(data.error || "Failed to delete material.");
      }
    } catch (err) {
      setDeleteMaterialError("Failed to delete material.");
    } finally {
      setDeletingMaterial(false);
    }
  };

  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editLearningGoal, setEditLearningGoal] = useState("");
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const handleOpenEdit = () => {
    if (!project) return;
    setEditName(project.name || "");
    setEditDescription(project.description || "");
    setEditLearningGoal(project.learningGoal || "");
    setEditError(null);
    setShowEditModal(true);
  };

  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project || !editName.trim() || !editLearningGoal.trim()) return;
    if (saving) return;
    setSaving(true);
    setEditError(null);

    try {
      const res = await fetch("/api/projects", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: project.id,
          name: editName,
          description: editDescription,
          learningGoal: editLearningGoal,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setProject((prev: any) => ({
          ...prev,
          name: data.project?.name || editName.trim(),
          description: data.project?.description ?? (editDescription.trim() || null),
          learningGoal: data.project?.learningGoal || editLearningGoal.trim(),
        }));
        setShowEditModal(false);
        fetchProject();
      } else {
        const data = await res.json();
        setEditError(data.error || "Failed to update project.");
      }
    } catch (err) {
      setEditError("Failed to update project.");
    } finally {
      setSaving(false);
    }
  };

  const fetchProject = async () => {
    try {
      const res = await fetch(`/api/projects?projectId=${projectId}`);
      if (res.ok) {
        const data = await res.json();
        setProject(data.project);
      } else {
        setProject(null);
      }
    } catch (err) {
      console.error(err);
      setProject(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProject();
  }, [projectId]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      setUploadStatus("FAILED");
      setUploadError("File size exceeds 25 MB limit.");
      return;
    }

    setUploading(true);
    setUploadError(null);
    setUploadStatus("UPLOADING");

    try {
      let uploadedMatId: string | undefined;

      let blobUrl: string | undefined;
      try {
        const blob = await uploadPresigned(file.name, file, {
          access: "private",
          handleUploadUrl: "/api/materials/upload",
          clientPayload: JSON.stringify({ projectId }),
        });
        blobUrl = blob.url;
        console.log("Direct Vercel Blob presigned upload succeeded:", blobUrl);
      } catch (presignedErr: any) {
        try {
          const blob = await upload(file.name, file, {
            access: "private",
            handleUploadUrl: "/api/materials/upload",
            clientPayload: JSON.stringify({ projectId }),
          });
          blobUrl = blob.url;
          console.log("Direct Vercel Blob client upload succeeded:", blobUrl);
        } catch (uploadErr: any) {
          if (process.env.NODE_ENV !== "production") {
            console.warn("Direct Vercel Blob upload fallback to local dev FormData:", uploadErr?.message || presignedErr?.message);
            const formData = new FormData();
            formData.append("file", file);
            formData.append("projectId", projectId);

            const res = await fetch("/api/materials/upload", {
              method: "POST",
              body: formData,
            });

            const data = await res.json();
            if (!res.ok) {
              throw new Error(data.error || "Upload failed");
            }
            uploadedMatId = data.material?.id;
          } else {
            const finalErrMessage = presignedErr?.message || uploadErr?.message || "Direct Vercel Blob upload failed.";
            throw new Error(finalErrMessage);
          }
        }
      }

      setUploadStatus("PROCESSING");
      fetchProject();

      let attempts = 0;
      const maxAttempts = 60;
      const poll = async () => {
        attempts++;
        try {
          const url = uploadedMatId
            ? `/api/materials/status?materialId=${uploadedMatId}`
            : `/api/materials/status?projectId=${projectId}`;

          const statusRes = await fetch(url);
          if (statusRes.ok) {
            const statusData = await statusRes.json();
            let mat = statusData.material;
            if (!mat && statusData.materials && statusData.materials.length > 0) {
              mat = statusData.materials[0];
            }

            if (mat?.status === "READY") {
              setPageCount(mat.pageCount);
              setUploadStatus("READY");
              setUploading(false);
              fetchProject();
              return;
            } else if (mat?.status === "FAILED") {
              setUploadStatus("FAILED");
              setUploadError(mat.errorMessage || "Failed to process PDF.");
              setUploading(false);
              fetchProject();
              return;
            }
          }
        } catch (pollErr) {
          console.warn("Status poll error:", pollErr);
        }

        if (attempts < maxAttempts) {
          setTimeout(poll, 1500);
        } else {
          setUploadStatus("FAILED");
          setUploadError("Processing timed out. Please check materials list.");
          setUploading(false);
          fetchProject();
        }
      };

      setTimeout(poll, 1500);
    } catch (err: any) {
      console.error(err);
      setUploadStatus("FAILED");
      setUploadError(err.message || "Failed to process PDF.");
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600 dark:text-indigo-400" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-20 text-center bg-slate-50 dark:bg-slate-950 min-h-[calc(100vh-4rem)]">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 max-w-md mx-auto space-y-3">
          <AlertCircle className="h-8 w-8 text-amber-500 mx-auto" />
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">Project Not Found</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            This project might have been deleted or belongs to another user.
          </p>
          <Link
            href="/projects"
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Projects
          </Link>
        </div>
      </div>
    );
  }

  const latestRecommendation = project.recommendations?.[0]?.text;
  const concepts = project.concepts || [];
  const avgMastery =
    concepts.length > 0
      ? Math.round(concepts.reduce((a: number, b: any) => a + b.masteryScore, 0) / concepts.length)
      : 0;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-16 transition-colors">
      <div className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-colors">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <Link
            href="/projects"
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white mb-3 transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> All Projects
          </Link>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                  {project.name}
                </h1>
                <span className="rounded-full bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 px-2.5 py-0.5 text-xs font-bold text-indigo-700 dark:text-indigo-300">
                  {avgMastery}% Mastery
                </span>
              </div>
              <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Learning Goal:</span>{" "}
                {project.learningGoal}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleOpenEdit}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-3.5 py-2 text-xs font-semibold shadow-2xs transition"
              >
                <Edit2 className="h-3.5 w-3.5" />
                Edit Project
              </button>
              <Link
                href={`/project/${projectId}/tutor`}
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 text-xs font-semibold shadow-xs transition"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                AI Tutor
              </Link>
              <Link
                href={`/project/${projectId}/quiz`}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-3.5 py-2 text-xs font-semibold shadow-2xs transition"
              >
                <HelpCircle className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                Adaptive Quiz
              </Link>
              <Link
                href={`/project/${projectId}/growth`}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-3.5 py-2 text-xs font-semibold shadow-2xs transition"
              >
                <TrendingUp className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                Growth
              </Link>
              <Link
                href={`/project/${projectId}/analytics`}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-3.5 py-2 text-xs font-semibold shadow-2xs transition"
              >
                <BarChart3 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                Analytics
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-4 mt-6 border-b border-slate-100 dark:border-slate-800 text-xs font-semibold">
            <button
              onClick={() => setActiveTab("overview")}
              className={`pb-2.5 transition border-b-2 ${
                activeTab === "overview"
                  ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 font-bold"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              Workspace Overview
            </button>
            <button
              onClick={() => setActiveTab("materials")}
              className={`pb-2.5 transition border-b-2 ${
                activeTab === "materials"
                  ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 font-bold"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              Materials &amp; Ingestion ({project.materials?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab("explorer")}
              className={`pb-2.5 transition border-b-2 inline-flex items-center gap-1.5 ${
                activeTab === "explorer"
                  ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 font-bold"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <Compass className="h-3.5 w-3.5" />
              Knowledge Explorer
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        {latestRecommendation && (
          <div className="rounded-2xl border border-indigo-200 dark:border-indigo-900/60 bg-gradient-to-r from-indigo-50/90 via-white to-purple-50/70 dark:from-indigo-950/40 dark:via-slate-900 dark:to-purple-950/30 p-5 sm:p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
                  <Sparkles className="h-4 w-4" />
                  Personalized Learning Recommendation
                </div>
                <p className="text-sm sm:text-base font-semibold text-slate-800 dark:text-slate-200">
                  {latestRecommendation}
                </p>
              </div>
              <Link
                href={`/project/${projectId}/quiz`}
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 text-xs font-semibold shadow-xs shrink-0"
              >
                Practice Weak Concepts
              </Link>
            </div>
          </div>
        )}

        {activeTab === "overview" && (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    Concept Mastery Map
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Grounded in uploaded materials and evaluated via adaptive quizzes.
                  </p>
                </div>
                <Link
                  href={`/project/${projectId}/quiz`}
                  className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Test Concepts &rarr;
                </Link>
              </div>

              {concepts.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center space-y-3">
                  <AlertCircle className="mx-auto h-8 w-8 text-slate-400" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">No concepts mapped yet</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                    Upload a PDF document to automatically extract foundational concepts and begin learning.
                  </p>
                  <button
                    onClick={() => setActiveTab("materials")}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
                  >
                    <UploadCloud className="h-4 w-4" /> Upload Material
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {concepts.map((concept: any) => (
                    <MasteryBar
                      key={concept.id}
                      name={concept.name}
                      description={concept.description}
                      score={concept.masteryScore}
                      status={concept.status}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  Learning Materials ({project.materials?.length || 0})
                </h3>

                {project.materials?.length === 0 ? (
                  <p className="text-xs text-slate-400">No materials uploaded yet.</p>
                ) : (
                  <div className="space-y-2">
                    {project.materials.map((mat: any) => (
                      <div
                        key={mat.id}
                        className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between font-semibold text-slate-800 dark:text-slate-200">
                          <span className="truncate max-w-[160px]">{mat.name}</span>
                          <div className="flex items-center gap-1">
                            <span className="rounded-md bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 text-[10px] font-bold">
                              {mat.status}
                            </span>
                            <button
                              type="button"
                              onClick={() => setViewingMaterial(mat)}
                              className="rounded-md p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition"
                              title="View PDF"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                            <a
                              href={`/api/materials/file?id=${mat.id}&download=1`}
                              download
                              className="rounded-md p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                              title="Download PDF"
                            >
                              <Download className="h-3.5 w-3.5" />
                            </a>
                            <button
                              type="button"
                              onClick={() => handleOpenInspectModal(mat)}
                              className="rounded-md p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                              title="Inspect Details"
                            >
                              <Info className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenDeleteMaterialModal(mat)}
                              className="rounded-md p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                              title="Delete Material"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {mat.pageCount || "?"} pages &bull; {mat.chunks?.length || 0} chunks
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  onClick={() => setActiveTab("materials")}
                  className="w-full text-center py-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Manage Materials &rarr;
                </button>
              </div>

              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Continuous Learning Loop</h3>
                <div className="space-y-2">
                  <Link
                    href={`/project/${projectId}/tutor`}
                    className="flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                  >
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
                      <MessageSquare className="h-4 w-4 text-indigo-600" /> Grounded Tutor
                    </div>
                    <span className="text-[11px] text-slate-400">Page citations &rarr;</span>
                  </Link>

                  <Link
                    href={`/project/${projectId}/quiz`}
                    className="flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                  >
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
                      <HelpCircle className="h-4 w-4 text-emerald-600" /> Adaptive Quiz
                    </div>
                    <span className="text-[11px] text-slate-400">AI grading &rarr;</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "materials" && (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <UploadCloud className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  Upload PDF Material
                </h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Upload textbooks, lecture notes, or research papers. The system extracts page-bounded text, embeds chunks, and identifies key concepts.
                </p>

                <div className="mt-4">
                  <label className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 p-6 text-center cursor-pointer hover:border-indigo-500 dark:hover:border-indigo-400 transition bg-slate-50/50 dark:bg-slate-950/40">
                    <FileText className="h-8 w-8 text-slate-400 mb-2" />
                    <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                      {uploading ? "Processing PDF..." : "Click or drag PDF to upload"}
                    </span>
                    <span className="text-[11px] text-slate-400 mt-1">PDF format up to 25MB</span>
                    <input
                      type="file"
                      accept=".pdf"
                      disabled={uploading}
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {uploadStatus && (
                  <div className="mt-5">
                    <ProcessingStepper
                      status={uploadStatus}
                      pageCount={pageCount}
                      errorMessage={uploadError || undefined}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-2 space-y-4">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Indexed Materials ({project.materials?.length || 0})
              </h2>

              {project.materials?.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center text-xs text-slate-400">
                  No materials uploaded yet. Add a PDF on the left to get started.
                </div>
              ) : (
                <div className="space-y-3">
                  {project.materials.map((mat: any) => (
                    <div
                      key={mat.id}
                      className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                            <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate max-w-md">
                              {mat.name}
                            </h4>
                          </div>
                          <div className="flex items-center gap-3 pt-1 text-xs text-slate-400">
                            <span>{mat.pageCount || "?"} Pages</span>
                            <span>&bull;</span>
                            <span>{mat.chunks?.length || 0} Searchable Chunks</span>
                            <span>&bull;</span>
                            <span>{Math.round(mat.fileSizeBytes / 1024 || 0)} KB</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-bold border ${
                              mat.status === "READY"
                                ? "bg-emerald-50 dark:bg-emerald-950/70 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300"
                                : mat.status === "FAILED"
                                ? "bg-rose-50 dark:bg-rose-950/70 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300"
                                : "bg-amber-50 dark:bg-amber-950/70 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300"
                            }`}
                          >
                            {mat.status}
                          </span>

                          <button
                            type="button"
                            onClick={() => setViewingMaterial(mat)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                            title="View PDF"
                          >
                            <Eye className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                            <span>View</span>
                          </button>

                          <a
                            href={`/api/materials/file?id=${mat.id}&download=1`}
                            download
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                            title="Download PDF"
                          >
                            <Download className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                            <span>Download</span>
                          </a>

                          <button
                            type="button"
                            onClick={() => handleOpenInspectModal(mat)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                            title="Inspect Chunks & Details"
                          >
                            <Info className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                            <span>Inspect</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenDeleteMaterialModal(mat)}
                            className="rounded-lg p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                            title="Delete Material"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "explorer" && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Compass className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                      Knowledge Explorer
                    </h2>
                  </div>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Search across the indexed learning materials in this project using semantic vector retrieval.
                  </p>
                </div>

                <div className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 self-start sm:self-auto border border-slate-200 dark:border-slate-700/60">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Searching only within this project</span>
                </div>
              </div>

              <form onSubmit={handleSearch} className="mt-5 flex flex-col sm:flex-row gap-2.5">
                <div className="relative flex-1">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <Search className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search formulas, concepts, algorithms, definitions..."
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/70 pl-9 pr-9 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={handleClearSearch}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                      title="Clear search"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={searching || !searchQuery.trim()}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition shadow-xs"
                >
                  {searching ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Searching...</span>
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4" />
                      <span>Search</span>
                    </>
                  )}
                </button>
              </form>

              {searchError && (
                <div className="mt-4 flex items-center gap-2 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/40 p-3 text-xs text-rose-700 dark:text-rose-300">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{searchError}</span>
                </div>
              )}
            </div>

            {searching ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center space-y-3 shadow-xs">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600 dark:text-indigo-400" />
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Searching indexed material chunks with vector similarity...
                </p>
              </div>
            ) : !hasSearched ? (
              <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center space-y-3 shadow-xs">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                  <Search className="h-6 w-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Search Indexed Material Passages
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                  Search your project&apos;s indexed learning materials to find relevant passages, citations, and exact page locations.
                </p>
              </div>
            ) : searchResults?.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center space-y-3 shadow-xs">
                <AlertCircle className="mx-auto h-8 w-8 text-slate-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  No relevant passages found for this query.
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                  Try broader keywords or verify that your uploaded documents have finished processing.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Found {searchResults?.length || 0} relevant passage{searchResults?.length === 1 ? "" : "s"}
                  </h3>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Ranked by semantic similarity
                  </span>
                </div>

                <div className="space-y-3">
                  {searchResults?.map((result, idx) => (
                    <div
                      key={result.chunkId || idx}
                      className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-3 hover:border-indigo-300 dark:hover:border-indigo-800/80 transition"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                          <span className="font-bold text-sm text-slate-900 dark:text-white truncate">
                            {result.materialName}
                          </span>
                          <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs font-semibold text-slate-600 dark:text-slate-300 shrink-0">
                            Page {result.pageNumber}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="rounded-full px-2.5 py-0.5 text-xs font-bold border bg-indigo-50 dark:bg-indigo-950/70 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300">
                            {Math.round(result.similarity * 100)}% relevant
                          </span>

                          {result.materialId && (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  setViewingMaterial({
                                    id: result.materialId,
                                    name: result.materialName,
                                    pageCount: result.pageCount,
                                    targetPage: result.pageNumber,
                                  })
                                }
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-indigo-600 transition"
                                title={`Open ${result.materialName} at Page ${result.pageNumber}`}
                              >
                                <Eye className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                                <span>Open Page</span>
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  handleOpenInspectModal({
                                    id: result.materialId,
                                    name: result.materialName,
                                    pageCount: result.pageCount,
                                  })
                                }
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                                title="Inspect Material Chunks"
                              >
                                <Info className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                                <span>Inspect</span>
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="rounded-xl bg-slate-50/80 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800/80 p-3.5">
                        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-mono whitespace-pre-wrap">
                          {result.content}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Edit Focused Project</h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Update your project details and learning goals.
            </p>

            {editError && (
              <div className="mt-3 flex items-center gap-2 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/40 p-2.5 text-xs text-red-700 dark:text-red-300">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleUpdateProject} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Project Name *
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="e.g. Raft Consensus Protocol"
                  className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Learning Goal *
                </label>
                <input
                  type="text"
                  required
                  value={editLearningGoal}
                  onChange={(e) => setEditLearningGoal(e.target.value)}
                  placeholder="e.g. Understand leader election and log replication safety"
                  className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Optional notes or context about this learning workspace..."
                  className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditError(null);
                  }}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition"
                >
                  {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {materialToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Delete Material</h3>
            <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Are you sure you want to delete <span className="font-semibold text-slate-900 dark:text-white">&ldquo;{materialToDelete.name}&rdquo;</span>?
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              This will permanently delete the uploaded PDF file, its {materialToDelete.chunks?.length || 0} searchable chunks, and vector embeddings. This action cannot be undone.
            </p>

            {deleteMaterialError && (
              <div className="mt-3 flex items-center gap-2 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/40 p-2.5 text-xs text-red-700 dark:text-red-300">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{deleteMaterialError}</span>
              </div>
            )}

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setMaterialToDelete(null);
                  setDeleteMaterialError(null);
                }}
                disabled={deletingMaterial}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteMaterial}
                disabled={deletingMaterial}
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50 transition"
              >
                {deletingMaterial && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Delete Material
              </button>
            </div>
          </div>
        </div>
      )}
      {viewingMaterial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-3 sm:p-6">
          <div className="flex flex-col w-full max-w-5xl h-[88vh] rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-5 py-3.5 bg-slate-50 dark:bg-slate-900/50">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-md">
                    {viewingMaterial.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    PDF Document Viewer &bull; {viewingMaterial.targetPage ? `Page ${viewingMaterial.targetPage} of ` : ""}{viewingMaterial.pageCount || "?"} pages
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={`/api/materials/file?id=${viewingMaterial.id}${viewingMaterial.targetPage ? `#page=${viewingMaterial.targetPage}` : ""}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                  title="Open in new tab"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">New Tab</span>
                </a>
                <a
                  href={`/api/materials/file?id=${viewingMaterial.id}&download=1`}
                  download
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                  title="Download PDF"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Download</span>
                </a>
                <button
                  type="button"
                  onClick={() => setViewingMaterial(null)}
                  className="rounded-xl p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  title="Close Viewer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="relative flex-1 w-full bg-slate-100 dark:bg-slate-950">
              <iframe
                src={`/api/materials/file?id=${viewingMaterial.id}${viewingMaterial.targetPage ? `#page=${viewingMaterial.targetPage}` : ""}`}
                className="w-full h-full border-0"
                title={viewingMaterial.name}
              />
            </div>
          </div>
        </div>
      )}

      {inspectingMaterial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-3 sm:p-6">
          <div className="flex flex-col w-full max-w-4xl max-h-[85vh] rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 py-4 bg-slate-50 dark:bg-slate-900/50">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400">
                  <Info className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-md">
                    {inspectingMaterial.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Ingestion Details &amp; Indexed Chunks Inspection
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setInspectingMaterial(null);
                  setChunkData(null);
                }}
                className="rounded-xl p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                title="Close Inspector"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-3.5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">Processing Status</span>
                  <span
                    className={`inline-block mt-0.5 rounded-md px-2 py-0.5 text-[11px] font-bold border ${
                      (chunkData?.material?.status || inspectingMaterial.status) === "READY"
                        ? "bg-emerald-50 dark:bg-emerald-950/70 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300"
                        : (chunkData?.material?.status || inspectingMaterial.status) === "FAILED"
                        ? "bg-rose-50 dark:bg-rose-950/70 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300"
                        : "bg-amber-50 dark:bg-amber-950/70 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300"
                    }`}
                  >
                    {chunkData?.material?.status || inspectingMaterial.status}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px]">Page Count</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 block">
                    {chunkData?.material?.pageCount ?? inspectingMaterial.pageCount ?? "?"} pages
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px]">Indexed Chunks</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 block">
                    {chunkData?.material?.chunkCount ?? inspectingMaterial.chunks?.length ?? "?"} chunks
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px]">Uploaded / Created</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 block">
                    {inspectingMaterial.createdAt
                      ? new Date(inspectingMaterial.createdAt).toLocaleDateString()
                      : "N/A"}
                  </span>
                </div>
              </div>

              {(chunkData?.material?.errorMessage || inspectingMaterial.errorMessage) && (
                <div className="mt-3 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/40 p-2.5 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{chunkData?.material?.errorMessage || inspectingMaterial.errorMessage}</span>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-3 bg-slate-50/50 dark:bg-slate-950/40">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Indexed Chunk Content Previews ({chunkData?.chunks?.length || 0})
                </h4>
                <span className="text-[11px] text-slate-400">
                  Ordered by document position &bull; Vectors hidden
                </span>
              </div>

              {loadingChunks ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-indigo-600 dark:text-indigo-400" />
                </div>
              ) : chunksError ? (
                <div className="flex items-center gap-2 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/40 p-4 text-xs text-rose-700 dark:text-rose-300">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{chunksError}</span>
                </div>
              ) : !chunkData?.chunks || chunkData.chunks.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-8 text-center text-xs text-slate-400">
                  No indexed chunks found for this material.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {chunkData.chunks.map((chunk: any) => {
                    const isExpanded = !!expandedChunkIds[chunk.id];
                    const previewText = chunk.content?.slice(0, 240) || "";
                    const hasMore = (chunk.content?.length || 0) > 240;

                    return (
                      <div
                        key={chunk.id}
                        className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 text-xs shadow-xs"
                      >
                        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800/60 mb-2">
                          <div className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-200">
                            <span className="rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 text-[11px] font-bold">
                              Chunk #{chunk.chunkIndex + 1}
                            </span>
                            <span className="text-slate-400 font-normal">&bull;</span>
                            <span className="text-slate-600 dark:text-slate-400 text-[11px]">
                              Page {chunk.pageNumber}
                            </span>
                          </div>
                          {hasMore && (
                            <button
                              type="button"
                              onClick={() => toggleChunkExpand(chunk.id)}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                            >
                              {isExpanded ? (
                                <>
                                  <span>Show less</span>
                                  <ChevronUp className="h-3 w-3" />
                                </>
                              ) : (
                                <>
                                  <span>Show all</span>
                                  <ChevronDown className="h-3 w-3" />
                                </>
                              )}
                            </button>
                          )}
                        </div>
                        <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-mono text-[11.5px] whitespace-pre-wrap">
                          {isExpanded ? chunk.content : previewText}
                          {!isExpanded && hasMore && "..."}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end border-t border-slate-200 dark:border-slate-800 px-6 py-3 bg-white dark:bg-slate-900">
              <button
                type="button"
                onClick={() => {
                  setInspectingMaterial(null);
                  setChunkData(null);
                }}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

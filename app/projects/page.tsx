"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FolderKanban,
  Plus,
  ArrowRight,
  Loader2,
  Layers,
  BookOpen,
  Sparkles,
  Trash2,
  AlertCircle,
  Filter,
  Edit2,
} from "lucide-react";

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<any[]>([]);
  const [spaces, setSpaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSpaceFilter, setSelectedSpaceFilter] = useState<string>("ALL");

  // Create Project modal state
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [learningGoal, setLearningGoal] = useState("");
  const [spaceId, setSpaceId] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Edit Project modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editLearningGoal, setEditLearningGoal] = useState("");
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const [projRes, spaceRes] = await Promise.all([
        fetch("/api/projects"),
        fetch("/api/spaces"),
      ]);

      if (projRes.ok) {
        const projData = await projRes.json();
        setProjects(projData.projects || []);
      }

      if (spaceRes.ok) {
        const spaceData = await spaceRes.json();
        const loadedSpaces = spaceData.spaces || [];
        setSpaces(loadedSpaces);
        if (loadedSpaces.length > 0 && !spaceId) {
          setSpaceId(loadedSpaces[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !spaceId || !learningGoal.trim()) return;
    setCreating(true);
    setError(null);

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, learningGoal, spaceId }),
      });

      if (res.ok) {
        const data = await res.json();
        setShowModal(false);
        router.push(`/project/${data.project.id}`);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to create project.");
      }
    } catch (err) {
      setError("Failed to create project.");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteProject = async (id: string, projectName: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm(`Are you sure you want to delete project "${projectName}"? This will delete all its materials, chunks, quizzes, and mastery logs.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/projects?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error("Failed to delete project:", err);
    }
  };

  const handleOpenEdit = (project: any, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingProjectId(project.id);
    setEditName(project.name || "");
    setEditDescription(project.description || "");
    setEditLearningGoal(project.learningGoal || "");
    setEditError(null);
    setShowEditModal(true);
  };

  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProjectId || !editName.trim() || !editLearningGoal.trim()) return;
    if (saving) return;
    setSaving(true);
    setEditError(null);

    try {
      const res = await fetch("/api/projects", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingProjectId,
          name: editName,
          description: editDescription,
          learningGoal: editLearningGoal,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setProjects((prev) =>
          prev.map((p) =>
            p.id === editingProjectId
              ? {
                  ...p,
                  name: data.project?.name || editName.trim(),
                  description: data.project?.description ?? (editDescription.trim() || null),
                  learningGoal: data.project?.learningGoal || editLearningGoal.trim(),
                }
              : p
          )
        );
        setShowEditModal(false);
        setEditingProjectId(null);
        fetchData();
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

  const filteredProjects =
    selectedSpaceFilter === "ALL"
      ? projects
      : projects.filter((p) => p.spaceId === selectedSpaceFilter);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-16 transition-colors">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-colors">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                <FolderKanban className="h-4 w-4" /> Learning Workspaces
              </div>
              <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                Focused Projects
              </h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Independent learning journeys with dedicated materials, grounded tutoring, and concept mastery.
              </p>
            </div>

            <button
              onClick={() => {
                if (spaces.length === 0) {
                  router.push("/spaces");
                } else {
                  setShowModal(true);
                }
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 text-xs font-semibold shadow-xs transition self-start sm:self-auto"
            >
              <Plus className="h-4 w-4" />
              New Project
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        {/* Space Filter Pill Bar */}
        {spaces.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            <span className="text-xs font-semibold text-slate-400 flex items-center gap-1 shrink-0">
              <Filter className="h-3.5 w-3.5" /> Space:
            </span>
            <button
              onClick={() => setSelectedSpaceFilter("ALL")}
              className={`rounded-lg px-3 py-1 text-xs font-medium transition shrink-0 ${
                selectedSpaceFilter === "ALL"
                  ? "bg-indigo-600 text-white"
                  : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              All Spaces ({projects.length})
            </button>
            {spaces.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedSpaceFilter(s.id)}
                className={`rounded-lg px-3 py-1 text-xs font-medium transition shrink-0 ${
                  selectedSpaceFilter === s.id
                    ? "bg-indigo-600 text-white"
                    : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>
        )}

        {/* Project Cards Grid */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600 dark:text-indigo-400" />
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center space-y-4">
            <div className="h-14 w-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
              <BookOpen className="h-7 w-7" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">No projects found</h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              {spaces.length === 0
                ? "You need to create a learning Space before you can start a focused project."
                : "Create a focused project with a clear learning goal to start uploading materials."}
            </p>
            <button
              onClick={() => {
                if (spaces.length === 0) {
                  router.push("/spaces");
                } else {
                  setShowModal(true);
                }
              }}
              className="mt-2 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-indigo-700 shadow-xs"
            >
              <Plus className="h-4 w-4" /> {spaces.length === 0 ? "Create Space First" : "Create Project"}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProjects.map((proj) => {
              const avgMastery =
                proj.concepts && proj.concepts.length > 0
                  ? Math.round(
                      proj.concepts.reduce((acc: number, c: any) => acc + c.masteryScore, 0) /
                        proj.concepts.length
                    )
                  : 0;

              return (
                <div
                  key={proj.id}
                  className="group flex flex-col justify-between rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs hover:border-indigo-400 dark:hover:border-indigo-600 transition"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800/80 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700 dark:text-indigo-300">
                        <Layers className="h-3 w-3" /> {proj.space?.name || "Space"}
                      </span>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                        <button
                          type="button"
                          onClick={(e) => handleOpenEdit(proj, e)}
                          className="rounded-lg p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition"
                          title="Edit Project"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteProject(proj.id, proj.name, e)}
                          className="rounded-lg p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                          title="Delete Project"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <h3 className="mt-3 font-bold text-slate-900 dark:text-white text-lg group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                      {proj.name}
                    </h3>

                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                      <strong>Goal:</strong> {proj.learningGoal}
                    </p>

                    {/* Mastery Bar */}
                    <div className="mt-4">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-slate-400">Concept Mastery</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{avgMastery}%</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <div
                          className="h-full bg-indigo-600 rounded-full"
                          style={{ width: `${avgMastery}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-4 text-xs">
                    <span className="text-slate-400">
                      {proj.materials?.length || 0} Materials &bull; {proj.concepts?.length || 0} Concepts
                    </span>
                    <Link
                      href={`/project/${proj.id}`}
                      className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
                    >
                      Workspace <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Project Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Create Learning Project</h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              A project is a dedicated workspace with its own materials, AI tutor context, and concept mastery.
            </p>

            {error && (
              <div className="mt-3 flex items-center gap-2 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/40 p-2.5 text-xs text-red-700 dark:text-red-300">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleCreateProject} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Target Space *
                </label>
                <select
                  value={spaceId}
                  onChange={(e) => setSpaceId(e.target.value)}
                  required
                  className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
                >
                  {spaces.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Project Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
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
                  value={learningGoal}
                  onChange={(e) => setLearningGoal(e.target.value)}
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
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional notes or context about this learning workspace..."
                  className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setError(null);
                  }}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition"
                >
                  {creating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Project Modal */}
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
                    setEditingProjectId(null);
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
    </div>
  );
}

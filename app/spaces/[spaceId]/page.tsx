"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { Plus, ArrowLeft, ArrowRight, BookOpen, Layers, Loader2, AlertCircle, Edit2 } from "lucide-react";

export default function SpaceDetailPage({ params }: { params: Promise<{ spaceId: string }> }) {
  const resolvedParams = use(params);
  const spaceId = resolvedParams.spaceId;

  const [space, setSpace] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const [showEditSpaceModal, setShowEditSpaceModal] = useState(false);
  const [editSpaceName, setEditSpaceName] = useState("");
  const [editSpaceDescription, setEditSpaceDescription] = useState("");
  const [savingSpace, setSavingSpace] = useState(false);
  const [editSpaceError, setEditSpaceError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [learningGoal, setLearningGoal] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSpaceData = async () => {
    try {
      const res = await fetch(`/api/spaces`);
      if (res.ok) {
        const data = await res.json();
        const found = data.spaces?.find((s: any) => s.id === spaceId);
        setSpace(found || null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSpaceData();
  }, [spaceId]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !learningGoal.trim()) return;
    setCreating(true);
    setError(null);

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          learningGoal,
          spaceId,
        }),
      });

      if (res.ok) {
        setName("");
        setDescription("");
        setLearningGoal("");
        setShowModal(false);
        fetchSpaceData();
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

  const handleOpenEditSpace = () => {
    if (!space) return;
    setEditSpaceName(space.name || "");
    setEditSpaceDescription(space.description || "");
    setEditSpaceError(null);
    setShowEditSpaceModal(true);
  };

  const handleUpdateSpace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!space || !editSpaceName.trim()) return;
    setSavingSpace(true);
    setEditSpaceError(null);

    try {
      const res = await fetch("/api/spaces", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: space.id,
          name: editSpaceName,
          description: editSpaceDescription,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSpace((prev: any) => ({
          ...prev,
          name: data.space?.name || editSpaceName.trim(),
          description: data.space?.description ?? (editSpaceDescription.trim() || null),
        }));
        setShowEditSpaceModal(false);
        fetchSpaceData();
      } else {
        const data = await res.json();
        setEditSpaceError(data.error || "Failed to update space.");
      }
    } catch (err) {
      setEditSpaceError("Failed to update space.");
    } finally {
      setSavingSpace(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600 dark:text-indigo-400" />
      </div>
    );
  }

  if (!space) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-20 text-center bg-slate-50 dark:bg-slate-950 min-h-[calc(100vh-4rem)]">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 max-w-md mx-auto space-y-3">
          <AlertCircle className="h-8 w-8 text-amber-500 mx-auto" />
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">Space Not Found</h2>
          <Link href="/spaces" className="mt-4 inline-block text-xs font-semibold text-indigo-600 hover:underline">
            &larr; Back to all Spaces
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-16 transition-colors">
      <div className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-colors">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <Link
            href="/spaces"
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white mb-4 transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> All Spaces
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                  <Layers className="h-4 w-4" />
                </div>
                <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                  {space.name}
                </h1>
              </div>
              <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-2xl">
                {space.description || "No description provided."}
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                type="button"
                onClick={handleOpenEditSpace}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 px-3.5 py-2.5 text-xs font-semibold shadow-xs transition"
              >
                <Edit2 className="h-4 w-4" />
                Edit Space
              </button>
              <button
                onClick={() => setShowModal(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 text-xs font-semibold shadow-xs transition"
              >
                <Plus className="h-4 w-4" />
                New Project
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Focused Projects ({space.projects?.length || 0})
          </h2>
        </div>

        {space.projects?.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center space-y-4">
            <BookOpen className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-700" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">No projects in this space yet</h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Create a focused project with a defined learning goal to begin uploading materials and learning.
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="mt-4 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-indigo-700 shadow-xs"
            >
              Create First Project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {space.projects.map((proj: any) => {
              const avgScore =
                proj.concepts?.length > 0
                  ? Math.round(
                      proj.concepts.reduce((a: number, b: any) => a + b.masteryScore, 0) /
                        proj.concepts.length
                    )
                  : 0;

              return (
                <div
                  key={proj.id}
                  className="flex flex-col justify-between rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs hover:border-indigo-400 dark:hover:border-indigo-600 transition"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-slate-900 dark:text-white text-base">{proj.name}</h3>
                      <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-100 dark:border-indigo-800 rounded-full px-2 py-0.5">
                        {avgScore}% Mastery
                      </span>
                    </div>

                    <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                      <strong>Goal:</strong> {proj.learningGoal}
                    </p>

                    <div className="mt-4 flex items-center gap-3 text-xs text-slate-400">
                      <span>{proj.materials?.length || 0} Materials</span>
                      <span>&bull;</span>
                      <span>{proj.concepts?.length || 0} Concepts</span>
                    </div>
                  </div>

                  <div className="mt-6 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-4">
                    <Link
                      href={`/project/${proj.id}/tutor`}
                      className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      Ask Tutor
                    </Link>
                    <Link
                      href={`/project/${proj.id}`}
                      className="inline-flex items-center gap-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 px-3 py-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900 transition"
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

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Create Focused Project</h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Each project holds its own materials, grounded tutor context, and concept mastery state.
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
                  Project Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Raft Consensus Algorithm"
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
                  placeholder="e.g. Understand leader election and log safety"
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
                  placeholder="Optional notes or context..."
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

      {showEditSpaceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Edit Learning Space</h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Update the name and description for this space.
            </p>

            {editSpaceError && (
              <div className="mt-3 flex items-center gap-2 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/40 p-2.5 text-xs text-red-700 dark:text-red-300">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{editSpaceError}</span>
              </div>
            )}

            <form onSubmit={handleUpdateSpace} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Space Name *
                </label>
                <input
                  type="text"
                  required
                  value={editSpaceName}
                  onChange={(e) => setEditSpaceName(e.target.value)}
                  placeholder="e.g. Distributed Systems"
                  className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={editSpaceDescription}
                  onChange={(e) => setEditSpaceDescription(e.target.value)}
                  placeholder="Brief summary of what you are exploring in this space..."
                  className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditSpaceModal(false);
                    setEditSpaceError(null);
                  }}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingSpace}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition"
                >
                  {savingSpace && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
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

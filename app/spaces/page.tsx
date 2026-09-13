"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Layers, Plus, Folder, ArrowRight, Loader2, Trash2, AlertCircle, Edit2 } from "lucide-react";

export default function SpacesPage() {
  const [spaces, setSpaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingSpaceId, setEditingSpaceId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const fetchSpaces = async () => {
    try {
      const res = await fetch("/api/spaces");
      if (res.ok) {
        const data = await res.json();
        setSpaces(data.spaces || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSpaces();
  }, []);

  const handleCreateSpace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    setError(null);

    try {
      const res = await fetch("/api/spaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description }),
      });

      if (res.ok) {
        setName("");
        setDescription("");
        setShowModal(false);
        fetchSpaces();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to create space.");
      }
    } catch (err) {
      setError("Failed to create space.");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteSpace = async (id: string, spaceName: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm(`Are you sure you want to delete "${spaceName}"? All its projects and materials will be permanently deleted.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/spaces?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchSpaces();
      }
    } catch (err) {
      console.error("Failed to delete space:", err);
    }
  };

  const handleOpenEdit = (space: any, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingSpaceId(space.id);
    setEditName(space.name || "");
    setEditDescription(space.description || "");
    setEditError(null);
    setShowEditModal(true);
  };

  const handleUpdateSpace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSpaceId || !editName.trim()) return;
    setSaving(true);
    setEditError(null);

    try {
      const res = await fetch("/api/spaces", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingSpaceId,
          name: editName,
          description: editDescription,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSpaces((prev) =>
          prev.map((s) =>
            s.id === editingSpaceId
              ? {
                  ...s,
                  name: data.space?.name || editName.trim(),
                  description: data.space?.description ?? (editDescription.trim() || null),
                }
              : s
          )
        );
        setShowEditModal(false);
        setEditingSpaceId(null);
        fetchSpaces();
      } else {
        const data = await res.json();
        setEditError(data.error || "Failed to update space.");
      }
    } catch (err) {
      setEditError("Failed to update space.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-16 transition-colors">
      <div className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-colors">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                <Layers className="h-4 w-4" /> Domain Organization
              </div>
              <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                Learning Spaces
              </h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Broad organizational layers representing fields, disciplines, or certification goals.
              </p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 text-xs font-semibold shadow-xs transition self-start sm:self-auto"
            >
              <Plus className="h-4 w-4" />
              New Space
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600 dark:text-indigo-400" />
          </div>
        ) : spaces.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center space-y-4">
            <div className="h-14 w-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
              <Layers className="h-7 w-7" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">No spaces created yet</h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Spaces organize your learning into major subject areas. Create your first space to begin.
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="mt-2 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-indigo-700 shadow-xs"
            >
              <Plus className="h-4 w-4" /> Create Space
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {spaces.map((space) => (
              <div
                key={space.id}
                className="group flex flex-col justify-between rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs hover:border-indigo-400 dark:hover:border-indigo-600 transition"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400">
                      <Folder className="h-5 w-5" />
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                      <button
                        type="button"
                        onClick={(e) => handleOpenEdit(space, e)}
                        className="rounded-lg p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition"
                        title="Edit Space"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteSpace(space.id, space.name, e)}
                        className="rounded-lg p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                        title="Delete Space"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <h3 className="mt-4 font-bold text-slate-900 dark:text-white text-lg group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                    {space.name}
                  </h3>
                  <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                    {space.description || "No description provided."}
                  </p>
                </div>

                <div className="mt-6 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-4 text-xs font-medium text-slate-500 dark:text-slate-400">
                  <span>{space.projects?.length || 0} Projects</span>
                  <Link
                    href={`/spaces/${space.id}`}
                    className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
                  >
                    Open Space <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Create Learning Space</h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              e.g. &ldquo;Computer Science&rdquo;, &ldquo;Cloud Architecture&rdquo;, or &ldquo;Biology&rdquo;.
            </p>

            {error && (
              <div className="mt-3 flex items-center gap-2 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/40 p-2.5 text-xs text-red-700 dark:text-red-300">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleCreateSpace} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Space Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
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
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief summary of what you are exploring in this space..."
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
                  Create Space
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Edit Learning Space</h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Update the name and description for this space.
            </p>

            {editError && (
              <div className="mt-3 flex items-center gap-2 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/40 p-2.5 text-xs text-red-700 dark:text-red-300">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{editError}</span>
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
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
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
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Brief summary of what you are exploring in this space..."
                  className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingSpaceId(null);
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

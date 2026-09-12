"use client";

import React, { useState } from "react";
import { FileText, ChevronDown, ChevronUp } from "lucide-react";

interface CitationBadgeProps {
  materialName: string;
  pageNumber: number;
  snippet?: string;
}

export function CitationBadge({ materialName, pageNumber, snippet }: CitationBadgeProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <span className="inline-block my-1 mr-1.5 align-middle">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1.5 rounded-md border border-indigo-200 bg-indigo-50/80 px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition cursor-pointer shadow-2xs"
        title="Click to view verified source excerpt"
      >
        <FileText className="h-3.5 w-3.5 text-indigo-600" />
        <span>
          {materialName} &bull; Page {pageNumber}
        </span>
        {isOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>

      {isOpen && snippet && (
        <div className="mt-1.5 rounded-lg border border-indigo-200 bg-white p-3 text-xs text-slate-700 shadow-md animate-in fade-in slide-in-from-top-1 max-w-lg">
          <div className="flex items-center justify-between pb-1 mb-1.5 border-b border-slate-100 text-[11px] font-medium text-slate-400">
            <span>VERIFIED EXCERPT (PAGE {pageNumber})</span>
            <span className="text-indigo-600">Grounded Source</span>
          </div>
          <p className="italic leading-relaxed text-slate-800">
            &ldquo;{snippet}&rdquo;
          </p>
        </div>
      )}
    </span>
  );
}

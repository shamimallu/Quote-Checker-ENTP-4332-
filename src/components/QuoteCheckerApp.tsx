"use client";

import { useState } from "react";
import Link from "next/link";
import QuoteUploadForm from "@/components/QuoteUploadForm";
import QuoteList from "@/components/QuoteList";
import QuoteComparison from "@/components/QuoteComparison";
import { loadQuotes, saveQuotes } from "@/lib/quote-storage";
import type { ComparisonResult, ExtractedQuote } from "@/lib/quote-types";

export default function QuoteCheckerApp() {
  const [quotes, setQuotes] = useState<ExtractedQuote[]>(() =>
    typeof window === "undefined" ? [] : loadQuotes()
  );
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [comparing, setComparing] = useState(false);
  const [compareError, setCompareError] = useState<string | null>(null);
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);

  async function handleUpload(file: File) {
    setUploading(true);
    setUploadError(null);
    try {
      const placeholder: ExtractedQuote = {
        id: crypto.randomUUID(),
        fileName: file.name,
        contractorName: "Pending analysis",
        lineItems: [],
        depositPercent: null,
        depositAmount: null,
        warrantyTerms: "AI analysis coming soon — this file is saved, but not read yet.",
      };
      const next = [...quotes, placeholder];
      setQuotes(next);
      saveQuotes(next);
      setComparison(null);
    } finally {
      setUploading(false);
    }
  }

  function handleRemove(id: string) {
    const next = quotes.filter((q) => q.id !== id);
    setQuotes(next);
    saveQuotes(next);
    setComparison(null);
  }

  async function handleCompare() {
    setComparing(true);
    setCompareError(null);
    try {
      const res = await fetch("/api/compare-quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quotes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not compare those quotes.");
      setComparison(data as ComparisonResult);
    } catch (error) {
      setCompareError(error instanceof Error ? error.message : "Could not compare those quotes.");
    } finally {
      setComparing(false);
    }
  }

  return (
    <main className="mx-auto flex max-w-3xl flex-1 flex-col px-6 py-16">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="font-serif text-3xl text-beige">Quote Checker</h1>
        <Link
          href="/"
          className="rounded-full border border-walnut px-4 py-1.5 text-sm text-beige transition-colors hover:border-caramel hover:text-caramel"
        >
          ← Back to home
        </Link>
      </div>

      <QuoteUploadForm onUpload={handleUpload} uploading={uploading} error={uploadError} />
      <QuoteList
        quotes={quotes}
        onRemove={handleRemove}
        onCompare={handleCompare}
        comparing={comparing}
        compareError={compareError}
      />
      {comparison && <QuoteComparison result={comparison} />}
    </main>
  );
}

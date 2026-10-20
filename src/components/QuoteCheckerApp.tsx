"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import QuoteUploadForm from "@/components/QuoteUploadForm";
import QuoteList from "@/components/QuoteList";
import QuoteComparison from "@/components/QuoteComparison";
import { deleteQuote, loadQuotes, saveQuote } from "@/lib/quote-storage";
import type { ComparisonResult, ExtractedQuote } from "@/lib/quote-types";

export default function QuoteCheckerApp() {
  const [quotes, setQuotes] = useState<ExtractedQuote[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [comparing, setComparing] = useState(false);
  const [compareError, setCompareError] = useState<string | null>(null);
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);

  useEffect(() => {
    loadQuotes()
      .then(setQuotes)
      .catch(() => setUploadError("Could not load your saved quotes. Check your connection and refresh."));
  }, []);

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
      await saveQuote(placeholder);
      setQuotes((list) => [...list, placeholder]);
      setComparison(null);
    } catch {
      setUploadError("Could not save that quote. Check your connection and that you are signed in.");
    } finally {
      setUploading(false);
    }
  }

  async function handleRemove(id: string) {
    try {
      await deleteQuote(id);
    } catch {
      setUploadError("Could not remove that quote. Try again.");
      return;
    }
    setQuotes((list) => list.filter((q) => q.id !== id));
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

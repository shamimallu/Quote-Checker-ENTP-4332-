"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import GeminiButton from "@/components/GeminiButton";
import JobBar from "@/components/JobBar";
import QuoteUploadForm from "@/components/QuoteUploadForm";
import QuoteList from "@/components/QuoteList";
import QuoteComparison from "@/components/QuoteComparison";
import { loadJobs } from "@/lib/job-storage";
import { canEditJob, type Job } from "@/lib/job-types";
import { deleteQuote, loadQuotes, saveComparison, saveQuote } from "@/lib/quote-storage";
import type { ComparisonResult, ExtractedQuote } from "@/lib/quote-types";

// Remembers which job was open last, in this browser only.
const SELECTED_JOB_KEY = "homi:selected-job";
function rememberedJobId() {
  try {
    return localStorage.getItem(SELECTED_JOB_KEY);
  } catch {
    return null;
  }
}
function rememberJobId(id: string | null) {
  try {
    if (id) localStorage.setItem(SELECTED_JOB_KEY, id);
    else localStorage.removeItem(SELECTED_JOB_KEY);
  } catch {}
}

export default function QuoteCheckerApp() {
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobsError, setJobsError] = useState(false);
  const [quotes, setQuotes] = useState<ExtractedQuote[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [comparing, setComparing] = useState(false);
  const [compareError, setCompareError] = useState<string | null>(null);
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);

  // Shows the loaded jobs and selects `preferred` if it still exists, else the remembered or newest job.
  const showJobs = useCallback((list: Job[], preferred: string | null) => {
    const pick =
      [preferred, rememberedJobId()].find((id) => id && list.some((j) => j.id === id)) ??
      list[0]?.id ??
      null;
    setJobs(list);
    setJobId(pick);
    rememberJobId(pick);
    setJobsError(false);
  }, []);

  const showJobsError = useCallback(() => {
    setJobs((current) => current ?? []);
    setJobsError(true);
  }, []);

  useEffect(() => {
    loadJobs()
      .then((list) => showJobs(list, null))
      .catch(showJobsError);
  }, [showJobs, showJobsError]);

  async function refreshJobs(preferred: string | null) {
    try {
      showJobs(await loadJobs(), preferred);
    } catch {
      showJobsError();
    }
  }

  useEffect(() => {
    if (!jobId) return;
    let cancelled = false;
    loadQuotes(jobId)
      .then(({ quotes, comparison }) => {
        if (cancelled) return;
        setQuotes(quotes);
        setComparison(comparison);
        setUploadError(null);
      })
      .catch(() => !cancelled && setUploadError("Could not load this job's quotes. Check your connection and refresh."));
    return () => {
      cancelled = true;
    };
  }, [jobId]);

  const job = jobs?.find((j) => j.id === jobId) ?? null;
  const editable = job ? canEditJob(job) : false;
  const visibleQuotes = job ? quotes : [];

  function selectJob(id: string) {
    setQuotes([]);
    setComparison(null);
    setJobId(id);
    rememberJobId(id);
  }

  async function handleUpload(file: File) {
    if (!job) return;
    setUploading(true);
    setUploadError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/extract-quote", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) {
        setUploadError(data.error ?? "Could not read that quote.");
        return;
      }
      const saved = await saveQuote(job.id, { ...(data as Omit<ExtractedQuote, "filePath">), filePath: null }, file);
      setQuotes((list) => [...list, saved]);
      setComparison(null);
    } catch {
      setUploadError("Could not save that quote. Check your connection and that you are signed in.");
    } finally {
      setUploading(false);
    }
  }

  async function handleRemove(id: string) {
    const quote = quotes.find((q) => q.id === id);
    if (!quote) return;
    try {
      await deleteQuote(quote);
    } catch (e) {
      setUploadError(e instanceof Error && e.message ? e.message : "Could not remove that quote. Try again.");
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
      const result = data as ComparisonResult;
      setComparison(result);
      if (editable) {
        await saveComparison(
          quotes.map((q) => q.id),
          result
        ).catch(() => setCompareError("Compared, but could not save the results. They'll be gone after a refresh."));
      }
    } catch (error) {
      setCompareError(error instanceof Error ? error.message : "Could not compare those quotes.");
    } finally {
      setComparing(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 py-16">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="font-serif text-3xl text-beige">Quote Checker</h1>
        <Link
          href="/"
          className="rounded-full border border-walnut px-4 py-1.5 text-sm text-beige transition-colors hover:border-caramel hover:text-caramel"
        >
          ← Back to home
        </Link>
      </div>

      {jobs === null ? (
        <p className="text-sm text-sand">Loading your jobs…</p>
      ) : (
        <>
          {jobsError && (
            <p className="mb-4 text-sm text-red-400">
              Could not load your jobs. Check your connection and that you are signed in, then refresh.
            </p>
          )}
          <JobBar key={jobs.length === 0 ? "empty" : "jobs"} jobs={jobs} selected={job} onSelect={selectJob} onChange={refreshJobs} />

          {!job ? (
            <p className="text-sm text-sand">Create a job above to start adding quotes for it.</p>
          ) : (
            <>
              {editable ? (
                <QuoteUploadForm onUpload={handleUpload} uploading={uploading} error={uploadError} />
              ) : (
                <p className="text-sm text-sand">
                  You can view this job&apos;s quotes. Ask the owner for edit access to add or remove them.
                </p>
              )}
              {!editable && uploadError && <p className="mt-2 text-sm text-red-400">{uploadError}</p>}
              <QuoteList
                quotes={visibleQuotes}
                onRemove={editable ? handleRemove : undefined}
                onCompare={handleCompare}
                comparing={comparing}
                compareError={compareError}
              />
              {comparison && <QuoteComparison result={comparison} />}
            </>
          )}
        </>
      )}

      <GeminiButton quotes={visibleQuotes} comparison={comparison} />
    </main>
  );
}

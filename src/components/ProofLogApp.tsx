"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import JobBar from "@/components/JobBar";
import ProofLogEntryForm from "@/components/proof-log/ProofLogEntryForm";
import ProofLogEntryList from "@/components/proof-log/ProofLogEntryList";
import { canEditJob } from "@/lib/job-types";
import { listProofLogEntries } from "@/lib/proof-log-storage";
import type { ProofLogEntry } from "@/lib/proof-log-types";
import { useJobs } from "@/lib/use-jobs";

// Proof Log: a dated record of the work on a job, with optional photos.
export default function ProofLogApp() {
  const { jobs, job, jobsError, selectJob, refreshJobs } = useJobs();
  const [loaded, setLoaded] = useState<{ jobId: string; entries: ProofLogEntry[] } | null>(null);
  const [entriesError, setEntriesError] = useState(false);
  const [version, setVersion] = useState(0); // bumped to reload entries after a change

  const jobId = job?.id ?? null;

  useEffect(() => {
    if (!jobId) return;
    let cancelled = false;
    listProofLogEntries(jobId)
      .then((list) => {
        if (cancelled) return;
        setLoaded({ jobId, entries: list });
        setEntriesError(false);
      })
      .catch(() => !cancelled && setEntriesError(true));
    return () => {
      cancelled = true;
    };
  }, [jobId, version]);

  const entries = loaded && job && loaded.jobId === job.id ? loaded.entries : null;
  const editable = job ? canEditJob(job) : false;
  const onRecordChange = () => setVersion((v) => v + 1);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 py-16">
      <div className="mb-8 flex items-center justify-between gap-4">
        <h1 className="font-serif text-3xl text-beige">Proof Log</h1>
        <Link
          href="/"
          className="shrink-0 rounded-full border border-walnut px-4 py-1.5 text-sm text-beige transition-colors hover:border-caramel hover:text-caramel"
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
          <JobBar
            key={jobs.length === 0 ? "empty" : "jobs"}
            jobs={jobs}
            selected={job}
            onSelect={selectJob}
            onChange={refreshJobs}
          />

          {!job ? (
            <p className="text-sm text-sand">Create a job above to start its proof log.</p>
          ) : entriesError ? (
            <p className="text-sm text-red-400">Could not load this job&apos;s proof log. Check your connection and refresh.</p>
          ) : entries === null ? (
            <p className="text-sm text-sand">Loading this job&apos;s proof log…</p>
          ) : (
            <div className="flex flex-col gap-6">
              {!editable && (
                <p className="text-sm text-sand">
                  You can view this job. Ask the owner for edit access to add entries.
                </p>
              )}
              {editable && (
                <ProofLogEntryForm key={job.id} jobId={job.id} onRecordChange={onRecordChange} />
              )}
              <ProofLogEntryList
                key={`list-${job.id}`}
                entries={entries}
                editable={editable}
                onRecordChange={onRecordChange}
              />
            </div>
          )}
        </>
      )}
    </main>
  );
}

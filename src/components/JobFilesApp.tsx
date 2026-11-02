"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import JobBar from "@/components/JobBar";
import JobAlerts from "@/components/job-files/JobAlerts";
import JobContractorSection from "@/components/job-files/JobContractorSection";
import JobDetailsSection from "@/components/job-files/JobDetailsSection";
import JobDocumentsSection from "@/components/job-files/JobDocumentsSection";
import JobMoneySection from "@/components/job-files/JobMoneySection";
import JobQuoteSection from "@/components/job-files/JobQuoteSection";
import { getContractor, listMyContractors, type Contractor } from "@/lib/contractor-storage";
import { getJobAlerts } from "@/lib/job-alerts";
import { listJobFiles, type JobFile } from "@/lib/job-file-storage";
import { loadLedger, type ChangeOrder, type Payment } from "@/lib/job-ledger-storage";
import { canEditJob } from "@/lib/job-types";
import { loadQuotes } from "@/lib/quote-storage";
import type { ExtractedQuote } from "@/lib/quote-types";
import { currentUserId } from "@/lib/supabase/current-user";
import { useJobs } from "@/lib/use-jobs";
import { countWarrantiesForJob } from "@/lib/warranty-storage";

// Everything on one job besides the job row itself.
type JobRecord = {
  jobId: string;
  quotes: ExtractedQuote[];
  payments: Payment[];
  changeOrders: ChangeOrder[];
  files: JobFile[];
  linkedWarranties: number;
  contractor: Contractor | null;
  myContractors: Contractor[];
  userId: string;
};

async function loadJobRecord(jobId: string, contractorId: string | null): Promise<JobRecord> {
  const [quotes, ledger, files, linkedWarranties, contractor, myContractors, userId] = await Promise.all([
    loadQuotes(jobId).then((r) => r.quotes),
    loadLedger(jobId),
    listJobFiles(jobId),
    countWarrantiesForJob(jobId),
    contractorId ? getContractor(contractorId) : Promise.resolve(null),
    listMyContractors(),
    currentUserId(),
  ]);
  return { jobId, quotes, ...ledger, files, linkedWarranties, contractor, myContractors, userId };
}

// Job Files: a neutral record of one repair job, from quote to finished work.
export default function JobFilesApp() {
  const { jobs, job, jobsError, selectJob, refreshJobs } = useJobs();
  const [record, setRecord] = useState<JobRecord | null>(null);
  const [recordError, setRecordError] = useState(false);
  const [version, setVersion] = useState(0); // bumped to reload the record after a change

  const jobId = job?.id ?? null;
  const contractorId = job?.contractorId ?? null;

  useEffect(() => {
    if (!jobId) return;
    let cancelled = false;
    loadJobRecord(jobId, contractorId)
      .then((r) => {
        if (cancelled) return;
        setRecord(r);
        setRecordError(false);
      })
      .catch(() => !cancelled && setRecordError(true));
    return () => {
      cancelled = true;
    };
  }, [jobId, contractorId, version]);

  const current = record && job && record.jobId === job.id ? record : null;
  const editable = job ? canEditJob(job) : false;
  const onJobChange = () => refreshJobs(jobId);
  const onRecordChange = () => setVersion((v) => v + 1);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 py-16">
      <div className="mb-8 flex items-center justify-between gap-4">
        <h1 className="font-serif text-3xl text-beige">Job Files</h1>
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
            <p className="text-sm text-sand">Create a job above to start its record.</p>
          ) : recordError ? (
            <p className="text-sm text-red-400">Could not load this job. Check your connection and refresh.</p>
          ) : !current ? (
            <p className="text-sm text-sand">Loading this job…</p>
          ) : (
            <div className="flex flex-col gap-6">
              <JobAlerts
                alerts={getJobAlerts({
                  job,
                  payments: current.payments,
                  changeOrders: current.changeOrders,
                  files: current.files,
                  linkedWarranties: current.linkedWarranties,
                })}
              />
              {!editable && (
                <p className="text-sm text-sand">
                  You can view this job. Ask the owner for edit access to make changes.
                </p>
              )}
              <JobDetailsSection key={job.id} job={job} editable={editable} onJobChange={onJobChange} />
              <JobContractorSection
                key={`contractor-${job.id}`}
                job={job}
                contractor={current.contractor}
                myContractors={current.myContractors}
                editable={editable}
                userId={current.userId}
                onJobChange={onJobChange}
                onRecordChange={onRecordChange}
              />
              <JobQuoteSection
                key={`quote-${job.id}`}
                job={job}
                quotes={current.quotes}
                editable={editable}
                onJobChange={onJobChange}
              />
              <JobMoneySection
                key={`money-${job.id}`}
                job={job}
                payments={current.payments}
                changeOrders={current.changeOrders}
                editable={editable}
                onRecordChange={onRecordChange}
              />
              <JobDocumentsSection
                key={`files-${job.id}`}
                jobId={job.id}
                files={current.files}
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

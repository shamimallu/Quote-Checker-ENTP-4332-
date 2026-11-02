"use client";

import { useCallback, useEffect, useState } from "react";
import { loadJobs } from "@/lib/job-storage";
import type { Job } from "@/lib/job-types";

// Remembers which job was open last, in this browser only, so Quote Checker and Job Files
// open on the same job.
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

// The signed-in person's jobs and the selected one. refreshJobs(preferred) reloads them and
// selects `preferred` if it still exists, else the remembered or newest job.
export function useJobs() {
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobsError, setJobsError] = useState(false);

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

  const refreshJobs = useCallback(
    async (preferred: string | null) => {
      try {
        showJobs(await loadJobs(), preferred);
      } catch {
        showJobsError();
      }
    },
    [showJobs, showJobsError]
  );

  const selectJob = useCallback((id: string) => {
    setJobId(id);
    rememberJobId(id);
  }, []);

  const job = jobs?.find((j) => j.id === jobId) ?? null;
  return { jobs, job, jobsError, selectJob, refreshJobs };
}

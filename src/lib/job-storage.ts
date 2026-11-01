import { createClient } from "@/lib/supabase/client";
import { currentUserId } from "@/lib/supabase/current-user";
import { removeFolder } from "@/lib/file-storage";
import { deleteWarrantiesForJob } from "@/lib/warranty-storage";
import type { Job, JobStatus, MemberRole } from "@/lib/job-types";

// Client-only. Jobs live in the Supabase `jobs` table and sharing in `job_members`.
// Row level security shows each person their own jobs plus jobs shared with them.

type JobRow = {
  id: string;
  title: string;
  status: JobStatus;
  owner: string;
  created_at: string;
  job_members: { user_id: string; role: MemberRole }[];
};

export async function loadJobs(): Promise<Job[]> {
  const supabase = createClient();
  const userId = await currentUserId();
  const { data, error } = await supabase
    .from("jobs")
    .select("id, title, status, owner, created_at, job_members(user_id, role)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  const rows = data as JobRow[];

  // Emails of everyone the jobs are shared with (profiles are visible to people who share a job).
  const memberIds = [...new Set(rows.flatMap((r) => r.job_members.map((m) => m.user_id)))];
  const emails = new Map<string, string | null>();
  if (memberIds.length > 0) {
    const { data: profiles } = await supabase.from("profiles").select("id, email").in("id", memberIds);
    (profiles ?? []).forEach((p) => emails.set(p.id, p.email));
  }

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    status: row.status,
    ownerId: row.owner,
    myRole:
      row.owner === userId
        ? "owner"
        : (row.job_members.find((m) => m.user_id === userId)?.role ?? "viewer"),
    members: row.job_members
      .filter((m) => m.user_id !== row.owner)
      .map((m) => ({ userId: m.user_id, role: m.role, email: emails.get(m.user_id) ?? null })),
    createdAt: row.created_at,
  }));
}

export async function createJob(title: string): Promise<string> {
  const userId = await currentUserId();
  const { data, error } = await createClient()
    .from("jobs")
    .insert({ title: title.trim(), owner: userId })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export async function updateJobStatus(jobId: string, status: JobStatus): Promise<void> {
  const { data, error } = await createClient()
    .from("jobs")
    .update({ status })
    .eq("id", jobId)
    .select("id");
  if (error) throw error;
  if (!data || data.length === 0) throw new Error("You can only view this job, not change it.");
}

export async function shareJob(jobId: string, email: string, role: MemberRole): Promise<void> {
  const { error } = await createClient().rpc("share_job", {
    p_job_id: jobId,
    p_email: email,
    p_role: role,
  });
  // The database's own message is written for people ("No homi account uses that email...").
  if (error) throw new Error(error.message);
}

export async function removeMember(jobId: string, userId: string): Promise<void> {
  const { error } = await createClient()
    .from("job_members")
    .delete()
    .eq("job_id", jobId)
    .eq("user_id", userId);
  if (error) throw error;
}

// Deletes the job with its quotes, files and proof log (the database removes those rows).
// Its warranties are kept, just unlinked, unless deleteWarranties is true.
export async function deleteJob(job: Job, deleteWarranties: boolean): Promise<void> {
  if (job.myRole !== "owner") throw new Error("Only the job's owner can delete it.");
  if (deleteWarranties) await deleteWarrantiesForJob(job.id);
  // Uploaded files aren't removed by the database, and must go while the job still exists.
  await removeFolder(`jobs/${job.id}`);
  const { error } = await createClient().from("jobs").delete().eq("id", job.id);
  if (error) throw error;
}

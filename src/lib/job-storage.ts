import { createClient } from "@/lib/supabase/client";
import { currentUserId } from "@/lib/supabase/current-user";
import { removeFolder } from "@/lib/file-storage";
import { deleteWarrantiesForJob } from "@/lib/warranty-storage";
import type { Job, JobDetails, JobStatus, MemberRole, PermitStatus } from "@/lib/job-types";

// Client-only. Jobs live in the Supabase `jobs` table and sharing in `job_members`.
// Row level security shows each person their own jobs plus jobs shared with them.

type JobRow = {
  id: string;
  title: string;
  status: JobStatus;
  owner: string;
  created_at: string;
  address: string;
  description: string;
  contractor_id: string | null;
  accepted_quote_id: string | null;
  baseline_total: number | string | null;
  baseline_deposit: number | string | null;
  baseline_warranty_terms: string | null;
  permit_status: PermitStatus;
  permit_number: string;
  job_members: { user_id: string; role: MemberRole }[];
};

const JOB_COLUMNS =
  "id, title, status, owner, created_at, address, description, contractor_id, accepted_quote_id, " +
  "baseline_total, baseline_deposit, baseline_warranty_terms, permit_status, permit_number";

// Supabase returns numeric columns as numbers or strings depending on size; normalise them.
const toNumber = (value: number | string | null) => (value === null ? null : Number(value));

const DETAIL_COLUMNS: Record<keyof JobDetails, string> = {
  title: "title",
  address: "address",
  description: "description",
  contractorId: "contractor_id",
  acceptedQuoteId: "accepted_quote_id",
  baselineTotal: "baseline_total",
  baselineDeposit: "baseline_deposit",
  baselineWarrantyTerms: "baseline_warranty_terms",
  permitStatus: "permit_status",
  permitNumber: "permit_number",
};

export async function loadJobs(): Promise<Job[]> {
  const supabase = createClient();
  const userId = await currentUserId();
  const { data, error } = await supabase
    .from("jobs")
    .select(`${JOB_COLUMNS}, job_members(user_id, role)`)
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
    address: row.address,
    description: row.description,
    contractorId: row.contractor_id,
    acceptedQuoteId: row.accepted_quote_id,
    baselineTotal: toNumber(row.baseline_total),
    baselineDeposit: toNumber(row.baseline_deposit),
    baselineWarrantyTerms: row.baseline_warranty_terms,
    permitStatus: row.permit_status,
    permitNumber: row.permit_number,
  }));
}

export async function createJob(
  title: string,
  details: { address?: string; description?: string } = {}
): Promise<string> {
  const userId = await currentUserId();
  const { data, error } = await createClient()
    .from("jobs")
    .insert({
      title: title.trim(),
      owner: userId,
      address: details.address?.trim() ?? "",
      description: details.description?.trim() ?? "",
    })
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

// Saves only the fields given. Viewers can't change a job; that comes back as zero rows.
export async function updateJobDetails(jobId: string, changes: Partial<JobDetails>): Promise<void> {
  const row = Object.fromEntries(
    Object.entries(changes).map(([key, value]) => [DETAIL_COLUMNS[key as keyof JobDetails], value])
  );
  const { data, error } = await createClient().from("jobs").update(row).eq("id", jobId).select("id");
  if (error) throw new Error(error.message);
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

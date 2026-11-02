export type JobStatus = "getting_quotes" | "hired" | "in_progress" | "done";

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  getting_quotes: "Getting quotes",
  hired: "Hired",
  in_progress: "In progress",
  done: "Done",
};

// Statuses from "hired" on mean the work has been agreed, so contract and permit alerts apply.
export function isHiredOrLater(status: JobStatus) {
  return status !== "getting_quotes";
}

export type PermitStatus = "unknown" | "not_required" | "applied" | "approved";

export const PERMIT_STATUS_LABELS: Record<PermitStatus, string> = {
  unknown: "Not sure yet",
  not_required: "Not required",
  applied: "Applied for",
  approved: "Approved",
};

export type MemberRole = "editor" | "viewer";

export const MEMBER_ROLE_LABELS: Record<MemberRole, string> = {
  editor: "Can edit",
  viewer: "Can view",
};

export type JobMember = {
  userId: string;
  role: MemberRole;
  email: string | null;
};

export type Job = {
  id: string;
  title: string;
  status: JobStatus;
  ownerId: string;
  myRole: "owner" | MemberRole; // the signed-in person's access to this job
  members: JobMember[]; // people it's shared with (not the owner)
  createdAt: string;
  address: string;
  description: string; // the problem being fixed
  contractorId: string | null; // from the homeowner's own contractor list
  // The accepted quote's numbers, copied onto the job so they survive the quote being deleted.
  acceptedQuoteId: string | null;
  baselineTotal: number | null;
  baselineDeposit: number | null;
  baselineWarrantyTerms: string | null;
  permitStatus: PermitStatus;
  permitNumber: string;
};

// The job fields that can be edited after creating it.
export type JobDetails = Pick<
  Job,
  | "title"
  | "address"
  | "description"
  | "contractorId"
  | "acceptedQuoteId"
  | "baselineTotal"
  | "baselineDeposit"
  | "baselineWarrantyTerms"
  | "permitStatus"
  | "permitNumber"
>;

export function canEditJob(job: Job) {
  return job.myRole !== "viewer";
}

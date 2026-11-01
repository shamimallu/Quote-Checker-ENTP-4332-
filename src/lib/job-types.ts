export type JobStatus = "getting_quotes" | "hired" | "in_progress" | "done";

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  getting_quotes: "Getting quotes",
  hired: "Hired",
  in_progress: "In progress",
  done: "Done",
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
};

export function canEditJob(job: Job) {
  return job.myRole !== "viewer";
}

import { createClient } from "@/lib/supabase/client";
import { getFileUrl, removeFiles, safeFileName, uploadFile } from "@/lib/file-storage";

// Client-only. A job's documents: rows in `job_files`, files in the private `homi-files` bucket
// under jobs/<job id>/files/. Deleting the job removes the whole jobs/<job id> folder.

export type JobFileKind = "contract" | "photo" | "receipt" | "invoice" | "permit" | "other";

export const JOB_FILE_KIND_LABELS: Record<JobFileKind, string> = {
  contract: "Contract",
  photo: "Photo",
  receipt: "Receipt",
  invoice: "Final invoice",
  permit: "Permit",
  other: "Other",
};

// The bucket's own limit (10MB). Uploads go straight to Supabase, not through Vercel.
export const MAX_JOB_FILE_BYTES = 10 * 1024 * 1024;

export type JobFile = {
  id: string;
  kind: JobFileKind;
  name: string;
  mimeType: string | null;
  sizeBytes: number | null;
  storagePath: string;
  createdAt: string;
};

export async function listJobFiles(jobId: string): Promise<JobFile[]> {
  const { data, error } = await createClient()
    .from("job_files")
    .select("id, kind, name, mime_type, size_bytes, storage_path, created_at")
    .eq("job_id", jobId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data.map((f) => ({
    id: f.id,
    kind: f.kind,
    name: f.name,
    mimeType: f.mime_type,
    sizeBytes: f.size_bytes,
    storagePath: f.storage_path,
    createdAt: f.created_at,
  }));
}

export async function uploadJobFile(jobId: string, file: File, kind: JobFileKind): Promise<void> {
  const id = crypto.randomUUID();
  const path = `jobs/${jobId}/files/${id}/${safeFileName(file.name)}`;
  await uploadFile(path, file, file.type);
  const { error } = await createClient().from("job_files").insert({
    id,
    job_id: jobId,
    kind,
    name: file.name,
    mime_type: file.type || null,
    size_bytes: file.size,
    storage_path: path,
  });
  if (error) {
    await removeFiles([path]).catch(() => {});
    throw error;
  }
}

export async function deleteJobFile(file: JobFile): Promise<void> {
  // Remove the stored file first; the storage rules check the job, which still exists.
  await removeFiles([file.storagePath]);
  const { data, error } = await createClient().from("job_files").delete().eq("id", file.id).select("id");
  if (error) throw error;
  if (!data || data.length === 0) throw new Error("You can only view this job's files, not delete them.");
}

export const getJobFileUrl = getFileUrl;

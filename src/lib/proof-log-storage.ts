import { createClient } from "@/lib/supabase/client";
import { getFileUrl, removeFiles, safeFileName, uploadFile } from "@/lib/file-storage";
import type { ProofLogEntry } from "@/lib/proof-log-types";

// Client-only. A job's proof log: rows in `proof_log_entries`, photos in the private
// `homi-files` bucket under jobs/<job id>/proof-log/<entry id>/. Deleting the job removes
// the whole jobs/<job id> folder.

// The bucket's own limit (10MB per file). Uploads go straight to Supabase, not through Vercel.
export const MAX_PROOF_LOG_PHOTO_BYTES = 10 * 1024 * 1024;

export async function listProofLogEntries(jobId: string): Promise<ProofLogEntry[]> {
  const { data, error } = await createClient()
    .from("proof_log_entries")
    .select("id, job_id, entry_date, note, photo_paths, created_at")
    .eq("job_id", jobId)
    .order("entry_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data.map((e) => ({
    id: e.id,
    jobId: e.job_id,
    entryDate: e.entry_date,
    note: e.note,
    photoPaths: e.photo_paths,
    createdAt: e.created_at,
  }));
}

export async function addProofLogEntry(
  jobId: string,
  entryDate: string,
  note: string,
  photos: File[]
): Promise<void> {
  const id = crypto.randomUUID();
  const paths: string[] = [];
  try {
    for (const photo of photos) {
      const path = `jobs/${jobId}/proof-log/${id}/${safeFileName(photo.name)}`;
      await uploadFile(path, photo, photo.type);
      paths.push(path);
    }
  } catch (uploadError) {
    await removeFiles(paths).catch(() => {});
    throw uploadError;
  }
  const { error } = await createClient()
    .from("proof_log_entries")
    .insert({ id, job_id: jobId, entry_date: entryDate, note: note.trim(), photo_paths: paths });
  if (error) {
    await removeFiles(paths).catch(() => {});
    throw error;
  }
}

export async function deleteProofLogEntry(entry: ProofLogEntry): Promise<void> {
  // Remove the stored photos first; the storage rules check the job, which still exists.
  if (entry.photoPaths.length > 0) await removeFiles(entry.photoPaths);
  const { data, error } = await createClient()
    .from("proof_log_entries")
    .delete()
    .eq("id", entry.id)
    .select("id");
  if (error) throw error;
  if (!data || data.length === 0) throw new Error("You can only view this job, not change it.");
}

export const getProofLogPhotoUrl = getFileUrl;

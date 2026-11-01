import { createClient } from "@/lib/supabase/client";

// Client-only. Every uploaded file lives in the private `homi-files` bucket:
//   jobs/<job id>/...            quote files (and later job files and proof log photos)
//   warranties/<warranty id>/... warranty documents
// Storage policies give the same access as the job or warranty the folder belongs to.
const BUCKET = "homi-files";

function bucket() {
  return createClient().storage.from(BUCKET);
}

export function safeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function uploadFile(path: string, file: Blob, contentType?: string) {
  const { error } = await bucket().upload(path, file, { contentType: contentType || undefined });
  if (error) throw error;
}

export async function removeFiles(paths: string[]) {
  if (paths.length === 0) return;
  const { error } = await bucket().remove(paths);
  if (error) throw error;
}

// Every file under a folder, including inside subfolders.
async function listAll(folder: string): Promise<string[]> {
  const { data, error } = await bucket().list(folder, { limit: 1000 });
  if (error) throw error;
  const paths: string[] = [];
  for (const entry of data ?? []) {
    const path = `${folder}/${entry.name}`;
    if (entry.id === null) paths.push(...(await listAll(path)));
    else paths.push(path);
  }
  return paths;
}

export async function removeFolder(folder: string) {
  await removeFiles(await listAll(folder));
}

// A short-lived link to a stored file (valid for 60 seconds).
export async function getFileUrl(path: string): Promise<string> {
  const { data, error } = await bucket().createSignedUrl(path, 60);
  if (error || !data) throw error ?? new Error("Could not open that file.");
  return data.signedUrl;
}

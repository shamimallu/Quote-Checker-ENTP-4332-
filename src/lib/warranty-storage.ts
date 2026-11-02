import { createClient } from "@/lib/supabase/client";
import { currentUserId } from "@/lib/supabase/current-user";
import { getFileUrl, removeFiles, removeFolder, safeFileName, uploadFile } from "@/lib/file-storage";
import type { Warranty, WarrantyType } from "@/lib/warranty-types";

// Client-only. Warranties live in the Supabase `warranties` table and their PDFs/photos in
// the `homi-files` bucket under warranties/<warranty id>/. Row level security lets the person
// who added a warranty, and everyone on its linked job, see it.
const TABLE = "warranties";

type WarrantyRow = {
  id: string;
  job_id: string | null;
  product_or_service: string;
  warranty_type: WarrantyType;
  provider: string;
  phone: string;
  email: string;
  start_date: string;
  length_years: number;
  length_months: number;
  covered: string;
  not_covered: string;
  document_name: string | null;
  document_type: string | null;
  document_path: string | null;
  created_at: string;
};

function fromRow(row: WarrantyRow): Warranty {
  return {
    id: row.id,
    jobId: row.job_id,
    item: row.product_or_service,
    warrantyType: row.warranty_type,
    provider: row.provider,
    phone: row.phone,
    email: row.email,
    startDate: row.start_date,
    lengthYears: row.length_years,
    lengthMonths: row.length_months,
    covered: row.covered,
    notCovered: row.not_covered,
    document: row.document_path
      ? { name: row.document_name ?? "Document", type: row.document_type ?? "", path: row.document_path }
      : null,
    createdAt: new Date(row.created_at).getTime(),
  };
}

export async function loadWarranties(): Promise<Warranty[]> {
  const { data, error } = await createClient().from(TABLE).select("*");
  if (error) throw error;
  return (data as WarrantyRow[]).map(fromRow);
}

export async function saveWarranty(warranty: Warranty): Promise<Warranty> {
  const supabase = createClient();
  const userId = await currentUserId();
  const { data: existing } = await supabase.from(TABLE).select("id").eq("id", warranty.id).maybeSingle();

  const fields = {
    job_id: warranty.jobId,
    product_or_service: warranty.item,
    warranty_type: warranty.warrantyType,
    provider: warranty.provider,
    phone: warranty.phone,
    email: warranty.email,
    start_date: warranty.startDate,
    length_years: warranty.lengthYears,
    length_months: warranty.lengthMonths,
    covered: warranty.covered,
    not_covered: warranty.notCovered,
  };

  // Save the warranty first: the storage rules only allow uploads for a warranty that exists.
  const { error } = existing
    ? await supabase.from(TABLE).update(fields).eq("id", warranty.id)
    : await supabase.from(TABLE).insert({ id: warranty.id, owner: userId, ...fields });
  if (error) throw error;

  // A newly chosen file has a blob and no path yet: upload it.
  let document = warranty.document;
  if (document?.blob) {
    const path = `warranties/${warranty.id}/${Date.now()}-${safeFileName(document.name)}`;
    await uploadFile(path, document.blob, document.type);
    document = { name: document.name, type: document.type, path };
  }

  const { error: docError } = await supabase
    .from(TABLE)
    .update({
      document_name: document?.name ?? null,
      document_type: document?.type ?? null,
      document_path: document?.path ?? null,
    })
    .eq("id", warranty.id);
  if (docError) throw docError;

  // Remove files from earlier versions of this warranty (replaced or removed documents).
  const folder = `warranties/${warranty.id}`;
  const { data: files } = await supabase.storage.from("homi-files").list(folder);
  const stale = (files ?? []).map((f) => `${folder}/${f.name}`).filter((p) => p !== document?.path);
  await removeFiles(stale).catch(() => {}); // leftover files are harmless; don't fail the save

  return { ...warranty, document };
}

export async function deleteWarranty(id: string): Promise<void> {
  const supabase = createClient();
  const userId = await currentUserId();

  // Check first: the files must be removed while the warranty still exists (the storage rules
  // look it up), and they shouldn't be removed if the row delete would then be refused.
  const { data: row, error: readError } = await supabase
    .from(TABLE)
    .select("owner, jobs(owner)")
    .eq("id", id)
    .single<{ owner: string; jobs: { owner: string } | null }>();
  if (readError) throw readError;
  if (row.owner !== userId && row.jobs?.owner !== userId) {
    throw new Error("Only the person who added this warranty, or the job's owner, can delete it.");
  }

  await removeFolder(`warranties/${id}`);
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) throw error;
}

export async function countWarrantiesForJob(jobId: string): Promise<number> {
  const { count, error } = await createClient()
    .from(TABLE)
    .select("id", { count: "exact", head: true })
    .eq("job_id", jobId);
  if (error) throw error;
  return count ?? 0;
}

export async function deleteWarrantiesForJob(jobId: string): Promise<void> {
  const { data, error } = await createClient().from(TABLE).select("id").eq("job_id", jobId);
  if (error) throw error;
  for (const { id } of data ?? []) await deleteWarranty(id);
}

export const getDocumentUrl = getFileUrl;

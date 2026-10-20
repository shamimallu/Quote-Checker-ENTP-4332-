import { createClient } from "@/lib/supabase/client";
import type { Warranty, WarrantyType } from "@/lib/warranty-types";

// Client-only. Warranties live in the Supabase `warranties` table and their PDFs/photos in
// the private `warranty-documents` bucket. Row level security limits every call to the
// signed-in person's own data.
const TABLE = "warranties";
const BUCKET = "warranty-documents";

type WarrantyRow = {
  id: string;
  item: string;
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
    item: row.item,
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

async function currentUserId(): Promise<string> {
  const { data, error } = await createClient().auth.getUser();
  if (error || !data.user) throw new Error("Please sign in first.");
  return data.user.id;
}

export async function loadWarranties(): Promise<Warranty[]> {
  const { data, error } = await createClient().from(TABLE).select("*");
  if (error) throw error;
  return (data as WarrantyRow[]).map(fromRow);
}

export async function saveWarranty(warranty: Warranty): Promise<Warranty> {
  const supabase = createClient();
  const userId = await currentUserId();
  let document = warranty.document;

  // A newly chosen file has a blob and no path yet: upload it first.
  if (document?.blob) {
    const safeName = document.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${userId}/${warranty.id}/${Date.now()}-${safeName}`;
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, document.blob, { contentType: document.type || undefined });
    if (error) throw error;
    document = { name: document.name, type: document.type, path };
  }

  const { error } = await supabase.from(TABLE).upsert({
    id: warranty.id,
    owner: userId,
    item: warranty.item,
    warranty_type: warranty.warrantyType,
    provider: warranty.provider,
    phone: warranty.phone,
    email: warranty.email,
    start_date: warranty.startDate,
    length_years: warranty.lengthYears,
    length_months: warranty.lengthMonths,
    covered: warranty.covered,
    not_covered: warranty.notCovered,
    document_name: document?.name ?? null,
    document_type: document?.type ?? null,
    document_path: document?.path ?? null,
  });
  if (error) throw error;

  // Remove files from earlier versions of this warranty (replaced or removed documents).
  const folder = `${userId}/${warranty.id}`;
  const { data: files } = await supabase.storage.from(BUCKET).list(folder);
  const stale = (files ?? [])
    .map((f) => `${folder}/${f.name}`)
    .filter((p) => p !== document?.path);
  if (stale.length > 0) await supabase.storage.from(BUCKET).remove(stale);

  return { ...warranty, document };
}

export async function deleteWarranty(id: string): Promise<void> {
  const supabase = createClient();
  const userId = await currentUserId();
  const folder = `${userId}/${id}`;
  const { data: files } = await supabase.storage.from(BUCKET).list(folder);
  if (files && files.length > 0) {
    await supabase.storage.from(BUCKET).remove(files.map((f) => `${folder}/${f.name}`));
  }
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) throw error;
}

// A short-lived link to a stored document (valid for 60 seconds).
export async function getDocumentUrl(path: string): Promise<string> {
  const { data, error } = await createClient().storage.from(BUCKET).createSignedUrl(path, 60);
  if (error || !data) throw error ?? new Error("Could not open that document.");
  return data.signedUrl;
}

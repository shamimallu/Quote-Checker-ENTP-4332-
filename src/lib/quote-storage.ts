import { createClient } from "@/lib/supabase/client";
import { removeFiles, safeFileName, uploadFile } from "@/lib/file-storage";
import type { ComparisonResult, ExtractedQuote, LineItem, SavedComparison } from "@/lib/quote-types";

// Client-only. Quotes live in the Supabase `quotes` table, one job each, and their files in the
// `homi-files` bucket under jobs/<job id>/quotes/. Row level security lets everyone on the job
// see them and the owner and editors change them.
const TABLE = "quotes";

type QuoteRow = {
  id: string;
  file_name: string | null;
  file_path: string | null;
  contractor_name: string;
  line_items: LineItem[];
  deposit_percent: number | null;
  deposit_amount: number | null;
  warranty_terms: string | null;
  analysis: SavedComparison | null;
};

function fromRow(row: QuoteRow): ExtractedQuote {
  return {
    id: row.id,
    fileName: row.file_name ?? "",
    filePath: row.file_path,
    contractorName: row.contractor_name,
    lineItems: row.line_items,
    depositPercent: row.deposit_percent,
    depositAmount: row.deposit_amount,
    warrantyTerms: row.warranty_terms,
  };
}

const sameIds = (a: string[], b: string[]) =>
  a.length === b.length && [...a].sort().join() === [...b].sort().join();

// The job's quotes, plus the latest saved comparison if it still covers exactly these quotes.
export async function loadQuotes(
  jobId: string
): Promise<{ quotes: ExtractedQuote[]; comparison: ComparisonResult | null }> {
  const { data, error } = await createClient()
    .from(TABLE)
    .select("*")
    .eq("job_id", jobId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  const rows = data as QuoteRow[];
  const quotes = rows.map(fromRow);

  const latest = rows
    .map((r) => r.analysis)
    .filter((a): a is SavedComparison => a !== null)
    .sort((a, b) => b.comparedAt.localeCompare(a.comparedAt))[0];
  const ids = quotes.map((q) => q.id);
  return { quotes, comparison: latest && sameIds(latest.quoteIds, ids) ? latest.result : null };
}

// Uploads the quote file into the job's folder, then saves the quote.
export async function saveQuote(jobId: string, quote: ExtractedQuote, file?: File): Promise<ExtractedQuote> {
  let filePath = quote.filePath;
  if (file) {
    filePath = `jobs/${jobId}/quotes/${quote.id}/${safeFileName(file.name)}`;
    await uploadFile(filePath, file, file.type);
  }

  const price = quote.lineItems.length > 0 ? quote.lineItems.reduce((sum, i) => sum + i.price, 0) : null;
  const { error } = await createClient().from(TABLE).insert({
    id: quote.id,
    job_id: jobId,
    file_name: quote.fileName,
    file_path: filePath,
    contractor_name: quote.contractorName,
    price,
    line_items: quote.lineItems,
    deposit_percent: quote.depositPercent,
    deposit_amount: quote.depositAmount,
    warranty_terms: quote.warrantyTerms,
  });
  if (error) {
    if (file && filePath) await removeFiles([filePath]).catch(() => {});
    throw error;
  }
  return { ...quote, filePath };
}

// Saves the Quote Checker's comparison on every quote it compared.
export async function saveComparison(quoteIds: string[], result: ComparisonResult): Promise<void> {
  const analysis: SavedComparison = { comparedAt: new Date().toISOString(), quoteIds, result };
  const { error } = await createClient().from(TABLE).update({ analysis }).in("id", quoteIds);
  if (error) throw error;
}

export async function deleteQuote(quote: ExtractedQuote): Promise<void> {
  // Remove the file first: the storage rules check the job, which still exists either way.
  if (quote.filePath) await removeFiles([quote.filePath]);
  const { data, error } = await createClient().from(TABLE).delete().eq("id", quote.id).select("id");
  if (error) throw error;
  if (!data || data.length === 0) throw new Error("You can only view this job's quotes, not remove them.");
}

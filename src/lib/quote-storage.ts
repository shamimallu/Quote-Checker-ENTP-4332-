import { createClient } from "@/lib/supabase/client";
import type { ExtractedQuote, LineItem } from "@/lib/quote-types";

// Client-only. Quotes live in the Supabase `quotes` table; row level security limits every
// call to the signed-in person's own quotes.
const TABLE = "quotes";

type QuoteRow = {
  id: string;
  file_name: string;
  contractor_name: string;
  line_items: LineItem[];
  deposit_percent: number | null;
  deposit_amount: number | null;
  warranty_terms: string | null;
};

function fromRow(row: QuoteRow): ExtractedQuote {
  return {
    id: row.id,
    fileName: row.file_name,
    contractorName: row.contractor_name,
    lineItems: row.line_items,
    depositPercent: row.deposit_percent,
    depositAmount: row.deposit_amount,
    warrantyTerms: row.warranty_terms,
  };
}

export async function loadQuotes(): Promise<ExtractedQuote[]> {
  const { data, error } = await createClient()
    .from(TABLE)
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data as QuoteRow[]).map(fromRow);
}

export async function saveQuote(quote: ExtractedQuote): Promise<void> {
  const supabase = createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) throw new Error("Please sign in first.");
  const { error } = await supabase.from(TABLE).upsert({
    id: quote.id,
    owner: auth.user.id,
    file_name: quote.fileName,
    contractor_name: quote.contractorName,
    line_items: quote.lineItems,
    deposit_percent: quote.depositPercent,
    deposit_amount: quote.depositAmount,
    warranty_terms: quote.warrantyTerms,
  });
  if (error) throw error;
}

export async function deleteQuote(id: string): Promise<void> {
  const { error } = await createClient().from(TABLE).delete().eq("id", id);
  if (error) throw error;
}

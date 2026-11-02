import { findOrCreateContractor } from "@/lib/contractor-storage";
import { updateJobDetails } from "@/lib/job-storage";
import type { Job } from "@/lib/job-types";
import type { ExtractedQuote } from "@/lib/quote-types";

// Client-only. Accepting a quote copies its total, deposit and warranty terms onto the job, so
// the job keeps a neutral record of what was agreed even if the quote is later deleted.

export function quoteTotal(quote: ExtractedQuote): number | null {
  const total = quote.lineItems.reduce((sum, item) => sum + item.price, 0);
  return total > 0 ? Math.round(total * 100) / 100 : null;
}

// The deposit in dollars: the stated amount, or the stated percent of the total.
export function quoteDeposit(quote: ExtractedQuote): number | null {
  if (quote.depositAmount !== null) return quote.depositAmount;
  const total = quoteTotal(quote);
  if (quote.depositPercent === null || total === null) return null;
  return Math.round(total * quote.depositPercent) / 100;
}

// Names the Quote Checker uses when it couldn't read a contractor, which shouldn't become one.
const PLACEHOLDER_NAMES = ["", "unknown contractor", "pending analysis"];

export async function acceptQuote(job: Job, quote: ExtractedQuote): Promise<void> {
  // Fill in the job's contractor from the quote if it has none yet.
  const name = quote.contractorName.trim();
  const contractorId =
    job.contractorId ?? (PLACEHOLDER_NAMES.includes(name.toLowerCase()) ? null : (await findOrCreateContractor(name)).id);

  await updateJobDetails(job.id, {
    acceptedQuoteId: quote.id,
    baselineTotal: quoteTotal(quote),
    baselineDeposit: quoteDeposit(quote),
    baselineWarrantyTerms: quote.warrantyTerms?.trim() || null,
    contractorId,
  });
}

export async function clearAcceptedQuote(job: Job): Promise<void> {
  await updateJobDetails(job.id, {
    acceptedQuoteId: null,
    baselineTotal: null,
    baselineDeposit: null,
    baselineWarrantyTerms: null,
  });
}

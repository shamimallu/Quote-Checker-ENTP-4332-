"use client";

import { useState } from "react";
import Link from "next/link";
import { formatUsd } from "@/lib/format";
import { acceptQuote, clearAcceptedQuote, quoteTotal } from "@/lib/job-baseline";
import type { Job } from "@/lib/job-types";
import type { ExtractedQuote } from "@/lib/quote-types";
import { card, input, linkButton, pill, primaryPill, sectionTitle, useAction } from "./ui";

// The accepted quote from the Quote Checker, whose total, deposit and warranty terms are
// copied onto the job as its baseline.
export default function JobQuoteSection({
  job,
  quotes,
  editable,
  onJobChange,
}: {
  job: Job;
  quotes: ExtractedQuote[];
  editable: boolean;
  onJobChange: () => Promise<void>;
}) {
  const [picking, setPicking] = useState(false);
  const [choice, setChoice] = useState("");
  const { busy, error, run } = useAction();

  const accepted = quotes.find((q) => q.id === job.acceptedQuoteId) ?? null;
  const hasBaseline = job.acceptedQuoteId !== null || job.baselineTotal !== null;
  const label = (q: ExtractedQuote) => {
    const total = quoteTotal(q);
    return `${q.contractorName || q.fileName}${total !== null ? ` · ${formatUsd(total)}` : ""}`;
  };

  async function accept() {
    const quote = quotes.find((q) => q.id === choice);
    if (!quote) return;
    const ok = await run(async () => {
      await acceptQuote(job, quote);
      await onJobChange();
    }, "Could not accept that quote. Try again.");
    if (ok) setPicking(false);
  }

  const remove = () =>
    run(async () => {
      await clearAcceptedQuote(job);
      await onJobChange();
    }, "Could not remove the accepted quote. Try again.");

  const deposit = job.baselineDeposit;
  const depositShare = deposit !== null && job.baselineTotal ? deposit / job.baselineTotal : null;

  return (
    <section className={card}>
      <h2 className={sectionTitle}>Accepted quote</h2>
      <p className="mt-1 text-xs text-sand">
        The quote you agreed to becomes this job&apos;s baseline. Its numbers are copied here, so they stay even if the
        quote is deleted.
      </p>

      {hasBaseline && (
        <div className="mt-4 rounded-xl border border-walnut p-4">
          <p className="text-sm text-sand">
            {accepted
              ? `From ${label(accepted)}`
              : "The accepted quote was deleted in the Quote Checker. Its numbers are kept here."}
          </p>
          <dl className="mt-3 grid gap-4 sm:grid-cols-3">
            <div>
              <dt className="text-sm text-sand">Total</dt>
              <dd className="text-beige">{job.baselineTotal !== null ? formatUsd(job.baselineTotal) : "Not stated"}</dd>
            </div>
            <div>
              <dt className="text-sm text-sand">Deposit</dt>
              <dd className="text-beige">
                {deposit !== null
                  ? `${formatUsd(deposit)}${depositShare !== null ? ` (${Math.round(depositShare * 100)}%)` : ""}`
                  : "Not stated"}
              </dd>
            </div>
            <div className="sm:col-span-3">
              <dt className="text-sm text-sand">Warranty terms</dt>
              <dd className="whitespace-pre-wrap text-beige">{job.baselineWarrantyTerms || "None mentioned"}</dd>
            </div>
          </dl>
        </div>
      )}

      {!hasBaseline && quotes.length === 0 && (
        <p className="mt-4 text-sm text-sand">
          No quotes for this job yet.{" "}
          <Link href="/quote-checker" className="text-caramel underline hover:text-beige">
            Add them in the Quote Checker
          </Link>
          , then come back to accept one.
        </p>
      )}

      {editable && quotes.length > 0 && !picking && (
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => {
              setChoice(job.acceptedQuoteId ?? quotes[0].id);
              setPicking(true);
            }}
            className={hasBaseline ? pill : primaryPill}
          >
            {hasBaseline ? "Change accepted quote" : "Accept a quote"}
          </button>
          {hasBaseline && (
            <button type="button" disabled={busy} onClick={remove} className={linkButton}>
              Remove accepted quote
            </button>
          )}
        </div>
      )}

      {picking && (
        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-walnut pt-4">
          <select
            aria-label="Quote to accept"
            value={choice}
            onChange={(e) => setChoice(e.target.value)}
            className={`${input} min-w-0 flex-1`}
          >
            {quotes.map((q) => (
              <option key={q.id} value={q.id}>
                {label(q)}
              </option>
            ))}
          </select>
          <button type="button" disabled={busy || !choice} onClick={accept} className={primaryPill}>
            {busy ? "Saving…" : "Accept"}
          </button>
          <button type="button" onClick={() => setPicking(false)} className={pill}>
            Cancel
          </button>
        </div>
      )}

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
    </section>
  );
}

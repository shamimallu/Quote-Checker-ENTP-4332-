import type { ExtractedQuote } from "@/lib/quote-types";

function formatUsd(amount: number) {
  return amount.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export default function QuoteList({
  quotes,
  onRemove,
  onCompare,
  comparing,
  compareError,
}: {
  quotes: ExtractedQuote[];
  onRemove: (id: string) => void;
  onCompare: () => void;
  comparing: boolean;
  compareError: string | null;
}) {
  if (quotes.length === 0) {
    return (
      <p className="mt-6 text-sm text-sand">No quotes added yet.</p>
    );
  }

  const total = (quote: ExtractedQuote) =>
    quote.lineItems.reduce((sum, item) => sum + item.price, 0);

  return (
    <div className="mt-6">
      <div className="grid gap-4 sm:grid-cols-2">
        {quotes.map((quote) => (
          <div key={quote.id} className="rounded-2xl border border-walnut bg-bark p-5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-serif text-lg text-beige">{quote.contractorName}</h3>
                <p className="text-xs text-sand">{quote.fileName}</p>
              </div>
              <button
                type="button"
                onClick={() => onRemove(quote.id)}
                className="text-xs text-sand transition-colors hover:text-caramel"
              >
                Remove
              </button>
            </div>

            <ul className="mt-3 space-y-1 text-sm text-beige">
              {quote.lineItems.map((item, i) => (
                <li key={i} className="flex justify-between gap-3">
                  <span className="text-sand">{item.description}</span>
                  <span>{formatUsd(item.price)}</span>
                </li>
              ))}
            </ul>

            <div className="mt-3 flex justify-between border-t border-walnut pt-2 text-sm font-medium text-beige">
              <span>Total</span>
              <span>{formatUsd(total(quote))}</span>
            </div>

            {(quote.depositPercent !== null || quote.depositAmount !== null) && (
              <p className="mt-2 text-xs text-sand">
                Deposit:{" "}
                {quote.depositPercent !== null
                  ? `${quote.depositPercent}%`
                  : formatUsd(quote.depositAmount as number)}
              </p>
            )}
            {quote.warrantyTerms && (
              <p className="mt-1 text-xs text-sand">Warranty: {quote.warrantyTerms}</p>
            )}
          </div>
        ))}
      </div>

      {quotes.length >= 2 && (
        <div className="mt-6">
          <button
            type="button"
            disabled={comparing}
            onClick={onCompare}
            className="rounded-full border border-caramel bg-caramel/10 px-5 py-2 text-sm text-caramel transition-colors hover:bg-caramel/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {comparing ? "Comparing…" : "Compare quotes"}
          </button>
          {compareError && <p className="mt-2 text-sm text-red-400">{compareError}</p>}
        </div>
      )}
    </div>
  );
}

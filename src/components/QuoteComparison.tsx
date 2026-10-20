import type { ComparisonResult } from "@/lib/quote-types";

export default function QuoteComparison({ result }: { result: ComparisonResult }) {
  return (
    <div className="mt-8 rounded-2xl border border-caramel/40 bg-bark p-6">
      <h2 className="font-serif text-xl text-beige">Comparison</h2>
      <p className="mt-2 text-sm text-sand">{result.summary}</p>

      {result.missingItems.length > 0 && (
        <section className="mt-5">
          <h3 className="text-sm font-medium text-caramel">Missing work</h3>
          <ul className="mt-2 space-y-2 text-sm text-beige">
            {result.missingItems.map((item, i) => (
              <li key={i} className="rounded-xl border border-walnut px-3 py-2">
                <span className="font-medium">{item.description}</span>
                <span className="text-sand">
                  {" "}
                  — in {item.presentIn.join(", ")}, missing from {item.missingFrom.join(", ")}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {result.overcharges.length > 0 && (
        <section className="mt-5">
          <h3 className="text-sm font-medium text-caramel">Prices to double-check</h3>
          <ul className="mt-2 space-y-2 text-sm text-beige">
            {result.overcharges.map((flag, i) => (
              <li key={i} className="rounded-xl border border-walnut px-3 py-2">
                <span className="font-medium">
                  {flag.contractorName} — {flag.description}
                </span>
                <span className="text-sand"> ({flag.reason})</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {result.termNotes.length > 0 && (
        <section className="mt-5">
          <h3 className="text-sm font-medium text-caramel">Deposit &amp; warranty terms</h3>
          <ul className="mt-2 space-y-2 text-sm text-beige">
            {result.termNotes.map((note, i) => (
              <li key={i} className="rounded-xl border border-walnut px-3 py-2">
                <span className="font-medium">{note.contractorName}</span>
                <span className="text-sand"> — {note.note}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

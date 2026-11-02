"use client";

import { formatDay } from "@/lib/format";
import { deleteProofLogEntry, getProofLogPhotoUrl } from "@/lib/proof-log-storage";
import type { ProofLogEntry } from "@/lib/proof-log-types";
import { card, linkButton, sectionTitle, useAction } from "./ui";

function photoName(path: string) {
  return decodeURIComponent(path.split("/").pop() ?? path);
}

export default function ProofLogEntryList({
  entries,
  editable,
  onRecordChange,
}: {
  entries: ProofLogEntry[];
  editable: boolean;
  onRecordChange: () => void;
}) {
  const { busy, error, run } = useAction();

  async function openPhoto(path: string) {
    try {
      window.open(await getProofLogPhotoUrl(path), "_blank", "noopener");
    } catch {
      window.alert("Could not open that photo. Try again.");
    }
  }

  const remove = (entry: ProofLogEntry) =>
    window.confirm("Delete this entry? This can't be undone.") &&
    run(async () => {
      await deleteProofLogEntry(entry);
      onRecordChange();
    }, "Could not delete that entry. Try again.");

  return (
    <section className={card}>
      <h2 className={sectionTitle}>Timeline</h2>

      {entries.length === 0 ? (
        <p className="mt-4 text-sm text-sand">No entries yet.</p>
      ) : (
        <ol className="mt-4 space-y-4">
          {entries.map((entry) => (
            <li key={entry.id} className="border-t border-walnut pt-4 first:border-t-0 first:pt-0">
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs text-sand">{formatDay(entry.entryDate)}</p>
                {editable && (
                  <button type="button" disabled={busy} onClick={() => remove(entry)} className={linkButton}>
                    Delete
                  </button>
                )}
              </div>
              {entry.note && <p className="mt-1 whitespace-pre-wrap text-sm text-beige">{entry.note}</p>}
              {entry.photoPaths.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {entry.photoPaths.map((path) => (
                    <button
                      key={path}
                      type="button"
                      onClick={() => openPhoto(path)}
                      className="rounded-full border border-walnut px-3 py-1 text-xs text-beige transition-colors hover:border-caramel hover:text-caramel"
                    >
                      📷 {photoName(path)}
                    </button>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ol>
      )}

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
    </section>
  );
}

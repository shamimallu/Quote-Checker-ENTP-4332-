"use client";

import { useRef, useState } from "react";
import { todayIso } from "@/lib/format";
import { addProofLogEntry, MAX_PROOF_LOG_PHOTO_BYTES } from "@/lib/proof-log-storage";
import { card, input, primaryPill, sectionTitle, useAction } from "./ui";

// Add a dated note, with optional photos, to this job's proof log.
export default function ProofLogEntryForm({
  jobId,
  onRecordChange,
}: {
  jobId: string;
  onRecordChange: () => void;
}) {
  const [entryDate, setEntryDate] = useState(todayIso());
  const [note, setNote] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { busy, error, setError, run } = useAction();

  async function submit() {
    const photos = Array.from(fileInputRef.current?.files ?? []);
    if (!note.trim() && photos.length === 0) {
      return setError("Add a note or a photo first.");
    }
    const tooBig = photos.find((p) => p.size > MAX_PROOF_LOG_PHOTO_BYTES);
    if (tooBig) return setError(`"${tooBig.name}" is over 10MB. Try a smaller photo.`);

    const ok = await run(async () => {
      await addProofLogEntry(jobId, entryDate, note, photos);
      onRecordChange();
    }, "Could not save that entry. Check your connection and try again.");

    if (ok) {
      setNote("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <section className={card}>
      <h2 className={sectionTitle}>Add an entry</h2>
      <p className="mt-1 text-xs text-sand">A dated note and, if you have them, photos of the work.</p>

      <div className="mt-4 flex flex-col gap-3">
        <label className="text-sm text-sand">
          Date
          <input
            type="date"
            value={entryDate}
            onChange={(e) => setEntryDate(e.target.value)}
            className={`mt-1 block w-full max-w-xs ${input}`}
          />
        </label>

        <label className="text-sm text-sand">
          Note
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="What happened on this date?"
            className={`mt-1 block w-full ${input}`}
          />
        </label>

        <label className="text-sm text-sand">
          Photos (optional)
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/heic,image/gif"
            className="mt-1 block w-full max-w-xs text-sm text-sand file:mr-3 file:rounded-full file:border file:border-walnut file:bg-espresso file:px-3 file:py-1.5 file:text-sm file:text-beige file:transition-colors hover:file:border-caramel"
          />
        </label>

        <button type="button" disabled={busy} onClick={submit} className={`self-start ${primaryPill}`}>
          {busy ? "Saving…" : "Add entry"}
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
    </section>
  );
}

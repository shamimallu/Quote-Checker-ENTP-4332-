"use client";

import { useRef, useState } from "react";
import { formatDay } from "@/lib/format";
import {
  deleteJobFile,
  getJobFileUrl,
  JOB_FILE_KIND_LABELS,
  MAX_JOB_FILE_BYTES,
  uploadJobFile,
  type JobFile,
  type JobFileKind,
} from "@/lib/job-file-storage";
import { card, input, linkButton, primaryPill, sectionTitle, useAction } from "./ui";

const sizeLabel = (bytes: number | null) =>
  bytes === null ? "" : bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

// Contracts, photos, receipts and the final invoice, in a private storage bucket.
export default function JobDocumentsSection({
  jobId,
  files,
  editable,
  onRecordChange,
}: {
  jobId: string;
  files: JobFile[];
  editable: boolean;
  onRecordChange: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState<JobFileKind>("contract");
  const { busy, error, setError, run } = useAction();

  async function upload() {
    const file = inputRef.current?.files?.[0];
    if (!file) return setError("Choose a file first.");
    if (file.size > MAX_JOB_FILE_BYTES) return setError("That file is over 10MB. Try a smaller PDF or photo.");
    const ok = await run(async () => {
      await uploadJobFile(jobId, file, kind);
      onRecordChange();
    }, "Could not upload that file. Check it's a PDF or image, then try again.");
    if (ok && inputRef.current) inputRef.current.value = "";
  }

  async function open(file: JobFile) {
    try {
      window.open(await getJobFileUrl(file.storagePath), "_blank", "noopener");
    } catch {
      setError("Could not open that file. Try again.");
    }
  }

  const remove = (file: JobFile) =>
    window.confirm(`Delete "${file.name}"? This can't be undone.`) &&
    run(async () => {
      await deleteJobFile(file);
      onRecordChange();
    }, "Could not delete that file. Try again.");

  return (
    <section className={card}>
      <h2 className={sectionTitle}>Files</h2>
      <p className="mt-1 text-xs text-sand">
        Private to you and anyone you share this job with. PDFs and photos, up to 10MB each.
      </p>

      {editable && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <select
            aria-label="What kind of file"
            value={kind}
            onChange={(e) => setKind(e.target.value as JobFileKind)}
            className={input}
          >
            {Object.entries(JOB_FILE_KIND_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <input
            ref={inputRef}
            type="file"
            aria-label="File to upload"
            accept="application/pdf,image/jpeg,image/png,image/webp,image/heic,image/gif"
            className="block w-full max-w-xs text-sm text-sand file:mr-3 file:rounded-full file:border file:border-walnut file:bg-espresso file:px-3 file:py-1.5 file:text-sm file:text-beige file:transition-colors hover:file:border-caramel"
          />
          <button type="button" disabled={busy} onClick={upload} className={primaryPill}>
            {busy ? "Uploading…" : "Upload"}
          </button>
        </div>
      )}

      {files.length === 0 ? (
        <p className="mt-4 text-sm text-sand">No files yet.</p>
      ) : (
        <ul className="mt-4 divide-y divide-walnut">
          {files.map((file) => (
            <li key={file.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
              <button
                type="button"
                onClick={() => open(file)}
                className="min-w-0 flex-1 text-left focus-visible:outline-2 focus-visible:outline-caramel"
              >
                <span className="mr-2 rounded-full border border-walnut px-2 py-0.5 text-xs text-caramel">
                  {JOB_FILE_KIND_LABELS[file.kind]}
                </span>
                <span className="text-beige underline-offset-2 hover:underline">{file.name}</span>
                <span className="ml-2 text-xs text-sand">
                  {formatDay(file.createdAt.slice(0, 10))}
                  {file.sizeBytes !== null && ` · ${sizeLabel(file.sizeBytes)}`}
                </span>
              </button>
              {editable && (
                <button type="button" disabled={busy} onClick={() => remove(file)} className={linkButton}>
                  Delete
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
    </section>
  );
}

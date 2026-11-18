"use client";

import { useState } from "react";
import type { Job } from "@/lib/job-types";
import {
  WARRANTY_TYPE_LABELS,
  formatDate,
  formatLength,
  getEndDate,
  parseDate,
  MAX_SCAN_FILE_BYTES,
  MAX_SCAN_FILE_LABEL,
  type Warranty,
  type WarrantyScan,
} from "@/lib/warranty-types";
import { shrinkPhoto } from "@/lib/shrink-photo";

// Adding a warranty is scan-only: the person takes a photo or uploads a PDF, the AI reads it,
// and this screen shows what it found, sorted into the same sections the old typed form had.
// Nothing is typed. If something is wrong or missing, they scan a clearer photo.

const scanButtonClass =
  "cursor-pointer rounded-full border border-border bg-secondary px-4 py-2 text-sm text-secondary-foreground transition-colors hover:border-primary";

function emptyWarranty(): Warranty {
  return {
    id: crypto.randomUUID(),
    jobId: null,
    item: "",
    warrantyType: "other",
    provider: "",
    phone: "",
    email: "",
    startDate: "",
    lengthYears: 0,
    lengthMonths: 0,
    covered: "",
    notCovered: "",
    document: null,
    createdAt: Date.now(),
  };
}

// Turns what the AI found into a warranty. A new scan replaces every scanned field, so details
// from an earlier file never mix with the new one. The id, job link and created date are kept.
function fromScan(base: Warranty, scan: WarrantyScan, file: File): Warranty {
  const text = (value: string | null) => value?.trim() ?? "";
  const hasLength = scan.lengthYears !== null || scan.lengthMonths !== null;
  return {
    ...base,
    item: text(scan.item),
    warrantyType: scan.warrantyType && scan.warrantyType in WARRANTY_TYPE_LABELS ? scan.warrantyType : "other",
    provider: text(scan.provider),
    phone: text(scan.phone),
    email: text(scan.email),
    startDate:
      scan.startDate && /^\d{4}-\d{2}-\d{2}$/.test(scan.startDate) && !isNaN(parseDate(scan.startDate).getTime())
        ? scan.startDate
        : "",
    lengthYears: hasLength ? Math.max(0, Math.round(scan.lengthYears ?? 0)) : 0,
    lengthMonths: hasLength ? Math.min(11, Math.max(0, Math.round(scan.lengthMonths ?? 0))) : 0,
    covered: text(scan.covered),
    notCovered: text(scan.notCovered),
    document: { name: file.name, type: file.type, blob: file },
  };
}

// What still has to be on the document before the warranty can be saved.
function missingRequired(w: Warranty): string[] {
  const missing: string[] = [];
  if (!w.item.trim()) missing.push("what it covers");
  if (!w.startDate) missing.push("the start date");
  if (w.lengthYears + w.lengthMonths <= 0) missing.push("how long it lasts");
  return missing;
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className={`mt-0.5 whitespace-pre-line text-sm ${value ? "text-foreground" : "italic text-muted-foreground"}`}>
        {value || "Not found on the document"}
      </dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-background p-4">
      <h3 className="mb-3 font-heading text-base text-foreground">{title}</h3>
      <dl className="grid gap-4 sm:grid-cols-3">{children}</dl>
    </section>
  );
}

export default function WarrantyScanner({
  initial,
  jobs,
  onSave,
  onCancel,
}: {
  initial?: Warranty;
  jobs: Job[]; // jobs this person can add warranties to
  onSave: (warranty: Warranty) => Promise<void>;
  onCancel: () => void;
}) {
  const [warranty, setWarranty] = useState<Warranty>(initial ?? emptyWarranty());
  const [scanned, setScanned] = useState(Boolean(initial)); // is there anything to show yet?
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function handleScan(picked: File | undefined) {
    if (!picked) return;
    setScanError(null);
    setSaveError(null);
    const file = await shrinkPhoto(picked);
    if (file.size > MAX_SCAN_FILE_BYTES) {
      setScanError(`That file is too large to read (${MAX_SCAN_FILE_LABEL} max). Try a photo instead of a large PDF.`);
      return;
    }
    setScanning(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/extract-warranty", { method: "POST", body });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data) {
        setScanError(data?.error ?? "Could not read that file. Try again.");
        return;
      }
      setWarranty((w) => fromScan(w, data as WarrantyScan, file));
      setScanned(true);
    } catch {
      setScanError("Could not reach the server. Check your connection and try again.");
    } finally {
      setScanning(false);
    }
  }

  async function handleSave() {
    if (missingRequired(warranty).length) return;
    setSaveError(null);
    setSaving(true);
    try {
      await onSave(warranty);
    } catch {
      setSaveError("Could not save. Check your connection and that you are signed in, then try again.");
      setSaving(false);
    }
  }

  const end = getEndDate(warranty);
  const missing = missingRequired(warranty);
  const length = warranty.lengthYears + warranty.lengthMonths > 0 ? formatLength(warranty) : "";

  const scanButtons = (
    <div className="flex flex-wrap gap-3">
      <label className={`${scanButtonClass} ${scanning ? "pointer-events-none opacity-50" : ""}`}>
        📷 {scanned ? "Scan again" : "Take a photo"}
        <input type="file" accept="image/*" capture="environment" className="sr-only" disabled={scanning}
          onChange={(e) => { handleScan(e.target.files?.[0]); e.target.value = ""; }} />
      </label>
      <label className={`${scanButtonClass} ${scanning ? "pointer-events-none opacity-50" : ""}`}>
        📄 Upload photo or PDF
        <input type="file" accept="application/pdf,image/*" className="sr-only" disabled={scanning}
          onChange={(e) => { handleScan(e.target.files?.[0]); e.target.value = ""; }} />
      </label>
    </div>
  );

  return (
    <div className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-6 text-card-foreground">
      <h2 className="font-heading text-xl">{initial ? "Warranty details" : "Scan a warranty"}</h2>

      <section aria-label="Scan a photo or PDF" className="flex flex-col gap-3">
        <p className="text-sm">
          {scanned
            ? "Something wrong or missing? Scan a clearer photo and we'll read it again."
            : "Take a photo of the warranty card, certificate or receipt, or upload a PDF. We'll read it and sort out the details for you."}
        </p>
        <p className="text-xs text-muted-foreground">Only photograph the document, not people or your house.</p>
        {scanButtons}
        {scanning && <p className="text-sm text-muted-foreground" role="status">Reading your document…</p>}
        {scanError && <p className="text-sm text-destructive" role="alert">{scanError}</p>}
      </section>

      {scanned && (
        <>
          <Section title="What it covers">
            <Field label="Product or work" value={warranty.item} />
            <Field label="Warranty type" value={WARRANTY_TYPE_LABELS[warranty.warrantyType]} />
          </Section>

          <Section title="Company or contractor">
            <Field label="Name" value={warranty.provider} />
            <Field label="Phone" value={warranty.phone} />
            <Field label="Email" value={warranty.email} />
          </Section>

          <Section title="Dates">
            <Field label="Starts" value={warranty.startDate ? formatDate(parseDate(warranty.startDate)) : ""} />
            <Field label="Lasts" value={length} />
            <Field label="Ends" value={end ? formatDate(end) : ""} />
          </Section>

          <section className="grid gap-4 rounded-xl border border-border bg-background p-4 sm:grid-cols-2">
            <dl><Field label="What's covered" value={warranty.covered} /></dl>
            <dl><Field label="What's not covered" value={warranty.notCovered} /></dl>
          </section>

          {warranty.document && (
            <p className="text-sm text-muted-foreground">📎 Saved with this warranty: {warranty.document.name}</p>
          )}

          <div>
            <label htmlFor="job" className="mb-1 block text-sm text-muted-foreground">Link to a job (optional)</label>
            <select id="job" value={warranty.jobId ?? ""}
              onChange={(e) => setWarranty((w) => ({ ...w, jobId: e.target.value || null }))}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-none">
              <option value="">Not linked to a job</option>
              {jobs.map((job) => (
                <option key={job.id} value={job.id}>{job.title}</option>
              ))}
              {/* keep a link to a job this person can't edit, so saving doesn't drop it */}
              {warranty.jobId && !jobs.some((j) => j.id === warranty.jobId) && (
                <option value={warranty.jobId}>Current job</option>
              )}
            </select>
            <p className="mt-1 text-xs text-muted-foreground">
              Everyone the job is shared with can see this warranty. If the job is deleted, you choose whether to keep it.
            </p>
          </div>

          {missing.length > 0 && (
            <p className="text-sm text-destructive" role="alert">
              We couldn&apos;t find {missing.join(", ")} on this document. Scan a clearer photo, or the page that shows it.
            </p>
          )}
          {saveError && <p className="text-sm text-destructive" role="alert">{saveError}</p>}
        </>
      )}

      <div className="flex gap-3">
        {scanned && (
          <button type="button" onClick={handleSave} disabled={saving || scanning || missing.length > 0}
            className="rounded-full bg-primary px-5 py-2 text-sm text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50">
            {saving ? "Saving…" : "Save warranty"}
          </button>
        )}
        <button type="button" onClick={onCancel}
          className="rounded-full border border-border px-5 py-2 text-sm transition-colors hover:border-primary">
          Cancel
        </button>
      </div>
    </div>
  );
}

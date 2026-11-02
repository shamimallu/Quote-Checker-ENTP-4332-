"use client";

import { useState } from "react";
import {
  createContractor,
  updateContractor,
  type Contractor,
  type ContractorInput,
} from "@/lib/contractor-storage";
import { updateJobDetails } from "@/lib/job-storage";
import type { Job } from "@/lib/job-types";
import { card, input, linkButton, pill, primaryPill, sectionTitle, useAction } from "./ui";

const NEW = "__new__";
const empty: ContractorInput = { name: "", phone: "", licenseNumber: "" };

// The homeowner's own contractor for this job, picked from their reusable list.
export default function JobContractorSection({
  job,
  contractor,
  myContractors,
  editable,
  userId,
  onJobChange,
  onRecordChange,
}: {
  job: Job;
  contractor: Contractor | null;
  myContractors: Contractor[];
  editable: boolean;
  userId: string | null;
  onJobChange: () => Promise<void>;
  onRecordChange: () => void;
}) {
  const [form, setForm] = useState<{ mode: "new" | "edit"; values: ContractorInput } | null>(null);
  const { busy, error, setError, run } = useAction();
  const isMine = contractor !== null && contractor.ownerId === userId;

  const setContractor = (contractorId: string | null) =>
    run(async () => {
      await updateJobDetails(job.id, { contractorId });
      await onJobChange();
    }, "Could not change the contractor. Try again.");

  function choose(value: string) {
    if (value === NEW) {
      setError(null);
      setForm({ mode: "new", values: empty });
    } else if (value) {
      setForm(null);
      setContractor(value);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    if (!form.values.name.trim()) return setError("Add the contractor's name.");
    const ok = await run(async () => {
      if (form.mode === "new") {
        const created = await createContractor(form.values);
        await updateJobDetails(job.id, { contractorId: created.id });
        await onJobChange();
      } else if (contractor) {
        await updateContractor(contractor.id, form.values);
      }
      onRecordChange();
    }, "Could not save the contractor. Try again.");
    if (ok) setForm(null);
  }

  const set = (key: keyof ContractorInput, value: string) =>
    setForm((f) => (f ? { ...f, values: { ...f.values, [key]: value } } : f));

  return (
    <section className={card}>
      <h2 className={sectionTitle}>Contractor</h2>
      <p className="mt-1 text-xs text-sand">
        Your own contractor, saved to your list for other jobs. homi isn&apos;t a marketplace and never charges lead fees.
      </p>

      {contractor ? (
        <div className="mt-4 rounded-xl border border-walnut p-4">
          <p className="text-beige">{contractor.name}</p>
          <div className="mt-1 flex flex-wrap gap-x-4 text-sm">
            {contractor.phone ? (
              <a href={`tel:${contractor.phone}`} className="text-caramel hover:underline">
                📞 {contractor.phone}
              </a>
            ) : (
              <span className="text-sand">No phone saved</span>
            )}
            <span className="text-sand">
              License: <span className="text-beige">{contractor.licenseNumber || "not recorded"}</span>
            </span>
          </div>
          {!isMine && <p className="mt-2 text-xs text-sand">Added by someone else on this job.</p>}
          {editable && (
            <div className="mt-3 flex flex-wrap gap-3">
              {isMine && !form && (
                <button
                  type="button"
                  onClick={() => setForm({ mode: "edit", values: { ...contractor } })}
                  className={pill}
                >
                  Edit details
                </button>
              )}
              <button type="button" disabled={busy} onClick={() => setContractor(null)} className={linkButton}>
                Remove from this job
              </button>
            </div>
          )}
        </div>
      ) : (
        <p className="mt-4 text-sm text-sand">No contractor picked yet.</p>
      )}

      {editable && !form && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label htmlFor="contractor-pick" className="text-sm text-sand">
            {contractor ? "Switch to" : "Pick"}
          </label>
          <select
            id="contractor-pick"
            value=""
            disabled={busy}
            onChange={(e) => choose(e.target.value)}
            className={`${input} min-w-0 flex-1 sm:max-w-xs`}
          >
            <option value="">Choose from your contractors…</option>
            {myContractors
              .filter((c) => c.id !== contractor?.id)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            <option value={NEW}>+ Add a new contractor</option>
          </select>
        </div>
      )}

      {form && (
        <form onSubmit={save} className="mt-4 flex flex-col gap-3 border-t border-walnut pt-4">
          <input
            autoFocus
            aria-label="Contractor name"
            placeholder="Name or company"
            value={form.values.name}
            onChange={(e) => set("name", e.target.value)}
            className={input}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              type="tel"
              aria-label="Phone"
              placeholder="Phone"
              value={form.values.phone}
              onChange={(e) => set("phone", e.target.value)}
              className={input}
            />
            <input
              aria-label="License number (if known)"
              placeholder="License number (if known)"
              value={form.values.licenseNumber}
              onChange={(e) => set("licenseNumber", e.target.value)}
              className={input}
            />
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={busy} className={primaryPill}>
              {busy ? "Saving…" : form.mode === "new" ? "Add and use for this job" : "Save"}
            </button>
            <button type="button" onClick={() => setForm(null)} className={pill}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
    </section>
  );
}

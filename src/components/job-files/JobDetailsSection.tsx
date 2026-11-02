"use client";

import { useState } from "react";
import { updateJobDetails } from "@/lib/job-storage";
import { PERMIT_STATUS_LABELS, type Job, type PermitStatus } from "@/lib/job-types";
import { card, input, pill, primaryPill, sectionTitle, useAction } from "./ui";

// The job's name, address and problem, plus its permit.
export default function JobDetailsSection({
  job,
  editable,
  onJobChange,
}: {
  job: Job;
  editable: boolean;
  onJobChange: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(job.title);
  const [address, setAddress] = useState(job.address);
  const [description, setDescription] = useState(job.description);
  const [permitNumber, setPermitNumber] = useState(job.permitNumber);
  const { busy, error, setError, run } = useAction();

  function startEditing() {
    setTitle(job.title);
    setAddress(job.address);
    setDescription(job.description);
    setPermitNumber(job.permitNumber);
    setError(null);
    setEditing(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return setError("Give the job a name.");
    const ok = await run(async () => {
      await updateJobDetails(job.id, {
        title: title.trim(),
        address: address.trim(),
        description: description.trim(),
        permitNumber: permitNumber.trim(),
      });
      await onJobChange();
    }, "Could not save the job details. Try again.");
    if (ok) setEditing(false);
  }

  const setPermitStatus = (permitStatus: PermitStatus) =>
    run(async () => {
      await updateJobDetails(job.id, { permitStatus });
      await onJobChange();
    }, "Could not save the permit status. Try again.");

  const showPermitNumber = job.permitStatus === "applied" || job.permitStatus === "approved";

  return (
    <section className={card}>
      <div className="flex items-start justify-between gap-3">
        <h2 className={sectionTitle}>Job details</h2>
        {editable && !editing && (
          <button type="button" onClick={startEditing} className={pill}>
            Edit
          </button>
        )}
      </div>

      {editing ? (
        <form onSubmit={save} className="mt-4 flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm text-sand">
            Job name
            <input value={title} onChange={(e) => setTitle(e.target.value)} className={input} />
          </label>
          <label className="flex flex-col gap-1 text-sm text-sand">
            Address
            <input value={address} onChange={(e) => setAddress(e.target.value)} className={input} />
          </label>
          <label className="flex flex-col gap-1 text-sm text-sand">
            What&apos;s the problem?
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className={`${input} resize-y`}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-sand">
            Permit number
            <input value={permitNumber} onChange={(e) => setPermitNumber(e.target.value)} className={input} />
          </label>
          <div className="flex gap-3">
            <button type="submit" disabled={busy} className={primaryPill}>
              {busy ? "Saving…" : "Save"}
            </button>
            <button type="button" onClick={() => setEditing(false)} className={pill}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-sand">Address</dt>
            <dd className="text-beige">{job.address || "—"}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-sm text-sand">The problem</dt>
            <dd className="whitespace-pre-wrap text-beige">{job.description || "—"}</dd>
          </div>
        </dl>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-walnut pt-4">
        <label htmlFor="permit-status" className="text-sm text-sand">
          Permit
        </label>
        <select
          id="permit-status"
          value={job.permitStatus}
          disabled={!editable || busy}
          onChange={(e) => setPermitStatus(e.target.value as PermitStatus)}
          className={input}
        >
          {Object.entries(PERMIT_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        {showPermitNumber && !editing && (
          <span className="text-sm text-sand">
            Permit number: <span className="text-beige">{job.permitNumber || "not recorded"}</span>
          </span>
        )}
      </div>

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
    </section>
  );
}

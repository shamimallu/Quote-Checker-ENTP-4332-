"use client";

import { useState } from "react";
import { createJob, deleteJob, removeMember, shareJob, updateJobStatus } from "@/lib/job-storage";
import { countWarrantiesForJob } from "@/lib/warranty-storage";
import {
  JOB_STATUS_LABELS,
  MEMBER_ROLE_LABELS,
  canEditJob,
  type Job,
  type JobStatus,
  type MemberRole,
} from "@/lib/job-types";

const inputClass =
  "rounded-lg border border-walnut bg-espresso px-3 py-2 text-sm text-beige placeholder:text-sand/50 focus:border-caramel focus:outline-none";
const pill =
  "rounded-full border border-walnut px-4 py-1.5 text-sm text-beige transition-colors hover:border-caramel hover:text-caramel disabled:opacity-50";
const primaryPill =
  "rounded-full border border-caramel bg-caramel/10 px-4 py-1.5 text-sm text-caramel transition-colors hover:bg-caramel/20 disabled:opacity-50";

type Panel = "none" | "new" | "share" | "delete";

// Picks the job the Quote Checker is working on, and lets its owner share or delete it.
// onChange(jobId) asks the parent to reload jobs and select that job.
export default function JobBar({
  jobs,
  selected,
  onSelect,
  onChange,
}: {
  jobs: Job[];
  selected: Job | null;
  onSelect: (jobId: string) => void;
  onChange: (jobId: string | null) => Promise<void>;
}) {
  const [panel, setPanel] = useState<Panel>(jobs.length === 0 ? "new" : "none");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<MemberRole>("editor");
  const [warrantyCount, setWarrantyCount] = useState<number | null>(null);

  function open(next: Panel) {
    setError(null);
    setPanel(panel === next ? "none" : next);
  }

  async function run(action: () => Promise<void>, failure: string) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : failure);
    } finally {
      setBusy(false);
    }
  }

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return setError("Give the job a name, like “Replace water heater”.");
    run(async () => {
      const id = await createJob(title, { address, description });
      setTitle("");
      setAddress("");
      setDescription("");
      setPanel("none");
      await onChange(id);
    }, "Could not create that job. Try again.");
  };

  const handleShare = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected || !email.trim()) return;
    run(async () => {
      await shareJob(selected.id, email, role);
      setEmail("");
      await onChange(selected.id);
    }, "Could not share this job. Try again.");
  };

  function openDelete() {
    if (!selected) return;
    open("delete");
    setWarrantyCount(null);
    countWarrantiesForJob(selected.id)
      .then(setWarrantyCount)
      .catch(() => setWarrantyCount(0));
  }

  const handleDelete = (deleteWarranties: boolean) =>
    selected &&
    run(async () => {
      await deleteJob(selected, deleteWarranties);
      setPanel("none");
      await onChange(null);
    }, "Could not delete this job. Try again.");

  const isOwner = selected?.myRole === "owner";

  return (
    <section className="mb-8 rounded-2xl border border-walnut bg-bark p-5">
      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="job" className="text-sm text-sand">
          Job
        </label>
        {jobs.length > 0 && (
          <select
            id="job"
            value={selected?.id ?? ""}
            onChange={(e) => {
              setPanel("none");
              onSelect(e.target.value);
            }}
            className={`${inputClass} min-w-0 flex-1 sm:max-w-xs`}
          >
            {jobs.map((job) => (
              <option key={job.id} value={job.id}>
                {job.title}
                {job.myRole !== "owner" ? " (shared with you)" : ""}
              </option>
            ))}
          </select>
        )}
        <button type="button" onClick={() => open("new")} className={pill}>
          + New job
        </button>
      </div>

      {selected && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label htmlFor="status" className="text-sm text-sand">
            Status
          </label>
          <select
            id="status"
            value={selected.status}
            disabled={!canEditJob(selected) || busy}
            onChange={(e) =>
              run(async () => {
                await updateJobStatus(selected.id, e.target.value as JobStatus);
                await onChange(selected.id);
              }, "Could not change the status. Try again.")
            }
            className={inputClass}
          >
            {Object.entries(JOB_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>

          {isOwner ? (
            <>
              <button type="button" onClick={() => open("share")} className={pill}>
                Share{selected.members.length > 0 ? ` (${selected.members.length})` : ""}
              </button>
              <button
                type="button"
                onClick={openDelete}
                className={`${pill} hover:border-red-400 hover:text-red-400`}
              >
                Delete job
              </button>
            </>
          ) : (
            <span className="text-xs text-sand">
              Shared with you · {MEMBER_ROLE_LABELS[selected.myRole as MemberRole].toLowerCase()}
            </span>
          )}
        </div>
      )}

      {panel === "new" && (
        <form onSubmit={handleCreate} className="mt-4 flex flex-col gap-3 border-t border-walnut pt-4">
          <input
            autoFocus
            aria-label="Job name"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Replace water heater"
            className={inputClass}
          />
          <input
            aria-label="Address (optional)"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Address (optional)"
            className={inputClass}
          />
          <textarea
            aria-label="What's the problem? (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What's the problem? (optional)"
            rows={2}
            className={`${inputClass} resize-y`}
          />
          <button type="submit" disabled={busy} className={`${primaryPill} self-start`}>
            {busy ? "Creating…" : "Create job"}
          </button>
        </form>
      )}

      {panel === "share" && selected && (
        <div className="mt-4 border-t border-walnut pt-4">
          <p className="text-sm text-sand">
            Share this job with someone who has a homi account, like a spouse or roommate.
          </p>
          {selected.members.length > 0 && (
            <ul className="mt-3 space-y-2">
              {selected.members.map((m) => (
                <li key={m.userId} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="text-beige">
                    {m.email ?? "Unknown"} <span className="text-sand">· {MEMBER_ROLE_LABELS[m.role]}</span>
                  </span>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      run(async () => {
                        await removeMember(selected.id, m.userId);
                        await onChange(selected.id);
                      }, "Could not remove that person. Try again.")
                    }
                    className="text-xs text-sand hover:text-red-400"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
          <form onSubmit={handleShare} className="mt-3 flex flex-wrap gap-3">
            <input
              type="email"
              aria-label="Their email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Their email"
              className={`${inputClass} min-w-0 flex-1`}
            />
            <select
              aria-label="What they can do"
              value={role}
              onChange={(e) => setRole(e.target.value as MemberRole)}
              className={inputClass}
            >
              {Object.entries(MEMBER_ROLE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <button type="submit" disabled={busy || !email.trim()} className={primaryPill}>
              {busy ? "Sharing…" : "Share"}
            </button>
          </form>
        </div>
      )}

      {panel === "delete" && selected && (
        <div className="mt-4 border-t border-walnut pt-4 text-sm">
          <p className="text-beige">
            Delete &ldquo;{selected.title}&rdquo;? Its quotes, files, payments, change orders and proof log will be deleted. This
            can&apos;t be undone.
          </p>
          {warrantyCount === null ? (
            <p className="mt-2 text-sand">Checking for warranties…</p>
          ) : warrantyCount > 0 ? (
            <p className="mt-2 text-sand">
              This job has {warrantyCount} warrant{warrantyCount === 1 ? "y" : "ies"}. Warranties can matter
              for years after the job is done, so you can keep {warrantyCount === 1 ? "it" : "them"} in the
              Warranty Vault.
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-3">
            {warrantyCount !== null && warrantyCount > 0 ? (
              <>
                <button type="button" disabled={busy} onClick={() => handleDelete(false)} className={primaryPill}>
                  Delete job, keep warranties
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => handleDelete(true)}
                  className={`${pill} border-red-400/60 text-red-400 hover:border-red-400 hover:text-red-400`}
                >
                  Delete job and warranties
                </button>
              </>
            ) : (
              <button
                type="button"
                disabled={busy || warrantyCount === null}
                onClick={() => handleDelete(false)}
                className={`${pill} border-red-400/60 text-red-400 hover:border-red-400 hover:text-red-400`}
              >
                Delete job
              </button>
            )}
            <button type="button" onClick={() => setPanel("none")} className={pill}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
    </section>
  );
}

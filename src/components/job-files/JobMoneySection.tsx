"use client";

import { useState } from "react";
import { formatDay, formatUsd, todayIso } from "@/lib/format";
import {
  addChangeOrder,
  addPayment,
  deleteChangeOrder,
  deletePayment,
  PAYMENT_METHOD_LABELS,
  type ChangeOrder,
  type Payment,
  type PaymentMethod,
} from "@/lib/job-ledger-storage";
import type { Job } from "@/lib/job-types";
import { card, input, linkButton, primaryPill, sectionTitle, useAction } from "./ui";

// What was quoted, what changed, and what's been paid.
export default function JobMoneySection({
  job,
  payments,
  changeOrders,
  editable,
  onRecordChange,
}: {
  job: Job;
  payments: Payment[];
  changeOrders: ChangeOrder[];
  editable: boolean;
  onRecordChange: () => void;
}) {
  const paid = payments.reduce((sum, p) => sum + p.amount, 0);
  const changes = changeOrders.reduce((sum, c) => sum + c.addedCost, 0);
  const quoted = job.baselineTotal;
  const agreed = quoted !== null ? quoted + changes : null;

  return (
    <section className={card}>
      <h2 className={sectionTitle}>Money</h2>
      <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-5">
        <Figure label="Quoted" value={quoted !== null ? formatUsd(quoted) : "—"} />
        <Figure label="Change orders" value={`${changes >= 0 ? "+" : "−"}${formatUsd(Math.abs(changes))}`} />
        <Figure label="New total" value={agreed !== null ? formatUsd(agreed) : "—"} />
        <Figure label="Paid" value={formatUsd(paid)} />
        <Figure
          label="Still owed"
          value={agreed !== null ? formatUsd(Math.max(agreed - paid, 0)) : "—"}
        />
      </dl>
      {quoted === null && (
        <p className="mt-3 text-xs text-sand">Accept a quote to compare payments with what was agreed.</p>
      )}

      <Payments jobId={job.id} payments={payments} editable={editable} onRecordChange={onRecordChange} />
      <ChangeOrders jobId={job.id} changeOrders={changeOrders} editable={editable} onRecordChange={onRecordChange} />
    </section>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-sand">{label}</dt>
      <dd className="text-beige">{value}</dd>
    </div>
  );
}

function Payments({
  jobId,
  payments,
  editable,
  onRecordChange,
}: {
  jobId: string;
  payments: Payment[];
  editable: boolean;
  onRecordChange: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [paidOn, setPaidOn] = useState(todayIso());
  const [method, setMethod] = useState<PaymentMethod>("check");
  const [note, setNote] = useState("");
  const { busy, error, setError, run } = useAction();

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(amount);
    if (!(value > 0)) return setError("Enter the amount paid.");
    const ok = await run(async () => {
      await addPayment(jobId, { amount: Math.round(value * 100) / 100, paidOn, method, note });
      onRecordChange();
    }, "Could not save that payment. Try again.");
    if (ok) {
      setAmount("");
      setNote("");
    }
  }

  const remove = (p: Payment) =>
    window.confirm(`Delete the ${formatUsd(p.amount)} payment from ${formatDay(p.paidOn)}?`) &&
    run(async () => {
      await deletePayment(p.id);
      onRecordChange();
    }, "Could not delete that payment. Try again.");

  return (
    <div className="mt-6 border-t border-walnut pt-4">
      <h3 className="text-sm font-medium text-beige">Payments</h3>
      {payments.length === 0 ? (
        <p className="mt-2 text-sm text-sand">No payments logged yet.</p>
      ) : (
        <ul className="mt-2 divide-y divide-walnut">
          {payments.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
              <span className="text-sand">
                {formatDay(p.paidOn)} · {PAYMENT_METHOD_LABELS[p.method]}
                {p.note && <span className="text-sand/80"> · {p.note}</span>}
              </span>
              <span className="flex items-center gap-3">
                <span className="text-beige">{formatUsd(p.amount)}</span>
                {editable && (
                  <button type="button" disabled={busy} onClick={() => remove(p)} className={linkButton}>
                    Delete
                  </button>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
      {editable && (
        <form onSubmit={add} className="mt-3 grid gap-2 sm:grid-cols-[6.5rem_9.5rem_8rem_minmax(0,1fr)_auto]">
          <input
            type="number"
            min="0.01"
            step="0.01"
            inputMode="decimal"
            aria-label="Amount paid"
            placeholder="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={input}
          />
          <input
            type="date"
            aria-label="Date paid"
            value={paidOn}
            onChange={(e) => setPaidOn(e.target.value)}
            className={input}
          />
          <select
            aria-label="How it was paid"
            value={method}
            onChange={(e) => setMethod(e.target.value as PaymentMethod)}
            className={input}
          >
            {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <input
            aria-label="Note (optional)"
            placeholder="Note (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className={input}
          />
          <button type="submit" disabled={busy} className={`${primaryPill} whitespace-nowrap`}>
            Add payment
          </button>
        </form>
      )}
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </div>
  );
}

function ChangeOrders({
  jobId,
  changeOrders,
  editable,
  onRecordChange,
}: {
  jobId: string;
  changeOrders: ChangeOrder[];
  editable: boolean;
  onRecordChange: () => void;
}) {
  const [description, setDescription] = useState("");
  const [cost, setCost] = useState("");
  const [orderedOn, setOrderedOn] = useState(todayIso());
  const { busy, error, setError, run } = useAction();

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(cost);
    if (!description.trim()) return setError("Describe the change.");
    if (!cost.trim() || Number.isNaN(value)) return setError("Enter the added cost (use a minus sign for a credit).");
    const ok = await run(async () => {
      await addChangeOrder(jobId, { description, addedCost: Math.round(value * 100) / 100, orderedOn });
      onRecordChange();
    }, "Could not save that change order. Try again.");
    if (ok) {
      setDescription("");
      setCost("");
    }
  }

  const remove = (c: ChangeOrder) =>
    window.confirm(`Delete the change order "${c.description}"?`) &&
    run(async () => {
      await deleteChangeOrder(c.id);
      onRecordChange();
    }, "Could not delete that change order. Try again.");

  return (
    <div className="mt-6 border-t border-walnut pt-4">
      <h3 className="text-sm font-medium text-beige">Change orders</h3>
      {changeOrders.length === 0 ? (
        <p className="mt-2 text-sm text-sand">No change orders.</p>
      ) : (
        <ul className="mt-2 divide-y divide-walnut">
          {changeOrders.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
              <span className="text-sand">
                {formatDay(c.orderedOn)} · <span className="text-beige">{c.description}</span>
              </span>
              <span className="flex items-center gap-3">
                <span className="text-beige">
                  {c.addedCost >= 0 ? "+" : "−"}
                  {formatUsd(Math.abs(c.addedCost))}
                </span>
                {editable && (
                  <button type="button" disabled={busy} onClick={() => remove(c)} className={linkButton}>
                    Delete
                  </button>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
      {editable && (
        <form onSubmit={add} className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_6.5rem_9.5rem_auto]">
          <input
            aria-label="What changed"
            placeholder="What changed, e.g. replace shutoff valve"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={input}
          />
          <input
            type="number"
            step="0.01"
            inputMode="decimal"
            aria-label="Added cost (negative for a credit)"
            placeholder="Cost"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            className={input}
          />
          <input
            type="date"
            aria-label="Date agreed"
            value={orderedOn}
            onChange={(e) => setOrderedOn(e.target.value)}
            className={input}
          />
          <button type="submit" disabled={busy} className={`${primaryPill} whitespace-nowrap`}>
            Add change
          </button>
        </form>
      )}
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </div>
  );
}

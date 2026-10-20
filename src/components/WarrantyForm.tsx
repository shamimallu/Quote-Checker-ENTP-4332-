"use client";

import { useState } from "react";
import {
  WARRANTY_TYPE_LABELS,
  formatDate,
  getEndDate,
  type Warranty,
  type WarrantyDocument,
  type WarrantyType,
} from "@/lib/warranty-types";

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10MB

const inputClass =
  "w-full rounded-lg border border-walnut bg-espresso px-3 py-2 text-beige placeholder:text-sand/50 focus:border-caramel focus:outline-none";
const labelClass = "mb-1 block text-sm text-sand";

function emptyWarranty(): Warranty {
  return {
    id: crypto.randomUUID(),
    item: "",
    warrantyType: "manufacturer",
    provider: "",
    phone: "",
    email: "",
    startDate: "",
    lengthYears: 1,
    lengthMonths: 0,
    covered: "",
    notCovered: "",
    document: null,
    createdAt: Date.now(),
  };
}

export default function WarrantyForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Warranty;
  onSave: (warranty: Warranty) => Promise<void>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<Warranty>(initial ?? emptyWarranty());
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function set<K extends keyof Warranty>(key: K, value: Warranty[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleFile(file: File | undefined) {
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      setError("That file is over 10MB. Try a smaller photo or PDF.");
      return;
    }
    setError(null);
    const doc: WarrantyDocument = { name: file.name, type: file.type, blob: file };
    set("document", doc);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.item.trim()) return setError("Add what the warranty covers.");
    if (!form.startDate) return setError("Add a start date.");
    if (form.lengthYears + form.lengthMonths <= 0) return setError("Add how long the warranty lasts.");
    setError(null);
    setSaving(true);
    try {
      await onSave({ ...form, item: form.item.trim(), provider: form.provider.trim() });
    } catch {
      setError("Could not save. Your browser may be blocking storage (e.g. private browsing).");
      setSaving(false);
    }
  }

  const end = getEndDate(form);

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 rounded-2xl border border-walnut bg-bark p-6">
      <h2 className="font-serif text-xl text-beige">{initial ? "Edit warranty" : "Add a warranty"}</h2>

      <div>
        <label htmlFor="item" className={labelClass}>What it covers *</label>
        <input id="item" className={inputClass} value={form.item} placeholder="e.g. Water heater, Roof replacement"
          onChange={(e) => set("item", e.target.value)} />
      </div>

      <div>
        <label htmlFor="type" className={labelClass}>Warranty type</label>
        <select id="type" className={inputClass} value={form.warrantyType}
          onChange={(e) => set("warrantyType", e.target.value as WarrantyType)}>
          {Object.entries(WARRANTY_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      <fieldset className="grid gap-4 sm:grid-cols-3">
        <legend className="mb-2 text-sm text-sand">Company or contractor</legend>
        <input aria-label="Company name" className={inputClass} value={form.provider} placeholder="Name"
          onChange={(e) => set("provider", e.target.value)} />
        <input aria-label="Phone" type="tel" className={inputClass} value={form.phone} placeholder="Phone"
          onChange={(e) => set("phone", e.target.value)} />
        <input aria-label="Email" type="email" className={inputClass} value={form.email} placeholder="Email"
          onChange={(e) => set("email", e.target.value)} />
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="start" className={labelClass}>Start date *</label>
          <input id="start" type="date" className={`${inputClass} [color-scheme:dark]`} value={form.startDate}
            onChange={(e) => set("startDate", e.target.value)} />
        </div>
        <div>
          <label htmlFor="years" className={labelClass}>Years</label>
          <input id="years" type="number" min={0} max={50} className={inputClass} value={form.lengthYears}
            onChange={(e) => set("lengthYears", Math.max(0, Number(e.target.value) || 0))} />
        </div>
        <div>
          <label htmlFor="months" className={labelClass}>Months</label>
          <input id="months" type="number" min={0} max={11} className={inputClass} value={form.lengthMonths}
            onChange={(e) => set("lengthMonths", Math.max(0, Number(e.target.value) || 0))} />
        </div>
      </div>
      <p className="-mt-2 text-sm text-sand">
        Ends: <span className="text-caramel">{end ? formatDate(end) : "add a start date"}</span>
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="covered" className={labelClass}>What&apos;s covered</label>
          <textarea id="covered" rows={3} className={inputClass} value={form.covered}
            placeholder="e.g. Tank leaks, parts" onChange={(e) => set("covered", e.target.value)} />
        </div>
        <div>
          <label htmlFor="notCovered" className={labelClass}>What&apos;s not covered</label>
          <textarea id="notCovered" rows={3} className={inputClass} value={form.notCovered}
            placeholder="e.g. Labor, damage from flooding" onChange={(e) => set("notCovered", e.target.value)} />
        </div>
      </div>

      <div>
        <label htmlFor="doc" className={labelClass}>Warranty document or receipt (photo or PDF, up to 10MB)</label>
        {form.document ? (
          <div className="flex flex-wrap items-center gap-3 text-sm text-beige">
            <span>📎 {form.document.name}</span>
            <button type="button" onClick={() => set("document", null)} className="text-sand underline hover:text-caramel">
              Remove
            </button>
          </div>
        ) : (
          <input id="doc" type="file" accept="application/pdf,image/*"
            onChange={(e) => handleFile(e.target.files?.[0])}
            className="block w-full text-sm text-sand file:mr-3 file:rounded-full file:border file:border-walnut file:bg-espresso file:px-3 file:py-1.5 file:text-sm file:text-beige file:transition-colors hover:file:border-caramel" />
        )}
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex gap-3">
        <button type="submit" disabled={saving}
          className="rounded-full border border-caramel bg-caramel/10 px-5 py-2 text-sm text-caramel transition-colors hover:bg-caramel/20 disabled:opacity-50">
          {saving ? "Saving…" : "Save warranty"}
        </button>
        <button type="button" onClick={onCancel}
          className="rounded-full border border-walnut px-5 py-2 text-sm text-beige transition-colors hover:border-caramel">
          Cancel
        </button>
      </div>
    </form>
  );
}

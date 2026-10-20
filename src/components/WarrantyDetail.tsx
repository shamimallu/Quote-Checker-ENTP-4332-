"use client";

import WarrantyStatusBadge from "@/components/WarrantyStatusBadge";
import { getDocumentUrl } from "@/lib/warranty-storage";
import {
  WARRANTY_TYPE_LABELS,
  daysLeft,
  formatDate,
  formatLength,
  getEndDate,
  getStatus,
  parseDate,
  type Warranty,
} from "@/lib/warranty-types";

export default function WarrantyDetail({
  warranty,
  onBack,
  onEdit,
  onDelete,
}: {
  warranty: Warranty;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const end = getEndDate(warranty);
  const left = end ? daysLeft(end) : null;

  async function openDocument() {
    const doc = warranty.document;
    if (!doc?.path) return;
    try {
      window.open(await getDocumentUrl(doc.path), "_blank", "noopener");
    } catch {
      window.alert("Could not open that document. Try again.");
    }
  }

  return (
    <div className="flex flex-col gap-6 rounded-2xl border border-walnut bg-bark p-6">
      <button type="button" onClick={onBack} className="self-start text-sm text-sand hover:text-caramel">
        ← All warranties
      </button>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl text-beige">{warranty.item}</h2>
          <p className="text-sm text-sand">{WARRANTY_TYPE_LABELS[warranty.warrantyType]}</p>
        </div>
        <WarrantyStatusBadge status={getStatus(warranty)} />
      </div>

      <dl className="grid gap-4 sm:grid-cols-3">
        <Field label="Started" value={warranty.startDate ? formatDate(parseDate(warranty.startDate)) : "—"} />
        <Field label="Length" value={formatLength(warranty)} />
        <Field
          label="Ends"
          value={end ? `${formatDate(end)}${left !== null && left >= 0 ? ` (${left} days left)` : ""}` : "—"}
        />
      </dl>

      <div className="rounded-xl border border-walnut p-4">
        <h3 className="mb-2 text-sm text-sand">Company or contractor</h3>
        <p className="text-beige">{warranty.provider || "—"}</p>
        <div className="mt-1 flex flex-wrap gap-x-4 text-sm">
          {warranty.phone && <a href={`tel:${warranty.phone}`} className="text-caramel hover:underline">📞 {warranty.phone}</a>}
          {warranty.email && <a href={`mailto:${warranty.email}`} className="text-caramel hover:underline">✉️ {warranty.email}</a>}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Notes label="What's covered" text={warranty.covered} />
        <Notes label="What's not covered" text={warranty.notCovered} />
      </div>

      {warranty.document && (
        <button type="button" onClick={openDocument}
          className="self-start rounded-full border border-walnut px-4 py-2 text-sm text-beige transition-colors hover:border-caramel hover:text-caramel">
          📎 Open {warranty.document.name}
        </button>
      )}

      <div className="flex gap-3 border-t border-walnut pt-5">
        <button type="button" onClick={onEdit}
          className="rounded-full border border-caramel bg-caramel/10 px-5 py-2 text-sm text-caramel transition-colors hover:bg-caramel/20">
          Edit
        </button>
        <button type="button" onClick={onDelete}
          className="rounded-full border border-walnut px-5 py-2 text-sm text-sand transition-colors hover:border-red-400 hover:text-red-400">
          Delete
        </button>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-sm text-sand">{label}</dt>
      <dd className="text-beige">{value}</dd>
    </div>
  );
}

function Notes({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <h3 className="mb-1 text-sm text-sand">{label}</h3>
      <p className="whitespace-pre-wrap text-beige">{text || "—"}</p>
    </div>
  );
}

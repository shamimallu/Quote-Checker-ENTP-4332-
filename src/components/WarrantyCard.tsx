import WarrantyStatusBadge from "@/components/WarrantyStatusBadge";
import { daysLeft, formatDate, getEndDate, getStatus, type Warranty } from "@/lib/warranty-types";

export default function WarrantyCard({
  warranty,
  onOpen,
}: {
  warranty: Warranty;
  onOpen: () => void;
}) {
  const end = getEndDate(warranty);
  const status = getStatus(warranty);
  const left = end ? daysLeft(end) : null;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full flex-col gap-3 rounded-2xl border border-walnut bg-bark p-5 text-left transition-colors hover:border-caramel focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-caramel"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-serif text-lg text-beige">{warranty.item}</h3>
          <p className="truncate text-sm text-sand">{warranty.provider || "No company added"}</p>
        </div>
        <WarrantyStatusBadge status={status} />
      </div>
      {end && (
        <p className="text-xs text-sand">
          {status === "expired" ? "Ended" : "Ends"} {formatDate(end)}
          {left !== null && left >= 0 && ` · ${left} day${left === 1 ? "" : "s"} left`}
          {warranty.document && " · 📎 document attached"}
        </p>
      )}
    </button>
  );
}

import type { WarrantyStatus } from "@/lib/warranty-types";

// The only non-palette colors in the section: status needs to read at a glance.
const STYLES: Record<WarrantyStatus, { label: string; className: string }> = {
  active: { label: "Active", className: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300" },
  "ending-soon": { label: "Ending soon", className: "border-amber-400/30 bg-amber-400/10 text-amber-300" },
  expired: { label: "Expired", className: "border-rose-400/30 bg-rose-400/10 text-rose-300" },
};

export default function WarrantyStatusBadge({ status }: { status: WarrantyStatus }) {
  const { label, className } = STYLES[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs ${className}`}>
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

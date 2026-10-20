export type WarrantyType = "manufacturer" | "workmanship" | "home-warranty" | "other";

export const WARRANTY_TYPE_LABELS: Record<WarrantyType, string> = {
  manufacturer: "Manufacturer (the maker)",
  workmanship: "Contractor workmanship (the installer)",
  "home-warranty": "Home warranty",
  other: "Other",
};

export type WarrantyDocument = {
  name: string;
  type: string;
  blob?: Blob; // a file just chosen in the form, not uploaded yet
  path?: string; // where the uploaded file lives in Supabase Storage
};

export type Warranty = {
  id: string;
  item: string;
  warrantyType: WarrantyType;
  provider: string;
  phone: string;
  email: string;
  startDate: string; // YYYY-MM-DD
  lengthYears: number;
  lengthMonths: number;
  covered: string;
  notCovered: string;
  document: WarrantyDocument | null;
  createdAt: number;
};

export type WarrantyStatus = "active" | "ending-soon" | "expired";

export const ENDING_SOON_DAYS = 60;

export function parseDate(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

// Start date + length. Returns null until a start date is entered.
export function getEndDate(
  w: Pick<Warranty, "startDate" | "lengthYears" | "lengthMonths">
): Date | null {
  if (!w.startDate) return null;
  const start = parseDate(w.startDate);
  return new Date(
    start.getFullYear() + w.lengthYears,
    start.getMonth() + w.lengthMonths,
    start.getDate()
  );
}

export function daysLeft(end: Date, today = new Date()): number {
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((end.getTime() - startOfToday.getTime()) / 86_400_000);
}

export function getStatus(w: Warranty, today = new Date()): WarrantyStatus {
  const end = getEndDate(w);
  if (!end) return "active";
  const left = daysLeft(end, today);
  if (left < 0) return "expired";
  if (left <= ENDING_SOON_DAYS) return "ending-soon";
  return "active";
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function formatLength(w: Pick<Warranty, "lengthYears" | "lengthMonths">): string {
  const parts: string[] = [];
  if (w.lengthYears) parts.push(`${w.lengthYears} year${w.lengthYears === 1 ? "" : "s"}`);
  if (w.lengthMonths) parts.push(`${w.lengthMonths} month${w.lengthMonths === 1 ? "" : "s"}`);
  return parts.join(" ") || "—";
}

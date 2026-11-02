export function formatUsd(amount: number) {
  return amount.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

// A YYYY-MM-DD date as "Nov 2, 2026", without time-zone shifts.
export function formatDay(value: string) {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// Today as YYYY-MM-DD in the person's own time zone, for date inputs.
export function todayIso() {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

import type { JobAlert } from "@/lib/job-alerts";

// The code-computed checks at the top of a job (no AI). Nothing shows when all is well.
export default function JobAlerts({ alerts }: { alerts: JobAlert[] }) {
  if (alerts.length === 0) return null;
  return (
    <section aria-label="Things to check" className="flex flex-col gap-3">
      {alerts.map((alert) => (
        <div
          key={alert.id}
          role={alert.level === "warning" ? "alert" : undefined}
          className={`rounded-2xl border p-4 ${
            alert.level === "warning" ? "border-red-400/50 bg-red-400/5" : "border-caramel/50 bg-caramel/5"
          }`}
        >
          <p className={`text-sm font-medium ${alert.level === "warning" ? "text-red-300" : "text-caramel"}`}>
            {alert.level === "warning" ? "⚠ " : "ⓘ "}
            {alert.title}
          </p>
          <p className="mt-1 text-sm text-beige">{alert.detail}</p>
        </div>
      ))}
    </section>
  );
}

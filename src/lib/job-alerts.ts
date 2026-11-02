import { formatUsd } from "@/lib/format";
import { isHiredOrLater, type Job } from "@/lib/job-types";
import type { ChangeOrder, Payment } from "@/lib/job-ledger-storage";
import type { JobFile } from "@/lib/job-file-storage";

// Simple checks on a job, worked out in code (no AI), shown at the top of Job Files.

export const MAX_DEPOSIT_SHARE = 0.3;

export type JobAlert = {
  id: "high-deposit" | "change-orders" | "overpaid" | "no-permit" | "no-warranty" | "no-contract";
  level: "warning" | "info";
  title: string;
  detail: string;
};

export type JobAlertInput = {
  job: Pick<Job, "status" | "baselineTotal" | "baselineDeposit" | "baselineWarrantyTerms" | "permitStatus">;
  payments: Pick<Payment, "amount">[];
  changeOrders: Pick<ChangeOrder, "addedCost">[];
  files: Pick<JobFile, "kind">[];
  linkedWarranties: number; // Warranty Vault warranties linked to this job
};

const percent = (share: number) => `${Math.round(share * 100)}%`;
const sum = (values: number[]) => Math.round(values.reduce((a, b) => a + b, 0) * 100) / 100;

export function getJobAlerts({ job, payments, changeOrders, files, linkedWarranties }: JobAlertInput): JobAlert[] {
  const alerts: JobAlert[] = [];
  const total = job.baselineTotal;
  const paid = sum(payments.map((p) => p.amount));
  const changes = sum(changeOrders.map((c) => c.addedCost));
  const hired = isHiredOrLater(job.status);

  if (total && job.baselineDeposit !== null && job.baselineDeposit / total > MAX_DEPOSIT_SHARE) {
    alerts.push({
      id: "high-deposit",
      level: "warning",
      title: "Deposit is over 30% of the quote",
      detail:
        `The ${formatUsd(job.baselineDeposit)} deposit is ${percent(job.baselineDeposit / total)} of the ${formatUsd(total)} quote. ` +
        "A large deposit puts more of your money at risk before work starts. Ask whether it can be lowered or tied to finished stages of the work.",
    });
  }

  if (total !== null && changes > 0) {
    alerts.push({
      id: "change-orders",
      level: "info",
      title: "Change orders have raised the price",
      detail: `Change orders add ${formatUsd(changes)} (${percent(changes / total)}) to the ${formatUsd(total)} quote, for a new total of ${formatUsd(total + changes)}. Make sure each one is in writing.`,
    });
  }

  if (total !== null && paid > total + changes) {
    alerts.push({
      id: "overpaid",
      level: "warning",
      title: "Paid more than the agreed total",
      detail: `You've paid ${formatUsd(paid)}, but the quote plus change orders comes to ${formatUsd(total + changes)}, which is ${formatUsd(paid - (total + changes))} more than agreed. Check for a missing change order or a double payment.`,
    });
  }

  if (hired && job.permitStatus === "unknown") {
    alerts.push({
      id: "no-permit",
      level: "warning",
      title: "No permit recorded",
      detail: "Many repairs need a city permit. Ask your contractor whether this one does, and record the answer under Permit.",
    });
  }

  if ((hired || total !== null) && !job.baselineWarrantyTerms && linkedWarranties === 0) {
    alerts.push({
      id: "no-warranty",
      level: "warning",
      title: "No warranty",
      detail: "The accepted quote doesn't mention a warranty, and none is saved in the Warranty Vault for this job. Ask the contractor what their work and the parts are covered for, in writing.",
    });
  }

  if (hired && !files.some((f) => f.kind === "contract")) {
    alerts.push({
      id: "no-contract",
      level: "warning",
      title: "No contract uploaded",
      detail: "Upload the signed contract under Files so you have a copy of what was agreed.",
    });
  }

  return alerts;
}

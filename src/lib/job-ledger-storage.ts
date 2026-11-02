import { createClient } from "@/lib/supabase/client";

// Client-only. Payments and change orders for a job, in the `job_payments` and
// `job_change_orders` tables. Everyone on the job can see them; the owner and editors change them.

export type PaymentMethod = "cash" | "check" | "card" | "bank_transfer" | "financing" | "other";

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "Cash",
  check: "Check",
  card: "Card",
  bank_transfer: "Bank transfer",
  financing: "Financing",
  other: "Other",
};

export type Payment = { id: string; amount: number; paidOn: string; method: PaymentMethod; note: string };
export type ChangeOrder = { id: string; description: string; addedCost: number; orderedOn: string };

export async function loadLedger(jobId: string): Promise<{ payments: Payment[]; changeOrders: ChangeOrder[] }> {
  const supabase = createClient();
  const [payments, changeOrders] = await Promise.all([
    supabase
      .from("job_payments")
      .select("id, amount, paid_on, method, note")
      .eq("job_id", jobId)
      .order("paid_on", { ascending: true }),
    supabase
      .from("job_change_orders")
      .select("id, description, added_cost, ordered_on")
      .eq("job_id", jobId)
      .order("ordered_on", { ascending: true }),
  ]);
  if (payments.error) throw payments.error;
  if (changeOrders.error) throw changeOrders.error;
  return {
    payments: payments.data.map((p) => ({
      id: p.id,
      amount: Number(p.amount),
      paidOn: p.paid_on,
      method: p.method,
      note: p.note,
    })),
    changeOrders: changeOrders.data.map((c) => ({
      id: c.id,
      description: c.description,
      addedCost: Number(c.added_cost),
      orderedOn: c.ordered_on,
    })),
  };
}

export async function addPayment(jobId: string, p: Omit<Payment, "id">): Promise<void> {
  const { error } = await createClient()
    .from("job_payments")
    .insert({ job_id: jobId, amount: p.amount, paid_on: p.paidOn, method: p.method, note: p.note.trim() });
  if (error) throw error;
}

export async function addChangeOrder(jobId: string, c: Omit<ChangeOrder, "id">): Promise<void> {
  const { error } = await createClient()
    .from("job_change_orders")
    .insert({ job_id: jobId, description: c.description.trim(), added_cost: c.addedCost, ordered_on: c.orderedOn });
  if (error) throw error;
}

// A blocked delete returns no error and zero rows, so check the count.
async function deleteRow(table: "job_payments" | "job_change_orders", id: string) {
  const { data, error } = await createClient().from(table).delete().eq("id", id).select("id");
  if (error) throw error;
  if (!data || data.length === 0) throw new Error("You can only view this job, not change it.");
}

export const deletePayment = (id: string) => deleteRow("job_payments", id);
export const deleteChangeOrder = (id: string) => deleteRow("job_change_orders", id);

import { createClient } from "@/lib/supabase/client";
import { currentUserId } from "@/lib/supabase/current-user";

// Client-only. The homeowner's own contractors, reused across jobs: bring-your-own, not a
// marketplace, and homi never charges lead fees. Row level security keeps the list private;
// everyone on a job can also see the contractor picked for it.

export type Contractor = {
  id: string;
  ownerId: string;
  name: string;
  phone: string;
  licenseNumber: string;
};

type ContractorRow = { id: string; owner: string; name: string; phone: string; license_number: string };

const fromRow = (r: ContractorRow): Contractor => ({
  id: r.id,
  ownerId: r.owner,
  name: r.name,
  phone: r.phone,
  licenseNumber: r.license_number,
});

// The signed-in person's own list (not contractors they can only see through a shared job).
export async function listMyContractors(): Promise<Contractor[]> {
  const userId = await currentUserId();
  const { data, error } = await createClient()
    .from("contractors")
    .select("id, owner, name, phone, license_number")
    .eq("owner", userId)
    .order("name");
  if (error) throw error;
  return (data as ContractorRow[]).map(fromRow);
}

// One contractor, including one picked for a shared job by someone else.
export async function getContractor(id: string): Promise<Contractor | null> {
  const { data, error } = await createClient()
    .from("contractors")
    .select("id, owner, name, phone, license_number")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? fromRow(data as ContractorRow) : null;
}

export type ContractorInput = { name: string; phone: string; licenseNumber: string };

const toRow = (c: ContractorInput) => ({
  name: c.name.trim(),
  phone: c.phone.trim(),
  license_number: c.licenseNumber.trim(),
});

export async function createContractor(input: ContractorInput): Promise<Contractor> {
  const userId = await currentUserId();
  const { data, error } = await createClient()
    .from("contractors")
    .insert({ owner: userId, ...toRow(input) })
    .select("id, owner, name, phone, license_number")
    .single();
  if (error) throw error;
  return fromRow(data as ContractorRow);
}

export async function updateContractor(id: string, input: ContractorInput): Promise<void> {
  const { data, error } = await createClient().from("contractors").update(toRow(input)).eq("id", id).select("id");
  if (error) throw error;
  if (!data || data.length === 0) throw new Error("Only the person who added this contractor can change it.");
}

// Finds a contractor in the person's list by name (ignoring case), or adds one.
export async function findOrCreateContractor(name: string): Promise<Contractor> {
  const existing = (await listMyContractors()).find((c) => c.name.trim().toLowerCase() === name.trim().toLowerCase());
  return existing ?? createContractor({ name, phone: "", licenseNumber: "" });
}

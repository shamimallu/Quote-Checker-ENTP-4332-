import { createClient } from "@/lib/supabase/client";

// Client-only. The signed-in person's id, or an error asking them to sign in.
export async function currentUserId(): Promise<string> {
  const { data, error } = await createClient().auth.getUser();
  if (error || !data.user) throw new Error("Please sign in first.");
  return data.user.id;
}

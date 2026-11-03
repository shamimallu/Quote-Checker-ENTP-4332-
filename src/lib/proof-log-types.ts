// Mirrors the `proof_log_entries` table in supabase/schema.sql.
export type ProofLogEntry = {
  id: string;
  jobId: string;
  entryDate: string; // yyyy-mm-dd
  note: string;
  photoPaths: string[];
  createdAt: string;
};

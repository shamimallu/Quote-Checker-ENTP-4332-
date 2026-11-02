export type LineItem = {
  description: string;
  price: number;
};

export type ExtractedQuote = {
  id: string;
  contractorName: string;
  fileName: string;
  lineItems: LineItem[];
  depositPercent: number | null;
  depositAmount: number | null;
  warrantyTerms: string | null;
  filePath: string | null; // where the uploaded quote file lives in Supabase Storage
};

export type MissingItemFlag = {
  description: string;
  presentIn: string[];
  missingFrom: string[];
};

export type OverchargeFlag = {
  contractorName: string;
  description: string;
  price: number;
  reason: string;
};

export type TermNote = {
  contractorName: string;
  note: string;
};

export type ComparisonResult = {
  missingItems: MissingItemFlag[];
  overcharges: OverchargeFlag[];
  termNotes: TermNote[];
  summary: string;
};

// The Quote Checker's comparison, saved on every quote it compared.
export type SavedComparison = {
  comparedAt: string;
  quoteIds: string[];
  result: ComparisonResult;
};

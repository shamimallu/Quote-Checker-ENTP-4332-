// Server-only: reads a warranty photo or PDF with the AI and returns the Warranty Vault form's fields.
// Do not import this file from a "use client" component.
//
// Imports use ".ts" on purpose: the eval script (scripts/eval-warranty-reader.ts) runs this file
// with plain Node, which needs the full file name.
import { getAnthropicClient } from "./anthropic.ts";
import { generateGeminiJson, getGeminiClient, isGeminiSelected } from "./gemini.ts";
import type { WarrantyScan } from "./warranty-types.ts";

const nullableString = { type: ["string", "null"] };
const nullableNumber = { type: ["number", "null"] };

const SCAN_SCHEMA = {
  type: "object" as const,
  properties: {
    documentKind: {
      type: "string",
      enum: ["warranty", "receipt", "unreadable", "not-a-warranty"],
      description:
        "warranty: a warranty card, certificate, or warranty terms. receipt: a receipt or invoice for a product or repair. " +
        "unreadable: it may be one of those, but it is too blurry, dark, cut off, or small to read the details with confidence. " +
        "not-a-warranty: anything else (a photo of a room, a person, a menu, a contract quote, etc.).",
    },
    item: { ...nullableString, description: "The product or work covered, e.g. \"Water heater\" or \"Roof replacement\"." },
    warrantyType: {
      type: ["string", "null"],
      enum: ["manufacturer", "workmanship", "home-warranty", "other", null],
      description:
        "manufacturer: from the maker of a product. workmanship: from the contractor or installer, covering their labor. " +
        "home-warranty: a home warranty plan. other: anything else.",
    },
    provider: { ...nullableString, description: "The company or contractor giving the warranty." },
    phone: { ...nullableString, description: "The provider's phone number, as printed." },
    email: { ...nullableString, description: "The provider's email address." },
    startDate: {
      ...nullableString,
      description: "When coverage starts (purchase, install, or start date), as YYYY-MM-DD.",
    },
    lengthYears: { ...nullableNumber, description: "Whole years of coverage. \"18 months\" is 1 year 6 months." },
    lengthMonths: { ...nullableNumber, description: "Extra months of coverage beyond the whole years, 0 to 11." },
    covered: { ...nullableString, description: "What the warranty covers, in one or two short plain sentences." },
    notCovered: { ...nullableString, description: "What it does not cover (exclusions), in one or two short plain sentences." },
  },
  required: [
    "documentKind", "item", "warrantyType", "provider", "phone", "email",
    "startDate", "lengthYears", "lengthMonths", "covered", "notCovered",
  ],
};

const INSTRUCTIONS =
  "A homeowner is saving a warranty. Read this file and fill in the warranty record. " +
  "First decide documentKind. Then fill a field only if you can clearly read it on the document; " +
  "otherwise use null. Never guess, and never fill a field from general knowledge about the product. " +
  "If the image is too blurry, dark, or cut off to read the key details, use documentKind \"unreadable\" " +
  "and leave every other field null. If it is not a warranty or receipt, use \"not-a-warranty\" and leave every other field null.";

export async function readWarranty(mimeType: string, base64Data: string): Promise<WarrantyScan | null> {
  if (isGeminiSelected()) {
    const client = getGeminiClient();
    return (await generateGeminiJson(
      client,
      [{ inlineData: { mimeType, data: base64Data } }, { text: INSTRUCTIONS }],
      SCAN_SCHEMA
    )) as WarrantyScan | null;
  }

  // Claude (only when AI_PROVIDER is not "gemini"). Claude doesn't read HEIC photos.
  const file =
    mimeType === "application/pdf"
      ? {
          type: "document" as const,
          source: { type: "base64" as const, media_type: "application/pdf" as const, data: base64Data },
        }
      : {
          type: "image" as const,
          source: {
            type: "base64" as const,
            media_type: mimeType as "image/jpeg" | "image/png" | "image/webp",
            data: base64Data,
          },
        };
  const response = await getAnthropicClient().messages.create({
    model: "claude-sonnet-5-5",
    max_tokens: 2048,
    tools: [{ name: "record_warranty", description: "Record the warranty's details.", input_schema: SCAN_SCHEMA }],
    tool_choice: { type: "auto" },
    messages: [
      { role: "user", content: [file, { type: "text", text: `${INSTRUCTIONS} Use the record_warranty tool.` }] },
    ],
  });
  const toolUse = response.content.find((block) => block.type === "tool_use");
  return toolUse && toolUse.type === "tool_use" ? (toolUse.input as WarrantyScan) : null;
}

// What to tell the person when a scan shouldn't fill in the form, or null when it's fine.
export function scanProblem(scan: WarrantyScan | null): string | null {
  if (!scan) return "Could not read that file. Try again or type the details.";
  if (scan.documentKind === "not-a-warranty") {
    return "This doesn't look like a warranty or receipt. Try a photo of the warranty card, certificate or receipt.";
  }
  const { documentKind, ...fields } = scan;
  const foundSomething = Object.values(fields).some((v) => v !== null && v !== "");
  if (documentKind === "unreadable" || !foundSomething) {
    return "That's too blurry or dark to read. Try again in good light, with the page flat and the camera steady.";
  }
  return null;
}

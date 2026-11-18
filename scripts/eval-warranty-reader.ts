// Checks that reading a warranty from a file gives sensible answers.
// Uses the same code as the app (src/lib/warranty-reader.ts) and your .env.local AI settings.
// Each run makes 3 AI requests (Gemini free tier: about 5 per minute).
//
//   node --env-file=.env.local scripts/eval-warranty-reader.ts
import { readFile } from "node:fs/promises";
import { readWarranty, scanProblem } from "../src/lib/warranty-reader.ts";
import type { WarrantyScan } from "../src/lib/warranty-types.ts";

type Case = {
  name: string;
  file: string;
  mimeType: string;
  // Returns what went wrong, or null if the answer is right.
  check: (scan: WarrantyScan | null, problem: string | null) => string | null;
};

const CASES: Case[] = [
  {
    name: "Clear warranty PDF fills in the right details",
    file: "evals/warranty-reader/clear-warranty.pdf",
    mimeType: "application/pdf",
    check(scan, problem) {
      if (problem || !scan) return `was rejected: ${problem}`;
      const wrong: string[] = [];
      if (!/water heater/i.test(scan.item ?? "")) wrong.push(`item "${scan.item}"`);
      if (!/brightwater/i.test(scan.provider ?? "")) wrong.push(`provider "${scan.provider}"`);
      if (scan.warrantyType !== "manufacturer") wrong.push(`type "${scan.warrantyType}"`);
      if (scan.startDate !== "2025-03-03") wrong.push(`start date "${scan.startDate}"`);
      if (scan.lengthYears !== 6 || (scan.lengthMonths ?? 0) !== 0) {
        wrong.push(`length ${scan.lengthYears}y ${scan.lengthMonths}m`);
      }
      if (!(scan.phone ?? "").replace(/\D/g, "").endsWith("8005550142")) wrong.push(`phone "${scan.phone}"`);
      if (scan.email !== "warranty@brightwater.example") wrong.push(`email "${scan.email}"`);
      if (!/labor/i.test(scan.notCovered ?? "")) wrong.push(`not covered "${scan.notCovered}"`);
      return wrong.length ? `wrong fields: ${wrong.join(", ")}` : null;
    },
  },
  {
    name: "Blurry warranty photo is turned away, not guessed",
    file: "evals/warranty-reader/blurry-warranty.jpg",
    mimeType: "image/jpeg",
    check(scan, problem) {
      if (problem) return null; // turned away with a friendly message: good
      // If it did answer, it must not have made up details you can't read in the photo.
      const invented = (["startDate", "phone", "email", "lengthYears"] as const).filter((k) => scan?.[k] !== null);
      return invented.length ? `answered confidently anyway (${invented.join(", ")})` : null;
    },
  },
  {
    name: "Photo of a pool (not a warranty) is turned away",
    file: "evals/warranty-reader/not-a-warranty.jpg",
    mimeType: "image/jpeg",
    check(scan, problem) {
      return problem && scan?.documentKind === "not-a-warranty"
        ? null
        : `expected "not a warranty", got ${scan?.documentKind ?? "nothing"}`;
    },
  },
];

let failed = 0;
for (const c of CASES) {
  const data = (await readFile(c.file)).toString("base64");
  let scan: WarrantyScan | null = null;
  let result: string | null;
  try {
    scan = await readWarranty(c.mimeType, data);
    const problem = scanProblem(scan);
    result = c.check(scan, problem);
    if (problem) console.log(`   message shown: "${problem}"`);
  } catch (error) {
    result = `AI call failed: ${error instanceof Error ? error.message.slice(0, 200) : error}`;
  }
  console.log(`${result ? "FAIL" : "PASS"}  ${c.name}${result ? `\n      ${result}` : ""}`);
  if (result) failed++;
}
console.log(`\n${CASES.length - failed} of ${CASES.length} passed`);
process.exit(failed ? 1 : 0);

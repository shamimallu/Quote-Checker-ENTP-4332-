import { NextResponse } from "next/server";
import { claudeErrorMessage } from "@/lib/anthropic";
import { geminiErrorMessage, geminiLogReason, isGeminiSelected } from "@/lib/gemini";
import { readWarranty, scanProblem } from "@/lib/warranty-reader";
import { MAX_SCAN_FILE_BYTES, MAX_SCAN_FILE_LABEL, SCAN_FILE_TYPES } from "@/lib/warranty-types";

// Reads a warranty photo or PDF and returns the Warranty Vault form's fields.
// Only signed-in people can call it (src/proxy.ts). The file is read in memory and
// not saved anywhere by this route.
export async function POST(request: Request) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Could not read the upload." }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file was uploaded." }, { status: 400 });
  }
  const isHeic = file.type === "image/heic" || file.type === "image/heif";
  if (!SCAN_FILE_TYPES.includes(file.type) || (isHeic && !isGeminiSelected())) {
    return NextResponse.json(
      { error: "Please use a photo (JPEG, PNG or WEBP) or a PDF." },
      { status: 400 }
    );
  }
  if (file.size > MAX_SCAN_FILE_BYTES) {
    return NextResponse.json(
      {
        error: `That file is too large to read automatically (${MAX_SCAN_FILE_LABEL} max). You can still attach it below and type the details.`,
      },
      { status: 400 }
    );
  }

  const base64Data = Buffer.from(await file.arrayBuffer()).toString("base64");

  try {
    const scan = await readWarranty(file.type, base64Data);
    const problem = scanProblem(scan);
    if (problem) return NextResponse.json({ error: problem }, { status: 422 });
    return NextResponse.json(scan);
  } catch (error) {
    const fallback = "Something went wrong reading that file. Try again or type the details.";
    if (isGeminiSelected()) {
      console.error(`Gemini could not read a warranty (${geminiLogReason(error)}):`, error);
      return NextResponse.json({ error: geminiErrorMessage(error, fallback) }, { status: 502 });
    }
    console.error("Claude could not read a warranty:", error);
    return NextResponse.json({ error: claudeErrorMessage(error, fallback) }, { status: 502 });
  }
}

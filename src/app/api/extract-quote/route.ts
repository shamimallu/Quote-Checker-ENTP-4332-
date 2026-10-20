import { NextResponse } from "next/server";
import { getAnthropicClient } from "@/lib/anthropic";
import type { ExtractedQuote } from "@/lib/quote-types";

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10MB
const ACCEPTED_TYPES: Record<string, true> = {
  "application/pdf": true,
  "image/jpeg": true,
  "image/png": true,
  "image/webp": true,
};

const EXTRACT_TOOL = {
  name: "record_quote",
  description: "Record the structured contents of a contractor repair quote.",
  input_schema: {
    type: "object" as const,
    properties: {
      contractorName: {
        type: "string",
        description: "The contractor or company name on the quote. Use \"Unknown contractor\" if not stated.",
      },
      lineItems: {
        type: "array",
        items: {
          type: "object",
          properties: {
            description: { type: "string" },
            price: { type: "number" },
          },
          required: ["description", "price"],
        },
      },
      depositPercent: {
        type: ["number", "null"],
        description: "Deposit as a percent of total, if stated. Null if not stated or not a percent.",
      },
      depositAmount: {
        type: ["number", "null"],
        description: "Deposit as a flat dollar amount, if stated. Null if not stated.",
      },
      warrantyTerms: {
        type: ["string", "null"],
        description: "The warranty language from the quote, verbatim or closely paraphrased. Null if none mentioned.",
      },
    },
    required: ["contractorName", "lineItems", "depositPercent", "depositAmount", "warrantyTerms"],
  },
};

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
  if (!ACCEPTED_TYPES[file.type]) {
    return NextResponse.json(
      { error: "Please upload a PDF, JPEG, PNG, or WEBP file." },
      { status: 400 }
    );
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "File is too large (10MB max)." }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const base64Data = Buffer.from(bytes).toString("base64");

  const documentBlock =
    file.type === "application/pdf"
      ? {
          type: "document" as const,
          source: { type: "base64" as const, media_type: "application/pdf" as const, data: base64Data },
        }
      : {
          type: "image" as const,
          source: {
            type: "base64" as const,
            media_type: file.type as "image/jpeg" | "image/png" | "image/webp",
            data: base64Data,
          },
        };

  let client;
  try {
    client = getAnthropicClient();
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "AI is not configured." },
      { status: 500 }
    );
  }

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-5-5",
      max_tokens: 2048,
      tools: [EXTRACT_TOOL],
      tool_choice: { type: "tool", name: "record_quote" },
      messages: [
        {
          role: "user",
          content: [
            documentBlock,
            {
              type: "text",
              text: "This is a contractor's repair quote. Extract its contents using the record_quote tool.",
            },
          ],
        },
      ],
    });

    const toolUse = response.content.find((block) => block.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") {
      return NextResponse.json({ error: "Could not read that quote." }, { status: 502 });
    }

    const parsed = toolUse.input as Omit<ExtractedQuote, "id" | "fileName">;
    const quote: ExtractedQuote = {
      id: crypto.randomUUID(),
      fileName: file.name,
      ...parsed,
    };

    return NextResponse.json(quote);
  } catch {
    return NextResponse.json({ error: "Something went wrong reading that quote." }, { status: 502 });
  }
}

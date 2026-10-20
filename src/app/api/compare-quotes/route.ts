import { NextResponse } from "next/server";
import { getAnthropicClient } from "@/lib/anthropic";
import costReference from "@/lib/cost-reference.json";
import type { ComparisonResult, ExtractedQuote } from "@/lib/quote-types";

const COMPARE_TOOL = {
  name: "record_comparison",
  description: "Record the comparison of several contractor repair quotes for the same job.",
  input_schema: {
    type: "object" as const,
    properties: {
      missingItems: {
        type: "array",
        description: "Line items that appear in at least one quote but are missing from at least one other.",
        items: {
          type: "object",
          properties: {
            description: { type: "string", description: "Plain description of the work item." },
            presentIn: { type: "array", items: { type: "string" }, description: "Contractor names that included this item." },
            missingFrom: { type: "array", items: { type: "string" }, description: "Contractor names that did not include this item." },
          },
          required: ["description", "presentIn", "missingFrom"],
        },
      },
      overcharges: {
        type: "array",
        description: "Line items priced notably higher than the other quotes, or than the reference price ranges.",
        items: {
          type: "object",
          properties: {
            contractorName: { type: "string" },
            description: { type: "string" },
            price: { type: "number" },
            reason: { type: "string", description: "One sentence, plain English, explaining why this looks high." },
          },
          required: ["contractorName", "description", "price", "reason"],
        },
      },
      termNotes: {
        type: "array",
        description: "A plain-English note per quote about its deposit and warranty terms, flagging anything risky (e.g. a deposit over 30%, no warranty mentioned).",
        items: {
          type: "object",
          properties: {
            contractorName: { type: "string" },
            note: { type: "string" },
          },
          required: ["contractorName", "note"],
        },
      },
      summary: {
        type: "string",
        description: "A short (2-3 sentence) plain-English summary of how these quotes compare overall.",
      },
    },
    required: ["missingItems", "overcharges", "termNotes", "summary"],
  },
};

export async function POST(request: Request) {
  let body: { quotes?: ExtractedQuote[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const quotes = body.quotes;
  if (!Array.isArray(quotes) || quotes.length < 2) {
    return NextResponse.json({ error: "Need at least two quotes to compare." }, { status: 400 });
  }

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
      tools: [COMPARE_TOOL],
      tool_choice: { type: "tool", name: "record_comparison" },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text:
                "Compare these contractor quotes for the same home repair job. Flag line items missing from one quote but present in others, and flag prices that look too high either compared to the other quotes here or compared to the reference price ranges below. Use record_comparison to report your findings.\n\n" +
                `Quotes:\n${JSON.stringify(quotes, null, 2)}\n\n` +
                `Reference price ranges (for common repair items, not specific to these quotes):\n${JSON.stringify(costReference.items, null, 2)}`,
            },
          ],
        },
      ],
    });

    const toolUse = response.content.find((block) => block.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") {
      return NextResponse.json({ error: "Could not compare those quotes." }, { status: 502 });
    }

    const result = toolUse.input as ComparisonResult;
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Something went wrong comparing those quotes." }, { status: 502 });
  }
}

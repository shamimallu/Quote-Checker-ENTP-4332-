import { GoogleGenAI, type Part } from "@google/genai";

// Set GEMINI_MODEL in .env.local to use a different model.
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash";

// Gemini is opt-in: set AI_PROVIDER=gemini in .env.local. Otherwise the
// Quote Checker keeps using Claude.
export function isGeminiSelected() {
  return process.env.AI_PROVIDER === "gemini";
}

// Server-only: do not import this file from a "use client" component.
export function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not set. Add it to .env.local and restart the dev server."
    );
  }
  return new GoogleGenAI({ apiKey });
}

// Asks Gemini for JSON shaped like `schema`. Returns null if it gave no answer.
export async function generateGeminiJson(
  client: GoogleGenAI,
  parts: Part[],
  schema: object
): Promise<unknown> {
  const response = await client.models.generateContent({
    model: GEMINI_MODEL,
    contents: [{ role: "user", parts }],
    config: {
      responseMimeType: "application/json",
      responseJsonSchema: schema,
    },
  });
  return response.text ? JSON.parse(response.text) : null;
}

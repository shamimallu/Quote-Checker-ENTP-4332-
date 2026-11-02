import { GoogleGenAI, type Part } from "@google/genai";

// Set GEMINI_MODEL in .env.local to use a different model.
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash";

// Gemini is often briefly overloaded (503), so try again before giving up.
const RETRY_WHEN_OVERLOADED = { attempts: 4, httpStatusCodes: [503] };

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
      // Give up rather than leave the person waiting if Gemini is overloaded.
      httpOptions: { timeout: 120_000, retryOptions: RETRY_WHEN_OVERLOADED },
    },
  });
  return response.text ? JSON.parse(response.text) : null;
}

// What to tell the person when a Gemini call fails. The free tier allows only a
// few requests per minute, and that limit is worth explaining.
export function geminiErrorMessage(error: unknown, fallback: string) {
  return (error as { status?: number } | null)?.status === 429
    ? "Gemini's limit for this minute has been reached. Wait a minute and try again."
    : fallback;
}

export type GeminiChatMessage = {
  role: "user" | "model";
  text: string;
};

// Asks Gemini for a plain text reply to a conversation. Returns null if it gave no answer.
export async function generateGeminiReply(
  client: GoogleGenAI,
  systemInstruction: string,
  messages: GeminiChatMessage[]
): Promise<string | null> {
  const response = await client.models.generateContent({
    model: GEMINI_MODEL,
    contents: messages.map((m) => ({ role: m.role, parts: [{ text: m.text }] })),
    config: {
      systemInstruction,
      // Give up rather than leave the person waiting if Gemini is overloaded.
      httpOptions: { timeout: 60_000, retryOptions: RETRY_WHEN_OVERLOADED },
    },
  });
  return response.text ?? null;
}

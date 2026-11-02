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

// Why a Gemini call failed, worked out from the error Google sends back.
export type GeminiProblem = "minute-limit" | "daily-limit" | "no-free-quota" | "busy" | "other";

export function getGeminiProblem(error: unknown): GeminiProblem {
  const status = (error as { status?: number } | null)?.status;
  // The SDK puts Google's whole JSON error body in the message, including which quota ran out.
  const details = error instanceof Error ? error.message : String(error);
  if (status === 429) {
    if (/limit:\s*0\b|"quotaValue":\s*"0"/.test(details)) return "no-free-quota";
    if (/PerDay/i.test(details)) return "daily-limit";
    return "minute-limit";
  }
  if (status === 500 || status === 503 || status === 504 || /timed? ?out|abort/i.test(details)) return "busy";
  return "other";
}

// What to tell the person when a Gemini call fails.
export function geminiErrorMessage(error: unknown, fallback: string) {
  switch (getGeminiProblem(error)) {
    case "minute-limit":
      return "Gemini's limit for this minute has been reached. Wait a minute and try again.";
    case "daily-limit":
      // Google resets daily quotas at midnight Pacific, which is always 2 AM Central (our team is in Texas).
      return "Gemini's free daily limit has been used up. It resets at 2 AM Central time, so try again after that.";
    case "no-free-quota":
      return "Gemini isn't available on this app's free plan right now. Please try again later.";
    case "busy":
      return "Gemini is busy right now. Please try again in a minute.";
    default:
      return fallback;
  }
}

// A one-line reason for the server log, so whoever runs the app can see what went wrong.
export function geminiLogReason(error: unknown) {
  const problem = getGeminiProblem(error);
  return problem === "no-free-quota"
    ? `no free-tier quota for model ${GEMINI_MODEL} on this GEMINI_API_KEY (change GEMINI_MODEL or enable billing)`
    : problem;
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

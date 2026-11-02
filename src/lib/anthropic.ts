import Anthropic from "@anthropic-ai/sdk";

// Server-only: do not import this file from a "use client" component.
export function getAnthropicClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Add it to .env.local and restart the dev server."
    );
  }
  return new Anthropic({ apiKey });
}

// What to tell the person when a Claude call fails. Setup problems (a wrong key) stay generic
// for them and are logged for whoever runs the app.
export function claudeErrorMessage(error: unknown, fallback: string) {
  const status = (error as { status?: number } | null)?.status;
  const details = error instanceof Error ? error.message : "";
  if (status === 429) return "Claude's limit has been reached for now. Wait a minute and try again.";
  if (status === 529 || status === 503) return "Claude is busy right now. Please try again in a minute.";
  if (/credit balance is too low/i.test(details)) {
    return "The app's Claude account is out of credit. Whoever set up the app needs to add credit.";
  }
  if (status === 401 || status === 403) return "The AI assistant isn't available right now. Please try again later.";
  return fallback;
}

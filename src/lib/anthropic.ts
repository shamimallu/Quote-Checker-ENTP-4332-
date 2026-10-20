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

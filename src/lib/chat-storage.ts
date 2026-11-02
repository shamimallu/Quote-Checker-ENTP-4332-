import { createClient } from "@/lib/supabase/client";
import { currentUserId } from "@/lib/supabase/current-user";
import type { GeminiChatMessage } from "@/lib/gemini";

// Client-only. Ask Gemini chats are saved in the `muse_conversations` and `muse_messages`
// tables. Row level security keeps every conversation private to the person who started it.

type MessageRow = { role: "user" | "assistant"; content: string };

// Gemini calls its own turns "model"; the database calls them "assistant".
const toRole = (role: GeminiChatMessage["role"]) => (role === "model" ? "assistant" : "user");
const fromRole = (role: MessageRow["role"]) => (role === "assistant" ? "model" : "user");

export type SavedChat = { id: string; messages: GeminiChatMessage[] };

// The conversation started most recently, or null if there isn't one yet.
export async function loadLatestChat(): Promise<SavedChat | null> {
  const supabase = createClient();
  const { data: conversation, error } = await supabase
    .from("muse_conversations")
    .select("id")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!conversation) return null;

  const { data: rows, error: messagesError } = await supabase
    .from("muse_messages")
    .select("role, content")
    .eq("conversation_id", conversation.id)
    .order("created_at", { ascending: true });
  if (messagesError) throw messagesError;
  return {
    id: conversation.id,
    messages: (rows as MessageRow[]).map((r) => ({ role: fromRole(r.role), text: r.content })),
  };
}

// Starts a conversation, named after its first question.
export async function createChat(firstQuestion: string): Promise<string> {
  const userId = await currentUserId();
  const title = firstQuestion.length > 60 ? `${firstQuestion.slice(0, 57)}…` : firstQuestion;
  const { data, error } = await createClient()
    .from("muse_conversations")
    .insert({ owner: userId, title })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

// Saves a question and Gemini's answer together, so a failed request never leaves a
// question without its answer. Explicit times keep the two in order.
export async function saveExchange(chatId: string, question: string, answer: string): Promise<void> {
  const now = Date.now();
  const { error } = await createClient()
    .from("muse_messages")
    .insert([
      { conversation_id: chatId, role: toRole("user"), content: question, created_at: new Date(now).toISOString() },
      { conversation_id: chatId, role: toRole("model"), content: answer, created_at: new Date(now + 1).toISOString() },
    ]);
  if (error) throw error;
}

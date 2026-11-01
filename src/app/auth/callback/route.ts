import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// The link in the confirmation email, and "Sign in with Google", land here with a one-time code.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  // Google sends the person back with ?error=... if they cancel or something goes wrong there.
  if (searchParams.get("error")) return NextResponse.redirect(`${origin}/login?error=google`);
  const code = searchParams.get("code");
  const next = searchParams.get("next");
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${safeNext}`);
  }
  return NextResponse.redirect(`${origin}/login?error=confirm`);
}

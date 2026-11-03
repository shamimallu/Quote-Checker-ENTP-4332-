import { createServerClient } from "@supabase/ssr";
import { isAuthRetryableFetchError } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseEnv } from "@/lib/supabase/env";

// Pages anyone can open without signing in.
const PUBLIC_PATHS = ["/", "/login", "/auth", "/subscribe", "/api/stripe/checkout", "/api/stripe/status", "/api/stripe/portal"];

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || (p !== "/" && pathname.startsWith(`${p}/`)));
}

// How long to wait for Supabase before giving up. Generous on purpose: an hourly login
// refresh takes two round trips, and giving up partway through one can lose the new login.
const AUTH_TIMEOUT_MS = 6000;

// The session cookie @supabase/ssr writes, possibly split into chunks (.0, .1, …).
const SESSION_COOKIE = /^sb-.+-auth-token(\.\d+)?$/;

type AuthCheck = "signed-in" | "signed-out" | "unknown";

// Refreshes the login session cookie and sends signed-out visitors to /login.
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { url, key } = getSupabaseEnv();

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // No session cookie means signed out, with no need to ask Supabase.
  // Otherwise getUser() checks the session with Supabase (unlike getSession(), which trusts
  // the cookie). A slow or unreachable Supabase is "unknown", not "signed out": treating it
  // as signed out sent people who were logged in back to /login.
  const hasSessionCookie = request.cookies.getAll().some((c) => SESSION_COOKIE.test(c.name));
  let timer: ReturnType<typeof setTimeout> | undefined;
  const auth: AuthCheck = !hasSessionCookie
    ? "signed-out"
    : await Promise.race([
        supabase.auth
          .getUser()
          .then(({ data, error }): AuthCheck => {
            if (data.user) return "signed-in";
            return error && isAuthRetryableFetchError(error) ? "unknown" : "signed-out";
          })
          .catch((): AuthCheck => "unknown"),
        new Promise<AuthCheck>((resolve) => {
          timer = setTimeout(() => resolve("unknown"), AUTH_TIMEOUT_MS);
        }),
      ]).finally(() => clearTimeout(timer));

  const { pathname } = request.nextUrl;
  if (auth !== "signed-in" && !isPublic(pathname)) {
    if (pathname.startsWith("/api/")) {
      // API routes have no sign-in check of their own, so never let an unchecked request through.
      return auth === "unknown"
        ? NextResponse.json(
            { error: "Couldn't check your sign-in just now. Please try again." },
            { status: 503 }
          )
        : NextResponse.json({ error: "Please sign in first." }, { status: 401 });
    }
    if (auth === "unknown") {
      // Let the page load. Its data still needs a valid login (row level security), and the
      // browser's own Supabase client checks the session again.
      console.warn(`Sign-in check timed out or failed for ${pathname}; loading the page anyway.`);
      return response;
    }
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

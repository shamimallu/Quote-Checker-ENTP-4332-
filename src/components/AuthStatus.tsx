"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Small sign in / sign out control for the home page.
export default function AuthStatus() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);

  async function signOut() {
    await createClient().auth.signOut();
    setEmail(null);
    router.refresh();
  }

  const pill =
    "rounded-full border border-walnut px-4 py-1.5 text-sm text-beige transition-colors hover:border-caramel hover:text-caramel";

  return (
    <div className="absolute top-6 right-6 z-10 flex items-center gap-3">
      {email === undefined ? null : email ? (
        <>
          <span className="hidden text-sm text-sand sm:inline">{email}</span>
          <button type="button" onClick={signOut} className={pill}>
            Sign out
          </button>
        </>
      ) : (
        <Link href="/login" className={pill}>
          Sign in
        </Link>
      )}
    </div>
  );
}

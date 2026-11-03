"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePremium } from "@/lib/use-premium";

// Free users can look around, but pressing or typing in anything sends them to the subscription page.
export default function PremiumGate({ feature, children }: { feature: string; children: React.ReactNode }) {
  const router = useRouter();
  const premium = usePremium();

  if (premium !== false) return <>{children}</>;

  function sendToSubscribe(event: React.SyntheticEvent) {
    event.preventDefault();
    event.stopPropagation();
    router.push("/subscribe");
  }

  return (
    <>
      <div className="border-b border-caramel/40 bg-cocoa/30 px-6 py-3 text-sm text-beige">
        {feature} is part of homi Premium.{" "}
        <Link href="/subscribe" className="text-caramel underline underline-offset-2">
          See plans
        </Link>
      </div>
      <div
        className="flex min-w-0 flex-1 flex-col"
        onClickCapture={sendToSubscribe}
        onSubmitCapture={sendToSubscribe}
        onKeyDownCapture={(event) => {
          if (event.key !== "Tab") sendToSubscribe(event);
        }}
        onChangeCapture={sendToSubscribe}
      >
        {children}
      </div>
    </>
  );
}

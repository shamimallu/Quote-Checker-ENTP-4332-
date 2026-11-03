import { Suspense } from "react";
import SubscribeApp from "@/components/SubscribeApp";

async function SubscribeContent(props: PageProps<"/subscribe">) {
  const { status, session_id } = await props.searchParams;
  return (
    <SubscribeApp
      status={typeof status === "string" ? status : undefined}
      sessionId={typeof session_id === "string" ? session_id : undefined}
    />
  );
}

export default function Subscribe(props: PageProps<"/subscribe">) {
  return (
    <Suspense>
      <SubscribeContent {...props} />
    </Suspense>
  );
}

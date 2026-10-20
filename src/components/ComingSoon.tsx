import Link from "next/link";
import SectionIcon from "@/components/SectionIcon";
import { sections } from "@/lib/sections";

// Placeholder for a section that hasn't been built yet.
export default function ComingSoon({ href }: { href: string }) {
  const section = sections.find((s) => s.href === href)!;

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-24 text-center">
      <SectionIcon name={section.icon} className="h-10 w-10 text-caramel" />
      <h1 className="font-serif text-4xl text-beige">{section.title}</h1>
      <p className="text-sand">This section is coming soon.</p>
      <Link
        href="/"
        className="rounded-full border border-walnut px-5 py-2 text-sm text-beige transition-colors hover:border-caramel hover:text-caramel"
      >
        ← Back to home
      </Link>
    </main>
  );
}

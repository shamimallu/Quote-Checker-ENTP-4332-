import Link from "next/link";
import AuthStatus from "@/components/AuthStatus";
import MuseButton from "@/components/MuseButton";
import SectionIcon from "@/components/SectionIcon";
import { sections } from "@/lib/sections";

export default function Home() {
  return (
    <main className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-6 py-24">
      {/* soft warm glow behind the wordmark */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-1/2 h-[28rem] w-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cocoa/25 blur-3xl"
      />

      <div className="relative flex flex-col items-center text-center">
        <h1 className="font-serif text-6xl font-medium tracking-tight text-beige sm:text-7xl">
          homi
        </h1>
        <div className="mt-5 h-px w-16 bg-caramel/60" />
        <p className="mt-5 text-base text-sand sm:text-lg">
          Your home, organized.
        </p>

        <nav
          aria-label="Sections"
          className="mt-12 grid w-full max-w-sm grid-cols-2 gap-3 sm:flex sm:max-w-none sm:flex-wrap sm:justify-center"
        >
          {sections.map((section) => (
            <Link
              key={section.href}
              href={section.href}
              className="group flex items-center justify-center gap-2 rounded-full border border-walnut bg-bark px-4 py-2.5 text-sm text-beige transition-colors hover:border-caramel hover:bg-walnut focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-caramel"
            >
              <SectionIcon
                name={section.icon}
                className="h-4 w-4 shrink-0 text-caramel"
              />
              {section.title}
            </Link>
          ))}
        </nav>
      </div>

      <AuthStatus />
      <MuseButton />
    </main>
  );
}

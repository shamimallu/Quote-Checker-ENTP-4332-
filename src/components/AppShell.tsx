"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import SectionIcon from "@/components/SectionIcon";
import { sections } from "@/lib/sections";

const homeIcon = (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.6}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className="h-5 w-5 shrink-0"
  >
    <path d="M3 11.5 12 4l9 7.5" />
    <path d="M5 10v10h14V10" />
  </svg>
);

const jobsIcon = (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.6}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className="h-5 w-5 shrink-0"
  >
    <path d="M14.5 6.5a4 4 0 0 0-5 5L4 17l3 3 5.5-5.5a4 4 0 0 0 5-5l-2.5 2.5-2-.5-.5-2z" />
  </svg>
);

const links = [
  { title: "Home", href: "/", icon: homeIcon },
  { title: "Jobs", href: "/jobs", icon: jobsIcon },
  ...sections.map((s) => ({
    title: s.title,
    href: s.href,
    icon: <SectionIcon name={s.icon} className="h-5 w-5 shrink-0" />,
  })),
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

// Sidebar on wide screens, a menu button on phones. Hidden on the sign-in pages.
export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  if (pathname === "/login" || pathname.startsWith("/auth")) {
    return <>{children}</>;
  }

  const sidebar = (
    <div className="flex h-full flex-col gap-8 p-5">
      <Link
        href="/"
        onClick={() => setOpen(false)}
        className="font-serif text-4xl font-medium tracking-tight text-beige"
      >
        homi
      </Link>
      <nav aria-label="Main" className="flex flex-col gap-1">
        {links.map((link) => {
          const active = isActive(pathname, link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                active
                  ? "bg-cocoa/40 font-medium text-caramel"
                  : "text-sand hover:bg-cocoa/20 hover:text-beige"
              }`}
            >
              {link.icon}
              {link.title}
            </Link>
          );
        })}
      </nav>
    </div>
  );

  return (
    <div className="flex min-h-full flex-1">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 border-r border-walnut bg-bark md:block">
        {sidebar}
      </aside>

      <div className="fixed inset-x-0 top-0 z-40 flex items-center justify-between border-b border-walnut bg-bark px-4 py-3 md:hidden">
        <Link href="/" className="font-serif text-2xl text-beige">
          homi
        </Link>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="rounded-full border border-walnut px-3 py-1.5 text-sm text-beige"
        >
          {open ? "Close" : "Menu"}
        </button>
      </div>
      {open && (
        <div className="fixed inset-0 z-30 md:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/50"
          />
          <aside className="absolute inset-y-0 left-0 w-64 border-r border-walnut bg-bark pt-14">
            {sidebar}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col pt-14 md:pt-0">{children}</div>
    </div>
  );
}

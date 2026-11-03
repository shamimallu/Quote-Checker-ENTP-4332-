import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCategory, jobCategories } from "@/lib/categories";

export function generateStaticParams() {
  return jobCategories.map((c) => ({ slug: c.slug }));
}

const tools = [
  { label: "Check a quote", href: "/quote-checker", note: "Compare bids before you agree to the work." },
  { label: "Warranties", href: "/warranty-vault", note: "See what is covered and what is ending soon." },
  { label: "Job files", href: "/job-files", note: "Keep the paperwork for this job together." },
  { label: "Proof log", href: "/proof-log", note: "Keep a record of the work as it happens." },
];

export default async function JobCategoryPage(props: PageProps<"/jobs/[slug]">) {
  const { slug } = await props.params;
  const category = getCategory(slug);
  if (!category) notFound();

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 py-12">
      <Link href="/jobs" className="self-start text-sm text-sand hover:text-caramel">
        ← All jobs
      </Link>

      <div className="mt-4 overflow-hidden rounded-3xl border border-walnut bg-bark shadow-sm shadow-black/20 sm:grid sm:grid-cols-2">
        <div className="relative aspect-[4/3] sm:aspect-auto sm:min-h-64">
          {category.photo ? (
            <Image
              src={category.photo}
              alt={category.alt}
              fill
              priority
              sizes="(min-width: 640px) 50vw, 100vw"
              className="object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-cocoa/30" />
          )}
        </div>
        <div className="flex flex-col justify-center gap-3 p-8">
          <h1 className="font-serif text-4xl text-beige">{category.title}</h1>
          <p className="text-sand">{category.blurb}</p>
        </div>
      </div>

      <h2 className="mt-10 font-serif text-xl text-beige">Tools for this job</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {tools.map((tool) => (
          <Link
            key={tool.href}
            href={tool.href}
            className="rounded-2xl border border-walnut bg-bark p-5 transition-all hover:-translate-y-0.5 hover:border-caramel hover:shadow-md"
          >
            <span className="font-serif text-lg text-beige">{tool.label}</span>
            <span className="mt-1 block text-sm text-sand">{tool.note}</span>
          </Link>
        ))}
      </div>
    </main>
  );
}

import Image from "next/image";
import Link from "next/link";
import type { JobCategory } from "@/lib/categories";

export default function CategoryCard({ category }: { category: JobCategory }) {
  return (
    <Link
      href={`/jobs/${category.slug}`}
      className="group overflow-hidden rounded-2xl border border-walnut bg-bark shadow-sm shadow-black/10 transition-all hover:-translate-y-0.5 hover:border-caramel hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-caramel"
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        {category.photo ? (
          <Image
            src={category.photo}
            alt={category.alt}
            fill
            sizes="(min-width: 1024px) 220px, (min-width: 640px) 30vw, 45vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-cocoa/30 text-caramel">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.4}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="h-12 w-12"
            >
              <path d="M14.5 6.5a4 4 0 0 0-5 5L4 17l3 3 5.5-5.5a4 4 0 0 0 5-5l-2.5 2.5-2-.5-.5-2z" />
            </svg>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <span className="font-serif text-lg text-beige">{category.title}</span>
        <span aria-hidden="true" className="text-sand transition-colors group-hover:text-caramel">
          →
        </span>
      </div>
    </Link>
  );
}

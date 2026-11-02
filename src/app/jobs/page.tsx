import CategoryCard from "@/components/CategoryCard";
import { jobCategories } from "@/lib/categories";

export default function Jobs() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 py-12">
      <h1 className="font-serif text-3xl text-beige">Jobs</h1>
      <p className="mt-2 text-sand">Pick a part of your home to see its quotes, warranties and records.</p>
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {jobCategories.map((category) => (
          <CategoryCard key={category.slug} category={category} />
        ))}
      </div>
    </main>
  );
}

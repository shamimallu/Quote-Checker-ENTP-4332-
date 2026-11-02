// The kinds of jobs a homeowner tracks. Photos live in public/photos (free Pexels photos).
export type JobCategory = {
  slug: string;
  title: string;
  photo: string | null; // null shows an icon instead of a photo
  alt: string;
  blurb: string;
};

export const jobCategories: JobCategory[] = [
  {
    slug: "hvac",
    title: "HVAC",
    photo: "/photos/hvac.jpg",
    alt: "Outdoor air conditioning unit mounted on a house wall",
    blurb: "Heating, cooling and ventilation: repairs, replacements and tune-ups.",
  },
  {
    slug: "pool",
    title: "Pool",
    photo: "/photos/pool.jpg",
    alt: "Modern house with a backyard swimming pool",
    blurb: "Pool equipment, resurfacing, decking and seasonal service.",
  },
  {
    slug: "roof",
    title: "Roof",
    photo: "/photos/roof.jpg",
    alt: "Roofer installing shingles on a house",
    blurb: "Leaks, shingles, flashing and full replacements.",
  },
  {
    slug: "plumbing",
    title: "Plumbing",
    photo: "/photos/plumbing.jpg",
    alt: "Kitchen sink with a stainless steel faucet",
    blurb: "Pipes, fixtures, water heaters and drains.",
  },
  {
    slug: "electrical",
    title: "Electrical",
    photo: "/photos/electrical.jpg",
    alt: "Electrical panel with wired relays",
    blurb: "Panels, wiring, outlets and lighting.",
  },
  {
    slug: "appliances",
    title: "Appliances",
    photo: "/photos/appliances.jpg",
    alt: "Kitchen with a stainless steel refrigerator and range",
    blurb: "Fridges, ovens, washers and the warranties that go with them.",
  },
  {
    slug: "other",
    title: "Other",
    photo: null,
    alt: "",
    blurb: "Anything else around the house that needs a repair or a quote.",
  },
];

export function getCategory(slug: string) {
  return jobCategories.find((c) => c.slug === slug);
}

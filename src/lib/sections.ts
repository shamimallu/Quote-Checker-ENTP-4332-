export type SectionIcon = "quote" | "folder" | "shield" | "camera";

export type Section = {
  title: string;
  href: string;
  icon: SectionIcon;
};

// The app's main sections, in the order they appear on the home page.
export const sections: Section[] = [
  { title: "Quote Checker", href: "/quote-checker", icon: "quote" },
  { title: "Job Files", href: "/job-files", icon: "folder" },
  { title: "Warranty Vault", href: "/warranty-vault", icon: "shield" },
  { title: "Proof Log", href: "/proof-log", icon: "camera" },
];

import type { Metadata } from "next";
import { DM_Serif_Display, Gabarito } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import AppShell from "@/components/AppShell";
import "./globals.css";

const gabarito = Gabarito({
  variable: "--font-gabarito",
  subsets: ["latin"],
});

const dmSerifDisplay = DM_Serif_Display({
  variable: "--font-dm-serif-display",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "homi",
  description: "Your home, organized.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${gabarito.variable} ${dmSerifDisplay.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <AppShell>{children}</AppShell>
        {/* Vercel Web Analytics: counts page views on the deployed site (nothing in local dev). */}
        <Analytics />
      </body>
    </html>
  );
}

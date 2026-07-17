import type { Metadata } from "next";
import SavedList from "@/components/radar/SavedList";

export const metadata: Metadata = {
  title: "Saved",
  description:
    "The stocks, headlines, and items you've bookmarked across Bazaar Brief — stored privately in your browser.",
};

export default function SavedPage() {
  return (
    <div className="flex flex-col gap-8">
      <section className="pt-6">
        <h1 className="text-4xl font-bold tracking-tight">Saved</h1>
        <p className="mt-3 max-w-2xl text-lg text-zinc-600 dark:text-zinc-400">
          Everything you&apos;ve bookmarked across the markets and news pages,
          in one place. Private to this browser — nothing leaves your device.
        </p>
      </section>
      <SavedList />
    </div>
  );
}

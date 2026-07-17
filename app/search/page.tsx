import type { Metadata } from "next";
import SearchBox from "@/components/SearchBox";
import { buildSearchIndex } from "@/lib/search";

export const metadata: Metadata = {
  title: "Search",
  description:
    "Search everything on Bazaar Brief — past issues, glossary terms, covered stocks, and Academy questions.",
};

export default function SearchPage() {
  const index = buildSearchIndex();
  return (
    <div className="flex flex-col gap-8">
      <section className="pt-6">
        <h1 className="text-4xl font-bold tracking-tight">Search</h1>
        <p className="mt-3 max-w-2xl text-lg text-zinc-600 dark:text-zinc-400">
          One box across everything on the site — past issues, glossary
          definitions, covered stocks, and Academy questions. Instant, as you type.
        </p>
      </section>
      <SearchBox index={index} />
    </div>
  );
}

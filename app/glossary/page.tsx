import type { Metadata } from "next";
import GlossaryList from "@/components/GlossaryList";
import { glossary } from "@/lib/glossary";

export const metadata: Metadata = {
  title: "Markets Glossary",
  description:
    "Plain-English definitions of the Indian-market terms investors meet most often. No jargon required to understand the jargon.",
};

export default function GlossaryPage() {
  return (
    <div className="flex flex-col gap-8">
      <section className="pt-6">
        <h1 className="text-4xl font-bold tracking-tight">Markets Glossary</h1>
        <p className="mt-3 max-w-2xl text-lg text-zinc-600 dark:text-zinc-400">
          Every term you&apos;ll meet in market reports, company filings, and investor conversations —
          defined in plain English, with the practical &ldquo;so what&rdquo;
          included.
        </p>
      </section>
      <GlossaryList terms={glossary} />
    </div>
  );
}

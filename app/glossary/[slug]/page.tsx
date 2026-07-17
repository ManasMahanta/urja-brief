import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getGlossaryTerm,
  glossary,
  relatedTerms,
  slugifyTerm,
} from "@/lib/glossary";
import { site } from "@/lib/site";
import InlineCTA from "@/components/InlineCTA";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return glossary.map((t) => ({ slug: slugifyTerm(t.term) }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const term = getGlossaryTerm(slug);
  if (!term) return {};
  const title = `${term.term} — Markets Glossary`;
  const description = term.def.slice(0, 155);
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      url: `${site.url}/glossary/${slug}`,
    },
    alternates: { canonical: `${site.url}/glossary/${slug}` },
  };
}

export default async function GlossaryTermPage({ params }: Props) {
  const { slug } = await params;
  const term = getGlossaryTerm(slug);
  if (!term) notFound();

  const related = relatedTerms(term);

  return (
    <article className="flex flex-col gap-6">
      <nav className="pt-6 text-sm text-zinc-500 dark:text-zinc-400">
        <Link href="/glossary" className="hover:text-sky-600 dark:hover:text-sky-400">
          Markets Glossary
        </Link>{" "}
        / <span className="text-zinc-700 dark:text-zinc-300">{term.term}</span>
      </nav>

      <header>
        <h1 className="text-4xl font-bold tracking-tight">{term.term}</h1>
        <p className="mt-4 text-lg leading-relaxed text-zinc-700 dark:text-zinc-300">
          {term.def}
        </p>
      </header>

      {related.length > 0 && (
        <section className="rounded-xl border border-zinc-200 bg-white/65 p-5 dark:border-white/10 dark:bg-white/[0.035]">
          <h2 className="text-sm font-semibold">Related terms</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {related.map((r) => (
              <Link
                key={r.term}
                href={`/glossary/${slugifyTerm(r.term)}`}
                className="rounded-full border border-zinc-200 px-3 py-1 text-sm text-zinc-600 transition hover:border-sky-400 hover:text-sky-600 dark:border-white/12 dark:text-zinc-400 dark:hover:border-sky-500 dark:hover:text-sky-400"
              >
                {r.term}
              </Link>
            ))}
          </div>
        </section>
      )}

      <InlineCTA heading="Understand the market, one term at a time" />

      <Link
        href="/glossary"
        className="text-sm text-sky-600 hover:underline dark:text-sky-400"
      >
        ← Back to the full glossary
      </Link>
    </article>
  );
}

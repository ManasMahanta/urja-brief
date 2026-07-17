import type { Metadata } from "next";
import AnalystChat from "@/components/academy/AnalystChat";
import Disclaimer from "@/components/Disclaimer";
import { learnLevels } from "@/lib/academy";

export const metadata: Metadata = {
  title: "Academy",
  description:
    "Learn to invest in Indian stocks by level — beginner to advanced — with topics to master, self-check questions, and an analyst that answers your questions. Educational only, not investment advice.",
};

export default function AcademyPage() {
  return (
    <div className="flex flex-col gap-12">
      <section className="pt-6">
        <h1 className="text-4xl font-bold tracking-tight">Academy</h1>
        <p className="mt-3 max-w-2xl text-lg text-zinc-600 dark:text-zinc-400">
          Learn the market the sane way: get the fundamentals and the risk
          mindset right before the stock picks. Pick your level, and ask the
          analyst anything.
        </p>
      </section>

      <AnalystChat />

      <section className="flex flex-col gap-8">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Learn by level</h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Three tracks, each with what to focus on, the topics to master, and
            questions to test yourself.
          </p>
        </div>

        {learnLevels.map((level) => (
          <section
            key={level.id}
            id={level.id}
            className="scroll-mt-24 rounded-2xl border border-zinc-200 bg-white/65 p-6 dark:border-white/10 dark:bg-white/[0.035]"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-xl font-bold tracking-tight">{level.level}</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">{level.who}</p>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
              {level.summary}
            </p>
            <p className="mt-3 rounded-lg border border-sky-200 bg-sky-50/60 px-3 py-2 text-sm text-sky-900 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-100">
              <strong>Focus:</strong> {level.focus}
            </p>

            <div className="mt-5 grid gap-6 sm:grid-cols-2">
              <div>
                <h4 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Topics to master
                </h4>
                <ul className="mt-2 space-y-1.5 text-sm text-zinc-700 dark:text-zinc-300">
                  {level.topics.map((t) => (
                    <li key={t} className="flex gap-2">
                      <span className="text-sky-500" aria-hidden="true">
                        •
                      </span>
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Self-check
                </h4>
                <ul className="mt-2 space-y-1.5 text-sm text-zinc-700 dark:text-zinc-300">
                  {level.questions.map((q) => (
                    <li key={q} className="flex gap-2">
                      <span className="text-amber-500" aria-hidden="true">
                        ?
                      </span>
                      {q}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        ))}
      </section>

      <Disclaimer />
    </div>
  );
}

// The narrative spine. Every section is introduced the same way and answers
// the same four questions, so the whole page reads as one briefing.

import type { ReactNode } from "react";
import { Reveal } from "@/components/cinematic/Motion";
import { Kicker } from "@/components/intel/ui";

export type Answers = {
  happened?: string;
  why?: string;
  care?: string;
  action?: string;
};

const Q: { key: keyof Answers; label: string; color: string }[] = [
  { key: "happened", label: "What happened", color: "text-sky-300" },
  { key: "why", label: "Why it happened", color: "text-violet-300" },
  { key: "care", label: "Why it matters", color: "text-amber-300" },
  { key: "action", label: "What to do", color: "text-emerald-300" },
];

export function AnswerStrip({ answers }: { answers: Answers }) {
  const present = Q.filter((q) => answers[q.key]);
  if (!present.length) return null;
  return (
    <div className="mt-6 grid gap-px overflow-hidden rounded-xl border border-white/10 bg-white/5 sm:grid-cols-2 lg:grid-cols-4">
      {present.map((q) => (
        <div key={q.key} className="bg-[#070c16]/80 p-4">
          <p className={`font-mono text-[0.6rem] font-semibold uppercase tracking-[0.14em] ${q.color}`}>
            {q.label}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-text-dim">{answers[q.key]}</p>
        </div>
      ))}
    </div>
  );
}

export default function SectionShell({
  id,
  index,
  kicker,
  title,
  standfirst,
  aside,
  answers,
  children,
}: {
  id: string;
  index: string;
  kicker: string;
  title: ReactNode;
  standfirst: string;
  aside?: ReactNode;
  answers?: Answers;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 py-16 sm:py-24">
      <Reveal>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3">
              <span className="tabular font-mono text-sm font-semibold text-text-mute">{index}</span>
              <Kicker>{kicker}</Kicker>
            </div>
            <h2 className="mt-4 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              {title}
            </h2>
            <p className="mt-3 text-[0.95rem] leading-relaxed text-text-dim">{standfirst}</p>
          </div>
          {aside && <div className="shrink-0">{aside}</div>}
        </div>
        {answers && <AnswerStrip answers={answers} />}
      </Reveal>
      <div className="mt-8">{children}</div>
    </section>
  );
}

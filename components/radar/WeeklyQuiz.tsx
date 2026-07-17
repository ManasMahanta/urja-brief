"use client";

import { useState } from "react";
import type { QuizQuestion } from "@/lib/weekly-quiz";

export default function WeeklyQuiz({ questions }: { questions: QuizQuestion[] }) {
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  const q = questions[idx];

  const choose = (i: number) => {
    if (picked !== null) return;
    setPicked(i);
    if (i === q.answerIndex) setScore((s) => s + 1);
  };

  const next = () => {
    if (idx + 1 >= questions.length) {
      setDone(true);
    } else {
      setIdx((i) => i + 1);
      setPicked(null);
    }
  };

  const restart = () => {
    setIdx(0);
    setPicked(null);
    setScore(0);
    setDone(false);
  };

  if (done) {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-sky-200 bg-sky-50/60 p-8 text-center dark:border-sky-500/30 dark:bg-sky-500/10">
        <p className="text-3xl font-bold">
          {score}/{questions.length}
        </p>
        <p className="text-sm text-sky-950/80 dark:text-sky-100/80">
          {pct >= 80
            ? "You're on top of the week's market news."
            : pct >= 50
              ? "Solid — a couple slipped past you."
              : "Time for a scroll through the radar below."}
        </p>
        <button
          type="button"
          onClick={restart}
          className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-500"
        >
          Play again
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-sky-200 bg-sky-50/40 p-6 dark:border-sky-500/30 dark:bg-sky-500/10">
      <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-sky-500 dark:text-sky-400">
        <span>This week in markets · quiz</span>
        <span>
          {idx + 1} / {questions.length}
        </span>
      </div>
      <p className="mt-3 font-medium leading-snug">{q.question}</p>
      <div className="mt-4 flex flex-col gap-2">
        {q.options.map((opt, i) => {
          const isAnswer = i === q.answerIndex;
          const isPicked = i === picked;
          let cls =
            "border-zinc-200 bg-white/70 hover:border-sky-400 dark:border-white/10 dark:bg-white/[0.035]";
          if (picked !== null) {
            if (isAnswer)
              cls = "border-emerald-400 bg-emerald-50 dark:border-emerald-500/50 dark:bg-emerald-500/10";
            else if (isPicked)
              cls = "border-rose-400 bg-rose-50 dark:border-rose-500/50 dark:bg-rose-500/10";
            else cls = "border-zinc-200 bg-white/40 opacity-70 dark:border-white/10 dark:bg-white/[0.035]";
          }
          return (
            <button
              key={i}
              type="button"
              onClick={() => choose(i)}
              disabled={picked !== null}
              className={`rounded-lg border px-4 py-2.5 text-left text-sm transition ${cls}`}
            >
              {opt}
            </button>
          );
        })}
      </div>
      {picked !== null && (
        <div className="mt-4 flex flex-col gap-3 border-t border-dashed border-sky-200 pt-4 dark:border-sky-500/30">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">{q.explanation}</p>
          <button
            type="button"
            onClick={next}
            className="self-start rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-500"
          >
            {idx + 1 >= questions.length ? "See score" : "Next question"}
          </button>
        </div>
      )}
    </div>
  );
}

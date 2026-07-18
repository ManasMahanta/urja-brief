import { getGridStory, type StoryTone } from "@/lib/story";

const TONE: Record<StoryTone, { ring: string; text: string; dot: string; kicker: string }> = {
  alert: { ring: "border-rose-400/25 bg-rose-400/[0.06]", text: "text-rose-200", dot: "bg-rose-400", kicker: "text-rose-300/80" },
  good: { ring: "border-emerald-300/25 bg-emerald-300/[0.06]", text: "text-emerald-100", dot: "bg-emerald-400", kicker: "text-emerald-300/80" },
  neutral: { ring: "border-cyan-200/15 bg-slate-950/40", text: "text-slate-100", dot: "bg-cyan-300", kicker: "text-cyan-300/80" },
};

// The day's most notable observation, auto-picked. Renders nothing if the grid
// snapshot is unavailable.
export default async function GridStory() {
  const story = await getGridStory();
  if (!story) return null;
  const tone = TONE[story.tone];

  return (
    <section className={`rounded-2xl border p-5 sm:p-6 ${tone.ring}`}>
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${tone.dot}`} aria-hidden="true" />
        <p className={`font-mono text-[0.65rem] font-semibold uppercase tracking-[0.16em] ${tone.kicker}`}>
          Grid story · right now
        </p>
      </div>
      <h2 className={`mt-3 text-2xl font-semibold tracking-tight ${tone.text}`}>{story.headline}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">{story.detail}</p>
    </section>
  );
}

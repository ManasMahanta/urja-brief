// Themed route-loading state: a breathing candlestick "equalizer", cycling
// status lines, and shimmering skeleton panels. Pure CSS (globals.css) so it
// renders instantly inside loading.tsx boundaries; honours reduced motion.

const BARS = [
  { h: 34, delay: "0s", color: "#34d399" },
  { h: 52, delay: "0.12s", color: "#38bdf8" },
  { h: 26, delay: "0.24s", color: "#fb7185" },
  { h: 60, delay: "0.36s", color: "#a78bfa" },
  { h: 40, delay: "0.48s", color: "#22d3ee" },
  { h: 30, delay: "0.6s", color: "#34d399" },
  { h: 48, delay: "0.72s", color: "#38bdf8" },
];

export default function Loader({
  title = "Loading the desk",
  messages = ["Reading the tape…", "Crunching live quotes…", "Assembling intelligence…"],
  skeleton = true,
}: {
  title?: string;
  messages?: string[];
  skeleton?: boolean;
}) {
  // Distribute each message's animation start across the 9s cycle.
  const step = 9 / Math.max(messages.length, 1);
  return (
    <div className="flex min-h-[60svh] flex-col items-center justify-center px-4 py-16">
      <div className="flex h-16 items-end gap-1.5" aria-hidden="true">
        {BARS.map((b, i) => (
          <span
            key={i}
            className="loader-bar"
            style={{ height: b.h, background: b.color, animationDelay: b.delay, boxShadow: `0 0 14px -2px ${b.color}` }}
          />
        ))}
      </div>

      <p className="mt-6 font-mono text-[0.66rem] font-semibold uppercase tracking-[0.22em] text-sky-300">
        {title}
      </p>

      <div className="relative mt-2 h-6 w-full max-w-xs" role="status" aria-live="polite">
        {messages.map((m, i) => (
          <span
            key={m}
            className="loader-msg absolute inset-0 text-center text-sm text-text-dim"
            style={{ animationDelay: `${(i * step).toFixed(1)}s` }}
          >
            {m}
          </span>
        ))}
      </div>

      {skeleton && (
        <div className="mt-10 grid w-full max-w-4xl gap-4 sm:grid-cols-3" aria-hidden="true">
          <div className="loader-skel h-28 sm:col-span-2" />
          <div className="loader-skel h-28" />
          <div className="loader-skel h-20" />
          <div className="loader-skel h-20" />
          <div className="loader-skel h-20" />
        </div>
      )}
    </div>
  );
}

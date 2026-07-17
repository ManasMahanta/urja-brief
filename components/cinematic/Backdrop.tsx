// Site-wide ambient backdrop, fixed behind all content on every page:
// a measurement grid floor, slow-drifting signal orbs, faint capital-flow
// data streams, a CRT scanline, and film grain. Pure CSS/SVG, zero requests.

const STREAMS = [
  { left: "12%", delay: "0s", dur: "7s" },
  { left: "31%", delay: "2.4s", dur: "9s" },
  { left: "58%", delay: "1.2s", dur: "6.5s" },
  { left: "74%", delay: "3.6s", dur: "8.2s" },
  { left: "89%", delay: "0.8s", dur: "10s" },
];

export default function Backdrop() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      <div className="grid-floor absolute inset-0" />
      <div className="orb absolute -top-48 left-[6%] h-[36rem] w-[36rem] bg-sky-500/12" />
      <div
        className="orb absolute top-[32%] -right-56 h-[32rem] w-[32rem] bg-violet-500/10"
        style={{ animationDelay: "-11s" }}
      />
      <div
        className="orb absolute -bottom-56 left-[28%] h-[38rem] w-[38rem] bg-emerald-500/8"
        style={{ animationDelay: "-22s" }}
      />
      {STREAMS.map((s, i) => (
        <span
          key={i}
          className="stream"
          style={{ left: s.left, animationDelay: s.delay, animationDuration: s.dur }}
        />
      ))}
      <div className="scanline absolute inset-0" />
      <div className="grain absolute inset-0" />
    </div>
  );
}

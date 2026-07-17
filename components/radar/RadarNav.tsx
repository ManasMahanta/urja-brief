"use client";

import { useEffect, useRef, useState } from "react";

export type RadarNavSection = { id: string; label: string; group?: string };

// Scrollspy nav for the radar page: a sticky vertical sidebar on desktop,
// a sticky horizontal pill bar on mobile. Highlights the section in view.
export default function RadarNav({
  sections,
}: {
  sections: RadarNavSection[];
}) {
  const [activeId, setActiveId] = useState(sections[0]?.id ?? "");
  const clickedRef = useRef<number>(0);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      // Skip scrollspy for a moment after a click so the clicked link stays
      // highlighted while smooth-scroll passes over other sections.
      if (Date.now() - clickedRef.current < 700) return;
      let current = sections[0]?.id ?? "";
      for (const s of sections) {
        const el = document.getElementById(s.id);
        if (el && el.getBoundingClientRect().top <= 130) current = s.id;
      }
      setActiveId(current);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [sections]);

  let lastGroup: string | undefined;

  return (
    <nav
      aria-label="Radar sections"
      className="flex gap-1.5 overflow-x-auto lg:flex-col lg:gap-1 lg:overflow-visible"
    >
      {sections.map((s) => {
        const active = s.id === activeId;
        const showGroup = s.group && s.group !== lastGroup;
        lastGroup = s.group;
        return (
          <span key={s.id} className="contents">
            {showGroup && (
              <span
                className="hidden pt-3 pb-1 pl-3 text-xs font-semibold uppercase tracking-wide text-zinc-400 first:pt-1 lg:block dark:text-zinc-600"
                aria-hidden="true"
              >
                {s.group}
              </span>
            )}
            <a
              href={`#${s.id}`}
              aria-current={active ? "true" : undefined}
              onClick={() => {
                clickedRef.current = Date.now();
                setActiveId(s.id);
              }}
              className={`whitespace-nowrap rounded-lg px-3 py-2.5 text-sm transition lg:py-1.5 ${
                active
                  ? "bg-sky-50 font-medium text-sky-700 dark:bg-sky-500/10 dark:text-sky-300"
                  : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
              }`}
            >
              {s.label}
            </a>
          </span>
        );
      })}
    </nav>
  );
}

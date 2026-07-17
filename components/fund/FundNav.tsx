"use client";

// Sticky in-page nav with scrollspy — the fund page's counterpart to the stock
// page's SectionNav. Sections are passed in because a fund can legitimately omit
// some (no sibling plan, too little history for rolling returns).

import { useEffect, useState } from "react";

export default function FundNav({ sections }: { sections: [string, string][] }) {
  const [active, setActive] = useState(sections[0]?.[0] ?? "");

  useEffect(() => {
    const els = sections.map(([id]) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: [0, 0.25, 0.5] },
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [sections]);

  return (
    <nav className="sticky top-[57px] z-30 -mx-4 border-b border-white/10 bg-[#05070d]/80 px-4 backdrop-blur-xl sm:top-[61px] sm:px-6">
      <div className="scroll-thin flex gap-1 overflow-x-auto py-2">
        {sections.map(([id, label]) => (
          <a
            key={id}
            href={`#${id}`}
            className={`shrink-0 rounded-full px-3 py-1.5 font-mono text-[0.68rem] font-medium uppercase tracking-wider transition ${
              active === id ? "bg-white/10 text-white" : "text-text-mute hover:text-text-dim"
            }`}
          >
            {label}
          </a>
        ))}
      </div>
    </nav>
  );
}

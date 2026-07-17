import type { ReactNode } from "react";
import { Reveal } from "@/components/cinematic/Motion";
import { Kicker } from "@/components/intel/ui";

// Section wrapper for the dissection page: anchor + numbered header + badge.
export default function Block({
  id,
  index,
  kicker,
  title,
  badge,
  children,
}: {
  id: string;
  index: string;
  kicker: string;
  title: string;
  badge?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 py-10 sm:py-12">
      <Reveal>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-3">
              <span className="tabular font-mono text-sm font-semibold text-text-mute">{index}</span>
              <Kicker>{kicker}</Kicker>
            </div>
            <h2 className="mt-3 text-xl font-bold tracking-tight text-white sm:text-2xl">{title}</h2>
          </div>
          {badge}
        </div>
      </Reveal>
      <div className="mt-6">{children}</div>
    </section>
  );
}

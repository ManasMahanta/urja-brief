import Link from "next/link";
import { site } from "@/lib/site";

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-white/10">
      <div className="mx-auto max-w-6xl px-4 pt-10 sm:px-6">
        <p className="rounded-xl border border-amber-500/25 bg-amber-500/[0.07] px-4 py-3 text-xs leading-relaxed text-amber-200/90">
          <strong className="text-amber-200">Source-aware intelligence, not operational advice.</strong>{" "}
          {site.name} is an educational view of public power-system reporting. It does not operate the grid, issue forecasts, or substitute for official dispatch, safety, or policy notices.
        </p>
      </div>
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-9 text-sm text-text-mute sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="font-mono text-xs tracking-wide">
          © {new Date().getFullYear()} {site.name} · India power intelligence ·{" "}
          {site.cadence.toLowerCase()}, free
        </p>
        <nav className="flex flex-wrap gap-x-4 gap-y-1">
          {[
            ["/grid", "Grid"], ["/generation", "Generation"], ["/policy", "Policy"], ["/methodology", "Methodology"],
          ].map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className="py-1.5 transition hover:text-white"
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}

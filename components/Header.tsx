import Link from "next/link";
import Logo from "@/components/Logo";
import { site } from "@/lib/site";

// Nav grouped into sections so the bar stays short as desks multiply. Desktop
// shows three dropdowns (pure CSS hover + focus-within, no client JS); mobile
// keeps the single <details> tray, laid out as labelled sections.
const groups: Array<{ label: string; items: Array<{ href: string; label: string }> }> = [
  {
    label: "Desks",
    items: [
      { href: "/grid", label: "Grid" },
      { href: "/carbon", label: "Carbon" },
      { href: "/renewables", label: "Solar & wind" },
      { href: "/coal", label: "Coal & fuel" },
      { href: "/generation", label: "Generation" },
      { href: "/storage", label: "Storage" },
      { href: "/ev", label: "EV" },
    ],
  },
  {
    label: "Track record",
    items: [
      { href: "/records", label: "Records" },
      { href: "/scoreboard", label: "Scoreboard" },
    ],
  },
  {
    label: "About",
    items: [
      { href: "/policy", label: "Policy" },
      { href: "/methodology", label: "Methodology" },
      { href: "/data", label: "Open data" },
    ],
  },
];

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#05070d]/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link href="/" aria-label={site.name} className="flex items-center">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-1 text-sm md:flex" aria-label="Main navigation">
          {groups.map((group) => (
            <div key={group.label} className="group relative">
              <button
                type="button"
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-text-dim transition hover:text-white group-hover:text-white group-focus-within:text-white"
                aria-haspopup="true"
              >
                {group.label}
                <span className="text-xs text-text-mute transition group-hover:rotate-180" aria-hidden="true">⌄</span>
              </button>
              <div className="invisible absolute left-0 top-full z-50 pt-2 opacity-0 transition group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
                <div className="glass flex w-52 flex-col p-2">
                  {group.items.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="rounded-lg px-3 py-2 text-sm font-medium text-text-dim transition hover:bg-white/5 hover:text-white"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <span className="hidden items-center gap-2 font-mono text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-text-mute lg:inline-flex">
            <span className="live-dot" /> Live desk
          </span>
          <Link
            href="/search"
            aria-label="Search"
            className="hidden h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-text-dim transition hover:border-white/20 hover:text-white sm:flex"
          >
            <span aria-hidden="true">⌕</span>
          </Link>
          <Link
            href="/subscribe"
            className="hidden rounded-lg bg-gradient-to-r from-sky-500 to-cyan-400 px-3.5 py-1.5 text-sm font-semibold text-[#04121b] shadow-[0_0_24px_-6px_rgba(56,189,248,0.7)] transition hover:brightness-110 sm:block"
          >
            Get the brief
          </Link>

          <details className="relative md:hidden">
            <summary className="flex h-10 cursor-pointer list-none items-center rounded-lg border border-white/10 px-3 text-sm font-semibold text-text-dim marker:content-none [&::-webkit-details-marker]:hidden">
              Menu <span className="ml-1.5 text-text-mute" aria-hidden="true">⌄</span>
            </summary>
            <nav
              aria-label="Mobile navigation"
              className="glass absolute right-0 z-50 mt-2 flex w-60 flex-col gap-1 p-2"
            >
              {groups.map((group) => (
                <div key={group.label} className="flex flex-col">
                  <p className="px-3 pb-1 pt-2 font-mono text-[0.6rem] uppercase tracking-[0.16em] text-text-mute">
                    {group.label}
                  </p>
                  {group.items.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="rounded-lg px-3 py-2.5 text-sm font-medium text-text-dim hover:bg-white/5 hover:text-white"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              ))}
              <Link
                href="/search"
                className="mt-1 rounded-lg px-3 py-2.5 text-sm font-medium text-text-dim hover:bg-white/5 hover:text-white"
              >
                Search
              </Link>
              <Link
                href="/subscribe"
                className="mt-1 rounded-lg bg-gradient-to-r from-sky-500 to-cyan-400 px-3 py-3 text-center text-sm font-semibold text-[#04121b]"
              >
                Get the brief
              </Link>
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}

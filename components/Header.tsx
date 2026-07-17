import Link from "next/link";
import Logo from "@/components/Logo";
import { site } from "@/lib/site";

const nav = [
  { href: "/grid", label: "Grid" },
  { href: "/generation", label: "Generation" },
  { href: "/policy", label: "Policy" },
  { href: "/methodology", label: "Methodology" },
];

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#05070d]/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link href="/" aria-label={site.name} className="flex items-center">
          <Logo />
        </Link>

        <nav
          className="hidden items-center gap-5 text-sm md:flex lg:gap-6"
          aria-label="Main navigation"
        >
          {nav.map((item) => (
            <Link
                key={item.href}
                href={item.href}
                className="text-text-dim transition hover:text-white"
              >
                {item.label}
            </Link>
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
              className="glass absolute right-0 z-50 mt-2 flex w-56 flex-col p-2"
            >
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 rounded-lg px-3 py-3 text-sm font-medium hover:bg-white/5 hover:text-white ${
                    "text-text-dim"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              <Link
                href="/search"
                className="rounded-lg px-3 py-3 text-sm font-medium text-text-dim hover:bg-white/5 hover:text-white"
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

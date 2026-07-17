// Brand mark: transmission towers carrying a pulse across the grid.

export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      <defs>
        <linearGradient id="ub-bg" x1="0" y1="0" x2="32" y2="32">
          <stop offset="0" stopColor="#06b6d4" />
          <stop offset="1" stopColor="#164e63" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="7" fill="url(#ub-bg)" />
      <g fill="none" stroke="#cffafe" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8">
        <path d="M6 25 11 7l5 18M8 18h6M9 13h4M18 25l4-16 4 16M19.5 18h5M20.5 14h3" />
        <path d="M4 8h4m16 0h4" stroke="#67e8f9" />
      </g>
    </svg>
  );
}

export default function Logo({ size = 28 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark size={size} />
      <span className="text-lg font-bold tracking-tight">
        Urja{" "}
        <span className="font-medium text-zinc-400 dark:text-zinc-500">
          Brief
        </span>
      </span>
    </span>
  );
}

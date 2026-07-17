// Persistent "not investment advice" notice. Rendered on every issue and on the
// markets pages, and expanded on the /disclaimer page. Required framing for
// retail-investor financial content.

export default function Disclaimer({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
        <strong>Educational only, not investment advice.</strong> Bazaar Brief is
        market commentary for learning — we are not SEBI-registered advisers.
        Prices may be delayed or inaccurate. Do your own research before investing.
      </p>
    );
  }
  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm leading-relaxed text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
      <h2 className="text-base font-bold">Important disclaimer</h2>
      <p className="mt-3">
        Bazaar Brief publishes <strong>educational market commentary</strong>,
        not investment advice. We are <strong>not SEBI-registered</strong>{" "}
        investment advisers or research analysts, and nothing here is a
        recommendation to buy, sell, or hold any security.
      </p>
      <p className="mt-3">
        Live prices, index levels, and other market data are pulled from
        third-party feeds, may be delayed, and can be inaccurate or unavailable.
        Do not rely on them for trading decisions.
      </p>
      <p className="mt-3">
        Investing in equities carries risk, including the loss of principal.
        Always do your own research and consider consulting a SEBI-registered
        adviser before making any investment decision.
      </p>
    </section>
  );
}

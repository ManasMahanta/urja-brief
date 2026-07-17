import type { Metadata } from "next";
import InlineCTA from "@/components/InlineCTA";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "About",
  description: `Who writes ${site.name}, what you'll get, and why it exists.`,
};

export default function AboutPage() {
  return (
    <div className="prose prose-zinc max-w-none dark:prose-invert prose-headings:tracking-tight">
      <h1>About {site.name}</h1>
      <p>
        The Indian market throws more at you than anyone can track — index
        moves, results season, IPOs, RBI policy, FII flows, endless hot tips.
        Most coverage either drowns you in noise or sells you a &ldquo;multibagger.&rdquo;
        {" "}{site.name} does neither: every issue is a calm, layered read that a
        busy person finishes in five minutes and a keen investor can go deep on.
      </p>
      <h2>What you get</h2>
      <ul>
        <li>
          <strong>{site.cadence}:</strong> one email, no more. A Market Pulse on
          where Nifty and Sensex closed, the week&apos;s big move explained, a
          results radar, a sector watch, IPOs and listings, a lightning round,
          and one research idea to chew on.
        </li>
        <li>
          <strong>Layered depth:</strong> skim the pulse if you&apos;re busy, or
          go all the way down. Every section says the quiet part — the
          &ldquo;so what&rdquo; for the stock — out loud.
        </li>
        <li>
          <strong>No hype, no tips:</strong> we explain what happened and what to
          research. We never tell you what to buy or sell — that&apos;s your call,
          ideally with a SEBI-registered adviser.
        </li>
      </ul>
      <h2>Who writes it</h2>
      <p>
        {site.name} is written by {site.author}. It reads the results, the
        filings, and the tape so you don&apos;t have to, and translates them into
        plain English — with the numbers, not the noise.
      </p>
      <h2>The fine print</h2>
      <p>
        <strong>Educational only, not investment advice.</strong> {site.name} is
        market commentary, and we are not SEBI-registered advisers — see the full{" "}
        <a href="/disclaimer">disclaimer</a>. Free, {site.cadence.toLowerCase()}.
        Unsubscribe anytime. Your email is used for the newsletter and nothing
        else — see the <a href="/privacy">privacy policy</a>.
      </p>
      <InlineCTA />
    </div>
  );
}

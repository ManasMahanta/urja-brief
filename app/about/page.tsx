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
        India&apos;s power system is one of the most consequential machines in the
        country — and one of the worst reported. Coverage either drowns you in
        acronyms or turns every headline into a crisis. {site.name} does
        neither: it tracks generation, demand, renewables, fuel, and policy as a
        system, with every number tied to the source and date it came from.
      </p>
      <h2>What you get</h2>
      <ul>
        <li>
          <strong>{site.cadence}:</strong> one email, no more. A Grid Pulse on
          demand and the generation mix, the week&apos;s big signal explained, a
          transition watch, a fuel and reliability check, a policy desk, and one
          open question worth following.
        </li>
        <li>
          <strong>A live desk:</strong> the site carries the current all-India
          power position and state-wise picture from the Ministry of
          Power&apos;s MERIT dashboard, clearly stamped with when it was
          fetched — never presented as more than it is.
        </li>
        <li>
          <strong>No invented readings:</strong> when a source is late, down, or
          unparseable, we say so. A missing report never becomes a confident
          story, and market prices are never passed off as grid conditions.
        </li>
      </ul>
      <h2>Who writes it</h2>
      <p>
        {site.name} is written by {site.author}. It reads the despatch data, the
        CEA reports, and the policy record so you don&apos;t have to, and
        translates them into plain English — with the numbers, not the noise.
      </p>
      <h2>The fine print</h2>
      <p>
        <strong>Educational only, not advice.</strong> {site.name} is system
        commentary. Where listed power companies appear, that is market context,
        not investment advice — see the full <a href="/disclaimer">disclaimer</a>.
        Free, {site.cadence.toLowerCase()}. Unsubscribe anytime. Your email is
        used for the newsletter and nothing else — see the{" "}
        <a href="/privacy">privacy policy</a>.
      </p>
      <InlineCTA />
    </div>
  );
}

import type { Metadata } from "next";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `How ${site.name} handles your data.`,
};

export default function PrivacyPage() {
  return (
    <div className="prose prose-zinc max-w-none dark:prose-invert prose-headings:tracking-tight">
      <h1>Privacy policy</h1>
      <p>
        <em>Last updated: July 2026</em>
      </p>
      <h2>What we collect</h2>
      <p>
        When you subscribe, we collect your email address — that&apos;s it. We
        don&apos;t require a name, and we don&apos;t buy or enrich data about
        you.
      </p>
      <h2>How it&apos;s used</h2>
      <p>
        Your email is used to send you the newsletter and occasional
        housekeeping notes about it. It is never sold, rented, or shared with
        third parties for their marketing.
      </p>
      <h2>Who processes it</h2>
      <p>
        Email delivery is handled by our email service provider (Buttondown),
        which stores subscriber addresses on our behalf and processes them under
        its own privacy policy. The website is hosted on Vercel, which may log
        standard request metadata (IP address, user agent) for security and
        operations.
      </p>
      <h2>Your rights</h2>
      <p>
        Every email contains a one-click unsubscribe link, which removes you
        from the list immediately. You can also request deletion of your data
        entirely by replying to any issue. If you&apos;re in the EU/EEA or a
        similar jurisdiction, these rights (access, rectification, erasure)
        apply as required by law.
      </p>
      <h2>Cookies & analytics</h2>
      <p>
        The site sets no tracking cookies. If privacy-preserving, aggregate
        analytics are added later, this policy will be updated first.
      </p>
      <h2>Contact</h2>
      <p>Questions? Reply to any issue of the newsletter.</p>
    </div>
  );
}

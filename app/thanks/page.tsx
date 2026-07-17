import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Almost there",
  robots: { index: false },
};

export default function ThanksPage() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-6 py-16 text-center">
      <div className="text-5xl">📬</div>
      <h1 className="text-3xl font-bold tracking-tight">
        One more step — check your inbox
      </h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        We just sent you a confirmation email. Click the link inside to activate
        your subscription (this double opt-in keeps the list healthy and your
        inbox in control). If it&apos;s not there in a minute, check spam and
        mark us as safe.
      </p>
      <div className="rounded-xl border border-zinc-200 p-5 text-sm text-zinc-600 dark:border-white/10 dark:text-zinc-400">
        <p className="font-semibold text-zinc-900 dark:text-zinc-100">
          Know someone who&apos;d like this?
        </p>
        <p className="mt-1">
          The best way to support {site.name} is to send a colleague to{" "}
          <span className="font-medium text-sky-600 dark:text-sky-400">
            {site.url.replace(/^https?:\/\//, "")}/subscribe
          </span>
        </p>
      </div>
      <Link
        href="/start-here"
        className="text-sm font-medium text-sky-600 hover:underline dark:text-sky-400"
      >
        Read past issues while you wait →
      </Link>
    </div>
  );
}

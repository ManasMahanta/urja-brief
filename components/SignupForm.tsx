"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Status = "idle" | "loading" | "info" | "error";

export default function SignupForm({
  compact = false,
}: {
  compact?: boolean;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setMessage("");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus("error");
        setMessage(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      if (data.configured === false) {
        setStatus("info");
        setMessage(data.message);
        return;
      }
      router.push("/thanks");
    } catch {
      setStatus("error");
      setMessage("Network error. Please try again.");
    }
  }

  return (
    <div className={compact ? "" : "w-full max-w-md"}>
      <form onSubmit={onSubmit} className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor={`email-${compact ? "compact" : "main"}`} className="sr-only">
          Email address
        </label>
        <input
          id={`email-${compact ? "compact" : "main"}`}
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white placeholder:text-text-mute focus:border-sky-400/50 focus:outline-none focus:ring-2 focus:ring-sky-400/20"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="rounded-lg bg-gradient-to-r from-sky-500 to-cyan-400 px-5 py-2.5 text-sm font-semibold text-[#04121b] shadow-[0_0_24px_-8px_rgba(56,189,248,0.7)] transition enabled:hover:brightness-110 disabled:opacity-50"
        >
          {status === "loading" ? "Subscribing…" : "Subscribe free"}
        </button>
      </form>
      {message && (
        <p
          role="status"
          className={`mt-2 text-sm ${
            status === "error" ? "text-down" : "text-text-dim"
          }`}
        >
          {message}
        </p>
      )}
      {!compact && !message && (
        <p className="mt-2 text-xs text-text-mute">
          Free, every Friday. Unsubscribe anytime.
        </p>
      )}
    </div>
  );
}

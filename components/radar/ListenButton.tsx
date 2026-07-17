"use client";

import { useEffect, useState } from "react";

// Reads text aloud using the browser's built-in speech synthesis — no API,
// no cost. Hides itself entirely if the browser doesn't support it.
export default function ListenButton({ text }: { text: string }) {
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    setSupported(typeof window !== "undefined" && "speechSynthesis" in window);
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  if (!supported) return null;

  const toggle = () => {
    const synth = window.speechSynthesis;
    if (speaking) {
      synth.cancel();
      setSpeaking(false);
      return;
    }
    synth.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 1;
    utter.onend = () => setSpeaking(false);
    utter.onerror = () => setSpeaking(false);
    setSpeaking(true);
    synth.speak(utter);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={speaking}
      className="inline-flex items-center gap-1.5 rounded-full border border-sky-300 px-3 py-1 text-xs font-semibold text-sky-600 transition hover:bg-sky-100/60 dark:border-sky-500/40 dark:text-sky-300 dark:hover:bg-sky-500/10"
    >
      <span aria-hidden="true">{speaking ? "◼" : "▶"}</span>
      {speaking ? "Stop" : "Listen"}
    </button>
  );
}

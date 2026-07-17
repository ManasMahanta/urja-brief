import SignupForm from "@/components/SignupForm";
import { site } from "@/lib/site";

export default function InlineCTA({
  heading = `Enjoying ${site.name}?`,
}: {
  heading?: string;
}) {
  return (
    <aside
      className="glass rail my-10 p-6"
      style={{ ["--rail" as string]: "#38bdf8" }}
    >
      <h2 className="text-base font-semibold text-white">{heading}</h2>
      <p className="mt-1 mb-4 text-sm text-text-dim">
        Get the next issue in your inbox — {site.tagline.toLowerCase()}.
      </p>
      <SignupForm compact />
    </aside>
  );
}

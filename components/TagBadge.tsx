import Link from "next/link";
import { topicLabel } from "@/lib/site";

export default function TagBadge({ tag }: { tag: string }) {
  return (
    <Link
      href={`/topics/${tag}`}
      className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-0.5 text-xs font-medium text-text-dim transition hover:border-sky-400/40 hover:text-sky-300"
    >
      {topicLabel(tag)}
    </Link>
  );
}

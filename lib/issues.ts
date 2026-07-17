import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

export type IssueMeta = {
  slug: string;
  title: string;
  date: string; // ISO yyyy-mm-dd
  summary: string;
  tags: string[];
  featured?: boolean;
};

export type Issue = IssueMeta & { content: string };

const ISSUES_DIR = path.join(process.cwd(), "content", "issues");

function parseIssue(filename: string): Issue {
  const slug = filename.replace(/\.mdx?$/, "");
  const raw = fs.readFileSync(path.join(ISSUES_DIR, filename), "utf8");
  const { data, content } = matter(raw);
  return {
    slug,
    title: String(data.title ?? slug),
    date: String(data.date ?? ""),
    summary: String(data.summary ?? ""),
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
    featured: Boolean(data.featured),
    content,
  };
}

export function getAllIssues(): Issue[] {
  if (!fs.existsSync(ISSUES_DIR)) return [];
  return fs
    .readdirSync(ISSUES_DIR)
    .filter((f) => /\.mdx?$/.test(f))
    .map(parseIssue)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getIssue(slug: string): Issue | undefined {
  return getAllIssues().find((i) => i.slug === slug);
}

export function getFeaturedIssues(): Issue[] {
  const all = getAllIssues();
  const featured = all.filter((i) => i.featured);
  return featured.length > 0 ? featured : all.slice(0, 3);
}

export function getIssuesByTag(tag: string): Issue[] {
  return getAllIssues().filter((i) => i.tags.includes(tag));
}

export function getAllTags(): string[] {
  const tags = new Set<string>();
  for (const issue of getAllIssues()) issue.tags.forEach((t) => tags.add(t));
  return [...tags].sort();
}

export function adjacentIssues(slug: string): {
  prev?: IssueMeta;
  next?: IssueMeta;
} {
  const all = getAllIssues(); // newest first
  const idx = all.findIndex((i) => i.slug === slug);
  if (idx === -1) return {};
  return { prev: all[idx + 1], next: all[idx - 1] };
}

export function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

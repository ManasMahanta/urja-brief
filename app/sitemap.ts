import type { MetadataRoute } from "next";
import { site, topics } from "@/lib/site";
import { getAllIssues } from "@/lib/issues";
import { glossary, slugifyTerm } from "@/lib/glossary";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages = [
    "",
    "/grid", "/generation", "/storage", "/records", "/policy", "/methodology",
    "/issues", "/glossary", "/about", "/start-here", "/subscribe", "/search",
  ].map((path) => ({
    url: `${site.url}${path}`,
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1 : 0.6,
  }));

  const issuePages = getAllIssues().map((issue) => ({
    url: `${site.url}/issues/${issue.slug}`,
    lastModified: issue.date,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  const topicPages = Object.keys(topics).map((tag) => ({
    url: `${site.url}/topics/${tag}`,
    changeFrequency: "weekly" as const,
    priority: 0.5,
  }));

  const glossaryPages = glossary.map((term) => ({
    url: `${site.url}/glossary/${slugifyTerm(term.term)}`,
    changeFrequency: "yearly" as const,
    priority: 0.3,
  }));

  return [...staticPages, ...issuePages, ...topicPages, ...glossaryPages];
}

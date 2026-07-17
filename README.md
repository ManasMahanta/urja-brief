# Bazaar Brief — Indian-markets newsletter website

A subscriber-growth website for a weekly Indian-stock-market newsletter, with a
live markets dashboard. Built with Next.js (App Router) + Tailwind CSS; issues
are MDX files; email delivery via Buttondown; live market data via Yahoo Finance
(keyless) with an optional premium provider.

> **Educational only, not investment advice.** This project is market commentary
> and a demo — it is not run by SEBI-registered advisers, and live prices may be
> delayed or inaccurate. See `/disclaimer`.

## Quick start

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build (statically generates issue/topic/glossary pages)
```

The signup form works out of the box in a graceful "not configured" mode. To
enable real subscriptions, copy `.env.example` to `.env.local` and set
`BUTTONDOWN_API_KEY`. Set `NEXT_PUBLIC_SITE_URL` to your real domain before
deploying — it drives SEO metadata, the sitemap, and the RSS feeds.

### Live market data

The markets dashboard, ticker, movers, sector heat, trending stocks, and quote
lookup all use **Yahoo Finance's free, keyless endpoints** — no setup required.
Every fetcher returns empty/null on failure, so a flaky upstream never breaks a
page. Set `MARKETDATA_API_KEY` (e.g. Twelve Data) to route the single-stock quote
lookup through a more reliable premium provider, with Yahoo as fallback.

### Optional generated features

The daily market brief, the **Stock Deep-Dive**, **Ask the Analyst** (Academy),
and the weekly quiz run on **Z.ai's GLM** models. Set `ZAI_API_KEY` to enable
them; optionally set `ZAI_MODEL` (defaults to `glm-4.5`). All degrade gracefully
when unset. Keys are used only in server-side routes, and every generated response
is constrained to be educational — it never gives buy/sell calls.

## Publishing an issue

Add a file to `content/issues/`:

```mdx
---
title: "Issue #4: Your headline"
date: "2026-07-25"
summary: "One-sentence hook shown on cards, in search results, and in RSS."
tags: [markets, results]        # slugs from lib/site.ts topics
featured: false                 # true = shown on /start-here
---

## Market Pulse
...
```

Section template (encoded in the seed issues): **Market Pulse → The Big Move →
Results Radar → Sector Watch → IPO & Listings → Lightning Round → One Idea**.
Every issue carries a persistent "not investment advice" disclaimer. The archive,
topic pages, sitemap, and RSS pick the file up automatically on the next build.
The three issues in `content/issues/` are **illustrative samples** — replace them.

## Map

- `app/` — pages: home, `/issues`, `/issues/[slug]`, `/topics/[tag]`, `/markets`
  (live dashboard), `/coverage`, `/ipo`, `/academy`, `/glossary`, `/search`,
  `/saved`, `/subscribe`, `/start-here`, `/about`, `/privacy`, `/disclaimer`,
  `/thanks`, plus `rss.xml`, `market.xml`, `sitemap.ts`, `robots.ts`
- `app/api/` — `subscribe` (Buttondown), `quote` (live lookup),
  `explain-stock` (Deep-Dive), `analyst` (Academy chat), `refresh` (cron
  revalidate), `email-brief` / `draft-issue` / `publish-issue` (GLM + Buttondown/GitHub)
- `lib/market.ts` — all live market data (Yahoo keyless + optional key, RSS news)
- `lib/site.ts` — site name, tagline, topic taxonomy (edit branding here)
- `lib/issues.ts` — MDX loading, tags, sorting
- `lib/{stocks-data,academy,glossary}.ts` — curated editorial content
- `components/market/` — ticker, feeds, highlights, quote lookup, Deep-Dive
- `components/Disclaimer.tsx` — the persistent "not advice" notice

## Deploy

Push to GitHub and import into [Vercel](https://vercel.com/new). Add env vars in
project settings and a `CRON_SECRET` for the daily refresh (see `vercel.json`).
No database required.

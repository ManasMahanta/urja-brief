# Urja Brief — India's power system, decoded

A subscriber-growth website for a weekly newsletter on India's power system,
with a live grid desk. Built with Next.js (App Router) + Tailwind CSS; issues
are MDX files; email delivery via Buttondown; live grid data from the Ministry
of Power's MERIT dashboard (keyless).

> **Educational only, not advice.** This project is system commentary and a
> demo. Live figures may be delayed or wrong; official reporting (CEA,
> Grid-India) is always the source of record. Where listed power companies
> appear, that is market context, not investment advice. See `/disclaimer`.

## Quick start

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build (statically generates issue/topic/glossary pages)
```

The signup form works out of the box in a graceful "not configured" mode. To
enable real subscriptions, set `BUTTONDOWN_API_KEY`. Set `NEXT_PUBLIC_SITE_URL`
to your real domain before deploying — it drives SEO metadata, the sitemap, and
the RSS feed.

## Live grid data

`lib/grid-live.ts` reads **meritindia.in** (MERIT, Ministry of Power/POSOCO) —
no key required:

- **All-India power position** — demand met plus the per-fuel generation split,
  parsed from the dashboard's server-rendered HTML (cached 5 min).
- **State-wise current status** — demand met / own generation / import for ~35
  states via MERIT's own JSON endpoints (cached 10 min).

MERIT publishes instantaneous MW with no timestamp, so every snapshot carries
the time *we* fetched it, and the UI labels figures as exactly that — never as
daily energy, peak demand, or an official CEA record. Every fetcher returns
null/empty on failure so a flaky upstream never breaks a page; the UI then says
the source is unavailable instead of showing a stale or invented number.

`lib/power.ts` adds listed power-company quotes (Yahoo keyless, labelled as
market context) and a Google News power-sector newswire.

### Optional generated features

The AI signal brief, **Ask the desk** analyst, and the weekly issue drafter run
on **Z.ai's GLM** models. Set `ZAI_API_KEY` to enable them; optionally
`ZAI_MODEL` (defaults to `glm-4.5`). All degrade gracefully when unset. Keys
are used only in server-side routes, and every generated response is
constrained: MERIT readings stay instantaneous MW, headlines are not facts
beyond their wording, and no output predicts, advises, or invents figures.

## Publishing an issue

Add a file to `content/issues/`:

```mdx
---
title: "Issue #4: Your headline"
date: "2026-07-25"
summary: "One-sentence hook shown on cards, in search results, and in RSS."
tags: [grid, renewables]        # slugs from lib/site.ts topics
featured: false                 # true = shown on /start-here
---

## Grid Pulse
...
```

Section template (encoded in the seed issues): **Grid Pulse → The Big Signal →
Transition Watch → Fuel & Reliability → Policy Desk → Lightning Round → One
Question**. Every issue carries a persistent "not advice" disclaimer. The
archive, topic pages, sitemap, and RSS pick the file up automatically on the
next build. The three issues in `content/issues/` are **illustrative samples**
— replace them.

## Map

- `app/` — pages: home (live desk), `/grid` (live pulse + state board),
  `/generation`, `/policy`, `/issues`, `/issues/[slug]`, `/topics/[tag]`,
  `/glossary`, `/search`, `/subscribe`, `/start-here`, `/about`,
  `/methodology`, `/privacy`, `/disclaimer`, `/thanks`, plus `rss.xml`,
  `sitemap.ts`, `robots.ts`
- `app/api/` — `subscribe` (Buttondown), `power-analyst` (desk chat),
  `refresh` (cron revalidate), `draft-issue` / `publish-issue` (GLM +
  Buttondown/GitHub)
- `lib/grid-live.ts` — MERIT live grid data (all-India + state-wise)
- `lib/power.ts` — power-company quotes, newswire, official source registry
- `lib/power-ai.ts` — grounded AI brief; `lib/draft.ts` — weekly issue drafter
- `lib/site.ts` — site name, tagline, topic taxonomy (edit branding here)
- `lib/issues.ts` — MDX loading, tags, sorting; `lib/glossary.ts` — power terms
- `components/urja/` — GridPulse, StateBoard, PowerBoard, PowerBrief,
  PowerAnalyst
- `components/Disclaimer.tsx` — the persistent "not advice" notice

## Deploy

Push to GitHub and import into [Vercel](https://vercel.com/new). Add env vars
in project settings and a `CRON_SECRET` for the daily refresh (see
`vercel.json`). No database required.

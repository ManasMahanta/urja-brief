import { unstable_cache } from "next/cache";
import { callGLM, glmConfigured } from "@/lib/glm";
import { getGridSnapshot, getStatewisePower } from "@/lib/grid-live";
import { getLoadCurves } from "@/lib/samples";
import {
  getEnergyHeadlines,
  getPolicyHeadlines,
  getPowerQuotes,
  getStorageHeadlines,
  officialSources,
} from "@/lib/power";

// "Explain simply" — one plain-language explanation per desk section, for
// readers with no power-sector background. The client sends only a section
// KEY; the context is rebuilt server-side from the same fetchers that render
// the section, so the model always explains the real current numbers and
// client input can never reach the prompt. Cached per section, so the whole
// site costs at most one generation per section per 15 minutes.

const mw = (value: number) => `${Math.round(value).toLocaleString("en-IN")} MW`;

const SECTIONS = {
  "grid-pulse": {
    title: "Live grid pulse",
    async context() {
      const snapshot = await getGridSnapshot();
      if (!snapshot) return null;
      return [
        `All-India electricity demand being met right now: ${mw(snapshot.demandMetMw)} (MERIT dashboard, instantaneous reading fetched ${snapshot.fetchedAt}).`,
        `Generation mix right now: thermal (mostly coal) ${mw(snapshot.mix.thermal)}, renewable (solar+wind) ${mw(snapshot.mix.renewable)}, hydro ${mw(snapshot.mix.hydro)}, nuclear ${mw(snapshot.mix.nuclear)}, gas ${mw(snapshot.mix.gas)}.`,
        `Renewables' share of generation right now: ${snapshot.renewableSharePct.toFixed(1)}%.`,
        "These are instantaneous megawatt readings — power flowing at this moment, not energy over the day, and not an official record.",
      ].join("\n");
    },
  },
  "load-curve": {
    title: "The day's shape (load curve)",
    async context() {
      const { today, yesterday } = await getLoadCurves();
      if (today.length < 2) return null;
      const demands = today.map((s) => s.demandMw);
      const re = today.map((s) => s.rePct);
      return [
        `This chart tracks India's electricity demand and the renewables' share through the day, sampled every 15 minutes from the MERIT dashboard.`,
        `Today so far (${today.length} samples): demand ranged ${mw(Math.min(...demands))} to ${mw(Math.max(...demands))}; renewables' share ranged ${Math.min(...re).toFixed(1)}% to ${Math.max(...re).toFixed(1)}%.`,
        yesterday.length ? `Yesterday has ${yesterday.length} samples for comparison.` : "No samples exist for yesterday yet.",
        "Typical pattern to explain: solar pushes the renewable share up in the afternoon, then demand peaks in the evening after sunset when solar is gone — coal and hydro carry that peak.",
      ].join("\n");
    },
  },
  "state-board": {
    title: "State-wise demand board",
    async context() {
      const states = await getStatewisePower();
      if (!states.length) return null;
      return [
        "This table shows, for each state right now: demand met (electricity being used), own generation (made inside the state), and import (brought in from outside).",
        "Top states by demand right now:",
        ...states.slice(0, 6).map((s) =>
          `- ${s.name}: demand ${mw(s.demandMetMw)}, own generation ${s.ownGenerationMw !== null ? mw(s.ownGenerationMw) : "not reported"}, import ${s.importMw !== null ? mw(s.importMw) : "not reported"}`,
        ),
        "Importing power is normal — states buy from the national market when that is cheaper or cleaner. A negative import means the state is selling to others at this moment.",
      ].join("\n");
    },
  },
  "carbon-intensity": {
    title: "How clean the grid is right now",
    async context() {
      const { getCarbonNow } = await import("@/lib/carbon");
      const carbon = await getCarbonNow();
      if (!carbon) return null;
      return [
        `Right now each unit of electricity (kWh) on India's grid carries about ${Math.round(carbon.intensityGco2)} grams of CO2. This is worked out live from what is generating: coal is dirty, gas less so, and solar/wind/hydro/nuclear add almost no CO2 as they run.`,
        carbon.today
          ? `Across today's samples it has ranged from about ${Math.round(carbon.today.min)} to ${Math.round(carbon.today.max)} grams per kWh (median ${Math.round(carbon.today.median)}).`
          : "There aren't enough samples yet today to say what's usual.",
        carbon.verdict ? `Verdict for this hour: ${carbon.verdict.headline}. ${carbon.verdict.detail}` : "",
        "The practical idea: run heavy things (geyser, washing machine, EV charging) in the cleaner hours — usually the sunny afternoon when solar is strong — rather than the coal-heavy evening peak.",
        "This is an estimate of what's burning right now, not an official audited emissions number.",
      ].filter(Boolean).join("\n");
    },
  },
  "coal-stock": {
    title: "How much coal India's power plants have",
    async context() {
      const { getCoalStock } = await import("@/lib/coal");
      const coal = await getCoalStock();
      if (!coal) return null;
      return [
        `India's coal-fired power plants are together holding about ${(coal.totalStockKt / 1000).toFixed(1)} million tonnes of coal — roughly ${coal.daysOfStock.toFixed(1)} days' worth at normal running (CEA daily report, as on ${coal.asOn}).`,
        `${coal.criticalPlants} plants are at "critical" stock — meaning they hold less than a quarter of the coal they're supposed to keep in reserve.`,
        `That's ${coal.pctOfNormative}% of the total reserve the fleet is meant to hold.`,
        "Why this matters: coal makes most of India's electricity, so if plant stocks run low and trains/mines can't refill them fast enough, some plants may have to cut generation — the usual cause of supply-driven power cuts.",
        "This is a national snapshot for one day; a shortage usually shows up in a few regions first, and this number alone doesn't say where.",
      ].join("\n");
    },
  },
  "storage-dispatch": {
    title: "Storage on the grid",
    async context() {
      const snapshot = await getGridSnapshot();
      if (!snapshot) return null;
      return [
        `Grid storage (big batteries and pumped-water plants) is supplying ${mw(snapshot.mix.storage)} right now, while coal-based thermal supplies ${mw(snapshot.mix.thermal)} at the same instant.`,
        "Context: India has announced many battery projects, but a project only shows up in this number after it is built, connected, and actually being used. Announcements lead this number by years.",
        "The core problem storage solves: solar peaks at 1pm, but people use the most electricity in the evening after sunset — storage moves the afternoon's energy to the evening.",
        "This reading says nothing about how many batteries are installed or being built — only what is flowing right now.",
      ].join("\n");
    },
  },
  "market-watch": {
    title: "Listed power companies (market context)",
    async context() {
      const quotes = await getPowerQuotes();
      if (!quotes.length) return null;
      return [
        "These are today's share prices of large listed power companies:",
        ...quotes.map((q) => `- ${q.name}: ₹${q.price.toFixed(2)}, ${q.changePercent >= 0 ? "+" : ""}${q.changePercent.toFixed(2)}% today`),
        "Important framing: share prices show what investors feel, not how the electricity grid is doing. A power stock can rise on a bad grid day and fall on a good one.",
      ].join("\n");
    },
  },
  "policy-wire": {
    title: "Policy newswire",
    async context() {
      const headlines = await getPolicyHeadlines(6);
      if (!headlines.length) return null;
      return [
        "Recent India power-policy headlines (headline text only — not verified facts):",
        ...headlines.map((h) => `- ${h.title}`),
        "Key distinction for a newcomer: a draft or proposal is not yet a rule; only a notified regulation or a regulator's order changes anything on the ground.",
      ].join("\n");
    },
  },
  "generation-desk": {
    title: "Generation desk",
    async context() {
      const headlines = await getEnergyHeadlines(5);
      return [
        "This desk is about how India's electricity is generated each day (coal, hydro, nuclear, solar, wind) and where the official record of that lives.",
        ...officialSources.map((s) => `- Official source: ${s.name} (${s.cadence}) — ${s.detail}`),
        headlines.length ? `Recent sector headlines:\n${headlines.map((h) => `- ${h.title}`).join("\n")}` : "The newswire is currently unavailable.",
        "Daily generation reports are published as documents with a lag — a dashboard and the official record are different things.",
      ].join("\n");
    },
  },
  "ev-desk": {
    title: "EV charging map",
    async context() {
      const { getChargingStations } = await import("@/lib/ev");
      const { stations, bySource } = await getChargingStations();
      if (!stations.length) return null;
      return [
        `This 3D map shows ${stations.length} EV charging stations across India from open sources: ${bySource["e-AMRIT"]} from NITI Aayog's e-AMRIT list (an old government pilot list) and ${bySource.OSM} mapped by OpenStreetMap volunteers.`,
        "India's official registry (BEE's EV Yatra) reports tens of thousands of public charging stations, but it does not publish an open downloadable list — so this map is a partial picture, denser where volunteer mappers are active (big cities).",
        "Why it matters for the grid: a fast charger can draw as much power as dozens of homes at once, so where chargers cluster changes local electricity demand.",
        "An empty area on this map means 'not mapped in these sources', not necessarily 'no charger there'.",
      ].join("\n");
    },
  },
  "storage-wire": {
    title: "Storage newswire",
    async context() {
      const headlines = await getStorageHeadlines(6);
      if (!headlines.length) return null;
      return [
        "Recent India energy-storage headlines (headline text only — not verified facts):",
        ...headlines.map((h) => `- ${h.title}`),
        "Reading tip: storage tender headlines usually announce a contract award. Built and operating is a later, separate step, often years away.",
      ].join("\n");
    },
  },
} as const;

export type ExplainSection = keyof typeof SECTIONS;

export function isExplainSection(value: string): value is ExplainSection {
  return value in SECTIONS;
}

export type ExplainLang = "en" | "hi";

const SHARED_RULES =
  "Use ONLY the numbers and facts in the supplied context; round numbers naturally. " +
  "Never predict the future, never give investment or safety advice, never invent figures, causes, or sources. " +
  "End with one short sentence on what this section canNOT tell you.";

const SYSTEM_PROMPTS: Record<ExplainLang, string> = {
  en:
    "You explain India's power grid to someone with no background in it — a curious person on a commute. " +
    "Write 4-6 short sentences in simple everyday English. No jargon: spell out what any technical term means in passing " +
    "(e.g. 'MW, a measure of power flowing right now'). Use a simple analogy if it genuinely helps. " +
    SHARED_RULES,
  hi:
    "आप भारत के बिजली ग्रिड को एक आम इंसान को समझा रहे हैं जिसे इस क्षेत्र की कोई जानकारी नहीं है। " +
    "4-6 छोटे वाक्य सरल, रोज़मर्रा की हिंदी में लिखें (आँकड़े और MW जैसी इकाइयाँ अंकों में ही रहने दें)। " +
    "कोई तकनीकी शब्द आए तो उसका मतलब साथ में समझाएँ। ज़रूरत हो तो एक आसान उदाहरण या उपमा दें। " +
    SHARED_RULES,
};

async function generate(section: ExplainSection, lang: ExplainLang): Promise<string | null> {
  if (!glmConfigured()) return null;
  const context = await SECTIONS[section].context();
  if (!context) return null;
  return callGLM(SYSTEM_PROMPTS[lang], `SECTION: ${SECTIONS[section].title}\n\n${context}`, 500);
}

// One cached explanation per section and language; refreshes with the data (15 min).
export async function getSimpleExplanation(
  section: ExplainSection,
  lang: ExplainLang = "en",
): Promise<string | null> {
  const cached = unstable_cache(() => generate(section, lang), ["urja-explain", section, lang], {
    revalidate: 900,
    tags: ["urja-explain"],
  });
  return cached();
}

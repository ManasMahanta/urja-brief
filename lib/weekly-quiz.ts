import { unstable_cache } from "next/cache";
import { callGLM } from "@/lib/glm";
import {
  formatChange,
  getHeadlineIndices,
  getMarketNews,
  getMovers,
  getSectorHeat,
} from "@/lib/market";

export type QuizQuestion = {
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
};

// "This week in the markets" — GLM writes a short multiple-choice quiz from the
// live market feeds. Cached 24h and rebuilt by the daily cron's revalidateTag.
// Returns [] when unconfigured or on any parse failure (section hides).
async function generateQuiz(): Promise<QuizQuestion[]> {
  const [indices, movers, sectors, news] = await Promise.all([
    getHeadlineIndices(),
    getMovers(5),
    getSectorHeat(),
    getMarketNews(8),
  ]);

  const digest = [
    "INDICES:",
    ...indices.map((i) => `- ${i.name}: ${formatChange(i.changePercent)}`),
    "GAINERS:",
    ...movers.gainers.map((m) => `- ${m.name}: ${formatChange(m.changePercent)}`),
    "LOSERS:",
    ...movers.losers.map((m) => `- ${m.name}: ${formatChange(m.changePercent)}`),
    "SECTORS:",
    ...sectors.map((s) => `- ${s.name}: ${formatChange(s.changePercent)}`),
    "HEADLINES:",
    ...news.map((n) => `- ${n.title}`),
  ].join("\n");

  const system =
    "You write a fun but substantive multiple-choice quiz about this week in the " +
    "Indian stock market. Using ONLY the supplied market data, write exactly 6 " +
    "questions that test whether someone followed the week's action (index moves, " +
    "top movers, sector rotation, headlines). Each question has 4 options, exactly " +
    "one correct, with a one-sentence explanation. Base every question on a specific " +
    "item in the data — never invent facts, and never give buy/sell advice. Return " +
    "ONLY minified JSON, no markdown, no prose, in this shape: " +
    '[{"question":"...","options":["a","b","c","d"],"answerIndex":0,"explanation":"..."}]';

  try {
    const raw = await callGLM(system, digest, 4000);
    if (!raw) return [];
    // Extract the JSON array even if wrapped in prose or a code fence.
    const start = raw.indexOf("[");
    const end = raw.lastIndexOf("]");
    if (start === -1 || end <= start) return [];
    const parsed = JSON.parse(raw.slice(start, end + 1)) as QuizQuestion[];
    if (!Array.isArray(parsed)) return [];
    // Keep only well-formed questions.
    return parsed
      .filter(
        (q) =>
          q &&
          typeof q.question === "string" &&
          Array.isArray(q.options) &&
          q.options.length === 4 &&
          typeof q.answerIndex === "number" &&
          q.answerIndex >= 0 &&
          q.answerIndex < 4,
      )
      .slice(0, 6);
  } catch {
    return [];
  }
}

export const getWeeklyQuiz = unstable_cache(generateQuiz, ["weekly-quiz"], {
  revalidate: 86400,
  tags: ["weekly-quiz"],
});

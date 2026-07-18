import { extractText, getDocumentProxy } from "unpdf";

// TEMPORARY diagnostic — reports exactly what Vercel's runtime gets when it
// fetches the NPP coal PDF, so we can tell IP-blocking/WAF from a parse failure.
// Remove once the coal desk is sorted.
export const dynamic = "force-dynamic";

const pad = (n: string) => n;
function istYmd(o: number) {
  const s = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date(Date.now() + o * 86_400_000));
  const [y, m, d] = s.split("-");
  return { y, m, d };
}
const url = (o: number) => {
  const { y, m, d } = istYmd(o);
  return `https://npp.gov.in/public-reports/cea/daily/fuel/${pad(d)}-${pad(m)}-${y}/dailyCoal1-${y}-${pad(m)}-${pad(d)}.pdf`;
};

export async function GET() {
  const out: unknown[] = [];
  for (let o = 1; o <= 2; o++) {
    const u = url(o);
    try {
      const res = await fetch(u, {
        cache: "no-store",
        headers: { "User-Agent": "Mozilla/5.0 UrjaBrief/1.0" },
        signal: AbortSignal.timeout(10_000),
      });
      const buf = new Uint8Array(await res.arrayBuffer());
      const head = new TextDecoder().decode(buf.slice(0, 12));
      let parsed: string | number = "not-attempted";
      if (head.startsWith("%PDF")) {
        try {
          const { text } = await extractText(await getDocumentProxy(buf), { mergePages: true });
          parsed = text.length;
        } catch (e) {
          parsed = `parse-error: ${(e as Error).message}`;
        }
      }
      out.push({ url: u, status: res.status, contentType: res.headers.get("content-type"), bytes: buf.length, head, parsedTextLen: parsed });
    } catch (e) {
      out.push({ url: u, fetchError: (e as Error).cause ? String((e as { cause?: { code?: string } }).cause?.code) : (e as Error).message });
    }
  }
  return Response.json({ region: process.env.VERCEL_REGION ?? "?", results: out });
}

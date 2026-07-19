import { getWeatherDemand } from "@/lib/weather";
import PlainEnglish from "@/components/urja/PlainEnglish";

const dayLabel = (iso: string, todayIso: string) => {
  if (iso === todayIso) return "Today";
  return new Date(iso + "T00:00:00+05:30").toLocaleDateString("en-IN", { weekday: "short", timeZone: "Asia/Kolkata" });
};

// Colour ramp for heat: cool cyan → hot rose. t in [0,1] across 22–44°C.
const heatColor = (c: number) => {
  const t = Math.max(0, Math.min(1, (c - 22) / 22));
  const lerp = (a: number, b: number) => Math.round(a + (b - a) * t);
  return `rgb(${lerp(56, 251)} ${lerp(189, 113)} ${lerp(248, 133)})`;
};

export default async function WeatherDemand() {
  const weather = await getWeatherDemand();
  if (!weather || !weather.forecast.length) return null;

  const todayIso = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
  const maxTemp = Math.max(...weather.forecast.map((f) => f.tempC));

  return (
    <section className="urja-panel p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="urja-kicker">Weather &amp; demand outlook</p>
        <span className="font-mono text-[0.65rem] uppercase tracking-wide text-slate-500">
          demand-weighted across 10 load centres
        </span>
      </div>
      <PlainEnglish>
        Weather drives power use — hot days mean more air-conditioning and higher demand. This is the
        temperature trend across India&apos;s big cities and what it means for the grid.
      </PlainEnglish>

      <p className="mt-3 text-sm leading-relaxed text-slate-300">
        Heat drives demand — air-conditioning and pumping load climb with the temperature. Here&apos;s
        the forecast across India&apos;s big load centres
        {weather.slopeMwPerC
          ? `, with peak demand projected from how it has tracked temperature so far (about ${Math.round(weather.slopeMwPerC).toLocaleString("en-IN")} MW per °C).`
          : "."}
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {weather.forecast.map((f) => (
          <div key={f.date} className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
            <p className="text-xs text-slate-400">{dayLabel(f.date, todayIso)}</p>
            <p className="mt-1 font-mono text-3xl font-semibold" style={{ color: heatColor(f.tempC) }}>
              {f.tempC.toFixed(0)}<span className="text-base font-normal text-slate-400">°C</span>
            </p>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800/60" aria-hidden="true">
              <span className="block h-full rounded-full" style={{ width: `${(f.tempC / maxTemp) * 100}%`, backgroundColor: heatColor(f.tempC) }} />
            </div>
            {f.projectedPeakMw !== null && (
              <p className="mt-2 font-mono text-xs text-cyan-200/80">
                ~{(f.projectedPeakMw / 1000).toFixed(0)} GW peak
              </p>
            )}
          </div>
        ))}
      </div>

      <p className="mt-4 border-t border-cyan-100/10 pt-3 text-xs leading-relaxed text-slate-500">
        {weather.slopeMwPerC
          ? `Projection from a simple fit of ${weather.pairs} days of our observed peaks against temperature — a rough guide, not a forecast; monsoon, humidity and holidays all move demand independently.`
          : "Peak projection appears once enough days of our own demand sampling line up against temperature. Until then this is the temperature outlook only — no invented demand numbers."}
        {" "}Temperature from open-meteo.
      </p>
    </section>
  );
}

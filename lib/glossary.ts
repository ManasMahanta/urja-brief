// Investing & markets glossary: plain-English definitions, editorially maintained.
// Sorted alphabetically at render time; just append new terms here.
// Educational only — nothing here is investment advice.

export type GlossaryTerm = {
  term: string;
  def: string;
};

// URL slug for a term's dedicated page, e.g. "Price-to-Earnings (P/E)" → "price-to-earnings".
export function slugifyTerm(term: string): string {
  return term
    .toLowerCase()
    .replace(/\s*\(.*?\)\s*/g, " ") // drop parenthetical abbreviations
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Look up a single term by its slug.
export function getGlossaryTerm(slug: string): GlossaryTerm | undefined {
  return glossary.find((t) => slugifyTerm(t.term) === slug);
}

// A few other terms to suggest from a term page — simple word-overlap ranking,
// so related definitions cross-link without a hand-maintained graph.
export function relatedTerms(term: GlossaryTerm, count = 4): GlossaryTerm[] {
  const stop = new Set([
    "the", "a", "an", "and", "or", "of", "to", "in", "on", "for", "with",
    "that", "is", "are", "it", "its", "as", "at", "by", "be", "you", "your",
    "not", "into", "than", "from", "this", "each", "how", "why", "what", "one",
  ]);
  const words = (s: string) =>
    new Set(
      s
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 3 && !stop.has(w)),
    );
  const target = words(`${term.term} ${term.def}`);
  return glossary
    .filter((t) => t.term !== term.term)
    .map((t) => {
      const ws = words(`${t.term} ${t.def}`);
      let overlap = 0;
      for (const w of ws) if (target.has(w)) overlap += 1;
      return { t, overlap };
    })
    .sort((a, b) => b.overlap - a.overlap)
    .slice(0, count)
    .map((x) => x.t);
}

export const glossary: GlossaryTerm[] = [
  { term: "Grid", def: "The interconnected network of generators, transmission lines, and distribution systems that moves electricity from plants to consumers. India operates as one synchronous national grid." },
  { term: "Demand met", def: "The load actually being served at a given moment, in MW. It is not the same as demand: if supply falls short, demand met is lower than what consumers wanted to draw." },
  { term: "Peak demand", def: "The highest load on the system during a period, usually a day. India's peak typically lands in the evening when solar output has faded but lighting and cooling loads are high." },
  { term: "Installed capacity", def: "The nameplate maximum output of all generation connected to the grid, in MW or GW. Capacity is potential — actual generation at any moment is far lower and varies by fuel." },
  { term: "Megawatt (MW)", def: "A unit of power — the rate of generation or consumption at an instant. Distinct from energy (MWh or units), which is power sustained over time. A dashboard shows MW; a monthly report shows energy." },
  { term: "Million units (MU)", def: "The common Indian unit for electrical energy: one MU is a gigawatt-hour (10 lakh kWh). Daily generation reports are stated in MU; live dashboards are stated in MW. The two are not interchangeable." },
  { term: "Plant load factor (PLF)", def: "Actual generation as a share of what a plant could produce running flat-out. A thermal fleet at 60% PLF has substantial idle capability — because of demand, fuel, maintenance, or economics." },
  { term: "Capacity utilisation factor (CUF)", def: "The renewable analogue of PLF: energy produced as a share of nameplate potential. Solar in India typically runs near 20% CUF and wind varies strongly by season and site." },
  { term: "Base load", def: "The portion of demand that persists around the clock, traditionally served by coal and nuclear plants that run continuously. The transition question is how much of it storage-backed renewables can carry." },
  { term: "Peaking power", def: "Generation dispatched only during the highest-demand hours, historically gas and hydro. Priced and valued differently from base load because it runs few hours but at critical times." },
  { term: "Merit order despatch", def: "Scheduling generation from cheapest to most expensive per unit until demand is met. The Ministry of Power's MERIT dashboard publishes the live national position that results from it." },
  { term: "DISCOM", def: "A distribution company — the utility that buys power in bulk and delivers it to homes and businesses. DISCOM finances are the sector's persistent stress point, since they sit between fixed tariffs and market costs." },
  { term: "GENCO", def: "A generation company, public or private, that owns and operates power plants — NTPC being the largest. GENCOs sell through long-term PPAs or on the exchanges." },
  { term: "Power purchase agreement (PPA)", def: "A long-term contract, often 25 years, under which a buyer (usually a DISCOM) commits to purchase a plant's output at agreed tariffs. PPAs underwrite most Indian generation investment." },
  { term: "Grid-India (POSOCO)", def: "The national grid operator, formerly POSOCO. Through NLDC and the regional load despatch centres it schedules power, maintains frequency, and publishes the operating record of the grid." },
  { term: "CEA (Central Electricity Authority)", def: "The statutory planning and data authority for Indian power. Its daily, monthly, and annual reports are the source of record for generation, capacity, and demand." },
  { term: "CERC", def: "The Central Electricity Regulatory Commission — sets inter-state tariffs, licenses trading, and regulates the exchanges. State-level equivalents are the SERCs." },
  { term: "MNRE", def: "The Ministry of New and Renewable Energy, which sets renewable targets and schemes (solar parks, PM-KUSUM, rooftop programmes) and publishes renewable capacity data." },
  { term: "Grid frequency", def: "The heartbeat of the AC grid, nominally 50 Hz in India. Frequency falls when demand outruns supply and rises in the opposite case; operations aim to hold a narrow band around 50." },
  { term: "Load despatch centre", def: "The control rooms that schedule and balance the grid in real time — national (NLDC), regional (RLDC), and state (SLDC). Their published schedules and reports are primary operational sources." },
  { term: "Power exchange", def: "A marketplace for short-term electricity trading. IEX handles most exchange volume in India; prices there are a visible stress signal, though most power still moves under long-term PPAs." },
  { term: "Day-ahead market (DAM)", def: "The exchange segment where power for each 15-minute block of tomorrow is bought and sold in a daily auction. Its clearing price is a widely watched indicator of system tightness." },
  { term: "Real-time market (RTM)", def: "The exchange segment trading power for delivery within the hour, in half-hourly auctions. It lets buyers and sellers correct forecasting errors close to delivery." },
  { term: "Market clearing price", def: "The single price at which exchange supply meets demand for a delivery block. Scarcity hours can clear near the price cap; renewable-heavy afternoons can clear near zero." },
  { term: "Deviation settlement mechanism (DSM)", def: "The rulebook that charges or pays participants for deviating from their scheduled drawal or injection, keeping schedules honest and the frequency stable." },
  { term: "Open access", def: "The right of large consumers (typically 1 MW and above) to buy power from someone other than their local DISCOM, using the grid on payment of charges. Green open access rules extend this to renewables." },
  { term: "Renewable purchase obligation (RPO)", def: "The mandated minimum share of consumption that DISCOMs and large consumers must source from renewables. Compliance varies widely by state and is a recurring policy fight." },
  { term: "Curtailment", def: "Ordering a plant — usually wind or solar — to generate less than it could, because of grid constraints or commercial disputes. Curtailment risk directly affects renewable investment economics." },
  { term: "Must-run status", def: "The regulatory principle that renewable plants should be despatched whenever they can generate, and curtailed only for genuine grid security reasons — not commercial convenience." },
  { term: "Round-the-clock (RTC) renewable power", def: "Contracts that blend wind, solar, storage, and sometimes conventional power so the buyer receives a firm, continuous supply rather than weather-shaped output." },
  { term: "Battery energy storage system (BESS)", def: "Grid-connected batteries that absorb surplus power and release it in deficit hours. India's tenders increasingly bundle BESS with solar to shift afternoon energy into the evening peak." },
  { term: "Pumped storage hydro", def: "Twin-reservoir hydro plants that pump water uphill with cheap surplus power and generate on the way down at peak. The oldest and largest-scale form of grid storage; several Indian projects are under construction." },
  { term: "Inter-state transmission system (ISTS)", def: "The high-voltage network that moves power across state borders, operated under central regulation. ISTS charge waivers have been a major incentive shaping where renewable projects get built." },
  { term: "Transmission congestion", def: "When a corridor cannot carry all the power that wants to flow, splitting the market and forcing costlier local generation. Congestion is why transmission build-out matters as much as generation capacity." },
  { term: "AT&C losses", def: "Aggregate technical and commercial losses — the share of energy a DISCOM buys but never bills, from line losses, theft, and billing failures. The headline metric of distribution health." },
  { term: "Coal stock days", def: "How long a thermal plant's coal inventory would last at expected burn. The CEA tracks it daily; plants below the norm are flagged 'critical', an early warning for supply stress." },
  { term: "Captive power", def: "Generation owned by an industrial consumer primarily for its own use, common in metals and cement. Captive demand shifts with industrial cycles and policy on cross-subsidy charges." },
  { term: "Energy transition", def: "The structural shift of the power system toward renewable generation, storage, and electrified demand. In India it is an addition story: renewables grow fastest, while coal still carries the evening peak." },
  { term: "Green energy corridor", def: "Dedicated transmission projects built to evacuate renewable power from resource-rich states to demand centres — the infrastructure that decides whether installed renewable capacity actually reaches the grid." },
  { term: "Distributed renewable energy", def: "Small-scale generation at or near the point of use — rooftop solar, agricultural solar pumps. It reduces grid demand rather than adding visible supply, which complicates demand statistics." },
];

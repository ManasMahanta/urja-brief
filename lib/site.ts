export const site = {
  name: "Urja Brief",
  tagline: "India's power system, decoded",
  description:
    "Urja Brief tracks India's power system — generation, demand, renewables, fuel constraints, and policy — with every signal linked to its source and reporting date.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://urja-brief.example.com",
  author: "Manas Mahanta",
  cadence: "Every week",
};

export const topics: Record<string, { label: string; blurb: string }> = {
  grid: {
    label: "Grid & Demand",
    blurb: "Generation, peak demand, regional supply, and the operating picture behind the grid.",
  },
  renewables: {
    label: "Renewables",
    blurb: "Solar, wind, hydro, storage, curtailment, and the pace of India's energy transition.",
  },
  fuels: {
    label: "Fuel & Supply",
    blurb: "Coal, gas, transmission constraints, and the reliability conditions beneath generation.",
  },
  policy: {
    label: "Policy & Regulation",
    blurb: "CEA, Ministry of Power, MNRE, and regulatory changes with practical system impact.",
  },
  companies: {
    label: "Power Companies",
    blurb: "A market lens on listed generators, transmission operators, and renewable developers.",
  },
};

export function topicLabel(tag: string): string {
  return topics[tag]?.label ?? tag;
}

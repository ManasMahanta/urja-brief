import Loader from "@/components/intel/Loader";

// The dissection can take ~20s on a cold render (one structured GLM call), so
// this boundary narrates the wait instead of leaving a frozen page.
export default function StockLoading() {
  return (
    <Loader
      title="AI Stock Dissection"
      messages={[
        "Fetching the live quote…",
        "Computing price structure…",
        "Running the AI dissection…",
        "Writing the executive briefing…",
        "Scoring risks & catalysts…",
      ]}
    />
  );
}

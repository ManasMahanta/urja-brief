import Loader from "@/components/intel/Loader";

export default function CompareLoading() {
  return (
    <Loader
      title="Fund comparison"
      messages={[
        "Pulling each fund's NAV history…",
        "Lining the windows up…",
        "Measuring risk and drawdowns…",
        "Running the SIP on each…",
        "Working out how they differ…",
      ]}
    />
  );
}

import Loader from "@/components/intel/Loader";

export default function FundLoading() {
  return (
    <Loader
      title="AI Fund Dissection"
      messages={[
        "Pulling the NAV history from AMFI…",
        "Computing returns against the Nifty…",
        "Measuring drawdowns and consistency…",
        "Pricing the Direct-vs-Regular gap…",
        "Lining up category peers…",
      ]}
    />
  );
}

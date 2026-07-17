import Loader from "@/components/intel/Loader";

// Root route-loading boundary: shows instantly while any page below renders.
export default function RootLoading() {
  return (
    <Loader
      title="Bazaar Brief"
      messages={["Reading the tape…", "Pulling live market data…", "Setting the scene…"]}
    />
  );
}

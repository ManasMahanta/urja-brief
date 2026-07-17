// Root route-loading boundary: shows instantly while any page below renders.
export default function RootLoading() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-16 sm:px-6" aria-busy="true">
      <p className="urja-kicker">Urja Brief</p>
      <div className="urja-panel h-56 animate-pulse" />
      <div className="grid gap-4 md:grid-cols-3">
        <div className="urja-panel h-32 animate-pulse" />
        <div className="urja-panel h-32 animate-pulse" />
        <div className="urja-panel h-32 animate-pulse" />
      </div>
    </div>
  );
}

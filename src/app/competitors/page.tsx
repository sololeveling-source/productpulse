export default function CompetitorsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-[28px] font-semibold leading-tight text-zinc-50">
          Competitors
        </h1>
      </div>

      <div className="flex flex-col items-center gap-2 py-16 text-center">
        <h2 className="text-xl font-semibold text-zinc-50">
          No competitors yet
        </h2>
        <p className="max-w-md text-sm font-normal text-zinc-400">
          Add a competitor and the changelog or pricing pages you want ProductPulse to watch.
        </p>
      </div>
    </div>
  );
}

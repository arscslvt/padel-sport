import WhereContent from "@/components/where-content";

export default function WhereStandalonePage() {
  return (
    <section className="relative mx-auto flex min-h-[calc(100dvh-14rem)] w-full max-w-6xl flex-col pb-14">
      <div className="pointer-events-none absolute left-1/2 top-20 h-44 w-44 -translate-x-1/2 rounded-full bg-emerald-400/15 blur-3xl" />
      <div className="relative mb-4 text-center">
        <h1 className="font-heading text-3xl font-bold text-white md:text-4xl">
          Dove siamo
        </h1>
        <p className="mt-2 text-white/80">
          Vieni a trovarci al PadelSport Melilli.
        </p>
      </div>

      <div className="relative rounded-3xl bg-emerald-950/20 py-4 backdrop-blur-sm md:px-6 md:py-6">
        <WhereContent />
      </div>
    </section>
  );
}

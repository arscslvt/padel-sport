import { Heading } from "@/components/ui/heading";
import WhereContent from "@/components/where-content";

export default function WhereStandalonePage() {
  return (
    <section className="mx-auto flex min-h-[calc(100dvh-14rem)] w-full max-w-6xl flex-col px-6 pb-20 lg:px-12">
      <header className="mb-10">
        <Heading as="h1" size="page">
          Dove siamo
        </Heading>
        <p className="text-muted-foreground pt-3 text-sm">
          Vieni a trovarci al PadelSport Melilli.
        </p>
      </header>

      <WhereContent />
    </section>
  );
}

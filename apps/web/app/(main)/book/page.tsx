import type { Metadata } from "next";

import { SumUpFallback } from "@/components/booking/sumup-fallback";
import { Heading } from "@/components/ui/heading";

import { BookingWizard } from "./_components/booking-wizard";

export const metadata: Metadata = {
  title: "Prenota un campo | A.S.D. Padel Sport Melilli",
  description:
    "Prenota il campo da padel a Melilli: scegli giorno, orario e squadra. Se manca qualcuno lo cerchiamo noi, in base al livello della partita.",
};

export default function BookPage() {
  return (
    <section className="mx-auto w-full max-w-3xl px-6 pb-24 lg:px-12">
      <header className="mb-10">
        <Heading as="h1" size="page">
          Prenota un campo
        </Heading>
        <p className="text-muted-foreground max-w-[52ch] pt-3 text-sm leading-relaxed">
          Novanta minuti, quattro giocatori. Ti bastano la mail del tuo account
          e un paio di minuti: il campo lo assegniamo noi alla conferma.
        </p>
      </header>

      <div className="rounded-card bg-muted p-6 sm:p-8 lg:p-10">
        <BookingWizard />
      </div>

      <SumUpFallback />
    </section>
  );
}

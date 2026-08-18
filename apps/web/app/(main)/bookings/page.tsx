import type { Metadata } from "next";

import { Heading } from "@/components/ui/heading";

import { BookingCodeForm } from "./_components/booking-code-form";
import { MyBookings } from "./_components/my-bookings";

export const metadata: Metadata = {
  title: "Le tue prenotazioni | A.S.D. Padel Sport Melilli",
  description:
    "Ritrova le prenotazioni fatte sul sito: codice, QR d'ingresso e invio della conferma via email, senza password.",
  robots: { index: false, follow: false },
};

export default function BookingsPage() {
  return (
    <section className="mx-auto w-full max-w-3xl px-6 pb-24 lg:px-12">
      <header className="mb-10">
        <Heading as="h1" size="page">
          Le tue prenotazioni
        </Heading>
        <p className="text-muted-foreground max-w-[52ch] pt-3 text-sm leading-relaxed">
          La mail di conferma non è arrivata? Verifica il tuo indirizzo e
          ritrova qui codice e QR di ogni partita in programma.
        </p>
      </header>

      <div className="rounded-card bg-muted p-6 sm:p-8 lg:p-10">
        <MyBookings />
      </div>

      <div className="mt-2.5">
        <BookingCodeForm />
      </div>
    </section>
  );
}

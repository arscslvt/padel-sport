import type { Metadata } from "next";

import { BookingCodeForm } from "../_components/booking-code-form";
import { MatchInvites } from "../_components/match-invites";
import { MyBookings } from "../_components/my-bookings";
import { SectionTitle } from "../_components/section-title";

export const metadata: Metadata = { title: "Prenotazioni" };

export default function BookingsPage() {
  return (
    <section aria-labelledby="bookings-title" className="space-y-5">
      <SectionTitle
        id="bookings-title"
        title="Prenotazioni"
        description="Le partite in programma a tuo nome, con il QR per entrare."
      />
      <MatchInvites />
      <div className="rounded-card bg-muted p-6 sm:p-8">
        <MyBookings />
      </div>
      <BookingCodeForm />
    </section>
  );
}

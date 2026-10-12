"use client";

import { useAuth, useClerk, useUser } from "@clerk/nextjs";
import { api } from "@padel-sport/backend/convex/_generated/api";
import type { Id } from "@padel-sport/backend/convex/_generated/dataModel";
import { formatEuro } from "@padel-sport/backend/convex/modules/pricing/lib";
import { useQuery } from "convex/react";
import { CreditCard, QrCode, Send } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { useStartPayment } from "@/components/booking/online-payment";
import { VerifyStep } from "@/components/booking/verify-step";
import { Button } from "@/components/ui/button";
import { formatClubDay, formatClubSlotRange, MAX_PLAYERS } from "@/lib/booking";

/**
 * Le prenotazioni di chi si è verificato, con codice e QR.
 *
 * È la via di recupero quando la mail di conferma non arriva: l'identità si
 * riconosce con lo stesso codice via email del modulo di prenotazione, senza
 * password e senza pagina di login.
 */

const STATUS_LABELS = {
  pending_on_site_payment: "In attesa di conferma",
  accepted_on_site_payment: "Confermata",
  cancelled: "Annullata",
} as const;

export function MyBookings() {
  const { isLoaded: authLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const { signOut } = useClerk();

  const bookings = useQuery(
    api.bookings.mine.default,
    isSignedIn ? {} : "skip",
  );

  const [resending, setResending] = useState<string | null>(null);
  const { pay, starting } = useStartPayment();

  const resend = async (matchId: Id<"openMatches">, code: string) => {
    setResending(code);
    try {
      const response = await fetch("/api/bookings/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.notified) {
        toast.error("Mail non inviata", {
          description: "Riprova fra poco o chiamaci: il codice è qui sopra.",
        });
        return;
      }

      toast.success("Mail inviata", {
        description:
          payload.notified === 1
            ? "Controlla la casella, anche nello spam."
            : `Rimandata a ${payload.notified} indirizzi.`,
      });
    } catch {
      toast.error("Mail non inviata", {
        description: "Controlla la connessione e riprova.",
      });
    } finally {
      setResending(null);
    }
  };

  if (!authLoaded) {
    return (
      <p className="text-muted-foreground py-10 text-sm">Un attimo solo…</p>
    );
  }

  if (!isSignedIn) {
    return <VerifyStep purpose="recover" />;
  }

  if (bookings === undefined) {
    return (
      <p className="text-muted-foreground py-10 text-sm">
        Cerchiamo le tue prenotazioni…
      </p>
    );
  }

  const email = user?.primaryEmailAddress?.emailAddress;

  return (
    <div>
      {bookings.length === 0 ? (
        <div>
          <p className="text-sm font-medium">Nessuna partita in programma</p>
          <p className="text-muted-foreground mt-1 max-w-[52ch] text-sm leading-relaxed">
            Hai prenotato con un'altra email? Esci ed entra con quella. Le
            prenotazioni fatte su SumUp non compaiono qui.
          </p>
        </div>
      ) : (
        /**
         * Le prenotazioni non hanno un riquadro proprio: dentro la superficie
         * grigia della pagina sarebbe una scatola dentro una scatola, che su
         * schermo stretto pesa. I margini negativi annullano il padding della
         * card, così la riga di separazione arriva da un bordo all'altro.
         */
        <ul className="divide-border -mx-6 divide-y sm:-mx-8 lg:-mx-10">
          {bookings.map((booking) => {
            // Estratti prima del JSX: dentro la callback TypeScript non
            // ricorda il restringimento fatto in una condizione più su.
            const { code, matchId } = booking;

            return (
              <li
                key={code ?? booking.bookingDate}
                className="px-6 py-6 first:pt-0 last:pb-0 sm:px-8 lg:px-10"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <p className="text-sm font-medium">
                    {formatClubDay(booking.bookingDate)}
                  </p>
                  <p className="text-muted-foreground text-xs tracking-wide uppercase">
                    {STATUS_LABELS[booking.status]}
                    {booking.payment.paid ? " · Pagata online" : ""}
                  </p>
                </div>

                <p className="text-muted-foreground mt-1 text-sm">
                  {formatClubSlotRange(booking.bookingDate)}
                  {booking.court ? ` · ${booking.court}` : ""} ·{" "}
                  {booking.players.length}/{MAX_PLAYERS} giocatori
                </p>

                {code && (
                  <>
                    <p className="mt-4 font-mono text-lg tracking-[0.2em]">
                      {code}
                    </p>

                    <div className="mt-4 flex flex-col gap-2.5 sm:flex-row">
                      <Button asChild size="pill" variant="outline">
                        <Link href={`/booking/${code}`}>
                          <QrCode className="size-4" />
                          {booking.status === "accepted_on_site_payment"
                            ? "Vedi il QR"
                            : "Vedi la prenotazione"}
                        </Link>
                      </Button>

                      {booking.payment.canPay && (
                        <Button
                          type="button"
                          size="pill"
                          disabled={starting !== null}
                          onClick={() => void pay(code)}
                        >
                          <CreditCard className="size-4" />
                          {starting === code
                            ? "Ti portiamo su SumUp…"
                            : `Paga ora ${formatEuro(booking.payment.amount)}`}
                        </Button>
                      )}

                      {matchId && (
                        <Button
                          type="button"
                          size="pill"
                          variant="ghost"
                          disabled={resending !== null}
                          onClick={() => void resend(matchId, code)}
                        >
                          <Send className="size-4" />
                          {resending === code
                            ? "Invio in corso…"
                            : "Rimanda la mail"}
                        </Button>
                      )}
                    </div>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {email && (
        <p className="text-muted-foreground mt-8 text-xs">
          Accesso come {email} ·{" "}
          <button
            type="button"
            className="hover:text-foreground underline underline-offset-4"
            onClick={() => void signOut()}
          >
            esci
          </button>
        </p>
      )}
    </div>
  );
}

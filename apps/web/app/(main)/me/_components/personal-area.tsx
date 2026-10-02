"use client";

import { useAuth, useClerk } from "@clerk/nextjs";
import { api } from "@padel-sport/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { ArrowRight, Phone } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";

import { VerifyStep } from "@/components/booking/verify-step";
import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Skeleton } from "@/components/ui/skeleton";
import { getInfo } from "@/lib/info";
import { BOOKING_LINK, PERSONAL_AREA_LINK } from "@/lib/links";
import { DURATION, EASE } from "@/lib/motion";

import { BookingCodeForm } from "./booking-code-form";
import { History } from "./history";
import { JoinProgram } from "./join-program";
import { MyBookings } from "./my-bookings";
import { RewardsGrid } from "./rewards-grid";
import { WalletCard } from "./wallet-card";

/**
 * L'area personale: prenotare, ritrovare le prenotazioni, vedere punti e premi.
 *
 * Non c'è niente di nuovo da imparare per entrare: è la stessa verifica via
 * email della prenotazione. Il portafoglio arriva da Convex in tempo reale, così
 * i punti caricati dallo staff compaiono mentre la pagina è aperta.
 */
export function PersonalArea() {
  const { isLoaded, isSignedIn } = useAuth();
  const { signOut } = useClerk();
  const reduce = useReducedMotion();

  const wallet = useQuery(
    api.modules.points.wallet.default,
    isSignedIn ? {} : "skip",
  );

  if (!isLoaded || (isSignedIn && wallet === undefined)) {
    return <AreaSkeleton />;
  }

  if (!isSignedIn) {
    return (
      <div>
        <div className="rounded-card bg-muted p-6 sm:p-8 lg:p-10">
          <VerifyStep purpose="area" />
        </div>
        {/* Per i compagni di squadra senza account: il codice gliel'ha
            passato chi ha prenotato, e la verifica via email non li troverebbe. */}
        <div className="mt-2.5">
          <BookingCodeForm />
        </div>
      </div>
    );
  }

  // Autenticato ma senza scheda: l'account esiste su Clerk e il club non l'ha
  // ancora collegato a nessuno. Succede a chi si è registrato dall'app e non ha
  // mai completato il profilo.
  if (!wallet) {
    return (
      <div className="rounded-card bg-muted p-6 sm:p-8 lg:p-10">
        <p className="font-medium">Il tuo account non è ancora collegato</p>
        <p className="text-muted-foreground mt-2 max-w-[52ch] text-sm leading-relaxed">
          Sei entrato, ma il club non ha ancora una scheda socio a tuo nome.
          Chiamaci o passa in struttura e la colleghiamo noi: da lì vedi punti e
          premi.
        </p>
        <div className="mt-6 flex flex-wrap gap-2.5">
          <Button asChild size="pill">
            <a href={`tel:${getInfo("cell")}`}>
              <Phone className="size-4" />
              Chiamaci
            </a>
          </Button>
          <Button
            variant="ghost"
            size="pill"
            onClick={() => void signOut({ redirectUrl: PERSONAL_AREA_LINK })}
          >
            Esci
          </Button>
        </div>
      </div>
    );
  }

  const rise = (delay: number) => ({
    initial: reduce ? { opacity: 0 } : { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: {
      duration: reduce ? 0.2 : DURATION.base,
      delay: reduce ? 0 : delay,
      ease: EASE,
    },
  });

  return (
    <div className="space-y-16 sm:space-y-20">
      <div className="space-y-2.5">
        <motion.div
          {...rise(0)}
          className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 pb-4"
        >
          <p className="text-muted-foreground text-sm">
            Ciao {wallet.firstName}.{" "}
            <button
              type="button"
              onClick={() => void signOut({ redirectUrl: PERSONAL_AREA_LINK })}
              className="hover:text-foreground underline underline-offset-4"
            >
              Non sei tu?
            </button>
          </p>
          <Button asChild size="pill" className="group active:scale-[0.98]">
            <Link href={BOOKING_LINK}>
              Prenota un campo
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </Button>
        </motion.div>

        <motion.div {...rise(0.08)}>
          {wallet.program.state === "joined" ? (
            <WalletCard wallet={wallet} />
          ) : (
            <JoinProgram
              version={wallet.program.version}
              state={wallet.program.state}
              balance={wallet.balance}
              pendingPoints={wallet.pendingPoints}
            />
          )}
        </motion.div>
      </div>

      <RewardsGrid
        rewards={wallet.rewards}
        balance={wallet.balance}
        canRedeem={wallet.program.state === "joined"}
      />

      {/* `#bookings` è dove atterrano i vecchi link a `/bookings` e il
          rimando dopo una prenotazione (next.config.ts). */}
      <section
        id="bookings"
        aria-labelledby="bookings-title"
        className="scroll-mt-28 space-y-6"
      >
        <Heading as="h2" size="sub" id="bookings-title">
          Le tue prenotazioni
        </Heading>
        <div>
          <div className="rounded-card bg-muted p-6 sm:p-8 lg:p-10">
            <MyBookings />
          </div>
          <div className="mt-2.5">
            <BookingCodeForm />
          </div>
        </div>
      </section>

      <History wallet={wallet} />
    </div>
  );
}

/** Lo scheletro ha la forma della pagina vera: niente salti quando arriva. */
function AreaSkeleton() {
  return (
    <div className="space-y-2.5" aria-busy="true">
      <div className="flex justify-between pb-4">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-11 w-44 rounded-full" />
      </div>
      <Skeleton className="rounded-card h-64 w-full" />
      <div className="grid grid-cols-1 gap-2.5 pt-14 sm:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="rounded-card aspect-[4/5]" />
        <Skeleton className="rounded-card hidden aspect-[4/5] sm:block" />
        <Skeleton className="rounded-card hidden aspect-[4/5] lg:block" />
      </div>
    </div>
  );
}

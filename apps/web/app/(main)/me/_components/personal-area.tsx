"use client";

import { useAuth, useClerk } from "@clerk/nextjs";
import { api } from "@padel-sport/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { ArrowRight, LogOut, Phone } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import areaPhoto from "@/assets/illustrations/personal-area-illustration.webp";

import { VerifyStep } from "@/components/booking/verify-step";
import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Skeleton } from "@/components/ui/skeleton";
import { getInfo } from "@/lib/info";
import { BOOKING_LINK, PERSONAL_AREA_LINK } from "@/lib/links";

import { PersonalAreaProvider } from "./area-context";
import { AreaDock, AreaRail } from "./area-nav";
import { BookingCodeForm } from "./booking-code-form";

/**
 * Il guscio dell'area personale: entrata, intestazione, navigazione.
 *
 * Non c'è niente di nuovo da imparare per entrare: è la stessa verifica via
 * email della prenotazione. Il portafoglio arriva da Convex in tempo reale e
 * lo leggono tutte le sezioni (area-context.tsx), così i punti caricati dallo
 * staff compaiono mentre la pagina è aperta, in qualunque sezione ci si trovi.
 */

/** Ease-out decisa: parte veloce e si posa, come un pannello che arriva. */
const ENTER_EASE = [0.23, 1, 0.32, 1] as const;

export function PersonalArea({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const { signOut } = useClerk();
  const reduce = useReducedMotion();
  const pathname = usePathname();

  const wallet = useQuery(
    api.modules.points.wallet.default,
    isSignedIn ? {} : "skip",
  );

  const signOutHere = () => void signOut({ redirectUrl: PERSONAL_AREA_LINK });

  if (!isLoaded || (isSignedIn && wallet === undefined)) {
    return (
      <Frame>
        <AreaSkeleton />
      </Frame>
    );
  }

  if (!isSignedIn) {
    return (
      <Frame>
        <SignedOut />
      </Frame>
    );
  }

  // Autenticato ma senza scheda: l'account esiste su Clerk e il club non l'ha
  // ancora collegato a nessuno. Succede a chi si è registrato dall'app e non ha
  // mai completato il profilo.
  if (!wallet) {
    return (
      <Frame>
        <Intro title="Area personale" />
        <div className="rounded-card bg-muted p-6 sm:p-8 lg:p-10">
          <p className="font-medium">Il tuo account non è ancora collegato</p>
          <p className="text-muted-foreground mt-2 max-w-[52ch] text-sm leading-relaxed">
            Sei entrato, ma il club non ha ancora una scheda socio a tuo nome.
            Chiamaci o passa in struttura e la colleghiamo noi: da lì vedi punti
            e premi.
          </p>
          <div className="mt-6 flex flex-wrap gap-2.5">
            <Button asChild size="pill">
              <a href={`tel:${getInfo("cell")}`}>
                <Phone className="size-4" />
                Chiamaci
              </a>
            </Button>
            <Button variant="ghost" size="pill" onClick={signOutHere}>
              Esci
            </Button>
          </div>
        </div>
      </Frame>
    );
  }

  return (
    <PersonalAreaProvider value={wallet}>
      <Frame>
        <header className="mb-10 flex flex-wrap items-end justify-between gap-x-8 gap-y-5 lg:mb-14">
          <div>
            <p className="text-muted-foreground text-sm">Area personale</p>
            <Heading as="h1" size="page" className="pt-1 pb-1">
              Ciao, <em>{wallet.firstName}</em>.
            </Heading>
          </div>
          <Button asChild size="pill" className="group active:scale-[0.97]">
            <Link href={BOOKING_LINK}>
              Prenota un campo
              <ArrowRight className="size-4 transition-transform duration-200 ease-out group-hover:translate-x-0.5" />
            </Link>
          </Button>
        </header>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[13.5rem_minmax(0,1fr)] lg:gap-14">
          <AreaRail
            footer={
              <button
                type="button"
                onClick={signOutHere}
                className="text-muted-foreground hover:text-foreground flex h-10 w-full items-center gap-3 rounded-full px-2 text-sm transition-colors"
              >
                <LogOut className="size-4" strokeWidth={1.75} />
                Esci
              </button>
            }
          />

          {/* Ogni sezione entra da poco sotto: abbastanza per dire «è
              cambiato», non tanto da far aspettare chi salta fra le voci. */}
          <motion.div
            key={pathname}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduce ? 0.15 : 0.28, ease: ENTER_EASE }}
            // Lo spazio sotto è quello del dock: senza, l'ultima riga ci
            // finirebbe dietro.
            className="min-w-0 pb-28 lg:pb-0"
          >
            {children}
          </motion.div>
        </div>
      </Frame>

      <AreaDock />
    </PersonalAreaProvider>
  );
}

/**
 * La soglia, come un bento: la foto con il titolo, e accanto due riquadri
 * grigi, l'accesso via email sopra e il codice di prenotazione sotto.
 *
 * Da desktop riprende il login del gestionale, con una foto sua (stesso
 * fotografo dell'hero, crediti nel footer). I tre riquadri hanno
 * lo stesso raggio e lo stesso passo fra loro: è questo che li fa leggere
 * come un pezzo solo. Dentro i riquadri il modulo sta in una colonna stretta
 * e centrata: allineato a sinistra su tutta la larghezza lasciava un vuoto
 * che sembrava un errore. Da telefono i tre riquadri si impilano.
 */
function SignedOut() {
  const reduce = useReducedMotion();

  /* Ogni riquadro entra appena dopo il precedente: si legge l'ordine
     foto, accesso, scorciatoia. Con meno movimento resta la dissolvenza. */
  const tile = (index: number) => ({
    initial: reduce ? { opacity: 0 } : { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: {
      duration: reduce ? 0.2 : 0.55,
      delay: reduce ? 0 : index * 0.08,
      ease: ENTER_EASE,
    },
  });

  return (
    // L'altezza è quella del viewport meno il respiro sopra (`main`) e sotto
    // (`Frame`): la soglia sta tutta in una schermata, senza scroll.
    <div className="grid gap-2.5 lg:min-h-[calc(100dvh-13rem)] lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)_auto]">
      {/* Sotto lg la foto è la cornice dell'hero della home: stessa distanza
          dai bordi del viewport (`--gutter-frame`), angoli arrotondati e la
          pillola della navigazione sopra. I margini negativi annullano il
          respiro di `main` (pt-24, da sm pt-28) e la differenza fra il bordo
          della pagina e quello delle cornici. Sotto lascia la stessa aria che
          c'è ai lati dei riquadri (`--gutter`), al netto del `gap-2.5`. Il
          raggio è concentrico a quello della pillola (`rounded-hero`). Da lg
          torna un riquadro del bento, con il raggio degli altri due. */}
      <motion.div
        {...tile(0)}
        className="rounded-hero lg:rounded-frame relative isolate -mx-[calc(var(--gutter)-var(--gutter-frame))] -mt-[calc(6rem-var(--gutter-frame))] flex min-h-96 flex-col justify-end overflow-hidden max-lg:mb-[calc(var(--gutter)-0.625rem)] sm:-mt-[calc(7rem-var(--gutter-frame))] sm:min-h-[30rem] lg:row-span-2 lg:mx-0 lg:mt-0 lg:min-h-0"
      >
        <Image
          src={areaPhoto}
          alt=""
          fill
          priority
          sizes="(min-width: 1024px) 50vw, 100vw"
          placeholder="blur"
          draggable={false}
          className="pointer-events-none -z-10 object-cover object-right select-none"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-linear-to-t from-black/70 via-black/15 to-transparent"
        />

        <div className="tone-photo p-6 sm:p-9 lg:p-12">
          <Heading as="h1" size="page">
            Area personale
          </Heading>
          <p className="text-foreground/75 mt-3 max-w-[40ch] text-sm leading-relaxed sm:text-base">
            Le tue partite, i tuoi punti e i premi che puoi riscattare al club.
          </p>
        </div>
      </motion.div>

      <motion.div
        {...tile(1)}
        className="rounded-frame bg-muted flex flex-col justify-center p-6 sm:p-9 lg:p-12"
      >
        <div className="w-full sm:mx-auto sm:max-w-sm">
          <VerifyStep purpose="area" />
        </div>
      </motion.div>

      {/* Per i compagni di squadra senza account: il codice gliel'ha passato
          chi ha prenotato, e la verifica via email non li troverebbe. Strada
          secondaria, quindi il riquadro più piccolo. */}
      <motion.div
        {...tile(2)}
        className="rounded-frame bg-muted p-6 sm:p-9 lg:px-12"
      >
        <div className="w-full sm:mx-auto sm:max-w-sm">
          <BookingCodeForm bare />
        </div>
      </motion.div>
    </div>
  );
}

/** Stessa larghezza in ogni stato: entrare non deve far saltare la pagina. */
function Frame({ children }: { children: React.ReactNode }) {
  return <section className="page-container pb-24">{children}</section>;
}

function Intro({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="mb-10">
      <Heading as="h1" size="page">
        {title}
      </Heading>
      {children && (
        <p className="text-muted-foreground max-w-[52ch] pt-3 text-sm leading-relaxed">
          {children}
        </p>
      )}
    </header>
  );
}

/** Lo scheletro ha la forma della pagina vera: niente salti quando arriva. */
function AreaSkeleton() {
  return (
    <div aria-busy="true">
      <div className="mb-10 flex items-end justify-between">
        <div className="space-y-3">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-12 w-64" />
        </div>
        <Skeleton className="hidden h-11 w-44 rounded-full sm:block" />
      </div>
      <Skeleton className="rounded-card h-64 w-full" />
    </div>
  );
}

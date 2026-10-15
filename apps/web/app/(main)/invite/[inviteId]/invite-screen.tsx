"use client";

import { useAuth, useClerk, useUser } from "@clerk/nextjs";
import { api } from "@padel-sport/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { ArrowRight, CalendarPlus, Check, Loader2, QrCode } from "lucide-react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Variants,
} from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import ball from "@/assets/stickers/padel-ball.png";
import { VerifyStep } from "@/components/booking/verify-step";
import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import {
  CLUB_TIME_ZONE,
  formatClubSlotRange,
  MAX_PLAYERS,
} from "@/lib/booking";
import { convexMessage } from "@/lib/clients";
import { EASE } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * La schermata d'invito: una partita sola, quella a cui ti hanno chiamato.
 *
 * È un biglietto su fondo d'inchiostro, e nient'altro: chi ti invita e la
 * risposta da una parte, la partita dall'altra (sotto, da telefono). Nel
 * biglietto il giorno in grande e il campo dall'alto con i quattro posti: chi
 * c'è già, il tuo — tenuto per te, con un anello che respira — e quelli
 * liberi. Il verde è uno solo, ed è tuo: il posto, l'anello, la conferma.
 *
 * Accettare è il momento da festeggiare, ed è il solo che si muove davvero:
 * il tuo posto si riempie, una pallina ci rimbalza sopra, arriva la conferma
 * e i pulsanti diventano quelli che servono adesso, il QR e il calendario. Il
 * resto entra in cascata una volta, all'apertura. Con il movimento ridotto
 * resta solo la dissolvenza.
 */

type Detail = NonNullable<
  FunctionReturnType<typeof api.modules.openMatches.invites.getMine>
>;

/** Ingresso dei blocchi: dal basso, e si posano. Stringa di transform: GPU. */
const ITEM: Variants = {
  hidden: { opacity: 0, transform: "translateY(16px)" },
  show: {
    opacity: 1,
    transform: "translateY(0px)",
    transition: { duration: 0.6, ease: EASE },
  },
};
const ITEM_REDUCED: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.25, ease: "easeOut" } },
};
const STACK: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

/** Molla per i gesti di festa: arriva, rimbalza appena, si ferma. */
const POP = { type: "spring", duration: 0.5, bounce: 0.35 } as const;

/**
 * Le due colonne da desktop: a sinistra chi invita e la risposta, a destra il
 * biglietto, che occupa entrambe le righe. Da telefono è una colonna sola, con
 * la risposta in fondo, sotto al pollice.
 */
const LAYOUT =
  "flex flex-1 flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,27rem)] lg:grid-rows-[1fr_auto_1fr] lg:gap-x-20 xl:gap-x-28";
const AREA_INTRO = "lg:col-start-1 lg:row-start-2";
const AREA_TICKET =
  "mt-10 lg:col-start-2 lg:row-span-3 lg:row-start-1 lg:mt-0 lg:self-center";
const AREA_ACTIONS =
  "mt-auto pt-10 lg:col-start-1 lg:row-start-3 lg:mt-0 lg:self-start lg:pt-10";

export function InviteScreen({ inviteId }: { inviteId: string }) {
  const { isLoaded, isSignedIn } = useAuth();
  const detail = useQuery(
    api.modules.openMatches.invites.getMine,
    isSignedIn ? { inviteId } : "skip",
  );

  return (
    <section className="frame-container pb-6">
      <div className="rounded-hero tone-ink relative isolate flex min-h-[calc(100svh-7.5rem)] flex-col overflow-hidden sm:min-h-[calc(100svh-9rem)]">
        {/* Un solo alone, appena percettibile: dà profondità al nero senza
            diventare un'immagine. */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-48 -left-40 -z-10 size-[36rem] rounded-full bg-emerald-400/[0.07] blur-3xl"
        />
        <div className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 pt-10 pb-8 sm:px-10 sm:pt-14 lg:px-16 lg:py-16">
          {!isLoaded || (isSignedIn && detail === undefined) ? (
            <Skeleton />
          ) : !isSignedIn ? (
            <SignIn />
          ) : !detail ? (
            <NotFound />
          ) : (
            <Invite detail={detail} />
          )}
        </div>
      </div>
    </section>
  );
}

/** L'etichetta sopra il titolo: un punto verde e poche lettere spaziate. */
function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-2.5 text-[11px] font-medium tracking-[0.2em] text-white/50 uppercase">
      <span aria-hidden className="size-1.5 rounded-full bg-emerald-400" />
      {children}
    </p>
  );
}

// ---------------------------------------------------------------------------

function Invite({ detail }: { detail: Detail }) {
  const reduce = Boolean(useReducedMotion());
  const respond = useMutation(api.modules.openMatches.invites.respond);
  const [busy, setBusy] = useState<"accept" | "decline" | null>(null);
  const [confirmDecline, setConfirmDecline] = useState(false);
  // La festa si fa solo se l'accettazione avviene qui, sotto gli occhi di chi
  // guarda: chi riapre il link domani trova la partita confermata e ferma.
  const [celebrate, setCelebrate] = useState(false);

  const { state, invite, bookingCode, you } = detail;
  const { match } = invite;
  const host = match.creator?.name ?? "Un amico";
  const hostFirst = host.split(" ")[0];

  const answer = async (accept: boolean) => {
    setBusy(accept ? "accept" : "decline");
    try {
      await respond({ inviteId: invite.inviteId, accept });
      if (accept) setCelebrate(true);
      setConfirmDecline(false);
    } catch (error) {
      toast.error("Risposta non inviata", {
        description: convexMessage(error, "Riprova fra poco."),
      });
    } finally {
      setBusy(null);
    }
  };

  const item = reduce ? ITEM_REDUCED : ITEM;
  const open = state === "pending";
  const quiet = state !== "pending" && state !== "accepted";

  return (
    <motion.div
      className={LAYOUT}
      variants={STACK}
      initial="hidden"
      animate="show"
    >
      <motion.div variants={item} className={AREA_INTRO}>
        <Eyebrow>
          {invite.circleName
            ? `Invito da ${invite.circleName}`
            : "Invito a una partita"}
        </Eyebrow>
        <div className="mt-6">
          <Title state={state} hostFirst={hostFirst} reduce={reduce} />
        </div>
        <p className="mt-5 max-w-[34ch] text-base leading-relaxed text-white/60">
          {lead(state, host)}
        </p>
      </motion.div>

      <motion.div variants={item} className={AREA_TICKET}>
        <Ticket
          detail={detail}
          you={you}
          celebrate={celebrate}
          reduce={reduce}
          quiet={quiet}
        />
      </motion.div>

      <motion.div variants={item} className={AREA_ACTIONS}>
        {/* Le due versioni dei pulsanti si sovrappongono nella stessa cella
            mentre si danno il cambio: niente buco, niente salto sotto. */}
        <div className="grid [&>*]:[grid-area:1/1]">
          <AnimatePresence initial={false}>
            {open ? (
              <Swap key={confirmDecline ? "confirm" : "answer"} reduce={reduce}>
                {confirmDecline ? (
                  <div>
                    <p className="text-sm leading-relaxed text-white/70">
                      Rifiuti l'invito? Il posto torna libero per {hostFirst}.
                    </p>
                    <div className="mt-4 flex flex-col gap-2.5 sm:flex-row">
                      <Button
                        type="button"
                        size="pill-lg"
                        variant="onPhoto"
                        className="transition-transform duration-150 ease-out active:scale-[0.97] sm:min-w-44"
                        disabled={busy !== null}
                        onClick={() => setConfirmDecline(false)}
                      >
                        Ci ripenso
                      </Button>
                      <Button
                        type="button"
                        size="pill-lg"
                        variant="ghost"
                        className="text-white/60 transition-transform duration-150 ease-out hover:bg-white/[0.06] hover:text-white active:scale-[0.97]"
                        disabled={busy !== null}
                        onClick={() => void answer(false)}
                      >
                        {busy === "decline" && (
                          <Loader2 className="size-4 animate-spin" />
                        )}
                        Sì, rifiuta
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2.5 sm:flex-row">
                    <Button
                      type="button"
                      size="pill-lg"
                      variant="onPhoto"
                      className="transition-transform duration-150 ease-out active:scale-[0.97] sm:min-w-56"
                      disabled={busy !== null}
                      onClick={() => void answer(true)}
                    >
                      {busy === "accept" ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Check className="size-4" />
                      )}
                      Accetto, ci sono
                    </Button>
                    <Button
                      type="button"
                      size="pill-lg"
                      variant="ghost"
                      className="text-white/60 transition-transform duration-150 ease-out hover:bg-white/[0.06] hover:text-white active:scale-[0.97]"
                      disabled={busy !== null}
                      onClick={() => setConfirmDecline(true)}
                    >
                      Non posso
                    </Button>
                  </div>
                )}
              </Swap>
            ) : state === "accepted" && bookingCode ? (
              <Swap key="accepted" reduce={reduce}>
                <div className="flex flex-col gap-2.5 sm:flex-row">
                  <Button
                    asChild
                    size="pill-lg"
                    variant="onPhoto"
                    className="transition-transform duration-150 ease-out active:scale-[0.97] sm:min-w-44"
                  >
                    <Link href={`/booking/${bookingCode}`}>
                      <QrCode className="size-4" />
                      Vedi il QR
                    </Link>
                  </Button>
                  <Button
                    asChild
                    size="pill-lg"
                    variant="ghost"
                    className="text-white/70 transition-transform duration-150 ease-out hover:bg-white/[0.06] hover:text-white active:scale-[0.97]"
                  >
                    <a href={`/booking/${bookingCode}/ics`}>
                      <CalendarPlus className="size-4" />
                      Aggiungi al calendario
                    </a>
                  </Button>
                </div>
              </Swap>
            ) : (
              <Swap key="done" reduce={reduce}>
                <Button
                  asChild
                  size="pill-lg"
                  variant="onPhoto"
                  className="w-full transition-transform duration-150 ease-out active:scale-[0.97] sm:w-auto"
                >
                  <Link href="/me/prenotazioni">
                    Le tue prenotazioni
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </Swap>
            )}
          </AnimatePresence>
        </div>

        <p className="mt-5 text-center text-xs leading-relaxed text-white/40 sm:text-left">
          {open
            ? "Il posto è tuo finché non rispondi."
            : state === "accepted"
              ? "La trovi anche fra le tue prenotazioni, nell'area personale."
              : "Le altre partite sono nell'area personale."}
        </p>
      </motion.div>
    </motion.div>
  );
}

/** Il titolo cambia con lo stato: tondo + corsivo, come i titoli del sito. */
function Title({
  state,
  hostFirst,
  reduce,
}: {
  state: Detail["state"];
  hostFirst: string;
  reduce: boolean;
}) {
  const [lead, accent] =
    state === "pending"
      ? [`${hostFirst} ti vuole`, "in campo."]
      : state === "accepted"
        ? ["Sei in", "squadra."]
        : state === "declined"
          ? ["Alla", "prossima."]
          : state === "cancelled"
            ? ["Partita", "annullata."]
            : ["Partita", "già giocata."];

  return (
    <div className="grid [&>*]:[grid-area:1/1]">
      <AnimatePresence initial={false}>
        <motion.div
          key={state}
          // Il cambio di titolo è un passaggio di stato: un velo di sfocatura
          // fonde le due frasi invece di farle scattare.
          initial={
            reduce
              ? { opacity: 0 }
              : {
                  opacity: 0,
                  filter: "blur(6px)",
                  transform: "translateY(8px)",
                }
          }
          animate={{
            opacity: 1,
            filter: "blur(0px)",
            transform: "translateY(0px)",
          }}
          exit={
            reduce
              ? { opacity: 0 }
              : {
                  opacity: 0,
                  filter: "blur(6px)",
                  transform: "translateY(-6px)",
                }
          }
          transition={{ duration: 0.28, ease: EASE }}
        >
          <Heading
            as="h1"
            size="hero"
            className="text-white lg:text-[clamp(3.5rem,5.2vw,5rem)] lg:leading-[0.98]"
          >
            {lead} <br className="hidden lg:block" />
            <em className="italic">{accent}</em>
          </Heading>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function lead(state: Detail["state"], host: string) {
  switch (state) {
    case "pending":
      return `${host} ti ha tenuto un posto nella sua partita.`;
    case "accepted":
      return "Il tuo posto è confermato. Ci vediamo in campo.";
    case "declined":
      return "Hai rifiutato l'invito: il posto è tornato libero.";
    case "cancelled":
      return "Chi organizzava ha annullato la partita, quindi l'invito non vale più.";
    case "expired":
      return "Questa partita è già passata.";
  }
}

/** Ingresso e uscita dei pulsanti quando cambia lo stato. */
function Swap({
  children,
  reduce,
}: {
  children: React.ReactNode;
  reduce: boolean;
}) {
  return (
    <motion.div
      initial={
        reduce ? { opacity: 0 } : { opacity: 0, transform: "translateY(8px)" }
      }
      animate={{ opacity: 1, transform: "translateY(0px)" }}
      exit={
        reduce ? { opacity: 0 } : { opacity: 0, transform: "translateY(-4px)" }
      }
      transition={{ duration: 0.2, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Il biglietto

const dayParts = (timestamp: number) => {
  const part = (options: Intl.DateTimeFormatOptions) =>
    new Date(timestamp).toLocaleDateString("it-IT", {
      timeZone: CLUB_TIME_ZONE,
      ...options,
    });
  return {
    weekday: part({ weekday: "long" }),
    day: part({ day: "numeric" }),
    month: part({ month: "long" }),
  };
};

function Ticket({
  detail,
  you,
  celebrate,
  reduce,
  quiet,
}: {
  detail: Detail;
  you: Detail["you"];
  celebrate: boolean;
  reduce: boolean;
  quiet: boolean;
}) {
  const { invite, state } = detail;
  const { match } = invite;
  const { weekday, day, month } = dayParts(match.matchDate);
  const filled = match.players.length + match.guests.length;
  const host = match.creator?.name?.split(" ")[0];

  return (
    <div
      className={cn(
        "relative rounded-[2rem] border border-white/[0.09] bg-white/[0.04] transition-opacity duration-300",
        quiet && "opacity-55",
      )}
    >
      <div className="relative flex items-end justify-between gap-6 px-7 pt-7 pb-8">
        <div>
          <p className="text-[11px] font-medium tracking-[0.2em] text-white/45 uppercase">
            {weekday}
          </p>
          <p className="font-display mt-3 text-[6.5rem] leading-[0.78] tracking-[-0.04em] text-white tabular-nums">
            {day}
          </p>
          <p className="font-display mt-2 text-[2rem] leading-none text-white/80 italic">
            {month}
          </p>
        </div>

        <div className="text-right">
          <AnimatePresence initial={false}>
            {state === "accepted" && (
              <motion.span
                key="confirmed"
                initial={
                  celebrate && !reduce
                    ? { opacity: 0, transform: "scale(0.9)" }
                    : false
                }
                animate={{ opacity: 1, transform: "scale(1)" }}
                transition={{ ...POP, delay: 0.35 }}
                className="absolute top-7 right-7 inline-flex items-center gap-1.5 rounded-full bg-emerald-400/[0.12] px-2.5 py-1 text-[11px] font-medium text-emerald-300 ring-1 ring-emerald-400/25"
              >
                <Check aria-hidden className="size-3" strokeWidth={2.5} />
                Confermata
              </motion.span>
            )}
          </AnimatePresence>
          <div>
            <p className="text-xl font-medium tracking-tight text-white tabular-nums">
              {formatClubSlotRange(match.matchDate)}
            </p>
            <p className="mt-1 text-sm text-white/45">
              {[match.court, `${filled} di ${MAX_PLAYERS} giocatori`]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
        </div>
      </div>

      <Perforation />

      <div className="px-7 pt-7 pb-7">
        <Court
          detail={detail}
          you={you}
          celebrate={celebrate}
          reduce={reduce}
        />
        {match.notes && (
          <figure className="mt-7">
            <blockquote className="font-display text-xl leading-snug text-white/80 italic">
              “{match.notes}”
            </blockquote>
            {host && (
              <figcaption className="mt-2 text-xs text-white/40">
                {host}
              </figcaption>
            )}
          </figure>
        )}
      </div>
    </div>
  );
}

/**
 * La perforazione del biglietto: una linea tratteggiata fra due tacche. Le
 * tacche sono cerchi del colore del fondo, tagliati a metà perché si veda solo
 * la parte dentro il biglietto: coprono il bordo e lo interrompono, come un
 * biglietto vero.
 */
function Perforation() {
  return (
    <div aria-hidden className="relative h-px">
      <div className="absolute inset-x-8 top-0 border-t border-dashed border-white/15" />
      <span className="bg-background absolute top-1/2 -left-px size-6 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[0.09] [clip-path:inset(0_0_0_50%)]" />
      <span className="bg-background absolute top-1/2 -right-px size-6 translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[0.09] [clip-path:inset(0_50%_0_0)]" />
    </div>
  );
}

type Seat =
  | { kind: "player"; key: string; name: string; host: boolean }
  | { kind: "you"; key: "you"; joined: boolean }
  | { kind: "free"; key: string };

function seatsOf(detail: Detail, you: Detail["you"]): Seat[] {
  const { match } = detail.invite;
  const joined = match.players.some((p) => p.id === you);
  const others: Seat[] = [
    ...match.players
      .filter((p) => p.id !== you)
      .map((p) => ({
        kind: "player" as const,
        key: p.id,
        name: p.name,
        host: p.id === match.creator?.id,
      })),
    ...match.guests.map((g) => ({
      kind: "player" as const,
      key: g.id,
      name: g.name,
      host: false,
    })),
  ];
  // Chi ha rifiutato o ha perso la partita non ha più un posto da mostrare.
  const mine: Seat[] =
    detail.state === "pending" || detail.state === "accepted"
      ? [{ kind: "you", key: "you", joined }]
      : [];
  const seats = [...others, ...mine].slice(0, MAX_PLAYERS);
  while (seats.length < MAX_PLAYERS) {
    seats.push({ kind: "free", key: `free-${seats.length}` });
  }
  return seats;
}

/**
 * I quattro posti, due per metà campo, con la rete in mezzo: il campo visto
 * dall'alto ridotto a una linea, come sulla tessera.
 */
function Court({
  detail,
  you,
  celebrate,
  reduce,
}: {
  detail: Detail;
  you: Detail["you"];
  celebrate: boolean;
  reduce: boolean;
}) {
  const seats = seatsOf(detail, you);

  return (
    <div className="relative grid grid-cols-2">
      <div
        aria-hidden
        className="absolute inset-y-1 left-1/2 w-px bg-linear-to-b from-transparent via-white/20 to-transparent"
      />
      {[0, 1].map((half) => (
        <ul
          key={half}
          className={cn("grid gap-5", half === 0 ? "pr-5" : "pl-6")}
        >
          {seats.slice(half * 2, half * 2 + 2).map((seat) => (
            <li key={seat.key} className="flex min-w-0 items-center gap-3">
              <SeatView seat={seat} celebrate={celebrate} reduce={reduce} />
            </li>
          ))}
        </ul>
      ))}
    </div>
  );
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

function SeatLabel({
  name,
  role,
  accent,
}: {
  name: string;
  role: string;
  accent?: boolean;
}) {
  return (
    <span className="min-w-0">
      <span className="block truncate text-sm font-medium text-white">
        {name}
      </span>
      <span
        className={cn(
          "block truncate text-xs",
          accent ? "text-emerald-300" : "text-white/40",
        )}
      >
        {role}
      </span>
    </span>
  );
}

function SeatView({
  seat,
  celebrate,
  reduce,
}: {
  seat: Seat;
  celebrate: boolean;
  reduce: boolean;
}) {
  if (seat.kind === "player") {
    return (
      <>
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/[0.08] text-[11px] font-semibold tracking-wide text-white/90 ring-1 ring-white/10">
          {initials(seat.name)}
        </span>
        <SeatLabel
          name={seat.name.split(" ")[0]}
          role={seat.host ? "Organizza" : "In campo"}
        />
      </>
    );
  }

  if (seat.kind === "free") {
    return (
      <>
        <span className="size-10 shrink-0 rounded-full border border-dashed border-white/15" />
        <span className="text-sm text-white/35">Libero</span>
      </>
    );
  }

  // Il tuo posto: tenuto (anello che respira) o preso (pieno, e se è appena
  // successo arriva con la molla, l'onda e la pallina).
  return (
    <>
      <span className="relative flex size-10 shrink-0 items-center justify-center">
        {!seat.joined && !reduce && (
          <motion.span
            aria-hidden
            className="absolute inset-0 rounded-full ring-1 ring-emerald-300"
            animate={{
              opacity: [0.6, 0],
              transform: ["scale(1)", "scale(1.6)"],
            }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeOut" }}
          />
        )}
        {seat.joined ? (
          <>
            {celebrate && !reduce && (
              <motion.span
                aria-hidden
                className="absolute inset-0 rounded-full bg-emerald-300"
                initial={{ opacity: 0.7, transform: "scale(0.9)" }}
                animate={{ opacity: 0, transform: "scale(2.4)" }}
                transition={{ duration: 0.6, ease: EASE }}
              />
            )}
            <motion.span
              className="relative flex size-10 items-center justify-center rounded-full bg-emerald-300 text-[11px] font-semibold text-emerald-950"
              initial={
                celebrate && !reduce
                  ? { opacity: 0, transform: "scale(0.6)" }
                  : false
              }
              animate={{ opacity: 1, transform: "scale(1)" }}
              transition={POP}
            >
              Tu
            </motion.span>
            {celebrate && !reduce && (
              <motion.span
                aria-hidden
                className="pointer-events-none absolute -top-[3px] -right-[3px] size-[18px]"
                initial={{
                  opacity: 0,
                  transform: "translateY(-56px) rotate(-90deg)",
                }}
                animate={{
                  opacity: 1,
                  transform: "translateY(0px) rotate(0deg)",
                }}
                transition={{
                  type: "spring",
                  duration: 0.7,
                  bounce: 0.45,
                  delay: 0.15,
                }}
              >
                <Image src={ball} alt="" sizes="18px" className="size-[18px]" />
              </motion.span>
            )}
          </>
        ) : (
          <span className="relative flex size-10 items-center justify-center rounded-full text-[11px] font-semibold text-emerald-300 ring-1 ring-emerald-300">
            Tu
          </span>
        )}
      </span>
      <SeatLabel
        name="Tu"
        role={seat.joined ? "In squadra" : "Posto per te"}
        accent
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Gli altri casi

function SignIn() {
  const reduce = Boolean(useReducedMotion());
  const item = reduce ? ITEM_REDUCED : ITEM;
  return (
    <motion.div
      className={LAYOUT}
      variants={STACK}
      initial="hidden"
      animate="show"
    >
      <motion.div variants={item} className={AREA_INTRO}>
        <Eyebrow>Invito a una partita</Eyebrow>
        <Heading
          as="h1"
          size="hero"
          className="mt-6 text-white lg:text-[clamp(3.5rem,5.2vw,5rem)] lg:leading-[0.98]"
        >
          Hai un <br className="hidden lg:block" />
          <em className="italic">invito.</em>
        </Heading>
        <p className="mt-5 max-w-[34ch] text-base leading-relaxed text-white/60">
          Qualcuno ti ha tenuto un posto in campo. Entra con la tua email per
          vedere la partita e rispondere.
        </p>
      </motion.div>
      {/* Il modulo è disegnato per le superfici chiare: gli si ridanno i suoi
          colori, che lo scope scuro della pagina aveva sovrascritto. */}
      <motion.div
        variants={item}
        className={cn(
          AREA_TICKET,
          "rounded-[2rem] bg-background p-7 text-foreground [--background:var(--n-50)] [--border:var(--n-200)] [--card:var(--n-0)] [--foreground:var(--n-950)] [--input:var(--n-200)] [--muted-foreground:var(--n-500)] [--muted:var(--n-100)] [--primary-foreground:var(--brand-foreground)] [--primary:var(--brand)]",
        )}
      >
        <VerifyStep purpose="invite" />
      </motion.div>
    </motion.div>
  );
}

function NotFound() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const email = user?.primaryEmailAddress?.emailAddress;
  const path = typeof window === "undefined" ? "/" : window.location.pathname;

  return (
    <div className="flex flex-1 flex-col lg:justify-center">
      <Eyebrow>Invito a una partita</Eyebrow>
      <Heading
        as="h1"
        size="hero"
        className="mt-6 text-white lg:text-[clamp(3.5rem,5.2vw,5rem)] lg:leading-[0.98]"
      >
        Invito <em className="italic">non trovato.</em>
      </Heading>
      <p className="mt-5 max-w-[40ch] text-base leading-relaxed text-white/60">
        Non troviamo questo invito nel tuo account. Forse è arrivato a un'altra
        tua email: entra con quella e riapri il link.
      </p>
      <div className="mt-auto flex flex-col gap-2.5 pt-10 sm:flex-row lg:mt-10 lg:pt-0">
        <Button
          type="button"
          size="pill-lg"
          variant="onPhoto"
          className="transition-transform duration-150 ease-out active:scale-[0.97]"
          onClick={() => void signOut({ redirectUrl: path })}
        >
          Entra con un'altra email
        </Button>
        <Button
          asChild
          size="pill-lg"
          variant="ghost"
          className="text-white/70 hover:bg-white/[0.06] hover:text-white"
        >
          <Link href="/me/prenotazioni">Le tue prenotazioni</Link>
        </Button>
      </div>
      {email && (
        <p className="mt-5 text-xs text-white/40">Accesso come {email}</p>
      )}
    </div>
  );
}

function Skeleton() {
  return (
    <div aria-busy="true" className={LAYOUT}>
      <div className={AREA_INTRO}>
        <div className="h-3 w-40 rounded-full bg-white/[0.08]" />
        <div className="mt-7 h-12 w-4/5 rounded-xl bg-white/[0.08] lg:h-16" />
        <div className="mt-3 h-12 w-3/5 rounded-xl bg-white/[0.08] lg:h-16" />
      </div>
      <div className={cn(AREA_TICKET, "h-96 rounded-[2rem] bg-white/[0.04]")} />
      <div className={AREA_ACTIONS}>
        <div className="h-14 rounded-full bg-white/[0.08] sm:w-56" />
      </div>
    </div>
  );
}

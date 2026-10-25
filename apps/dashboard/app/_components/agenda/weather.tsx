"use client";

import {
  type Closure,
  closureHoursLabel,
  closureOn,
  hourClosuresOn,
  isHourClosure,
  type Schedule,
} from "@padel-sport/backend/convex/modules/settings/schedule";
import {
  CalendarOff,
  ChevronDown,
  CloudLightning,
  CloudOff,
  CloudRain,
  Loader2,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import {
  type ReactNode,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { SlotText } from "slot-text/react";
import { toast } from "sonner";
import "slot-text/style.css";

import { useConfirm } from "@/app/_providers/confirm.provider";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EASE_OUT, UI_DURATION } from "@/lib/motion";
import { cn } from "@/lib/utils";

import { addDays, clubTime, dayKey, dayLabel, shortDayLabel } from "./lib";
import {
  type ClosureProposal,
  clockOf,
  closureProposal,
  conditionIcon,
  conditionLabel,
  playingHours,
  rainChance,
  type Sky,
  skyOf,
  spokenTime,
  type Verdict,
  verdict,
  type WeatherDay,
  type WeatherHour,
} from "./weather-lib";

/**
 * Il meteo al club per il giorno scelto in agenda.
 *
 * Da desktop è un riquadro a destra dell'agenda (`WeatherPanel`); da telefono
 * una riga bassa sotto la striscia dei giorni, che si apre con un tocco
 * (`WeatherWidget`). Dicono la stessa cosa: il cielo, le temperature e un
 * responso in parole («Pioggia probabile, dalle 16 alle 19»), poi ora per ora
 * le probabilità di pioggia nelle ore di apertura.
 *
 * I dati arrivano dalla tabella che il backend riempie due volte al giorno
 * (modules/weather/refresh.ts): qui non si chiama nessun servizio esterno.
 *
 * Il movimento:
 * - all'arrivo i pezzi si mettono a fuoco in cascata (`.weather-reveal`);
 * - cambiando giorno le parole si scambiano sfumando nella sfocatura, che
 *   unisce le due frasi invece di sovrapporle; le temperature rotolano come un
 *   contatore, in su se fa più caldo; le barre della pioggia salgono e
 *   scendono al loro posto, con una curva ease-in-out perché si spostano
 *   sullo schermo, non entrano;
 * - la velatura del riquadro passa da un cielo all'altro in dissolvenza.
 * Chi ha chiesto meno animazioni vede solo le dissolvenze.
 *
 * Quando il tempo è davvero brutto (weather-lib.ts, `closureProposal`) il
 * riquadro propone di chiudere: le ore di pioggia più quelle per asciugare i
 * campi, o tutta la giornata. Chiuso, lo dice al posto della proposta.
 */

/** Open-Meteo prevede sedici giorni, compreso oggi. */
export const FORECAST_DAYS = 16;

type DayWeather =
  | { kind: "loading" }
  | { kind: "missing"; reason: string }
  | {
      kind: "ready";
      weather: WeatherDay;
      verdict: Verdict;
      hours: WeatherHour[];
      proposal: ClosureProposal | null;
      /** Le chiusure già decise per il giorno: tutto il giorno, o fasce. */
      closures: Closure[];
    };

function useDayWeather({
  day,
  today,
  rows,
  schedule,
  now,
}: WeatherProps): DayWeather {
  if (rows === undefined) return { kind: "loading" };

  const weather = rows.find((row) => row.day === day);
  if (!weather) {
    const horizon = addDays(today, FORECAST_DAYS - 1);
    return {
      kind: "missing",
      reason:
        day < today
          ? "Per questo giorno il meteo non è stato salvato."
          : day > horizon
            ? "Le previsioni arrivano circa due settimane prima."
            : "Arriva con il prossimo aggiornamento, a mezzanotte o alle 14.",
    };
  }

  // Il meteo si legge su tutta l'apertura del giorno, anche sulle ore già
  // chiuse per pioggia: altrimenti, chiuso il pomeriggio, il grafico
  // perderebbe proprio le ore di pioggia e il responso direbbe «asciutto».
  const usual = schedule && {
    ...schedule,
    closures: schedule.closures?.filter((closure) => !isHourClosure(closure)),
  };
  const open = playingHours(usual, day);
  const when = day < today ? "past" : day === today ? "today" : "future";
  const fullDay = schedule ? closureOn(schedule, day) : null;
  return {
    kind: "ready",
    weather,
    verdict: verdict(weather, open, when, now),
    hours: weather.hours.filter((hour) => open.includes(hour.hour)),
    proposal: closureProposal(weather, schedule, day, when, now),
    closures: fullDay
      ? [fullDay]
      : schedule
        ? hourClosuresOn(schedule, day)
        : [],
  };
}

interface WeatherProps {
  /** Il giorno che si sta guardando, "AAAA-MM-GG". */
  day: string;
  today: string;
  /** Le righe del meteo; `undefined` finché arrivano. */
  rows: WeatherDay[] | undefined;
  schedule: Schedule | undefined;
  now: number;
  /** Chi può chiudere il club: gli amministratori dello staff. */
  canClose?: boolean;
}

/** Da desktop: il riquadro accanto all'agenda. */
export function WeatherPanel(props: WeatherProps) {
  const state = useDayWeather(props);
  const { day, today } = props;

  if (state.kind === "loading") return <PanelSkeleton />;

  if (state.kind === "missing") {
    return (
      <section
        aria-label="Meteo al club"
        className="bg-card relative overflow-hidden rounded-3xl border p-5"
      >
        <div className="weather-reveal flex flex-col items-start gap-3">
          <CloudOff className="text-muted-foreground/60 size-7" />
          <div className="space-y-1">
            <Swap id={`${dayLabel(day, today)}|${state.reason}`}>
              <p className="text-muted-foreground text-[13px] font-medium">
                {dayLabel(day, today)}
              </p>
              <p className="text-[15px] font-medium">Meteo non disponibile</p>
              <p className="text-muted-foreground text-sm">{state.reason}</p>
            </Swap>
          </div>
        </div>
      </section>
    );
  }

  const { weather, verdict, hours } = state;
  const sky = skyOf(verdict.code);

  return (
    <section
      aria-label="Meteo al club"
      className="bg-card relative overflow-hidden rounded-3xl border"
    >
      <SkyTint sky={sky} />
      <div className="relative space-y-5 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1.5">
            <div className="weather-reveal" style={reveal(0)}>
              <Swap id={dayLabel(day, today)}>
                <p className="text-muted-foreground text-[13px] font-medium">
                  {dayLabel(day, today)}
                </p>
              </Swap>
            </div>
            <Temperatures
              className="weather-reveal"
              style={reveal(1)}
              max={weather.tempMax}
              min={weather.tempMin}
            />
            <div className="weather-reveal" style={reveal(2)}>
              <Swap id={conditionLabel(verdict.code)}>
                <p className="text-muted-foreground text-sm">
                  {conditionLabel(verdict.code)}
                </p>
              </Swap>
            </div>
          </div>
          <SkyIcon
            code={verdict.code}
            className="weather-reveal size-11"
            strokeWidth={1.5}
            style={reveal(0)}
          />
        </div>

        <div className="weather-reveal" style={reveal(3)}>
          <Swap id={`${verdict.title}|${verdict.detail}`}>
            <p className="text-[17px] leading-snug font-semibold tracking-[-0.01em]">
              {verdict.title}
            </p>
            <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
              {verdict.detail}
            </p>
          </Swap>
        </div>

        <RainClosure
          day={day}
          today={today}
          state={state}
          canClose={props.canClose ?? false}
        />

        <HourlyChart
          hours={hours}
          className="weather-reveal"
          style={reveal(4)}
        />

        <Footer
          weather={weather}
          className="weather-reveal"
          style={reveal(5)}
        />
      </div>
    </section>
  );
}

/**
 * Da telefono: una riga bassa, il cielo e il responso. Un tocco la apre sul
 * dettaglio e sulle ore; resta aperta o chiusa anche alla prossima apertura.
 */
export function WeatherWidget(props: WeatherProps) {
  const state = useDayWeather(props);
  const [open, setOpen] = useWeatherOpen();
  const reduce = useReducedMotion();
  const regionId = useId();
  const { day } = props;

  if (state.kind === "loading") {
    return <Skeleton className="h-11 w-full rounded-2xl" />;
  }

  if (state.kind === "missing") {
    return (
      <div className="bg-card weather-reveal flex min-h-11 items-center gap-3 rounded-2xl border px-3.5 py-2.5">
        <CloudOff className="text-muted-foreground/60 size-5 shrink-0" />
        <Swap id={state.reason} className="min-w-0 flex-1">
          <p className="text-muted-foreground truncate text-[13px]">
            {state.reason}
          </p>
        </Swap>
      </div>
    );
  }

  const { weather, verdict, hours } = state;

  return (
    // L'entrata sta su un involucro: la scheda sotto si rimpicciolisce al
    // tocco, e le due trasformazioni non devono pestarsi.
    <div className="weather-reveal">
      <section
        aria-label="Meteo al club"
        className="bg-card relative overflow-hidden rounded-2xl border transition-transform duration-150 ease-(--ease-out) has-[>button:active]:scale-[0.985] motion-reduce:transition-none"
      >
        <SkyTint sky={skyOf(verdict.code)} />
        <button
          type="button"
          aria-expanded={open}
          aria-controls={regionId}
          onClick={() => setOpen(!open)}
          className="relative flex min-h-11 w-full items-center gap-3 px-3.5 py-2.5 text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <SkyIcon code={verdict.code} className="size-5 shrink-0" />
          <Swap inline id={verdict.title} className="min-w-0 flex-1">
            <span className="block truncate text-[14px] font-medium">
              {verdict.title}
            </span>
          </Swap>
          <Temperatures compact max={weather.tempMax} min={weather.tempMin} />
          <ChevronDown
            aria-hidden
            className={cn(
              "text-muted-foreground size-4 shrink-0 transition-transform duration-200 ease-(--ease-out) motion-reduce:transition-none",
              open && "rotate-180",
            )}
          />
        </button>
        {/* La proposta di chiusura resta in vista anche a widget chiuso: è
            l'unica cosa che qui chiede di fare qualcosa. */}
        <RainClosure
          compact
          day={day}
          today={props.today}
          state={state}
          canClose={props.canClose ?? false}
        />
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              id={regionId}
              key="detail"
              initial={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
              animate={{
                opacity: 1,
                height: "auto",
                transition: { duration: 0.3, ease: EASE_OUT },
              }}
              exit={{
                opacity: 0,
                ...(reduce ? {} : { height: 0 }),
                transition: { duration: 0.2, ease: EASE_OUT },
              }}
              className="relative overflow-hidden"
            >
              <div className="space-y-4 px-3.5 pt-0.5 pb-3.5">
                <Swap id={`${conditionLabel(verdict.code)}|${verdict.detail}`}>
                  <p className="text-muted-foreground text-[13px] leading-relaxed">
                    {conditionLabel(verdict.code)}. {verdict.detail}
                  </p>
                </Swap>
                <HourlyChart hours={hours} />
                <Footer weather={weather} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </div>
  );
}

/**
 * La proposta di chiudere per maltempo, o la chiusura già decisa.
 *
 * La proposta dice quando piove, quanto, e fino a quando i campi restano
 * bagnati; i due pulsanti chiudono quelle ore o tutta la giornata, il
 * principale è quello che conviene. Prima di chiudere si chiede conferma:
 * sito e app smettono subito di accettare prenotazioni. Le partite già prese
 * restano, e lo staff le trova in agenda (come le chiusure di Configurazione).
 *
 * Chiudere spetta agli amministratori: gli altri vedono l'avviso senza
 * pulsanti. Fatta la chiusura, Convex aggiorna gli orari e al posto della
 * proposta compare la chiusura, con lo stesso scambio sfocato delle parole.
 */
function RainClosure({
  day,
  today,
  state,
  canClose,
  compact,
}: {
  day: string;
  today: string;
  state: Extract<DayWeather, { kind: "ready" }>;
  canClose: boolean;
  compact?: boolean;
}) {
  const confirm = useConfirm();
  const router = useRouter();
  const [busy, setBusy] = useState<"hours" | "day" | null>(null);
  const { proposal, closures } = state;

  const close = async (whole: boolean) => {
    if (!proposal) return;
    const label = whole
      ? day === today
        ? "il club oggi"
        : `il club ${dayLabel(day, today).toLowerCase()}`
      : rangesLabel(proposal);

    const ok = await confirm({
      title: `Chiudere ${label}?`,
      description: `Sito e app non accetteranno prenotazioni ${whole ? "per tutta la giornata" : "in quelle ore"}. Le partite già prese restano in agenda: annullale tu, avvisando i clienti.`,
      confirmLabel: "Chiudi",
      cancelLabel: "Indietro",
    });
    if (!ok) return;

    setBusy(whole ? "day" : "hours");
    try {
      const bodies = whole
        ? [{ from: day, to: day, reason: "Maltempo" }]
        : proposal.ranges.map((range) => ({
            from: day,
            to: day,
            start: clockOf(range.start),
            end: clockOf(range.end),
            reason: "Maltempo",
          }));
      let affected = 0;
      for (const body of bodies) {
        const response = await fetch("/api/dashboard/closures", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(payload?.error ?? "Riprova fra poco.");
        }
        affected += payload?.affected ?? 0;
      }

      if (affected > 0) {
        toast.warning("Club chiuso per maltempo", {
          description: `${affected} ${affected === 1 ? "partita resta" : "partite restano"} in agenda ${whole ? "in quel giorno" : "in quelle ore"}. Annullale tu, avvisando i clienti.`,
          duration: 10_000,
        });
      } else {
        toast.success("Club chiuso per maltempo", {
          description: `Sito e app non accettano prenotazioni ${whole ? "per tutta la giornata" : "in quelle ore"}.`,
          action: {
            label: "Chiusure",
            onClick: () => router.push("/settings"),
          },
        });
      }
    } catch (error) {
      toast.error("Impossibile chiudere", {
        description:
          error instanceof Error ? error.message : "Riprova fra poco.",
      });
    } finally {
      setBusy(null);
    }
  };

  const view = closures.length > 0 ? "closed" : proposal ? "proposal" : "none";

  /**
   * Da desktop la proposta è un riquadro dentro il riquadro del meteo; da
   * telefono no: il widget è già una scheda stretta, e una seconda cornice
   * dentro mangerebbe spazio e si leggerebbe come un oggetto a parte. Lì sta
   * sotto la riga del meteo, separata da un filo.
   *
   * I pulsanti da telefono sono alti 44 punti, come vuole iOS per un dito; il
   * secondario è bianco con il bordo, non grigio sul fondo azzurrino del
   * cielo, dove spariva.
   */
  const frame = compact
    ? "border-rain/20 mx-3.5 border-t pt-3 pb-3.5"
    : "rounded-2xl border p-3.5";

  // Si anima solo quando cambia quel che si legge: due giorni con la stessa
  // proposta (o la stessa chiusura) non fanno ripartire lo scambio.
  const contentKey =
    view === "closed"
      ? `closed|${closures.map((closure) => closureHoursLabel(closure) ?? "giorno").join("+")}|${closures[0].reason ?? ""}`
      : proposal
        ? `proposal|${proposal.storm}|${rainLabel(proposal)}|${rangesLabel(proposal)}|${proposalDetail(proposal)}`
        : view;

  /**
   * Passando a un giorno che ha (o non ha più) una proposta o una chiusura,
   * la scheda non scatta: si allunga o si accorcia seguendo il contenuto, che
   * entra ed esce sfocato. Quando il contenuto cambia (proposta → chiusura),
   * l'altezza segue morbida mentre le parole si scambiano.
   *
   * Da desktop lo spazio verso il grafico sta dentro il pezzo che si apre
   * (`pb-5`), e il suo margine è zero: `space-y-5` dà a ogni figlio 20px di
   * margine sotto, e un margine fuori non si chiuderebbe con lui (il vuoto
   * raddoppiava, e a pezzo chiuso scattava di 20px).
   */
  const reduce = useReducedMotion();
  const hidden = reduce
    ? { opacity: 0, height: 0 }
    : { opacity: 0, height: 0, filter: "blur(4px)" };

  return (
    <AnimatePresence initial={false}>
      {view !== "none" && (
        <motion.div
          key="rain-closure"
          initial={hidden}
          animate={{
            opacity: 1,
            height: "auto",
            filter: "blur(0px)",
            transition: { duration: 0.32, ease: EASE_OUT },
          }}
          exit={{
            ...hidden,
            transition: { duration: 0.22, ease: EASE_OUT },
          }}
          className={cn("overflow-hidden", !compact && "!mb-0")}
        >
          <AutoHeight className={cn(compact ? "relative" : "pb-5")}>
            <Swap id={contentKey}>
              {view === "closed" ? (
                <div
                  className={cn(
                    "text-warning-foreground flex items-center gap-3 text-[13px] leading-snug",
                    frame,
                    compact
                      ? "border-warning-border"
                      : "bg-warning-subtle border-warning-border py-2.5",
                  )}
                >
                  <CalendarOff className="size-4 shrink-0" />
                  <span>
                    <span className="font-medium">
                      {closures.some((closure) => !isHourClosure(closure))
                        ? "Club chiuso tutto il giorno"
                        : `Chiuso ${closures.map((closure) => closureHoursLabel(closure)).join(" e ")}`}
                    </span>
                    {closures[0].reason
                      ? `, ${closures[0].reason.toLowerCase()}`
                      : ""}
                    .
                  </span>
                </div>
              ) : proposal ? (
                <div
                  className={cn(
                    "space-y-3",
                    frame,
                    !compact && "border-rain/25 bg-rain/[0.07]",
                  )}
                >
                  <div className="flex gap-3">
                    {proposal.storm ? (
                      <CloudLightning className="text-rain mt-0.5 size-5 shrink-0" />
                    ) : (
                      <CloudRain className="text-rain mt-0.5 size-5 shrink-0" />
                    )}
                    <div className="min-w-0 space-y-0.5">
                      <p className="text-[15px] leading-snug font-semibold md:text-[14px]">
                        {proposal.storm ? "Temporali" : "Pioggia forte"}{" "}
                        {rainLabel(proposal)}
                      </p>
                      <p className="text-muted-foreground text-[13px] leading-relaxed">
                        {proposalDetail(proposal)}
                      </p>
                    </div>
                  </div>
                  {canClose ? (
                    <div
                      className={cn(
                        "flex gap-2",
                        proposal.fullDay ? "flex-col-reverse" : "flex-col",
                        !compact && "xl:flex-row",
                      )}
                    >
                      <ClosureButton
                        primary={!proposal.fullDay}
                        busy={busy === "hours"}
                        disabled={busy !== null}
                        onClick={() => void close(false)}
                      >
                        Chiudi {rangesLabel(proposal)}
                      </ClosureButton>
                      <ClosureButton
                        primary={proposal.fullDay}
                        busy={busy === "day"}
                        disabled={busy !== null}
                        onClick={() => void close(true)}
                      >
                        Chiudi tutto il giorno
                      </ClosureButton>
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-xs">
                      Può chiudere il club un amministratore dello staff.
                    </p>
                  )}
                </div>
              ) : null}
            </Swap>
          </AutoHeight>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Un pulsante della proposta: pieno quello che conviene, bianco con il bordo
 * l'altro. Alto 44 punti da telefono, più basso da desktop; al tocco si
 * abbassa appena, per dire che l'ha sentito.
 */
function ClosureButton({
  primary,
  busy,
  disabled,
  onClick,
  children,
}: {
  primary: boolean;
  busy: boolean;
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Button
      variant={primary ? "default" : "outline"}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "h-11 flex-1 rounded-full text-[15px] font-medium transition-transform duration-150 ease-(--ease-out) active:scale-[0.97] md:h-9 md:text-sm",
        !primary &&
          "bg-card text-foreground border-foreground/15 dark:bg-card dark:border-foreground/20 shadow-none",
      )}
    >
      {busy && <Loader2 className="size-4 animate-spin" />}
      {children}
    </Button>
  );
}

/** «dalle 16 alle 19»: quando piove, senza l'asciugatura. */
function rainLabel(proposal: ClosureProposal): string {
  if (proposal.ranges.length > 1) return "in più momenti della giornata";
  const [range] = proposal.ranges;
  return `dalle ${spokenTime(range.rainStart)} alle ${spokenTime(range.rainEnd)}`;
}

/** «dalle 16 alle 21», o «nelle ore di pioggia»: quel che si chiude. */
function rangesLabel(proposal: ClosureProposal): string {
  if (proposal.ranges.length > 1) return "nelle ore di pioggia";
  const [range] = proposal.ranges;
  return `dalle ${spokenTime(range.start)} alle ${spokenTime(range.end)}`;
}

function proposalDetail(proposal: ClosureProposal): string {
  const amount = `Circa ${String(proposal.mm).replace(".", ",")} mm, fino al ${proposal.chance}%.`;
  if (proposal.fullDay) {
    return `${amount} Con il tempo per asciugare i campi resta troppo poco per giocare: conviene chiudere tutta la giornata.`;
  }
  if (proposal.ranges.length > 1) {
    return `${amount} Le fasce da chiudere comprendono il tempo per asciugare i campi.`;
  }
  const [range] = proposal.ranges;
  const drying = range.end - range.rainEnd;
  if (drying <= 0)
    return `${amount} Fino alla chiusura i campi restano bagnati.`;
  const wait =
    drying === 60
      ? " ancora un'ora"
      : drying % 60 === 0
        ? ` ancora ${drying / 60} ore`
        : "";
  return `${amount} I campi restano bagnati${wait} dopo la pioggia: si riapre alle ${spokenTime(range.end)}.`;
}

/**
 * Un contenitore che segue l'altezza del suo contenuto con un'animazione:
 * quando dentro una frase lascia il posto a un'altra più lunga o più corta,
 * il bordo sotto scivola invece di saltare. L'altezza si misura
 * (`ResizeObserver`) e si anima davvero, come la striscia dei giorni che si
 * apre a calendario (day-navigator.tsx): uno `scale` deformerebbe il testo.
 */
function AutoHeight({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const reduce = useReducedMotion();
  const content = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | "auto">("auto");

  useLayoutEffect(() => {
    const node = content.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) =>
      setHeight(entry.borderBoxSize[0]?.blockSize ?? entry.contentRect.height),
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <motion.div
      initial={false}
      animate={{ height }}
      transition={reduce ? { duration: 0 } : { duration: 0.3, ease: EASE_OUT }}
      className="overflow-hidden"
    >
      <div ref={content} className={className}>
        {children}
      </div>
    </motion.div>
  );
}

const reveal = (index: number) => ({ "--i": index }) as React.CSSProperties;

/**
 * Lo scambio delle parole al cambio di giorno: la frase vecchia si sfoca e
 * sparisce mentre la nuova arriva da sfocata. Insieme, senza aspettarsi
 * (`popLayout`), e breve: si cambia giorno molte volte di fila.
 */
function Swap({
  id,
  inline,
  className,
  children,
}: {
  id: string;
  /** Dentro un pulsante, dove un `div` non può stare. */
  inline?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const reduce = useReducedMotion();
  const hidden = reduce
    ? { opacity: 0 }
    : { opacity: 0, filter: "blur(4px)", transform: "translateY(3px)" };
  const Wrapper = inline ? "span" : "div";
  const Item = inline ? motion.span : motion.div;

  return (
    <Wrapper className={cn("relative block", className)}>
      <AnimatePresence mode="popLayout" initial={false}>
        <Item
          key={id}
          className="block"
          initial={hidden}
          animate={{
            opacity: 1,
            filter: "blur(0px)",
            transform: "translateY(0px)",
            transition: { duration: UI_DURATION.enter, ease: EASE_OUT },
          }}
          exit={{
            ...hidden,
            transition: { duration: UI_DURATION.exit, ease: EASE_OUT },
          }}
        >
          {children}
        </Item>
      </AnimatePresence>
    </Wrapper>
  );
}

/**
 * L'icona del cielo. Quando cambia, la vecchia si rimpicciolisce sfocandosi e
 * la nuova cresce al suo posto: stanno una sopra l'altra.
 */
function SkyIcon({
  code,
  className,
  style,
  strokeWidth = 2,
}: {
  code: number;
  className?: string;
  /** Più sottile quando l'icona è grande. */
  strokeWidth?: number;
  style?: React.CSSProperties;
}) {
  const reduce = useReducedMotion();
  const Icon = conditionIcon(code);
  const hidden = reduce
    ? { opacity: 0 }
    : { opacity: 0, filter: "blur(4px)", transform: "scale(0.8)" };

  return (
    <span
      aria-hidden
      className={cn("grid shrink-0 *:col-start-1 *:row-start-1", className)}
      style={style}
    >
      <AnimatePresence initial={false}>
        <motion.span
          key={Icon.displayName ?? code}
          initial={hidden}
          animate={{
            opacity: 1,
            filter: "blur(0px)",
            transform: "scale(1)",
            transition: { duration: 0.3, ease: EASE_OUT },
          }}
          exit={{
            ...hidden,
            transition: { duration: UI_DURATION.exit, ease: EASE_OUT },
          }}
          className="grid"
        >
          <Icon className="size-full" strokeWidth={strokeWidth} />
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

/**
 * La velatura del cielo dietro il riquadro: una per tipo di cielo, una sopra
 * l'altra, e si accende quella del giorno. Un gradiente non si anima, la sua
 * opacità sì.
 */
function SkyTint({ sky }: { sky: Sky }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {(["sun", "cloud", "rain", "storm"] as const).map((tint) => (
        <div
          key={tint}
          className={cn(
            "absolute inset-0 transition-opacity duration-700 ease-out",
            tint === sky ? "opacity-100" : "opacity-0",
          )}
          style={{
            background: `radial-gradient(120% 90% at 100% 0%, var(--weather-${tint}), transparent 70%)`,
          }}
        />
      ))}
    </div>
  );
}

/**
 * Massima e minima. Cambiando giorno le cifre rotolano come un contatore: in
 * su se fa più caldo, in giù se fa più freddo.
 */
function Temperatures({
  max,
  min,
  compact,
  className,
  style,
}: {
  max: number;
  min: number;
  compact?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  const reduce = useReducedMotion();
  const previous = useRef(max);
  const direction: "up" | "down" = max >= previous.current ? "up" : "down";
  useEffect(() => {
    previous.current = max;
  }, [max]);

  const roll = reduce
    ? { direction, duration: 0, stagger: 0 }
    : { direction, duration: 380, stagger: 50 };
  const high = `${Math.round(max)}°`;
  const low = `${Math.round(min)}°`;

  // Uno `span`: da telefono sta dentro un pulsante, dove un `p` non può stare.
  return (
    <span
      className={cn(
        "flex shrink-0 items-baseline tabular-nums",
        compact ? "gap-1.5 text-[13px]" : "gap-2",
        className,
      )}
      style={style}
    >
      <span className="sr-only">
        Massima {high}, minima {low}
      </span>
      <SlotText
        aria-hidden
        text={high}
        options={roll}
        className={cn(
          "font-semibold",
          compact
            ? "text-foreground"
            : "text-[2.75rem] leading-none tracking-[-0.04em]",
        )}
      />
      <SlotText
        aria-hidden
        text={low}
        options={roll}
        className={cn("text-muted-foreground", !compact && "text-xl")}
      />
    </span>
  );
}

/**
 * Le ore di apertura, ognuna con il suo cielo, la temperatura e una barra per
 * la probabilità di pioggia. Niente binario dietro le barre: conta solo
 * quanto sono alte.
 *
 * Ogni barra è una pillola alta quanto il grafico, spinta in giù e ritagliata
 * dal suo contenitore: così resta tonda in cima a ogni altezza, cosa che uno
 * `scaleY` non farebbe. Cambiando giorno scivola alla nuova altezza; quando
 * compare la prima volta sale dal fondo (`@starting-style`).
 */
function HourlyChart({
  hours,
  className,
  style,
}: {
  hours: WeatherHour[];
  className?: string;
  style?: React.CSSProperties;
}) {
  if (hours.length === 0) return null;

  return (
    <div className={className} style={style}>
      <ol className="sr-only">
        {hours.map((hour) => (
          <li key={hour.hour}>
            Ore {hour.hour}: {Math.round(hour.temp)}°,{" "}
            {conditionLabel(hour.code).toLowerCase()}, pioggia al{" "}
            {rainChance(hour)}%
          </li>
        ))}
      </ol>
      <div
        aria-hidden
        className="grid"
        style={{
          gridTemplateColumns: `repeat(${hours.length}, minmax(0, 1fr))`,
        }}
      >
        {hours.map((hour, index) => {
          const chance = rainChance(hour);
          const Icon = conditionIcon(hour.code, hour.isDay);
          return (
            <div key={hour.hour} className="flex flex-col items-center gap-1.5">
              <Icon className="text-muted-foreground size-3.5 stroke-[1.75]" />
              <span className="text-[11px] font-medium tabular-nums">
                {Math.round(hour.temp)}°
              </span>
              <span className="relative h-12 w-1.5 overflow-hidden rounded-full">
                <span
                  className={cn(
                    "absolute inset-0 rounded-full transition-[transform,background-color] duration-[420ms] ease-[cubic-bezier(0.77,0,0.175,1)] [transform:translateY(calc((1_-_var(--p))_*_100%))] motion-reduce:transition-none starting:[transform:translateY(100%)]",
                    chance >= 10 ? "bg-rain" : "bg-foreground/15",
                  )}
                  style={
                    {
                      "--p": Math.max(0.1, chance / 100),
                      transitionDelay: `${index * 14}ms`,
                    } as React.CSSProperties
                  }
                />
              </span>
              <span className="text-muted-foreground text-[11px] tabular-nums">
                {hour.hour}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Tramonto, vento, e da dove vengono i dati (CC BY 4.0 lo chiede). */
function Footer({
  weather,
  className,
  style,
}: {
  weather: WeatherDay;
  className?: string;
  style?: React.CSSProperties;
}) {
  const fetchedDay = dayKey(weather.fetchedAt);
  const today = dayKey(Date.now());
  const updated =
    fetchedDay === today
      ? `Aggiornato alle ${clubTime(weather.fetchedAt)}`
      : `Aggiornato ${shortDayLabel(fetchedDay, today).toLowerCase()} alle ${clubTime(weather.fetchedAt)}`;

  return (
    <div className={cn("space-y-1.5", className)} style={style}>
      <p className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-[13px] tabular-nums">
        {weather.sunset && <span>Tramonto {weather.sunset}</span>}
        {weather.gustsMax !== undefined && (
          <span>Raffiche fino a {weather.gustsMax} km/h</span>
        )}
      </p>
      <p className="text-muted-foreground/80 text-[11px]">
        {updated}, dati{" "}
        <a
          href="https://open-meteo.com/"
          target="_blank"
          rel="noreferrer"
          className="hover:text-foreground underline-offset-2 transition-colors hover:underline"
        >
          Open-Meteo
        </a>
      </p>
    </div>
  );
}

/** La forma del riquadro mentre arriva: niente salta quando c'è. */
function PanelSkeleton() {
  return (
    <div className="bg-card space-y-5 rounded-3xl border p-5">
      <div className="flex items-start justify-between">
        <div className="space-y-2.5">
          <Skeleton className="h-3.5 w-12" />
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-3.5 w-20" />
        </div>
        <Skeleton className="size-11 rounded-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4.5 w-40" />
        <Skeleton className="h-3.5 w-full" />
      </div>
      <Skeleton className="h-24 w-full rounded-xl" />
    </div>
  );
}

/** Da telefono: il widget aperto o chiuso, ricordato nel browser. */
function useWeatherOpen(): [boolean, (open: boolean) => void] {
  const [open, setOpen] = useState(false);

  // Letto dopo il primo render, come use-hide-cancelled.ts: il server non sa
  // cosa ha scelto questo browser.
  useEffect(() => {
    try {
      setOpen(window.localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      // Memoria del browser non disponibile: resta chiuso.
    }
  }, []);

  const update = (next: boolean) => {
    setOpen(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    } catch {
      // Senza memoria la scelta vale fino alla prossima apertura.
    }
  };

  return [open, update];
}

const STORAGE_KEY = "dashboard-agenda-weather-open";

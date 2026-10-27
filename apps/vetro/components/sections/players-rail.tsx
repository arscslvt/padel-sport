"use client";

import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CalendarPlusIcon,
  ChecksIcon,
  WhatsappLogoIcon,
} from "@phosphor-icons/react/dist/ssr";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { Reveal, Words } from "@/components/motion/reveal";
import {
  Initials,
  StatusBadge,
  Surface,
} from "@/components/product/primitives";
import { headingVariants } from "@/components/site/heading";
import { Button } from "@/components/ui/button";
import { ANCHORS } from "@/lib/brand";
import { cn } from "@/lib/utils";

/**
 * Il lato dei giocatori: quello che vede chi prenota.
 *
 * Una fila di schede da scorrere di lato, che parte allineata al testo e
 * arriva fino al bordo dello schermo: si capisce che continua. Lo scorrimento
 * è quello nativo, con l'aggancio a ogni scheda; i due tasti fanno lo stesso
 * per chi usa il mouse e non ha un trackpad.
 */
export function PlayersRail() {
  const rail = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });

  const measure = useCallback(() => {
    const el = rail.current;
    if (!el) return;
    setEdges({
      start: el.scrollLeft < 8,
      end: el.scrollLeft + el.clientWidth > el.scrollWidth - 8,
    });
  }, []);

  useEffect(() => {
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure]);

  const step = (direction: 1 | -1) => {
    const el = rail.current;
    const card = el?.querySelector("li");
    if (!el || !card) return;
    el.scrollBy({
      left: direction * (card.clientWidth + 12),
      behavior: "smooth",
    });
  };

  return (
    <section id={ANCHORS.players} className="overflow-x-clip py-24 sm:py-32">
      <div className="page-container flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
        <h2
          className={cn(headingVariants({ size: "section" }), "max-w-[15ch]")}
        >
          <Words
            lead="E i tuoi giocatori"
            accent="se ne accorgono."
            accentClassName="text-brand"
          />
        </h2>
        <div className="flex gap-2">
          <Button
            variant="glass"
            size="icon"
            aria-label="Indietro"
            disabled={edges.start}
            onClick={() => step(-1)}
          >
            <ArrowLeftIcon />
          </Button>
          <Button
            variant="glass"
            size="icon"
            aria-label="Avanti"
            disabled={edges.end}
            onClick={() => step(1)}
          >
            <ArrowRightIcon />
          </Button>
        </div>
      </div>

      <Reveal className="mt-12">
        <ul
          ref={rail}
          onScroll={measure}
          className={cn(
            "flex snap-x snap-mandatory gap-3 overflow-x-auto pb-6 [scrollbar-width:none]",
            // Il primo bordo segue il testo, l'ultimo arriva al bordo dello
            // schermo: la fila si legge come qualcosa che continua.
            "px-(--rail-inset) scroll-px-(--rail-inset) [--rail-inset:max(var(--gutter),calc((100vw-var(--page-max))/2))]",
          )}
        >
          <Card
            title="Prenota in pochi tocchi"
            body="Giorno, ora e compagni dal telefono, a qualsiasi ora. Senza chiamare."
          >
            <SlotsVisual />
          </Card>
          <Card
            title="Invita gli amici su WhatsApp"
            body="Un link nel gruppo, e chi lo apre entra nella partita."
            className="bg-club text-white [--muted-foreground:oklch(1_0_0/72%)]"
          >
            <InviteVisual />
          </Card>
          <Card
            title="Trova compagni del suo livello"
            body="Le partite aperte mostrano chi cerca giocatori, e di che livello."
          >
            <OpenMatchVisual />
          </Card>
          <Card
            title="Tornei ed eventi, a un tocco"
            body="Si iscrive dalla pagina dell'evento. Allo staff resta solo da segnare chi arriva."
            className="bg-[linear-gradient(180deg,oklch(0.95_0.04_165),var(--color-card)_70%)]"
          >
            <EventVisual />
          </Card>
          <Card
            title="Le sue partite, sempre a portata"
            body="Nell'area personale trova le prenotazioni e le aggiunge al calendario."
          >
            <MyBookingsVisual />
          </Card>
        </ul>
      </Reveal>
    </section>
  );
}

function Card({
  title,
  body,
  className,
  children,
}: {
  title: string;
  body: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <li
      className={cn(
        "concentric flex w-[19rem] shrink-0 snap-start flex-col overflow-hidden border border-border bg-card [--inner:1.75rem] [--pad:1.25rem] sm:w-[22rem]",
        className,
      )}
    >
      <div className="flex h-60 items-center">{children}</div>
      <h3
        className={cn(headingVariants({ size: "card" }), "mt-6 text-inherit")}
      >
        {title}
      </h3>
      <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
        {body}
      </p>
    </li>
  );
}

function SlotsVisual() {
  const slots = [
    ["17:00", false],
    ["18:30", false],
    ["19:30", true],
    ["21:00", false],
    ["22:30", false],
    ["23:30", false],
  ] as const;
  return (
    <Surface className="concentric w-full [--inner:1rem] [--pad:0.75rem]">
      <p className="px-1 pt-1 text-[13px] font-medium">Sabato 31</p>
      <div className="mt-3 grid grid-cols-3 gap-1.5">
        {slots.map(([time, selected]) => (
          <span
            key={time}
            className={cn(
              "grid h-10 place-content-center rounded-xl border text-sm font-medium tabular-nums",
              selected
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card",
            )}
          >
            {time}
          </span>
        ))}
      </div>
      <span className="mt-4 flex h-8 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground">
        Prenota
      </span>
    </Surface>
  );
}

function InviteVisual() {
  return (
    <div className="w-full">
      <div className="ml-auto w-[88%] rounded-[24px] rounded-br-[8px] bg-white p-3 text-zinc-900 shadow-[0_8px_24px_-12px_oklch(0_0_0/50%)]">
        <div className="rounded-xl bg-zinc-100 p-3">
          <p className="text-[12px] text-zinc-500">Padel Club Riviera</p>
          <p className="mt-0.5 text-[14px] font-semibold">
            Giulia ti invita a giocare
          </p>
          <p className="text-[13px] text-zinc-600">
            Sabato 31 alle 19:30 · Campo 2
          </p>
        </div>
        <p className="mt-2 text-[13px]">Ci sei? Manca solo il quarto</p>
        <p className="mt-1 flex items-center justify-end gap-1 text-[11px] text-zinc-500">
          11:43{" "}
          <ChecksIcon
            aria-hidden
            weight="bold"
            className="size-3.5 text-sky-500"
          />
        </p>
      </div>
      <p className="mt-3 flex items-center gap-1.5 text-[12px] text-white/70">
        <WhatsappLogoIcon aria-hidden weight="fill" className="size-4" />
        Inviato nel gruppo del giovedì
      </p>
    </div>
  );
}

function OpenMatchVisual() {
  return (
    <Surface className="concentric w-full [--inner:1rem] [--pad:0.75rem]">
      <div className="flex items-center justify-between gap-2 px-1 pt-1">
        <span className="text-[12px] font-medium text-info-foreground">
          Partita aperta
        </span>
        <span className="text-[12px] text-muted-foreground">Intermedio</span>
      </div>
      <p className="mt-3 px-1 text-[15px] font-semibold">Sabato 31 · 21:00</p>
      <div className="mt-3 flex items-center gap-2 px-1">
        <div className="flex -space-x-2">
          {["Luca Spadaro", "Andrea Messina", "Elena Fichera"].map((name) => (
            <Initials key={name} name={name} className="ring-2 ring-card" />
          ))}
          <span className="grid size-8 place-content-center rounded-full border border-dashed border-zinc-400 bg-card text-[11px] text-muted-foreground ring-2 ring-card">
            ?
          </span>
        </div>
        <span className="text-[13px] text-muted-foreground">
          Cerca 1 giocatore
        </span>
      </div>
      <span className="mt-4 flex h-8 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground">
        Unisciti
      </span>
    </Surface>
  );
}

function EventVisual() {
  return (
    <Surface className="w-full overflow-hidden rounded-[28px]">
      <div className="bg-[radial-gradient(120%_120%_at_0%_0%,oklch(0.42_0.08_165),oklch(0.26_0.05_165))] px-4 py-5 text-white">
        <p className="text-[12px] text-white/70">Sabato 14 novembre</p>
        <p className="font-display text-[1.7rem] leading-tight">
          Torneo d'autunno
        </p>
      </div>
      <div className="flex items-center justify-between gap-3 p-4">
        <span className="text-[13px] text-muted-foreground">32 iscritti</span>
        <StatusBadge tone="success" icon={ChecksIcon}>
          Ci sei
        </StatusBadge>
      </div>
    </Surface>
  );
}

function MyBookingsVisual() {
  return (
    <div className="flex w-full flex-col gap-2">
      {[
        {
          day: "Sab 31",
          time: "19:30",
          court: "Campo 2",
          tone: "success" as const,
          label: "Confermata",
        },
        {
          day: "Mer 4",
          time: "18:30",
          court: "Campo 1",
          tone: "warning" as const,
          label: "Da confermare",
        },
      ].map((row) => (
        <Surface key={row.day} className="flex items-center gap-3 px-4 py-3">
          <span className="w-12 shrink-0">
            <span className="block text-[11px] text-muted-foreground">
              {row.day}
            </span>
            <span className="block text-[15px] font-semibold tabular-nums">
              {row.time}
            </span>
          </span>
          <span className="flex-1 text-[13px] text-muted-foreground">
            {row.court}
          </span>
          <StatusBadge tone={row.tone}>{row.label}</StatusBadge>
        </Surface>
      ))}
      <span className="mt-1 inline-flex h-9 w-fit items-center gap-1.5 rounded-full border border-border bg-card px-4 text-[13px] font-medium">
        <CalendarPlusIcon aria-hidden className="size-4" />
        Aggiungi al calendario
      </span>
    </div>
  );
}

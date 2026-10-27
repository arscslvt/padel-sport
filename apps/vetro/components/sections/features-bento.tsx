"use client";

import type { Icon } from "@phosphor-icons/react/dist/lib/types";
import {
  CheckIcon,
  CloudIcon,
  CloudRainIcon,
  CloudSunIcon,
  CreditCardIcon,
  LifebuoyIcon,
  PaperPlaneTiltIcon,
  SunIcon,
  UsersThreeIcon,
} from "@phosphor-icons/react/dist/ssr";
import type { PointerEvent, ReactNode } from "react";

import { Reveal, Words } from "@/components/motion/reveal";
import {
  Initials,
  StatusBadge,
  Surface,
} from "@/components/product/primitives";
import { headingVariants } from "@/components/site/heading";
import { ANCHORS } from "@/lib/brand";
import { cn } from "@/lib/utils";

/**
 * Le funzioni, in una griglia a tessere di misure diverse: la più grande è
 * l'agenda, perché è la pagina che lo staff apre cento volte al giorno.
 * Ogni tessera porta un pezzo del gestionale, con i testi che usa davvero.
 *
 * Il bordo si accende sotto il puntatore: un solo gestore sulla griglia
 * scrive la posizione su ogni card, così la luce passa da una tessera
 * all'altra senza interruzioni.
 */
export function FeaturesBento() {
  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse") return;
    for (const card of event.currentTarget.querySelectorAll<HTMLElement>(
      ".spotlight",
    )) {
      const rect = card.getBoundingClientRect();
      card.style.setProperty("--x", `${event.clientX - rect.left}px`);
      card.style.setProperty("--y", `${event.clientY - rect.top}px`);
    }
  }

  return (
    <section id={ANCHORS.features} className="py-24 sm:py-32">
      <div className="page-container">
        <h2
          className={cn(headingVariants({ size: "section" }), "max-w-[24ch]")}
        >
          <Words
            lead="Tutto il club,"
            accent="in un posto solo."
            accentClassName="text-brand"
          />
        </h2>

        <div
          onPointerMove={onPointerMove}
          className="spotlight-group mt-12 grid grid-cols-1 gap-3 md:grid-cols-2 lg:mt-16 lg:grid-cols-6"
        >
          <Tile
            className="md:col-span-2 lg:col-span-4 lg:row-span-2"
            tint="bg-[radial-gradient(90%_60%_at_100%_0%,oklch(0.95_0.03_245/80%),transparent_70%)]"
            title="L'agenda sa che tempo fa"
            body="Le partite del giorno e il meteo del club, ora per ora. Se arriva la pioggia, chiudi i campi con un tocco."
          >
            <WeatherVisual />
          </Tile>
          <Tile
            className="lg:col-span-2 lg:row-span-2"
            title="Ogni cliente, una scheda"
            body="Dati, tessera e livello in un posto. Se una persona compare due volte, unisci le schede."
          >
            <ClientVisual />
          </Tile>
          <Tile
            className="lg:col-span-3"
            tint="bg-[radial-gradient(80%_70%_at_0%_100%,oklch(0.94_0.045_165/90%),transparent_70%)]"
            title="Incassi prima di giocare"
            body="Chi prenota paga online con SumUp. I rimborsi li decidi tu."
            delay={0.05}
          >
            <PaymentVisual />
          </Tile>
          <Tile
            className="lg:col-span-3"
            title="Eventi, iscrizioni e arrivi"
            body="Raccogli le iscrizioni, segna chi arriva e scrivi a tutti gli iscritti con un messaggio."
            delay={0.1}
          >
            <EventVisual />
          </Tile>
          <Tile
            className="lg:col-span-2"
            title="Le richieste dal sito"
            body="Chi cerca aiuto o compagni di gioco ti scrive da qui, con i contatti già pronti."
          >
            <RequestsVisual />
          </Tile>
          <Tile
            className="md:col-span-2 lg:col-span-4"
            tint="bg-[repeating-linear-gradient(135deg,oklch(0.92_0_0/45%)_0_1px,transparent_1px_14px)]"
            title="Campi, orari e chiusure, come vuoi tu"
            body="Imposti campi, fasce orarie e giorni di chiusura. Chi prenota vede solo gli orari liberi."
            delay={0.05}
          >
            <SettingsVisual />
          </Tile>
        </div>
      </div>
    </section>
  );
}

function Tile({
  className,
  tint,
  title,
  body,
  delay = 0,
  children,
}: {
  className?: string;
  /** Un fondo proprio: non tutte le tessere sono bianche su bianco. */
  tint?: string;
  title: string;
  body: string;
  delay?: number;
  children: ReactNode;
}) {
  return (
    <Reveal delay={delay} className={cn("flex min-w-0", className)}>
      {/* Raggio 48: le anteprime (raggio 28) stanno a 20px dal bordo, e
          28 + 20 fa 48. Dentro le anteprime vale lo stesso conto: chi ne
          occupa un angolo ha raggio 16 a 12px, o 12 a 16px. */}
      <article className="spotlight concentric relative flex w-full flex-col overflow-hidden border border-border bg-card [--inner:1.75rem] [--pad:1.25rem]">
        {tint && (
          <div
            aria-hidden
            className={cn("pointer-events-none absolute inset-0 -z-10", tint)}
          />
        )}
        <div className="flex flex-1 items-center">{children}</div>
        <div className="px-1 pt-8 pb-1">
          <h3 className={headingVariants({ size: "card" })}>{title}</h3>
          <p className="mt-2 max-w-[44ch] text-[15px] leading-relaxed text-muted-foreground">
            {body}
          </p>
        </div>
      </article>
    </Reveal>
  );
}

/* ── Le anteprime ─────────────────────────────────────────── */

const FORECAST: { hour: string; icon: Icon; rain?: boolean }[] = [
  { hour: "14", icon: SunIcon },
  { hour: "15", icon: SunIcon },
  { hour: "16", icon: CloudSunIcon },
  { hour: "17", icon: CloudRainIcon, rain: true },
  { hour: "18", icon: CloudRainIcon, rain: true },
  { hour: "19", icon: CloudRainIcon, rain: true },
  { hour: "20", icon: CloudIcon },
  { hour: "21", icon: CloudIcon },
];

function WeatherVisual() {
  return (
    <div className="grid grid-cols-1 w-full gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] xl:items-center">
      <Surface className="rounded-[28px] p-4">
        <p className="mb-3 text-[13px] font-medium">Meteo al club</p>
        <ol className="grid grid-cols-8 gap-1">
          {FORECAST.map(({ hour, icon: IconComponent, rain }) => (
            <li
              key={hour}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-lg py-2",
                rain && "bg-info-subtle",
              )}
            >
              <IconComponent
                aria-hidden
                weight="duotone"
                className={cn("size-5", rain ? "text-info" : "text-warning")}
              />
              <span className="text-[11px] text-muted-foreground tabular-nums">
                {hour}
              </span>
            </li>
          ))}
        </ol>
      </Surface>

      <Surface className="concentric border-info-border bg-[color-mix(in_oklab,var(--color-info-subtle),white_40%)] [--inner:1rem] [--pad:0.75rem]">
        <p className="flex items-center gap-2 text-[14px] font-semibold text-info-foreground">
          <CloudRainIcon aria-hidden weight="fill" className="size-4" />
          Pioggia forte dalle 17 alle 20
        </p>
        <p className="mt-1.5 text-[13px] leading-snug text-muted-foreground">
          Circa 6 mm, fino all'80%. Le fasce da chiudere comprendono il tempo
          per asciugare i campi.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="inline-flex h-8 items-center rounded-full bg-primary px-3.5 text-[12px] font-medium text-primary-foreground">
            Chiudi dalle 17 alle 21
          </span>
          <span className="inline-flex h-8 items-center rounded-full border border-border bg-card px-3.5 text-[12px] font-medium">
            Chiudi tutto il giorno
          </span>
        </div>
      </Surface>
    </div>
  );
}

function ClientVisual() {
  return (
    <div className="flex w-full flex-col gap-2.5">
      <Surface className="concentric [--inner:1rem] [--pad:0.75rem]">
        <div className="flex items-center gap-3">
          <Initials name="Chiara Amato" className="text-[12px]" />
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold">Chiara Amato</p>
            <p className="text-[12px] text-muted-foreground">
              Cliente da marzo 2025
            </p>
          </div>
        </div>
        <dl className="mt-4 grid grid-cols-1 gap-2.5 text-[13px]">
          <div className="flex items-center justify-between gap-2">
            <dt className="text-muted-foreground">Tessera</dt>
            <dd>
              <StatusBadge tone="success">Valida fino al 31 agosto</StatusBadge>
            </dd>
          </div>
          <div className="flex items-center justify-between gap-2">
            <dt className="text-muted-foreground">Livello</dt>
            <dd className="font-medium">Avanzato</dd>
          </div>
          <div className="flex items-center justify-between gap-2">
            <dt className="text-muted-foreground">Partite</dt>
            <dd className="font-medium tabular-nums">38</dd>
          </div>
        </dl>
      </Surface>
      <Surface className="concentric flex items-center gap-3 border-warning-border bg-warning-subtle [--inner:1rem] [--pad:0.75rem]">
        <UsersThreeIcon
          aria-hidden
          weight="duotone"
          className="size-5 shrink-0 text-warning"
        />
        <p className="min-w-0 flex-1 text-[13px] leading-snug text-warning-foreground">
          Due schede per Chiara Amato
        </p>
        <span className="inline-flex h-8 items-center rounded-full bg-card px-3.5 text-[12px] font-medium shadow-[0_1px_2px_oklch(0_0_0/8%)]">
          Unisci
        </span>
      </Surface>
    </div>
  );
}

function PaymentVisual() {
  return (
    <div className="flex w-full flex-col gap-2.5">
      <Surface className="flex items-center gap-4 rounded-[28px] px-4 py-3">
        <span className="w-11 shrink-0 text-right">
          <span className="block text-[15px] font-semibold tabular-nums">
            19:30
          </span>
          <span className="block text-xs text-muted-foreground tabular-nums">
            21:00
          </span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">
            Giulia Ferraro e altri 3
          </span>
          <span className="block truncate text-[13px] text-muted-foreground">
            Campo 2 · 4/4
          </span>
        </span>
        <StatusBadge tone="success" icon={CreditCardIcon}>
          Pagata online
        </StatusBadge>
      </Surface>
      <Surface className="concentric flex items-center gap-3 [--inner:0.75rem] [--pad:1rem]">
        <span className="grid size-6 shrink-0 place-content-center rounded-full bg-primary text-primary-foreground">
          <CheckIcon aria-hidden weight="bold" className="size-3.5" />
        </span>
        <span className="text-[13px] font-medium">
          Rimborsa il pagamento online
        </span>
      </Surface>
    </div>
  );
}

function EventVisual() {
  return (
    <Surface className="w-full overflow-hidden rounded-[28px]">
      <div className="bg-club px-4 py-4 text-white">
        <p className="text-[12px] text-white/70">Sabato 14 novembre</p>
        <p className="font-display text-[1.6rem] leading-tight">
          Torneo d'autunno
        </p>
      </div>
      <div className="grid grid-cols-2 divide-x divide-border border-b border-border">
        <div className="px-4 py-3">
          <p className="text-[12px] text-muted-foreground">Iscritti</p>
          <p className="text-lg font-semibold tabular-nums">32</p>
        </div>
        <div className="px-4 py-3">
          <p className="text-[12px] text-muted-foreground">Arrivati</p>
          <p className="text-lg font-semibold tabular-nums">28</p>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 p-3 pl-4">
        <span className="text-[13px] text-muted-foreground">
          Comunicazione a 32 iscritti
        </span>
        <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-primary px-3.5 text-[12px] font-medium text-primary-foreground">
          <PaperPlaneTiltIcon aria-hidden weight="fill" className="size-3.5" />
          Invia
        </span>
      </div>
    </Surface>
  );
}

function RequestsVisual() {
  return (
    <Surface className="w-full divide-y divide-border rounded-[28px]">
      {[
        { icon: LifebuoyIcon, label: "Assistenza", count: 1 },
        { icon: UsersThreeIcon, label: "Cerco giocatori", count: 2 },
      ].map(({ icon: IconComponent, label, count }) => (
        <div key={label} className="flex items-center gap-3 p-3 pr-4">
          <span className="grid size-8 place-content-center rounded-full bg-brand-soft text-brand">
            <IconComponent aria-hidden weight="duotone" className="size-4.5" />
          </span>
          <span className="flex-1 text-sm font-medium">{label}</span>
          <span className="grid h-5 min-w-5 place-content-center rounded-full bg-danger px-1.5 text-[11px] font-semibold text-white tabular-nums">
            {count}
          </span>
        </div>
      ))}
    </Surface>
  );
}

const WEEK = [
  { day: "Lun", open: true },
  { day: "Mar", open: true },
  { day: "Mer", open: true },
  { day: "Gio", open: true },
  { day: "Ven", open: true },
  { day: "Sab", open: true },
  { day: "Dom", open: false },
];

function SettingsVisual() {
  return (
    <div className="grid grid-cols-1 w-full gap-3 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <Surface className="rounded-[28px] p-4">
        <p className="mb-3 text-[13px] font-medium">Giorni di apertura</p>
        <ul className="grid grid-cols-7 gap-1.5">
          {WEEK.map(({ day, open }) => (
            <li key={day} className="flex flex-col items-center gap-2">
              <span
                aria-hidden
                className={cn(
                  "relative h-5 w-8 rounded-full transition-colors",
                  open ? "bg-primary" : "bg-zinc-200",
                )}
              >
                <span
                  className={cn(
                    "absolute top-0.5 size-4 rounded-full bg-white shadow-[0_1px_2px_oklch(0_0_0/20%)]",
                    open ? "right-0.5" : "left-0.5",
                  )}
                />
              </span>
              <span className="text-[11px] text-muted-foreground">
                {day}
                <span className="sr-only">
                  {open ? ", aperto" : ", chiuso"}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </Surface>
      <Surface className="concentric flex flex-col gap-2 text-[13px] [--inner:0.75rem] [--pad:1rem]">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Mattina</span>
          <span className="font-medium tabular-nums">09:00-12:30</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Pomeriggio</span>
          <span className="font-medium tabular-nums">14:30-23:00</span>
        </div>
        <div className="mt-1 flex items-center justify-between border-t border-border pt-2.5">
          <span className="text-muted-foreground">Chiusure</span>
          <StatusBadge tone="neutral">25 e 26 dicembre</StatusBadge>
        </div>
      </Surface>
    </div>
  );
}

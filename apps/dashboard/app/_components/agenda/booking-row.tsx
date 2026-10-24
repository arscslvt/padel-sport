"use client";

import { formatEuro } from "@padel-sport/backend/convex/modules/pricing/lib";
import {
  BellOff,
  Building2,
  Columns2,
  CreditCard,
  Loader2,
  type LucideIcon,
  UserRound,
  Users,
} from "lucide-react";

import { StatusBadge, type StatusTone } from "@/app/_components/status-badge";
import { Button } from "@/components/ui/button";
import { MATCH_DURATION_MS } from "@/lib/booking";
import { cn } from "@/lib/utils";

import {
  type Booking,
  clientReach,
  clubTime,
  dayKey,
  dueOnSite,
  isCancelled,
  isPaidOnline,
  isPartial,
  isPending,
  isQuadrangolare,
  isStaffMade,
  LEVEL_LABELS,
  needsRefund,
  onSiteTotal,
  partialLabel,
  playersLabel,
  seatsOf,
  shortDayLabel,
  timeRange,
} from "./lib";

/**
 * Chi ha fatto la prenotazione, in un'icona accanto al nome: l'omino è il
 * cliente che ha prenotato da sé, l'edificio lo staff dal gestionale. Discreta
 * di proposito: è un'informazione da trovare quando serve, non da leggere a
 * ogni riga. Con il puntatore il titolo la spiega; lo screen reader la legge.
 */
function OriginMark({ booking }: { booking: Booking }) {
  if (!booking.origin) return null;

  const staff = isStaffMade(booking);
  const Icon = staff ? Building2 : UserRound;
  const label = staff ? "Creata dal gestionale" : "Prenotata dal cliente";

  return (
    <span title={label} className="text-muted-foreground inline-flex shrink-0">
      <Icon aria-hidden className="size-3.5" />
      <span className="sr-only">{label}</span>
    </span>
  );
}

interface Notice {
  key: string;
  tone: StatusTone;
  icon: LucideIcon;
  label: string;
}

/**
 * Quel che la prenotazione chiede allo staff, dal più urgente: chi ha
 * prenotato non sa niente, mancano giocatori, è già pagata (così non si
 * incassa due volte). In fondo, che non è una partita come le altre: un
 * quadrangolare occupa due campi. Vuoto per una partita a posto.
 */
function noticesOf(booking: Booking, concluded = false): Notice[] {
  if (isCancelled(booking)) return [];

  const notices: Notice[] = [];
  // A partita finita avvisare o completare la squadra non serve più.
  if (!concluded && clientReach(booking) === "unreached") {
    notices.push({
      key: "unreached",
      tone: "danger",
      icon: BellOff,
      label: "Non avvisato",
    });
  }
  if (!concluded && isPartial(booking)) {
    const missing = seatsOf(booking) - booking.players.length;
    notices.push({
      key: "partial",
      tone: "warning",
      icon: Users,
      label: `${partialLabel(booking)} · ${missing === 1 ? "manca 1" : `mancano ${missing}`}`,
    });
  }
  // A destra lo dice già il badge quando non resta niente da incassare.
  if (isPaidOnline(booking) && (isPending(booking) || dueOnSite(booking) > 0)) {
    const due = dueOnSite(booking);
    notices.push({
      key: "paid",
      tone: "success",
      icon: CreditCard,
      label:
        due > 0
          ? `Pagata online · restano ${formatEuro(due)}`
          : "Pagata online",
    });
  }
  if (isQuadrangolare(booking)) {
    notices.push({
      key: "quadrangolare",
      tone: "info",
      icon: Columns2,
      label: "Quadrangolare",
    });
  }
  return notices;
}

/**
 * La tasca: continua la scheda verso il basso con i suoi stessi lati, più
 * scura, e porta quel che c'è da fare in badge brevi, dal più urgente. I badge
 * stanno in fila e vanno a capo solo se non ci stanno: la tasca resta bassa
 * anche con più avvisi, e la giornata non si allunga. Lo stesso respiro su
 * ogni lato: 8px.
 */
function NoticeTray({ notices }: { notices: Notice[] }) {
  if (notices.length === 0) return null;

  return (
    <span className="bg-muted flex flex-wrap gap-1.5 rounded-b-2xl border border-t-0 p-2">
      {notices.map((notice) => (
        <StatusBadge key={notice.key} tone={notice.tone} icon={notice.icon}>
          {notice.label}
        </StatusBadge>
      ))}
    </span>
  );
}

/**
 * Una partita nella giornata.
 *
 * L'ora sta in colonna a sinistra, grande, perché è la prima cosa che si
 * cerca: «chi gioca alle 18:30?». Lo stato compare solo quando c'è qualcosa
 * da dire — da confermare, annullata — e una partita confermata è una riga
 * pulita. Il tocco apre il dettaglio.
 *
 * Sotto, nella tasca (`NoticeTray`), quel che c'è da fare: «Non avvisato»
 * quando nessun avviso è arrivato a chi ha prenotato (allo sportello conviene
 * una telefonata), «Da completare» o «Cerca giocatori» con quanti ne
 * mancano. La riga dei dati resta intera.
 */
export function BookingRow({
  booking,
  court,
  concluded = false,
  onOpen,
}: {
  booking: Booking;
  court?: string;
  /** Già giocata: più spenta, e senza gli avvisi che non servono più. */
  concluded?: boolean;
  onOpen: () => void;
}) {
  const cancelled = isCancelled(booking);
  const notices = noticesOf(booking, concluded);

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "group flex w-full flex-col text-left outline-none",
        "transition-transform duration-150 ease-out active:scale-[0.99] motion-reduce:transform-none",
      )}
    >
      {/* Lo sfondo della scheda è pieno anche al passaggio del mouse: è una
          superficie, non un velo sulla pagina. */}
      <span
        className={cn(
          "bg-card relative z-[1] flex w-full items-center gap-4 rounded-2xl border px-4 py-3 shadow-[0_1px_2px_rgb(0_0_0/0.04)] transition-colors",
          // Con la tasca la scheda si apre in basso: lati dritti, che la
          // tasca prosegue senza scalino.
          notices.length > 0 && "rounded-b-none",
          "group-active:bg-[color-mix(in_oklab,var(--color-card),var(--color-muted)_80%)] md:group-hover:bg-[color-mix(in_oklab,var(--color-card),var(--color-muted)_50%)]",
          "group-focus-visible:ring-ring/50 group-focus-visible:ring-[3px]",
          // Le annullate non hanno mai una tasca: la trasparenza qui non
          // scopre niente.
          cancelled && "opacity-60",
          concluded && "opacity-75",
        )}
      >
        <span className="w-12 shrink-0 text-right">
          <span
            className={cn(
              "block text-[15px] font-semibold tabular-nums",
              cancelled && "line-through",
            )}
          >
            {clubTime(booking.bookingDate)}
          </span>
          <span className="text-muted-foreground block text-xs tabular-nums">
            {clubTime(booking.bookingDate + MATCH_DURATION_MS)}
          </span>
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            {/* I giocatori in fila finché ci stanno, poi i puntini: chi
                gioca alle 18:30 si legge senza aprire la scheda. */}
            <span className="truncate text-[15px] font-medium">
              {playersLabel(booking)}
            </span>
            <OriginMark booking={booking} />
            {booking.mergedWith && (
              <Users
                aria-label="Campo condiviso"
                className="text-info size-4 shrink-0"
              />
            )}
          </span>
          <span className="text-muted-foreground mt-0.5 block truncate text-[13px]">
            {[
              court,
              `${booking.players.length}/${seatsOf(booking)}`,
              LEVEL_LABELS[booking.level],
            ]
              .filter(Boolean)
              .join(" · ")}
          </span>
        </span>

        {isPending(booking) ? (
          <StatusBadge tone="warning">Da confermare</StatusBadge>
        ) : needsRefund(booking) ? (
          <StatusBadge tone="danger">Da rimborsare</StatusBadge>
        ) : cancelled ? (
          <StatusBadge tone="danger">Annullata</StatusBadge>
        ) : isPaidOnline(booking) && dueOnSite(booking) === 0 ? (
          <StatusBadge tone="success">Pagata online</StatusBadge>
        ) : (
          <span className="text-muted-foreground shrink-0 text-sm tabular-nums">
            {onSiteTotal(booking)}
          </span>
        )}
      </span>

      <NoticeTray notices={notices} />
    </button>
  );
}

/**
 * Una prenotazione che aspetta lo staff, con le due risposte a portata di
 * pollice: è il gesto più frequente della dashboard e non deve costare più
 * di due tocchi (il secondo è la conferma).
 */
export function PendingCard({
  booking,
  court,
  busy,
  onOpen,
  onAccept,
  onReject,
}: {
  booking: Booking;
  court?: string;
  busy: boolean;
  onOpen: () => void;
  onAccept: () => void;
  onReject: () => void;
}) {
  return (
    <article className="bg-card rounded-2xl border">
      <button
        type="button"
        onClick={onOpen}
        className="w-full rounded-t-2xl px-4 pt-3.5 pb-3 text-left outline-none focus-visible:bg-muted/60"
      >
        <span className="flex items-center justify-between gap-3">
          <span className="flex min-w-0 items-center gap-2">
            <span className="truncate text-[15px] font-semibold">
              {playersLabel(booking)}
            </span>
            <OriginMark booking={booking} />
          </span>
          {isPaidOnline(booking) ? (
            <span className="text-success-foreground shrink-0 text-sm tabular-nums">
              Pagata online
            </span>
          ) : (
            <span className="text-muted-foreground shrink-0 text-sm tabular-nums">
              {onSiteTotal(booking)}
            </span>
          )}
        </span>
        <span className="mt-1 block text-sm">
          {shortDayLabel(dayKey(booking.bookingDate))},{" "}
          <span className="tabular-nums">{timeRange(booking.bookingDate)}</span>
        </span>
        <span className="text-muted-foreground mt-0.5 block truncate text-[13px]">
          {[
            court,
            `${booking.players.length} ${booking.players.length === 1 ? "giocatore" : "giocatori"}`,
            LEVEL_LABELS[booking.level],
          ]
            .filter(Boolean)
            .join(" · ")}
        </span>
      </button>

      <div className="grid grid-cols-2 gap-2 px-3 pb-3">
        <Button
          variant="outline"
          className="h-11 rounded-xl"
          disabled={busy}
          onClick={onReject}
        >
          Rifiuta
        </Button>
        <Button className="h-11 rounded-xl" disabled={busy} onClick={onAccept}>
          {busy && <Loader2 className="size-4 animate-spin" />}
          Conferma
        </Button>
      </div>
    </article>
  );
}

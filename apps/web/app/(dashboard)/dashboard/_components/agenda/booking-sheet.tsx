"use client";

import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Loader2, Phone, Unlink } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { ListGroup, ListRow } from "@/app/(dashboard)/_components/list";
import { SheetHeader } from "@/app/(dashboard)/_components/sheet-header";
import { StatusBadge } from "@/app/(dashboard)/_components/status-badge";
import { Button } from "@/components/ui/button";
import {
  ResponsiveDrawer,
  ResponsiveDrawerContent,
  ResponsiveDrawerFooter,
} from "@/components/ui/responsive-drawer";
import { MAX_PLAYERS } from "@/lib/booking";

import {
  type Booking,
  dayKey,
  dayLabel,
  isCancelled,
  isPartial,
  isPending,
  LEVEL_LABELS,
  timeRange,
  totalPrice,
  whatsappNumber,
} from "./lib";

/**
 * Il dettaglio di una prenotazione, dal basso.
 *
 * In cima i due gesti che servono davvero allo sportello — chiamare e
 * scrivere su WhatsApp — grandi quanto un pollice. Sotto i dati, in righe da
 * leggere al volo. In fondo le azioni che lo stato permette: confermare o
 * rifiutare quella in attesa, annullare quella confermata.
 */
export function BookingSheet({
  booking,
  partner,
  court,
  busy,
  onOpenChange,
  onAccept,
  onCancel,
  onSplit,
}: {
  booking: Booking | null;
  partner?: Booking;
  court?: string;
  busy: boolean;
  onOpenChange: (open: boolean) => void;
  onAccept: (booking: Booking) => void;
  onCancel: (booking: Booking) => void;
  onSplit: (booking: Booking) => void;
}) {
  return (
    <ResponsiveDrawer open={booking !== null} setOpen={onOpenChange}>
      <ResponsiveDrawerContent className="sm:max-w-md md:max-h-[90dvh] md:overflow-y-auto">
        {booking && (
          <Body
            booking={booking}
            partner={partner}
            court={court}
            busy={busy}
            onAccept={onAccept}
            onCancel={onCancel}
            onSplit={onSplit}
          />
        )}
      </ResponsiveDrawerContent>
    </ResponsiveDrawer>
  );
}

function Body({
  booking,
  partner,
  court,
  busy,
  onAccept,
  onCancel,
  onSplit,
}: {
  booking: Booking;
  partner?: Booking;
  court?: string;
  busy: boolean;
  onAccept: (booking: Booking) => void;
  onCancel: (booking: Booking) => void;
  onSplit: (booking: Booking) => void;
}) {
  const pending = isPending(booking);
  const cancelled = isCancelled(booking);
  const phone = booking.phone?.trim();

  return (
    <>
      <SheetHeader
        title={booking.bookedBy}
        description={`${dayLabel(dayKey(booking.bookingDate))}, ${timeRange(booking.bookingDate)}`}
      />

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 pt-1 pb-2 md:-mx-1 md:px-1">
        <div className="flex flex-wrap gap-1.5">
          {pending ? (
            <StatusBadge tone="warning">Da confermare</StatusBadge>
          ) : cancelled ? (
            <StatusBadge tone="danger">Annullata</StatusBadge>
          ) : (
            <StatusBadge tone="success">Confermata</StatusBadge>
          )}
          {booking.mergedWith ? (
            <StatusBadge tone="info">Campo condiviso</StatusBadge>
          ) : isPartial(booking) && !cancelled ? (
            <StatusBadge tone="warning">Cerca giocatori</StatusBadge>
          ) : null}
        </div>

        {/* Senza numero i due tasti restano, spenti: dove stanno non cambia. */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            asChild={Boolean(phone)}
            variant="secondary"
            className="h-12 rounded-xl"
            disabled={!phone}
          >
            {phone ? (
              <a href={`tel:${phone}`}>
                <Phone className="size-4" />
                Chiama
              </a>
            ) : (
              <span>
                <Phone className="size-4" />
                Chiama
              </span>
            )}
          </Button>
          <Button
            asChild={Boolean(phone)}
            variant="secondary"
            className="h-12 rounded-xl"
            disabled={!phone}
          >
            {phone ? (
              <a
                href={`https://wa.me/${whatsappNumber(phone)}`}
                target="_blank"
                rel="noreferrer"
              >
                <FaWhatsapp className="size-4" />
                WhatsApp
              </a>
            ) : (
              <span>
                <FaWhatsapp className="size-4" />
                WhatsApp
              </span>
            )}
          </Button>
        </div>

        <ListGroup>
          <ListRow
            title="Campo"
            trailing={<Value>{court ?? "Da assegnare"}</Value>}
          />
          <ListRow
            title="Giocatori"
            subtitle={booking.players.join(", ")}
            trailing={
              <Value>
                {booking.players.length} di {MAX_PLAYERS}
              </Value>
            }
          />
          <ListRow
            title="Livello"
            trailing={<Value>{LEVEL_LABELS[booking.level]}</Value>}
          />
          <ListRow
            title="Totale in struttura"
            trailing={<Value>{totalPrice(booking)} €</Value>}
          />
          <ListRow
            title="Telefono"
            trailing={<Value>{phone || "Non indicato"}</Value>}
          />
          {booking.code && (
            <ListRow
              title="Codice"
              trailing={<Value mono>{booking.code}</Value>}
            />
          )}
          <ListRow
            title="Prenotata il"
            trailing={
              <Value>
                {format(booking.createdAt, "d MMM, HH:mm", { locale: it })}
              </Value>
            }
          />
        </ListGroup>

        {booking.mergedWith && (
          <ListGroup
            title="Campo condiviso"
            footer="Separando, la seconda prenotazione torna su un campo libero alla stessa ora."
          >
            <ListRow
              title={partner?.bookedBy ?? "Altra prenotazione"}
              subtitle={
                partner
                  ? `${partner.players.length} ${partner.players.length === 1 ? "giocatore" : "giocatori"}`
                  : undefined
              }
            />
            <ListRow
              leading={<Unlink className="size-5" />}
              title="Separa le prenotazioni"
              onClick={() => onSplit(booking)}
            />
          </ListGroup>
        )}
      </div>

      {!cancelled && (
        <ResponsiveDrawerFooter className="grid grid-cols-2 gap-2 pb-[calc(1rem+env(safe-area-inset-bottom))] md:pb-0">
          {pending ? (
            <>
              <Button
                variant="outline"
                className="h-12 rounded-xl"
                disabled={busy}
                onClick={() => onCancel(booking)}
              >
                Rifiuta
              </Button>
              <Button
                className="h-12 rounded-xl"
                disabled={busy}
                onClick={() => onAccept(booking)}
              >
                {busy && <Loader2 className="size-4 animate-spin" />}
                Conferma
              </Button>
            </>
          ) : (
            <Button
              variant="ghost"
              className="text-danger hover:text-danger col-span-2 h-12 rounded-xl"
              disabled={busy}
              onClick={() => onCancel(booking)}
            >
              {busy && <Loader2 className="size-4 animate-spin" />}
              Annulla prenotazione
            </Button>
          )}
        </ResponsiveDrawerFooter>
      )}
    </>
  );
}

function Value({
  children,
  mono,
}: {
  children: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <span
      className={
        mono
          ? "text-muted-foreground font-mono text-sm"
          : "text-muted-foreground text-[15px] tabular-nums"
      }
    >
      {children}
    </span>
  );
}

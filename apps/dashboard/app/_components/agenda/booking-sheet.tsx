"use client";

import { formatEuro } from "@padel-sport/backend/convex/modules/pricing/lib";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Loader2, Mail, Phone, Undo2, Unlink } from "lucide-react";
import { Fragment, useRef, useState } from "react";
import { FaWhatsapp } from "react-icons/fa";
import { ListGroup, ListRow } from "@/app/_components/list";
import { SheetHeader } from "@/app/_components/sheet-header";
import { StatusBadge } from "@/app/_components/status-badge";
import { Button } from "@/components/ui/button";
import {
  ResponsiveDrawer,
  ResponsiveDrawerContent,
  ResponsiveDrawerFooter,
  useResponsiveDrawer,
} from "@/components/ui/responsive-drawer";
import { MAX_PLAYERS } from "@/lib/booking";
import { cn } from "@/lib/utils";

import {
  authorLine,
  type Booking,
  clientReach,
  DELIVERY_KIND_LABELS,
  type Delivery,
  dayKey,
  dayLabel,
  deliveryBadge,
  isCancelled,
  isPaidOnline,
  isPartial,
  isPending,
  LEVEL_LABELS,
  needsRefund,
  onSiteTotal,
  timeRange,
  wasRefunded,
  whatsappNumber,
} from "./lib";
import { PlayersDrawer, PlayersEditor } from "./players-editor";
import { RescheduleDrawer, RescheduleEditor } from "./reschedule-editor";

/**
 * I tasti di contatto: superficie bianca come le schede sotto, sempre.
 *
 * Il drawer è grigio (`bg-secondary`, lo stesso tono di `muted` e `accent`):
 * l'hover di `outline` e la trasparenza dello stato spento li facevano sparire
 * nello sfondo. L'hover vale solo con il mouse (al tocco resterebbe acceso) e
 * scurisce appena; da spenti si spegne il testo, non la superficie.
 */
const CONTACT_BUTTON =
  "h-12 rounded-2xl border-border bg-card shadow-[0_1px_2px_rgb(0_0_0/0.04)] transition-[transform,background-color] duration-150 hover:bg-card active:scale-[0.98] disabled:opacity-100 disabled:text-muted-foreground [@media(hover:hover)_and_(pointer:fine)]:hover:bg-background";

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
  onRefund,
  onUpdatePlayers,
  onReschedule,
  onSplit,
}: {
  booking: Booking | null;
  partner?: Booking;
  court?: string;
  busy: boolean;
  onOpenChange: (open: boolean) => void;
  onAccept: (booking: Booking) => void;
  onCancel: (booking: Booking) => void;
  onRefund: (booking: Booking, paymentId: string, amount: number) => void;
  onUpdatePlayers: (booking: Booking, players: string[]) => Promise<boolean>;
  onReschedule: (
    booking: Booking,
    bookingDate: number,
    notify: boolean,
  ) => Promise<boolean>;
  onSplit: (booking: Booking) => void;
}) {
  return (
    <ResponsiveDrawer open={booking !== null} setOpen={onOpenChange}>
      <ResponsiveDrawerContent className="sm:max-w-md md:max-h-[90dvh] md:overflow-y-auto">
        {booking && (
          <Body
            // Un'altra prenotazione riparte da capo: modulo dei giocatori chiuso.
            key={booking._id}
            booking={booking}
            partner={partner}
            court={court}
            busy={busy}
            onAccept={onAccept}
            onCancel={onCancel}
            onRefund={onRefund}
            onUpdatePlayers={onUpdatePlayers}
            onReschedule={onReschedule}
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
  onRefund,
  onUpdatePlayers,
  onReschedule,
  onSplit,
}: {
  booking: Booking;
  partner?: Booking;
  court?: string;
  busy: boolean;
  onAccept: (booking: Booking) => void;
  onCancel: (booking: Booking) => void;
  onRefund: (booking: Booking, paymentId: string, amount: number) => void;
  onUpdatePlayers: (booking: Booking, players: string[]) => Promise<boolean>;
  onReschedule: (
    booking: Booking,
    bookingDate: number,
    notify: boolean,
  ) => Promise<boolean>;
  onSplit: (booking: Booking) => void;
}) {
  const pending = isPending(booking);
  const cancelled = isCancelled(booking);
  const phone = booking.phone?.trim();
  const [editingPlayers, setEditingPlayers] = useState(false);
  const [editingTime, setEditingTime] = useState(false);
  // Da telefono la scheda è un drawer: i giocatori si correggono in uno
  // annidato. Da desktop è una modale, e il modulo si apre dentro.
  const { isDesktop } = useResponsiveDrawer();
  const savePlayers = (players: string[]) => onUpdatePlayers(booking, players);
  // Chiuso il modulo, il fuoco torna sulla riga che l'aveva aperto.
  const playersRow = useRef<HTMLButtonElement>(null);
  const closePlayers = () => {
    setEditingPlayers(false);
    requestAnimationFrame(() => playersRow.current?.focus());
  };

  const saveTime = (bookingDate: number, notify: boolean) =>
    onReschedule(booking, bookingDate, notify);
  const timeRow = useRef<HTMLButtonElement>(null);
  const closeTime = () => {
    setEditingTime(false);
    requestAnimationFrame(() => timeRow.current?.focus());
  };

  // Da desktop un modulo alla volta dentro la scheda: aprirne uno chiude
  // l'altro, così si sa sempre cosa si sta modificando.
  const toggleTime = () => {
    setEditingPlayers(false);
    setEditingTime((open) => !open);
  };
  const togglePlayers = () => {
    setEditingTime(false);
    setEditingPlayers((open) => !open);
  };

  const time = {
    title: "Orario",
    trailing: <Value>{timeRange(booking.bookingDate)}</Value>,
  };

  const players = {
    title: "Giocatori",
    subtitle: booking.players.join(", "),
    trailing: (
      <Value>
        {booking.players.length} di {MAX_PLAYERS}
      </Value>
    ),
  };

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
          {clientReach(booking) === "unreached" && (
            <StatusBadge tone="danger">Cliente non avvisato</StatusBadge>
          )}
          {needsRefund(booking) ? (
            <StatusBadge tone="danger">Da rimborsare</StatusBadge>
          ) : isPaidOnline(booking) ? (
            <StatusBadge tone="success">Pagata online</StatusBadge>
          ) : wasRefunded(booking) ? (
            <StatusBadge tone="neutral">Rimborsata</StatusBadge>
          ) : null}
        </div>

        {/* Senza numero i due tasti restano, spenti: dove stanno non cambia. */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            asChild={Boolean(phone)}
            variant="outline"
            className={CONTACT_BUTTON}
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
            variant="outline"
            className={CONTACT_BUTTON}
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
          {/* L'orario si sposta nello stesso giorno: un tocco e si sceglie. */}
          {cancelled ? (
            <ListRow {...time} />
          ) : isDesktop ? (
            <ListRow
              {...time}
              ref={timeRow}
              chevron
              aria-expanded={editingTime}
              onClick={toggleTime}
            />
          ) : (
            <RescheduleDrawer
              booking={booking}
              busy={busy}
              open={editingTime}
              onOpenChange={setEditingTime}
              onSave={saveTime}
            >
              <ListRow {...time} chevron />
            </RescheduleDrawer>
          )}
          <ListRow
            title="Campo"
            trailing={<Value>{court ?? "Da assegnare"}</Value>}
          />
          {/* Allo sportello si scopre chi gioca davvero: un tocco e si
              corregge. */}
          {cancelled ? (
            <ListRow {...players} />
          ) : isDesktop ? (
            <ListRow
              {...players}
              ref={playersRow}
              chevron
              aria-expanded={editingPlayers}
              onClick={togglePlayers}
            />
          ) : (
            <PlayersDrawer
              booking={booking}
              busy={busy}
              open={editingPlayers}
              onOpenChange={setEditingPlayers}
              onSave={savePlayers}
            >
              <ListRow {...players} chevron />
            </PlayersDrawer>
          )}
          <ListRow
            title="Livello"
            trailing={<Value>{LEVEL_LABELS[booking.level]}</Value>}
          />
          <ListRow
            title="Totale in struttura"
            subtitle={
              isPaidOnline(booking)
                ? `Già pagati online ${formatEuro(booking.paidAmount ?? 0)}`
                : undefined
            }
            trailing={<Value>{onSiteTotal(booking)}</Value>}
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
        </ListGroup>

        {isDesktop && editingTime && (
          <RescheduleEditor
            booking={booking}
            busy={busy}
            onSave={saveTime}
            onClose={closeTime}
          />
        )}

        {isDesktop && editingPlayers && (
          <PlayersEditor
            booking={booking}
            busy={busy}
            onSave={savePlayers}
            onClose={closePlayers}
          />
        )}

        <OnlinePayment booking={booking} busy={busy} onRefund={onRefund} />

        <Deliveries deliveries={booking.deliveries} />

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

        {/* Chi l'ha creata e quando: in fondo, per chi lo cerca. */}
        <p className="text-muted-foreground px-1 pb-1 text-xs leading-relaxed">
          {authorLine(booking)}
        </p>
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

/**
 * Gli avvisi mandati al cliente su questa prenotazione, dal più recente.
 *
 * Una riga per canale e destinatario: «la mail è partita» e «la mail è
 * arrivata» sono due notizie diverse, e qui si legge la seconda. Il perché di
 * un mancato invio va a capo invece di troncarsi: è l'informazione che serve
 * per decidere se chiamare.
 */
function Deliveries({ deliveries }: { deliveries?: Delivery[] }) {
  if (!deliveries || deliveries.length === 0) return null;

  const sorted = [...deliveries].sort(
    (a, b) =>
      b.createdAt - a.createdAt ||
      Number(a.role === "guest") - Number(b.role === "guest"),
  );

  return (
    <ListGroup
      title="Avvisi al cliente"
      footer="Lo stato si aggiorna da solo man mano che email e WhatsApp vengono consegnati."
    >
      {sorted.map((delivery) => {
        const badge = deliveryBadge(delivery);
        const email = delivery.channel === "email";
        return (
          <div
            key={delivery._id}
            className="flex min-h-14 items-start gap-3 px-4 py-2.5"
          >
            <span className="text-muted-foreground flex h-[22px] shrink-0 items-center">
              {email ? (
                <Mail className="size-5" />
              ) : (
                <FaWhatsapp className="size-5" />
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] leading-snug">
                {email ? "Email" : "WhatsApp"}
                {delivery.role === "guest" && (
                  <span className="text-muted-foreground"> · ospite</span>
                )}
              </span>
              {delivery.recipient && (
                <span className="text-muted-foreground mt-0.5 block truncate text-[13px] leading-snug">
                  {delivery.recipient}
                </span>
              )}
              <span className="text-muted-foreground mt-0.5 block text-[13px] leading-snug">
                {DELIVERY_KIND_LABELS[delivery.kind]} ·{" "}
                {format(delivery.updatedAt, "d MMM, HH:mm", { locale: it })}
              </span>
              {delivery.detail && (
                <span
                  className={cn(
                    "mt-0.5 block text-[13px] leading-snug",
                    delivery.status === "failed"
                      ? "text-danger"
                      : "text-muted-foreground",
                  )}
                >
                  {delivery.detail}
                </span>
              )}
            </span>
            <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>
          </div>
        );
      })}
    </ListGroup>
  );
}

/**
 * L'incasso online, con quello che serve a ritrovarlo nel pannello SumUp: il
 * codice transazione è quello che SumUp mostra fra le Transazioni e sulla
 * ricevuta, gli id servono quando c'è da scrivere all'assistenza. Sono tutti
 * selezionabili con un tocco, per copiarli.
 *
 * Ogni incasso ancora valido ha il suo «Rimborsa»: vale a prenotazione
 * annullata, confermata o in attesa, e con due incassi permette di
 * restituire solo il doppione.
 */
function OnlinePayment({
  booking,
  busy,
  onRefund,
}: {
  booking: Booking;
  busy: boolean;
  onRefund: (booking: Booking, paymentId: string, amount: number) => void;
}) {
  const payments = booking.payments ?? [];
  if (!isPaidOnline(booking) && payments.length === 0) return null;

  const paid = payments.filter((payment) => payment.status === "paid");
  const many = payments.length > 1;

  const footer = needsRefund(booking)
    ? "La prenotazione è annullata ma risulta pagata: rimborsala qui sotto."
    : paid.length > 1
      ? "Risultano più pagamenti validi per la stessa prenotazione: quelli in più vanno rimborsati."
      : "Per una controverifica, nel pannello SumUp apri Transazioni e cerca il codice transazione.";

  return (
    <ListGroup title="Pagamento online" footer={footer}>
      {payments.length === 0 && (
        <ListRow
          title="Importo pagato"
          trailing={<Value>{formatEuro(booking.paidAmount ?? 0)}</Value>}
        />
      )}
      {payments.map((payment, index) => (
        <Fragment key={payment.paymentId}>
          <ListRow
            title={many ? `Pagamento ${index + 1}` : "Importo pagato"}
            subtitle={format(payment.paidAt, "d MMM yyyy, HH:mm", {
              locale: it,
            })}
            trailing={
              payment.status === "refunded" ? (
                <StatusBadge tone="neutral">Rimborsato</StatusBadge>
              ) : (
                <Value>{formatEuro(payment.amount)}</Value>
              )
            }
          />
          {payment.status === "refunded" && payment.refundedAt && (
            <ListRow
              title="Rimborsato il"
              trailing={
                <Value>
                  {format(payment.refundedAt, "d MMM yyyy, HH:mm", {
                    locale: it,
                  })}
                </Value>
              }
            />
          )}
          {payment.transactionCode && (
            <Reference
              label="Codice transazione"
              value={payment.transactionCode}
            />
          )}
          {payment.transactionId && (
            <Reference label="ID transazione" value={payment.transactionId} />
          )}
          {payment.checkoutId && (
            <Reference label="ID checkout" value={payment.checkoutId} />
          )}
          <Reference label="Riferimento" value={payment.paymentId} />
          {payment.status === "paid" && (
            <ListRow
              leading={
                busy ? (
                  <Loader2 className="size-5 animate-spin" />
                ) : (
                  <Undo2 className="size-5" />
                )
              }
              title={`Rimborsa ${formatEuro(payment.amount)}`}
              subtitle={
                payment.refundError
                  ? `Ultimo tentativo non riuscito: ${payment.refundError}`
                  : undefined
              }
              tone="danger"
              onClick={
                busy
                  ? undefined
                  : () => onRefund(booking, payment.paymentId, payment.amount)
              }
            />
          )}
        </Fragment>
      ))}
    </ListGroup>
  );
}

/** Un identificativo da copiare: intero, mai troncato, selezionabile. */
function Reference({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-h-14 flex-col justify-center gap-0.5 px-4 py-2.5">
      <span className="text-[15px] leading-snug">{label}</span>
      <span className="text-muted-foreground font-mono text-[13px] break-all select-all">
        {value}
      </span>
    </div>
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

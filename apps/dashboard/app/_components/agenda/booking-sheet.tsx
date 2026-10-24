"use client";

import type { Id } from "@padel-sport/backend/convex/_generated/dataModel";
import { formatEuro } from "@padel-sport/backend/convex/modules/pricing/lib";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Loader2, Phone, Undo2, Unlink, UserPen } from "lucide-react";
import { useRouter } from "next/navigation";
import { Fragment, useRef, useState } from "react";
import { FaWhatsapp } from "react-icons/fa";
import { ListGroup, ListRow } from "@/app/_components/list";
import { SheetHeader } from "@/app/_components/sheet-header";
import { StatusBadge } from "@/app/_components/status-badge";
import { LevelBars } from "@/components/level-bars";
import { Button } from "@/components/ui/button";
import {
  ResponsiveDrawer,
  ResponsiveDrawerContent,
  ResponsiveDrawerFooter,
  useResponsiveDrawer,
} from "@/components/ui/responsive-drawer";
import { CourtDrawer, CourtEditor } from "./court-editor";
import {
  authorLine,
  type Booking,
  clientReach,
  courtsOf,
  dayKey,
  dayLabel,
  isCancelled,
  isPaidOnline,
  isPartial,
  isPending,
  LEVEL_BARS,
  LEVEL_LABELS,
  needsRefund,
  partialLabel,
  playersLabel,
  rosterOf,
  seatsOf,
  timeRange,
  wasRefunded,
  whatsappNumber,
} from "./lib";
import { PhoneDrawer, PhoneEditor } from "./phone-editor";
import {
  PlayersDrawer,
  PlayersEditor,
  type PlayersPayload,
} from "./players-editor";
import { TotalRow } from "./price-breakdown";
import {
  RecipientsPanel,
  type ResendEmail,
  type ResendWhatsapp,
} from "./recipients-panel";
import { RescheduleDrawer, RescheduleEditor } from "./reschedule-editor";

/** I pezzi della scheda che si modificano, uno alla volta. */
type Part = "time" | "court" | "players" | "phone";

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
 * Un tasto di contatto: un link quando c'è un indirizzo, un pulsante spento
 * quando non c'è.
 *
 * Icona ed etichetta stanno sempre direttamente dentro il tasto, che le mette
 * in fila. Prima il tasto spento le avvolgeva in uno `<span>`, e dentro uno
 * span l'icona (che il reset di Tailwind rende `display: block`) andava a capo
 * sopra il testo: le prenotazioni senza numero mostravano i tasti rotti.
 */
function ContactButton({
  href,
  external,
  icon,
  label,
}: {
  href?: string;
  external?: boolean;
  icon: React.ReactNode;
  label: string;
}) {
  if (!href) {
    return (
      <Button variant="outline" className={CONTACT_BUTTON} disabled>
        {icon}
        {label}
      </Button>
    );
  }

  return (
    <Button asChild variant="outline" className={CONTACT_BUTTON}>
      <a
        href={href}
        {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
      >
        {icon}
        {label}
      </a>
    </Button>
  );
}

/**
 * Il dettaglio di una prenotazione: dal basso da telefono, di lato da desktop.
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
  onMoveCourt,
  onUpdatePhone,
  onResendWhatsapp,
  onResendEmail,
  onNotifyMissing,
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
  onUpdatePlayers: (
    booking: Booking,
    payload: PlayersPayload,
  ) => Promise<boolean>;
  onReschedule: (
    booking: Booking,
    bookingDate: number,
    notify: boolean,
  ) => Promise<boolean>;
  onMoveCourt: (booking: Booking, slotIds: string[]) => Promise<boolean>;
  onUpdatePhone: (booking: Booking, phone: string) => Promise<boolean>;
  onResendWhatsapp: ResendWhatsapp;
  onResendEmail: ResendEmail;
  onNotifyMissing: (booking: Booking, names: string[]) => void;
  onSplit: (booking: Booking) => void;
}) {
  return (
    // Da desktop un pannello laterale: l'agenda resta a vista accanto, e la
    // scheda lunga (avvisi, pagamenti) ha tutta l'altezza dello schermo.
    <ResponsiveDrawer
      open={booking !== null}
      setOpen={onOpenChange}
      desktop="sheet"
    >
      {/* Da telefono si apre già alta, quasi tutto lo schermo: la scheda è
          lunga, e partire da metà vorrebbe dire trascinarla ogni volta. Con
          la tastiera aperta si accorcia (`--drawer-max-height`,
          components/ui/keyboard-inset.tsx), come «Assegna punti». */}
      <ResponsiveDrawerContent className="data-[vaul-drawer-direction=bottom]:h-[min(88dvh,var(--drawer-max-height,88dvh))]! data-[vaul-drawer-direction=bottom]:max-h-[min(88dvh,var(--drawer-max-height,88dvh))] sm:max-w-md">
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
            onMoveCourt={onMoveCourt}
            onUpdatePhone={onUpdatePhone}
            onResendWhatsapp={onResendWhatsapp}
            onResendEmail={onResendEmail}
            onNotifyMissing={onNotifyMissing}
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
  onMoveCourt,
  onUpdatePhone,
  onResendWhatsapp,
  onResendEmail,
  onNotifyMissing,
  onSplit,
}: {
  booking: Booking;
  partner?: Booking;
  court?: string;
  busy: boolean;
  onAccept: (booking: Booking) => void;
  onCancel: (booking: Booking) => void;
  onRefund: (booking: Booking, paymentId: string, amount: number) => void;
  onUpdatePlayers: (
    booking: Booking,
    payload: PlayersPayload,
  ) => Promise<boolean>;
  onReschedule: (
    booking: Booking,
    bookingDate: number,
    notify: boolean,
  ) => Promise<boolean>;
  onMoveCourt: (booking: Booking, slotIds: string[]) => Promise<boolean>;
  onUpdatePhone: (booking: Booking, phone: string) => Promise<boolean>;
  onResendWhatsapp: ResendWhatsapp;
  onResendEmail: ResendEmail;
  onNotifyMissing: (booking: Booking, names: string[]) => void;
  onSplit: (booking: Booking) => void;
}) {
  const pending = isPending(booking);
  const cancelled = isCancelled(booking);
  const phone = booking.phone?.trim();
  // Orario, campo e giocatori si modificano uno alla volta. Da telefono la
  // scheda è un drawer e ognuno si apre in uno annidato; da desktop è una
  // modale, e il modulo si apre dentro.
  const [editing, setEditing] = useState<Part | null>(null);
  const { isDesktop } = useResponsiveDrawer();
  const router = useRouter();

  // Chiuso il modulo, il fuoco torna sulla riga che l'aveva aperto.
  const timeRow = useRef<HTMLButtonElement>(null);
  const courtRow = useRef<HTMLButtonElement>(null);
  const playersRow = useRef<HTMLButtonElement>(null);
  const phoneRow = useRef<HTMLButtonElement>(null);
  const rowOf = {
    time: timeRow,
    court: courtRow,
    players: playersRow,
    phone: phoneRow,
  };

  const toggle = (part: Part) =>
    setEditing((current) => (current === part ? null : part));
  const close = (part: Part) => {
    setEditing(null);
    requestAnimationFrame(() => rowOf[part].current?.focus());
  };
  const openChange = (part: Part) => (open: boolean) =>
    setEditing(open ? part : null);

  const saveTime = (bookingDate: number, notify: boolean) =>
    onReschedule(booking, bookingDate, notify);
  const saveCourt = (slotIds: string[]) => onMoveCourt(booking, slotIds);
  const savePhone = (value: string) => onUpdatePhone(booking, value);

  // Il numero di chi ha prenotato: si scrive se manca, si corregge se è
  // sbagliato. Senza, la riga invita ad aggiungerlo.
  const phoneRowProps = {
    title: "Telefono",
    trailing: phone ? (
      <Value>{phone}</Value>
    ) : cancelled ? (
      <Value>Non indicato</Value>
    ) : (
      <span className="text-primary text-[15px] font-medium">Aggiungi</span>
    ),
  };
  const savePlayers = (payload: PlayersPayload) =>
    onUpdatePlayers(booking, payload);

  // La scheda del cliente, per correggerne i dati. Prima si scrive la
  // prenotazione nell'indirizzo dell'agenda, senza aggiungere voci alla
  // cronologia: tornando indietro la scheda si riapre (agenda.tsx legge
  // `?booking=`), invece di lasciare l'agenda nuda.
  // Vale per ogni giocatore con una scheda: dall'elenco dei giocatori, e
  // dagli avvisi per chi non è stato raggiunto.
  const openClient = (playerId: Id<"players">) => {
    const here = new URL(window.location.href);
    here.searchParams.set("booking", booking._id);
    window.history.replaceState(window.history.state, "", here);
    router.push(`/clients/${playerId}?from=agenda`);
  };

  const courtRowProps = {
    title: courtsOf(booking).length > 1 ? "Campi" : "Campo",
    trailing: <Value>{court ?? "Da assegnare"}</Value>,
  };

  const time = {
    title: "Orario",
    trailing: <Value>{timeRange(booking.bookingDate)}</Value>,
  };

  // I posti, quattro per campo: chi c'è, poi quelli ancora liberi. Con il campo
  // condiviso gli altri posti sono dell'altro gruppo, e da annullata non ci
  // sono più posti da riempire: lì non si mostrano.
  const roster = rosterOf(booking);
  const freeSeats =
    booking.mergedWith || cancelled
      ? 0
      : Math.max(0, seatsOf(booking) - roster.length);

  const editPlayers = {
    leading: <UserPen className="size-5" />,
    title: "Modifica giocatori",
  };

  return (
    <>
      <SheetHeader
        title={playersLabel(booking)}
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
            <StatusBadge tone="warning">{partialLabel(booking)}</StatusBadge>
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
          <ContactButton
            href={phone ? `tel:${phone}` : undefined}
            icon={<Phone className="size-4" />}
            label="Chiama"
          />
          <ContactButton
            href={phone ? `https://wa.me/${whatsappNumber(phone)}` : undefined}
            external
            icon={<FaWhatsapp className="size-4" />}
            label="WhatsApp"
          />
        </div>

        {/* Il gruppo che ha preso il campo, un posto per riga. Chi ha una
            scheda la apre con un tocco: nome, numero ed email si correggono
            lì, e arrivano anche su questa prenotazione. Allo sportello si
            scopre chi gioca davvero: in fondo si corregge. */}
        <ListGroup
          title="Giocatori"
          action={
            <span className="text-muted-foreground text-[13px] tabular-nums">
              {roster.length} di {seatsOf(booking)}
            </span>
          }
        >
          {roster.map(({ name, playerId, phone: contact }, index) =>
            playerId ? (
              <ListRow
                // Due omonimi sono due righe: il nome da solo non basta.
                key={`${index}-${name}`}
                title={name}
                subtitle="Cliente in anagrafica"
                chevron
                onClick={() => openClient(playerId)}
              />
            ) : contact ? (
              // Non è in anagrafica, ma ha lasciato un recapito: si chiama da qui.
              <ListRow
                key={`${index}-${name}`}
                title={name}
                subtitle={contact}
                trailing={<Phone className="text-muted-foreground size-4" />}
                href={`tel:${contact}`}
              />
            ) : (
              <ListRow key={`${index}-${name}`} title={name} />
            ),
          )}
          {Array.from({ length: freeSeats }, (_, index) => (
            <ListRow
              // biome-ignore lint/suspicious/noArrayIndexKey: posti vuoti, tutti uguali.
              key={`free-${index}`}
              title={
                <span className="text-muted-foreground">Posto libero</span>
              }
            />
          ))}
          {cancelled ? null : isDesktop ? (
            <ListRow
              {...editPlayers}
              ref={playersRow}
              aria-expanded={editing === "players"}
              onClick={() => toggle("players")}
            />
          ) : (
            <PlayersDrawer
              booking={booking}
              busy={busy}
              open={editing === "players"}
              onOpenChange={openChange("players")}
              onSave={savePlayers}
            >
              <ListRow {...editPlayers} />
            </PlayersDrawer>
          )}
        </ListGroup>

        {isDesktop && editing === "players" && (
          <PlayersEditor
            booking={booking}
            busy={busy}
            onSave={savePlayers}
            onClose={() => close("players")}
          />
        )}

        <ListGroup>
          {/* L'orario si sposta nello stesso giorno: un tocco e si sceglie. */}
          {cancelled ? (
            <ListRow {...time} />
          ) : isDesktop ? (
            <ListRow
              {...time}
              ref={timeRow}
              chevron
              aria-expanded={editing === "time"}
              onClick={() => toggle("time")}
            />
          ) : (
            <RescheduleDrawer
              booking={booking}
              busy={busy}
              open={editing === "time"}
              onOpenChange={openChange("time")}
              onSave={saveTime}
            >
              <ListRow {...time} chevron />
            </RescheduleDrawer>
          )}
          {/* Il campo si cambia alla stessa ora, per chiudere un buco o
              accontentare il cliente. */}
          {cancelled ? (
            <ListRow {...courtRowProps} />
          ) : isDesktop ? (
            <ListRow
              {...courtRowProps}
              ref={courtRow}
              chevron
              aria-expanded={editing === "court"}
              onClick={() => toggle("court")}
            />
          ) : (
            <CourtDrawer
              booking={booking}
              busy={busy}
              open={editing === "court"}
              onOpenChange={openChange("court")}
              onSave={saveCourt}
            >
              <ListRow {...courtRowProps} chevron />
            </CourtDrawer>
          )}
          <ListRow
            title="Livello"
            trailing={
              <span className="flex items-center gap-1.5">
                <Value>{LEVEL_LABELS[booking.level]}</Value>
                <LevelBars filled={LEVEL_BARS[booking.level]} />
              </span>
            }
          />
          {/* Quanto si incassa, e quanto deve ognuno quando non è uguale per
              tutti: il tesserato paga meno. */}
          <TotalRow booking={booking} isDesktop={isDesktop} />
          {cancelled ? (
            <ListRow {...phoneRowProps} />
          ) : isDesktop ? (
            <ListRow
              {...phoneRowProps}
              ref={phoneRow}
              chevron
              aria-expanded={editing === "phone"}
              onClick={() => toggle("phone")}
            />
          ) : (
            <PhoneDrawer
              booking={booking}
              busy={busy}
              open={editing === "phone"}
              onOpenChange={openChange("phone")}
              onSave={savePhone}
            >
              <ListRow {...phoneRowProps} chevron />
            </PhoneDrawer>
          )}
          {booking.code && (
            <ListRow
              title="Codice"
              trailing={<Value mono>{booking.code}</Value>}
            />
          )}
        </ListGroup>

        {isDesktop && editing === "time" && (
          <RescheduleEditor
            booking={booking}
            busy={busy}
            onSave={saveTime}
            onClose={() => close("time")}
          />
        )}

        {isDesktop && editing === "court" && (
          <CourtEditor
            booking={booking}
            busy={busy}
            onSave={saveCourt}
            onClose={() => close("court")}
          />
        )}

        {isDesktop && editing === "phone" && (
          <PhoneEditor
            booking={booking}
            busy={busy}
            onSave={savePhone}
            onClose={() => close("phone")}
          />
        )}

        <OnlinePayment booking={booking} busy={busy} onRefund={onRefund} />

        <RecipientsPanel
          booking={booking}
          busy={busy}
          isDesktop={isDesktop}
          onResendWhatsapp={onResendWhatsapp}
          onResendEmail={onResendEmail}
          onNotifyMissing={onNotifyMissing}
          onOpenClient={openClient}
        />

        {booking.mergedWith && (
          <ListGroup
            title="Campo condiviso"
            footer="Separando, la seconda prenotazione torna su un campo libero alla stessa ora."
          >
            <ListRow
              title={partner ? playersLabel(partner) : "Altra prenotazione"}
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
        // Le azioni stanno ferme in fondo, staccate dal contenuto che scorre
        // da un filo da bordo a bordo: non sono l'ultima riga della scheda.
        // Nessuno spazio sopra il filo: il contenuto scorre fino a lì.
        <ResponsiveDrawerFooter className="border-foreground/10 grid grid-cols-2 gap-2 border-t pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] md:-mx-6 md:-mt-4 md:-mb-2 md:px-6 md:pt-4 md:pb-0">
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

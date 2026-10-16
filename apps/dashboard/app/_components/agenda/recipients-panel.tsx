"use client";

import type { Id } from "@padel-sport/backend/convex/_generated/dataModel";
import type { RetryTarget } from "@padel-sport/backend/convex/modules/deliveries/retry";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Loader2, Mail, Send, UserRound } from "lucide-react";
import { type FormEvent, useId, useState } from "react";
import { FaWhatsapp } from "react-icons/fa";

import { DisclosureRow } from "@/app/_components/disclosure-row";
import { ListGroup, ListRow } from "@/app/_components/list";
import {
  NestedDrawer,
  PRESS,
  useNestedDirty,
} from "@/app/_components/nested-drawer";
import { StatusBadge, type StatusTone } from "@/app/_components/status-badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import {
  type Booking,
  DELIVERY_KIND_LABELS,
  type Delivery,
  deliveryBadge,
  deliveryRecipients,
  emailRetry,
  latestOn,
  missingConfirmations,
  type Recipient,
  ROLE_LABELS,
  recipientCard,
  recipientReach,
  retryTarget,
  uncontactedNames,
  whatsappRetry,
} from "./lib";

/**
 * Gli avvisi della prenotazione, persona per persona.
 *
 * Con più giocatori in campo la domanda allo sportello non è «com'è andata
 * quella mail», è «lui l'ha saputo?». Ogni persona è una riga: il nome, l'esito
 * detto a parole, e a destra un'icona per canale tentato, colorata con l'esito
 * dell'ultimo invio. Il colore conferma, la parola spiega: chi non distingue
 * il rosso dal verde legge «Non raggiunto».
 *
 * Toccando la riga si vede il resto: ogni tentativo con il suo perché, e il
 * reinvio dove serve, vicino a quel che corregge. Da telefono in un drawer
 * annidato; da desktop a fisarmonica, sotto la riga toccata, perché il
 * dettaglio deve comparire dove si è guardato. Uno aperto alla volta.
 */

export type ResendWhatsapp = (
  booking: Booking,
  phone: string,
  playerId?: Id<"players">,
) => Promise<boolean>;

export type ResendEmail = (
  booking: Booking,
  target: RetryTarget,
  name: string,
) => Promise<boolean>;

/** Icona del canale colorata con l'esito: stessi toni dei badge. */
const CHIP_TONES: Record<StatusTone, string> = {
  neutral: "border-border bg-muted text-muted-foreground",
  success: "border-success-border bg-success-subtle text-success-foreground",
  warning: "border-warning-border bg-warning-subtle text-warning-foreground",
  danger: "border-danger-border bg-danger-subtle text-danger-foreground",
  info: "border-info-border bg-info-subtle text-info-foreground",
};

const CHANNELS = ["whatsapp", "email"] as const;
type Channel = (typeof CHANNELS)[number];

const CHANNEL_LABELS: Record<Channel, string> = {
  whatsapp: "WhatsApp",
  email: "Email",
};

function ChannelIcon({
  channel,
  className,
}: {
  channel: Channel;
  className?: string;
}) {
  return channel === "whatsapp" ? (
    <FaWhatsapp aria-hidden className={className} />
  ) : (
    <Mail aria-hidden className={className} />
  );
}

/** I canali su cui la persona è stata cercata, con l'esito dell'ultimo invio. */
function ChannelChips({ person }: { person: Recipient }) {
  return (
    <span className="flex items-center gap-1.5">
      {CHANNELS.map((channel) => {
        const latest = latestOn(person, channel);
        if (!latest) return null;
        const badge = deliveryBadge(latest);
        return (
          <span
            key={channel}
            role="img"
            aria-label={`${CHANNEL_LABELS[channel]}: ${badge.label}`}
            title={`${CHANNEL_LABELS[channel]}: ${badge.label}`}
            className={cn(
              "flex size-7 items-center justify-center rounded-full border",
              CHIP_TONES[badge.tone],
            )}
          >
            <ChannelIcon channel={channel} className="size-3.5" />
          </span>
        );
      })}
    </span>
  );
}

function rowProps(person: Recipient) {
  const reach = recipientReach(person);
  return {
    title: person.name,
    subtitle: (
      <>
        {ROLE_LABELS[person.role]} ·{" "}
        <span className={cn(reach.tone === "danger" && "text-danger")}>
          {reach.label}
        </span>
      </>
    ),
    trailing: <ChannelChips person={person} />,
  };
}

export function RecipientsPanel({
  booking,
  busy,
  isDesktop,
  onResendWhatsapp,
  onResendEmail,
  onNotifyMissing,
  onOpenClient,
}: {
  booking: Booking;
  busy: boolean;
  isDesktop: boolean;
  onResendWhatsapp: ResendWhatsapp;
  onResendEmail: ResendEmail;
  /** La conferma, insieme, ai collegati che non l'hanno mai avuta. */
  onNotifyMissing: (booking: Booking, names: string[]) => void;
  onOpenClient: (playerId: Id<"players">) => void;
}) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const people = deliveryRecipients(booking);
  if (people.length === 0) return null;
  // Senza scheda e senza mail: in campo, ma nessun avviso li raggiunge.
  const uncontacted = uncontactedNames(booking, people);
  const missing = missingConfirmations(booking).map((player) => player.name);

  const detail = (person: Recipient) => (
    <RecipientDetail
      booking={booking}
      person={person}
      busy={busy}
      onResendWhatsapp={onResendWhatsapp}
      onResendEmail={onResendEmail}
      onOpenClient={onOpenClient}
    />
  );

  return (
    <ListGroup
      title="Avvisi ai giocatori"
      footer={
        uncontacted.length > 0
          ? "Apri una persona per vedere ogni invio e riprovare quelli non arrivati. Chi non ha una scheda cliente non riceve avvisi: va avvisato a voce."
          : "Apri una persona per vedere ogni invio e riprovare quelli non arrivati."
      }
    >
      {people.map((person) =>
        isDesktop ? (
          <DisclosureRow
            key={person.key}
            {...rowProps(person)}
            label={`Avvisi a ${person.name}`}
            open={person.key === openKey}
            // Aprirne una chiude quella aperta: il confronto si fa una
            // persona alla volta.
            onToggle={() =>
              setOpenKey((current) =>
                current === person.key ? null : person.key,
              )
            }
          >
            {detail(person)}
          </DisclosureRow>
        ) : (
          <NestedDrawer
            key={person.key}
            open={person.key === openKey}
            onOpenChange={(next) => setOpenKey(next ? person.key : null)}
            title={person.name}
            description={ROLE_LABELS[person.role]}
            trigger={<ListRow {...rowProps(person)} chevron />}
          >
            <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-1 pb-[calc(1rem+env(safe-area-inset-bottom))]">
              {detail(person)}
            </div>
          </NestedDrawer>
        ),
      )}
      {/* Le prenotazioni confermate prima che la conferma andasse a tutti:
          un tocco, e chi manca la riceve come gli altri. */}
      {missing.length > 0 && (
        <ListRow
          leading={
            busy ? (
              <Loader2 className="size-5 animate-spin motion-reduce:animate-none" />
            ) : (
              <Send className="size-5" />
            )
          }
          title="Manda la conferma a chi manca"
          subtitle={`Mail e WhatsApp a ${missing.join(", ")}`}
          onClick={busy ? undefined : () => onNotifyMissing(booking, missing)}
        />
      )}
      {uncontacted.map((name, index) => (
        <ListRow
          // biome-ignore lint/suspicious/noArrayIndexKey: due omonimi sono due righe, il nome da solo non basta.
          key={`uncontacted-${name}-${index}`}
          title={name}
          subtitle="Senza anagrafica · Non sarà contattato"
          className="text-muted-foreground"
        />
      ))}
    </ListGroup>
  );
}

/** Tutto quel che è partito verso una persona, canale per canale. */
function RecipientDetail({
  booking,
  person,
  busy,
  onResendWhatsapp,
  onResendEmail,
  onOpenClient,
}: {
  booking: Booking;
  person: Recipient;
  busy: boolean;
  onResendWhatsapp: ResendWhatsapp;
  onResendEmail: ResendEmail;
  onOpenClient: (playerId: Id<"players">) => void;
}) {
  const card = recipientCard(booking, person);
  const waRetry = whatsappRetry(booking, person);
  const mailRetry = emailRetry(booking, person);

  const sections = CHANNELS.filter(
    (channel) =>
      person.deliveries.some((delivery) => delivery.channel === channel) ||
      (channel === "whatsapp" ? waRetry : mailRetry),
  );

  return (
    <div className="space-y-5">
      {sections.map((channel) => {
        const attempts = person.deliveries.filter(
          (delivery) => delivery.channel === channel,
        );
        return (
          <div key={channel} className="space-y-3">
            {attempts.length === 0 && (
              <ListGroup
                title={
                  <span className="inline-flex items-center gap-1.5">
                    <ChannelIcon channel={channel} className="size-3.5" />
                    {CHANNEL_LABELS[channel]}
                  </span>
                }
              >
                <ListRow
                  title={
                    channel === "email"
                      ? "Non ancora inviata"
                      : "Non ancora inviato"
                  }
                  subtitle="Nessun tentativo finora"
                  className="text-muted-foreground"
                />
              </ListGroup>
            )}
            {attempts.length > 0 && (
              <ListGroup
                title={
                  <span className="inline-flex items-center gap-1.5">
                    <ChannelIcon channel={channel} className="size-3.5" />
                    {CHANNEL_LABELS[channel]}
                  </span>
                }
              >
                {attempts.map((delivery, index) => (
                  <Attempt
                    key={delivery._id}
                    delivery={delivery}
                    superseded={index > 0}
                  />
                ))}
              </ListGroup>
            )}

            {channel === "whatsapp" && waRetry && (
              <WhatsappRetryForm
                booking={booking}
                person={person}
                last={waRetry.last}
                busy={busy}
                onSend={onResendWhatsapp}
              />
            )}

            {channel === "email" && mailRetry && (
              <EmailRetry
                booking={booking}
                person={person}
                busy={busy}
                hasCard={Boolean(card)}
                first={attempts.length === 0}
                onSend={onResendEmail}
              />
            )}
          </div>
        );
      })}

      {card && (
        <ListGroup>
          <ListRow
            leading={<UserRound className="size-5" />}
            title="Scheda cliente"
            subtitle="Per correggere numero o email"
            chevron
            onClick={() => onOpenClient(card)}
          />
        </ListGroup>
      )}
    </div>
  );
}

/**
 * Un tentativo: cosa, a chi, quando, com'è andato e perché. Il perché di un
 * fallimento è rosso solo sull'ultimo: uno già superato da un invio dopo è
 * storia, non qualcosa da sistemare.
 */
function Attempt({
  delivery,
  superseded,
}: {
  delivery: Delivery;
  superseded: boolean;
}) {
  const badge = deliveryBadge(delivery);
  return (
    <div className="flex min-h-14 items-start gap-3 px-4 py-2.5">
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] leading-snug">
          {DELIVERY_KIND_LABELS[delivery.kind]}
        </span>
        {delivery.recipient && (
          <span className="text-muted-foreground mt-0.5 block truncate text-[13px] leading-snug">
            {delivery.recipient}
          </span>
        )}
        <span className="text-muted-foreground mt-0.5 block text-[13px] leading-snug">
          {format(delivery.updatedAt, "d MMM, HH:mm", { locale: it })}
        </span>
        {delivery.detail && (
          <span
            className={cn(
              "mt-0.5 block text-[13px] leading-snug",
              delivery.status === "failed" && !superseded
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
}

function SendLabel({ busy, label }: { busy: boolean; label: string }) {
  return busy ? (
    <>
      <Loader2
        aria-hidden
        className="size-4 animate-spin motion-reduce:animate-none"
      />
      Invio…
    </>
  ) : (
    label
  );
}

/**
 * Il WhatsApp di conferma, di nuovo. Quasi sempre non è arrivato per colpa
 * del numero: si parte da quello dell'ultimo tentativo, già scritto, e si
 * corregge prima di mandarlo.
 */
function WhatsappRetryForm({
  booking,
  person,
  last,
  busy,
  onSend,
}: {
  booking: Booking;
  person: Recipient;
  last?: Delivery;
  busy: boolean;
  onSend: ResendWhatsapp;
}) {
  const initial =
    last?.recipient ??
    (person.role === "booker" ? booking.phone : person.phone) ??
    "";
  const [phone, setPhone] = useState(initial.trim());
  const id = useId();
  // Da telefono il drawer non si chiude per sbaglio su un numero corretto e
  // non ancora mandato.
  useNestedDirty(phone.trim() !== initial.trim());

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!phone.trim()) return;
    await onSend(booking, phone.trim(), person.playerId);
  };

  const footer =
    person.role === "player"
      ? "Il numero corretto si salva anche nella scheda cliente."
      : "Il numero corretto resta su questa prenotazione: la scheda cliente non cambia.";

  return (
    <form className="space-y-3" onSubmit={submit} noValidate>
      <ListGroup
        title={last ? "Rinvia la conferma" : "Manda la conferma"}
        footer={footer}
      >
        <label
          htmlFor={id}
          className="flex min-h-14 items-center gap-3 px-4 py-2.5"
        >
          <FaWhatsapp aria-hidden className="text-muted-foreground size-5" />
          <span className="sr-only">Numero di telefono</span>
          <input
            id={id}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={phone}
            disabled={busy}
            placeholder="+39 333 123 4567"
            onChange={(event) => setPhone(event.target.value)}
            className="placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent text-base outline-none md:text-[15px]"
          />
        </label>
      </ListGroup>
      <Button
        type="submit"
        className={cn("h-12 w-full rounded-xl", PRESS)}
        disabled={busy || !phone.trim()}
      >
        <SendLabel
          busy={busy}
          label={last ? "Rinvia WhatsApp" : "Invia WhatsApp"}
        />
      </Button>
    </form>
  );
}

/**
 * La mail di conferma, di nuovo. L'indirizzo non si corregge qui: sta su
 * Clerk per chi ha un account, nella scheda cliente per gli altri.
 */
function EmailRetry({
  booking,
  person,
  busy,
  hasCard,
  first,
  onSend,
}: {
  booking: Booking;
  person: Recipient;
  busy: boolean;
  hasCard: boolean;
  /** Non è mai partita: «Invia», non «Rinvia». */
  first: boolean;
  onSend: ResendEmail;
}) {
  const target = retryTarget(person);
  if (!target) return null;

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        className={cn("bg-card h-12 w-full rounded-xl", PRESS)}
        disabled={busy}
        onClick={() => void onSend(booking, target, person.name)}
      >
        <SendLabel
          busy={busy}
          label={first ? "Invia la mail" : "Rinvia la mail"}
        />
      </Button>
      <p className="text-muted-foreground px-1 text-xs leading-relaxed">
        {hasCard
          ? `${first ? "Parte" : "Riparte"} la conferma con il QR. Se l'indirizzo è sbagliato, correggilo prima nella scheda cliente.`
          : `${first ? "Parte" : "Riparte"} la conferma con il QR allo stesso indirizzo.`}
      </p>
    </div>
  );
}

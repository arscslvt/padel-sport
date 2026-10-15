"use client";

import {
  formatEuro,
  type MatchPricing,
  roundEuro,
} from "@padel-sport/backend/convex/modules/pricing/lib";
import Link from "next/link";

import {
  ChoiceCard,
  Hint,
  SectionLabel,
  StepHeader,
  SummaryRow,
} from "@/components/booking/wizard-ui";
import type { BookingDay } from "@/lib/booking";
import { formatDayLong, formatSlotRange, MAX_PLAYERS } from "@/lib/booking";
import type { BookingPartner } from "@/lib/booking-form";
import { formatLevelRange, LEVEL_RANGES } from "@/lib/levels";
import { BOOKING_TERMS_LINK } from "@/lib/links";

/** Ultimo sguardo prima di occupare il campo. Ogni riga riporta al suo passo. */
export function SummaryStep({
  step,
  totalSteps,
  day,
  time,
  levelIndex,
  bookerName,
  phone,
  notes,
  partners,
  pricing,
  payment,
  onEdit,
}: {
  step: number;
  totalSteps: number;
  day: BookingDay;
  time: string;
  levelIndex: number;
  bookerName: string;
  phone: string;
  notes?: string;
  partners: BookingPartner[];
  /** Assente finché il listino non è arrivato: la riga del prezzo aspetta. */
  pricing?: MatchPricing;
  /** Assente quando il club non ha attivato il pagamento online. */
  payment?: { online: boolean; onChange: (online: boolean) => void };
  onEdit: (step: number) => void;
}) {
  const level = LEVEL_RANGES[levelIndex];
  const squadSize = 1 + partners.length;
  const missing = MAX_PLAYERS - squadSize;

  return (
    <div>
      <StepHeader
        step={step}
        total={totalSteps}
        title="Tutto pronto?"
        subtitle="Controlla il riepilogo e conferma la prenotazione."
      />

      <div className="border-border rounded-2xl border px-4">
        <SummaryRow
          label="Data"
          value={formatDayLong(day.date)}
          onEdit={() => onEdit(1)}
        />
        <SummaryRow
          label="Orario"
          value={formatSlotRange(time)}
          onEdit={() => onEdit(1)}
        />
        <SummaryRow
          label="Livello richiesto"
          value={`${formatLevelRange(level.min, level.max)} · ${level.label}`}
          onEdit={() => onEdit(2)}
        />
        <SummaryRow
          label={`Giocatori ${squadSize}/${MAX_PLAYERS}`}
          value={
            <ul className="flex flex-col gap-0.5">
              <li>{bookerName} · prenoti tu</li>
              {/* La posizione e non il nome: due compagni possono chiamarsi
                  uguale, e l'elenco qui non si riordina. */}
              {partners.map((partner, index) => (
                <li key={`${index}-${partner.name}`}>
                  {partner.name}
                  {partner.playerId
                    ? " · invito su WhatsApp"
                    : partner.email
                      ? ` · ${partner.email}`
                      : ""}
                </li>
              ))}
            </ul>
          }
          onEdit={() => onEdit(3)}
        />
        <SummaryRow label="Telefono" value={phone} onEdit={() => onEdit(4)} />
        {notes && (
          <SummaryRow
            label="Note alla struttura"
            value={notes}
            onEdit={() => onEdit(4)}
          />
        )}
        {pricing && (
          <SummaryRow
            label="Quota"
            value={
              <PriceSummary
                pricing={pricing}
                partners={partners.length}
                onSite={!payment}
              />
            }
          />
        )}
      </div>

      {payment && (
        <div className="mt-8">
          <SectionLabel>Come vuoi pagare?</SectionLabel>
          <div className="flex flex-col gap-2.5">
            <ChoiceCard
              title="Online, adesso"
              description="Con carta, Apple Pay o Google Pay sulla pagina sicura di SumUp, per te e i compagni indicati."
              selected={payment.online}
              onClick={() => payment.onChange(true)}
            />
            <ChoiceCard
              title="In struttura"
              description="Paghi all'arrivo, come sempre."
              selected={!payment.online}
              onClick={() => payment.onChange(false)}
            />
          </div>
          <p className="text-muted-foreground mt-3 text-xs leading-relaxed">
            Se paghi online puoi disdire e avere il rimborso fino a 24 ore prima
            della partita. Dopo la quota non è più rimborsabile.
          </p>
        </div>
      )}

      {missing > 0 && (
        <Hint>
          Confermando occupi il campo. {missing === 1 ? "Manca" : "Mancano"}{" "}
          {missing === 1 ? "un giocatore" : `${missing} giocatori`}: ci pensiamo
          noi a cercare chi gioca al vostro livello, e potremmo chiamarti per
          definire gli ultimi dettagli.
        </Hint>
      )}

      {/* Le informazioni che il Codice del Consumo chiede prima di un
          contratto a distanza: stanno nella pagina, qui c'è la strada. */}
      <p className="text-muted-foreground mt-6 text-xs leading-relaxed">
        Confermando accetti le{" "}
        <Link
          href={BOOKING_TERMS_LINK}
          target="_blank"
          className="text-foreground underline underline-offset-2"
        >
          condizioni di prenotazione
        </Link>
        .
      </p>
    </div>
  );
}

/**
 * Quanto si paga, con le parole di chi prenota: la sua quota, quella dei
 * compagni indicati e il totale. Chi aggiunge il club in seguito paga la sua.
 */
function PriceSummary({
  pricing,
  partners,
  onSite,
}: {
  pricing: MatchPricing;
  partners: number;
  /** Senza pagamento online non c'è scelta: lo si dice qui. */
  onSite: boolean;
}) {
  const bookerPrice = pricing.bookerPricePerPlayer ?? pricing.pricePerPlayer;
  const member = pricing.bookerPricePerPlayer !== undefined;
  const total = roundEuro(bookerPrice + pricing.pricePerPlayer * partners);

  return (
    <ul className="flex flex-col gap-0.5">
      <li>
        {formatEuro(bookerPrice)} per te
        {member ? " · tariffa tesserati" : ""}
      </li>
      {partners > 0 && (
        <>
          <li>{formatEuro(pricing.pricePerPlayer)} per ogni compagno</li>
          <li className="font-medium">Totale {formatEuro(total)}</li>
        </>
      )}
      {onSite && (
        <li className="text-muted-foreground">Si paga in struttura</li>
      )}
    </ul>
  );
}

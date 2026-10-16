"use client";

import {
  formatEuro,
  type PriceLine,
  priceLines,
  roundEuro,
} from "@padel-sport/backend/convex/modules/pricing/lib";
import { useState } from "react";

import { DisclosureRow } from "@/app/_components/disclosure-row";
import { ListGroup, ListRow } from "@/app/_components/list";
import { NestedDrawer } from "@/app/_components/nested-drawer";

import { type Booking, dueOnSite, isPaidOnline, onSiteTotal } from "./lib";

/**
 * Il totale da incassare in struttura, con quanto deve ognuno.
 *
 * Quando pagano tutti uguale basta dirlo sotto il totale: «7 € a persona».
 * Quando no (il tesserato paga meno di chi non lo è) allo sportello serve
 * sapere chi deve cosa, e la riga si apre: da desktop sul posto, da telefono
 * in un drawer annidato, come gli avvisi ai giocatori.
 *
 * Le quote vengono dal server (`priceLines`, modules/pricing/lib.ts): è la
 * stessa somma che fa il totale, e quella che paga chi salda online.
 */
export function TotalRow({
  booking,
  isDesktop,
}: {
  booking: Booking;
  isDesktop: boolean;
}) {
  const [open, setOpen] = useState(false);
  const lines = priceLines(booking);
  const prices = [...new Set(lines.map((line) => line.price))];
  const mixed = prices.length > 1;

  const paidOnline = isPaidOnline(booking)
    ? `già pagati online ${formatEuro(booking.paidAmount ?? 0)}`
    : null;

  const perHead = mixed
    ? splitLabel(lines)
    : prices[0] !== undefined
      ? `${formatEuro(prices[0])} a persona`
      : null;

  const row = {
    title: "Totale in struttura",
    subtitle: [perHead, paidOnline].filter(Boolean).join(" · ") || undefined,
    trailing: <Amount>{onSiteTotal(booking)}</Amount>,
  };

  if (!mixed) return <ListRow {...row} />;

  const detail = <Breakdown booking={booking} lines={lines} />;

  return isDesktop ? (
    <DisclosureRow
      {...row}
      label="Quanto deve ognuno"
      open={open}
      onToggle={() => setOpen((current) => !current)}
    >
      {detail}
    </DisclosureRow>
  ) : (
    <NestedDrawer
      open={open}
      onOpenChange={setOpen}
      title="Quanto deve ognuno"
      description={row.subtitle}
      trigger={<ListRow {...row} chevron />}
    >
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-1 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        {detail}
      </div>
    </NestedDrawer>
  );
}

/** «7 € tesserati, 9 € gli altri»: le due tariffe, la più bassa prima. */
function splitLabel(lines: PriceLine[]): string {
  const member = lines.find((line) => line.member)?.price;
  const full = lines.find((line) => !line.member)?.price;
  if (member === undefined || full === undefined) {
    const sorted = [...new Set(lines.map((line) => line.price))].sort(
      (a, b) => a - b,
    );
    return sorted.map(formatEuro).join(" o ");
  }
  return `${formatEuro(member)} tesserati, ${formatEuro(full)} gli altri`;
}

function Breakdown({
  booking,
  lines,
}: {
  booking: Booking;
  lines: PriceLine[];
}) {
  const total = roundEuro(lines.reduce((sum, line) => sum + line.price, 0));
  const paid = isPaidOnline(booking) ? (booking.paidAmount ?? 0) : 0;

  return (
    <div className="space-y-4">
      <ListGroup footer="Paga da tesserato chi è collegato a un cliente con la tessera valida. Un nome scritto a mano paga il prezzo pieno.">
        {lines.map((line, index) => (
          <ListRow
            // Due omonimi sono due righe: il nome da solo non basta.
            key={`${line.name}-${index}`}
            title={line.name}
            subtitle={[
              line.booker ? "Ha prenotato" : null,
              line.member ? "Tesserato" : "Non tesserato",
            ]
              .filter(Boolean)
              .join(" · ")}
            trailing={<Amount>{formatEuro(line.price)}</Amount>}
          />
        ))}
      </ListGroup>

      {/* Il totale sta già nella riga: qui solo se c'è un pagamento online
          da scalare, per dire quanto resta. */}
      {paid > 0 && (
        <ListGroup>
          <ListRow
            title="Totale"
            trailing={<Amount>{formatEuro(total)}</Amount>}
          />
          <ListRow
            title="Già pagati online"
            trailing={<Amount>{formatEuro(paid)}</Amount>}
          />
          <ListRow
            title="Da incassare"
            trailing={<Amount strong>{formatEuro(dueOnSite(booking))}</Amount>}
          />
        </ListGroup>
      )}
    </div>
  );
}

function Amount({
  children,
  strong,
}: {
  children: React.ReactNode;
  strong?: boolean;
}) {
  return (
    <span
      className={
        strong
          ? "text-foreground text-[15px] font-medium tabular-nums"
          : "text-muted-foreground text-[15px] tabular-nums"
      }
    >
      {children}
    </span>
  );
}

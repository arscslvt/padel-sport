import type { Doc, Id } from "../../_generated/dataModel";

/**
 * Chi aspetta ancora la mail di conferma, e può riceverla rimandandola.
 *
 * È una funzione pura, senza database: la usa il server che rimanda
 * (bookings/email.ts) e la scheda del gestionale che decide se offrirlo. Una
 * regola sola, così il tasto non compare dove il server poi direbbe di no.
 *
 * Per ogni destinatario conta l'ultima mail di conferma: chi l'ha ricevuta,
 * o ce l'ha in viaggio, non ne riceve una seconda. Ripartono:
 *
 * - le mail fallite (rimbalzate, rifiutate, il sito non ha risposto);
 * - quelle saltate per mancanza dell'indirizzo, ma solo per chi ha una scheda
 *   cliente: lì l'indirizzo si può aggiungere. Chi ha prenotato senza scheda
 *   non ha dove scriverlo, e il tasto resterebbe lì per niente.
 */

type Row = Pick<
  Doc<"bookingDeliveries">,
  "kind" | "channel" | "role" | "playerId" | "name" | "recipient" | "status" | "createdAt"
>;

export interface EmailRetryTargets {
  booker: boolean;
  playerIds: Id<"players">[];
  /** Gli ospiti, riconosciuti dall'indirizzo: non hanno una scheda. */
  guestEmails: string[];
  /** Chi riceverà la mail, per dirlo a chi la rimanda. */
  names: string[];
}

function keyOf(row: Row): string | null {
  if (row.role === "booker") return "booker";
  if (row.role === "player") return row.playerId ? `player:${row.playerId}` : null;
  return row.recipient ? `guest:${row.recipient.toLowerCase()}` : null;
}

export function emailRetryTargets(
  booking: Pick<Doc<"bookings">, "bookedBy" | "createdByPlayer">,
  deliveries: Row[],
): EmailRetryTargets {
  const latest = new Map<string, Row>();
  for (const row of deliveries) {
    if (row.channel !== "email" || row.kind !== "accepted") continue;
    const key = keyOf(row);
    if (!key) continue;
    const current = latest.get(key);
    if (!current || row.createdAt > current.createdAt) latest.set(key, row);
  }

  const targets: EmailRetryTargets = {
    booker: false,
    playerIds: [],
    guestEmails: [],
    names: [],
  };

  for (const row of latest.values()) {
    const fixable =
      row.role === "player" ||
      (row.role === "booker" && Boolean(booking.createdByPlayer));
    const retry =
      row.status === "failed" || (row.status === "skipped" && fixable);
    if (!retry) continue;

    if (row.role === "booker") {
      targets.booker = true;
      targets.names.unshift(booking.bookedBy);
    } else if (row.role === "player" && row.playerId) {
      targets.playerIds.push(row.playerId);
      targets.names.push(row.name ?? "un giocatore");
    } else if (row.role === "guest" && row.recipient) {
      targets.guestEmails.push(row.recipient.toLowerCase());
      targets.names.push(row.name ?? row.recipient);
    }
  }

  return targets;
}

/** Chi riceve un avviso, come si sceglie dalla scheda: una persona sola. */
export type RetryTarget =
  | { role: "booker" }
  | { role: "player"; playerId: Id<"players"> }
  | { role: "guest"; email: string };

/** Le persone in attesa, ristrette a una se `target` c'è. */
export function onlyTarget(
  targets: EmailRetryTargets,
  target?: RetryTarget,
): EmailRetryTargets {
  if (!target) return targets;

  const index =
    target.role === "player"
      ? targets.playerIds.indexOf(target.playerId)
      : target.role === "guest"
        ? targets.guestEmails.indexOf(target.email.toLowerCase())
        : -1;

  return {
    booker: target.role === "booker" && targets.booker,
    playerIds:
      target.role === "player" && index !== -1 ? [target.playerId] : [],
    guestEmails:
      target.role === "guest" && index !== -1
        ? [target.email.toLowerCase()]
        : [],
    names: [],
  };
}

export function hasEmailRetry(targets: EmailRetryTargets): boolean {
  return (
    targets.booker ||
    targets.playerIds.length > 0 ||
    targets.guestEmails.length > 0
  );
}

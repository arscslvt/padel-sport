import type { Doc, Id } from "../../_generated/dataModel";
import type { QueryCtx } from "../../_generated/server";

/**
 * Chi ha già ricevuto una certa comunicazione, e da quando in poi non si può
 * più saperlo con precisione.
 *
 * Due fonti, perché la storia ha due epoche:
 *
 * 1. gli invii tracciati lasciano una riga per destinatario, e lì la risposta
 *    è esatta;
 * 2. gli invii fatti prima del tracciamento non hanno lasciato niente. Per
 *    quelli l'unico indizio è la data: il destinatario è stato scelto quando
 *    l'invio è partito, quindi chi si era iscritto prima di `startedAt` era in
 *    quell'elenco. È una stima, ma sbaglia dalla parte giusta — nel dubbio non
 *    rimanda la mail a chi potrebbe averla già letta.
 */
export interface CommunicationCoverage {
  /** Iscrizioni con una consegna registrata */
  delivered: Set<Id<"eventRsvps">>;
  /** Iscritti prima di questo istante: raggiunti da un invio non tracciato */
  legacyUntil: number | null;
}

export async function communicationCoverage(
  ctx: QueryCtx,
  documentId: string,
  blockKey: string,
): Promise<CommunicationCoverage> {
  const [sends, deliveries] = await Promise.all([
    ctx.db
      .query("eventCommunications")
      .withIndex("by_document", (q) =>
        q.eq("documentId", documentId).eq("blockKey", blockKey),
      )
      .collect(),
    ctx.db
      .query("eventCommunicationDeliveries")
      .withIndex("by_document", (q) =>
        q.eq("documentId", documentId).eq("blockKey", blockKey),
      )
      .collect(),
  ]);

  // Solo gli invii riusciti coprono qualcuno: un `failed` non ha raggiunto
  // nessuno, e un `sending` non si sa ancora.
  const untracked = sends.filter((send) => send.status === "sent" && !send.tracked);

  return {
    delivered: new Set(deliveries.map((row) => row.rsvpId)),
    legacyUntil: untracked.length
      ? Math.max(...untracked.map((send) => send.startedAt))
      : null,
  };
}

/** Questa iscrizione ha già ricevuto la comunicazione? */
export function isReached(
  coverage: CommunicationCoverage,
  rsvp: Doc<"eventRsvps">,
) {
  if (coverage.delivered.has(rsvp._id)) return true;
  return coverage.legacyUntil !== null && rsvp.createdAt < coverage.legacyUntil;
}

/** Gli iscritti a cui una comunicazione può ancora arrivare. */
export function reachable(entries: Doc<"eventRsvps">[]) {
  return entries.filter(
    (entry) => entry.status === "confirmed" && !entry.unsubscribedAt,
  );
}

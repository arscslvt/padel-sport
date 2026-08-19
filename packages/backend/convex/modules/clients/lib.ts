import type { Doc, Id } from "../../_generated/dataModel";
import type { QueryCtx } from "../../_generated/server";

/**
 * Cosa vuol dire essere un cliente in regola, in un posto solo.
 *
 * Ci passano la dashboard, che lo mostra, e la prenotazione, che sopra ci
 * decide se lasciar prenotare: se le due risposte divergessero, uno vedrebbe
 * una tessera verde e si sentirebbe rifiutare la prenotazione.
 */

/** Dodici mesi, la durata dell'iscrizione. */
export const MEMBERSHIP_MS = 365 * 24 * 60 * 60 * 1000;

/** Da quanto vicino alla scadenza vale la pena avvisare lo staff. */
export const EXPIRING_SOON_MS = 30 * 24 * 60 * 60 * 1000;

export type MembershipState =
  /** Mai iscritto. */
  | "none"
  /** La tessera di quest'anno c'è ma non è stata saldata: non copre. */
  | "unpaid"
  /** In corso e pagata, ma scade entro un mese. */
  | "expiring"
  | "active"
  | "expired";

export interface MembershipStatus {
  state: MembershipState;
  /** La tessera a cui lo stato si riferisce: quella di adesso, o l'ultima scaduta. */
  membership: Doc<"memberships"> | null;
  /** Un rinnovo già aperto che comincia più avanti. */
  upcoming: Doc<"memberships"> | null;
}

async function membershipsOf(
  ctx: QueryCtx,
  playerId: Id<"players">,
): Promise<Doc<"memberships">[]> {
  return await ctx.db
    .query("memberships")
    .withIndex("by_player", (q) => q.eq("playerId", playerId))
    .collect();
}

/**
 * Lo stato della tessera adesso.
 *
 * La domanda è sempre «questa persona è coperta **oggi**», e la risposta sta
 * nella tessera che contiene questo istante — non nella più recente. Chi
 * rinnova in anticipo ha per qualche settimana due tessere: prendere quella che
 * scade più tardi lo farebbe risultare non pagante fino al giorno del rinnovo,
 * cioè lo bloccherebbe proprio perché è stato previdente.
 */
export async function membershipStatus(
  ctx: QueryCtx,
  playerId: Id<"players">,
  now: number = Date.now(),
): Promise<MembershipStatus> {
  const rows = await membershipsOf(ctx, playerId);

  if (rows.length === 0) {
    return { state: "none", membership: null, upcoming: null };
  }

  const covering = rows.filter((row) => row.startsAt <= now && row.endsAt > now);
  // Fra due tessere sovrapposte vince quella pagata: è quella che copre.
  const current = covering.find((row) => row.paid) ?? covering[0] ?? null;

  const upcoming =
    rows
      .filter((row) => row.startsAt > now)
      .sort((a, b) => a.startsAt - b.startsAt)[0] ?? null;

  if (!current) {
    const last = rows.reduce((latest, row) =>
      row.endsAt > latest.endsAt ? row : latest,
    );
    return { state: "expired", membership: last, upcoming };
  }

  if (!current.paid) {
    return { state: "unpaid", membership: current, upcoming };
  }

  const state =
    current.endsAt - now <= EXPIRING_SOON_MS ? "expiring" : "active";

  return { state, membership: current, upcoming };
}

/**
 * La tessera che scade più tardi, rinnovi futuri compresi.
 * Serve a incatenare un rinnovo alla fine del precedente, non a dire se una
 * persona è in regola: per quello c'è `membershipStatus`.
 */
export async function lastMembership(
  ctx: QueryCtx,
  playerId: Id<"players">,
): Promise<Doc<"memberships"> | null> {
  const rows = await membershipsOf(ctx, playerId);
  if (rows.length === 0) return null;

  return rows.reduce((latest, row) => (row.endsAt > latest.endsAt ? row : latest));
}

/** Tutte le tessere di un cliente, dalla più recente: è lo storico in scheda. */
export async function membershipHistory(
  ctx: QueryCtx,
  playerId: Id<"players">,
): Promise<Doc<"memberships">[]> {
  const rows = await membershipsOf(ctx, playerId);
  return rows.sort((a, b) => b.startsAt - a.startsAt);
}

/**
 * La tessera copre davvero il cliente in questo momento?
 *
 * È la domanda che fa la prenotazione: in corso *e* saldata. Una tessera aperta
 * dallo staff e non ancora pagata non vale, altrimenti l'iscrizione sarebbe
 * facoltativa nei fatti.
 */
export function isMembershipValid(state: MembershipState): boolean {
  return state === "active" || state === "expiring";
}

/**
 * A che punto è l'account collegato a una scheda.
 *
 * Non dice se la persona è socia — quello lo dice la tessera — ma se ha un modo
 * di entrare: `none` è chi allo sportello non ha mai lasciato altro che i
 * propri dati, e va benissimo così.
 */
export type AccountState = "none" | "invited" | "active";

export interface AccountInfo {
  state: AccountState;
  invitedAt?: number;
  lastSentAt?: number;
  sentCount?: number;
  acceptedAt?: number;
}

export async function accountInfo(
  ctx: QueryCtx,
  player: Doc<"players">,
): Promise<AccountInfo> {
  const invites = await ctx.db
    .query("clientInvites")
    .withIndex("by_player", (q) => q.eq("playerId", player._id))
    .collect();

  const accepted = invites.find((row) => row.status === "accepted");
  const open = invites.find((row) => row.status === "pending");

  if (accepted) {
    return {
      state: "active",
      invitedAt: accepted.createdAt,
      lastSentAt: accepted.lastSentAt,
      sentCount: accepted.sentCount,
      acceptedAt: accepted.acceptedAt,
    };
  }

  if (open) {
    return {
      state: "invited",
      invitedAt: open.createdAt,
      lastSentAt: open.lastSentAt,
      sentCount: open.sentCount,
    };
  }

  // Nessun invito ma un account collegato: è chi si era registrato dall'app
  // prima che esistesse questa sezione.
  return { state: player.clerkUserId ? "active" : "none" };
}

/** Nome e cognome quando ci sono, altrimenti il nome storico del profilo. */
export function displayName(player: {
  name: string;
  firstName?: string;
  lastName?: string;
}): string {
  const composed = [player.firstName, player.lastName]
    .filter((part) => part?.trim())
    .join(" ")
    .trim();

  return composed || player.name;
}

/**
 * I campi che il club considera l'anagrafica minima.
 *
 * I profili nati dall'app non ne hanno quasi nessuno: è da qui che nasce
 * l'etichetta «dati incompleti» in elenco, e l'elenco di cosa manca da mostrare
 * a chi deve completarli.
 */
export function missingProfileFields(player: Doc<"players">): string[] {
  const missing: string[] = [];

  if (!player.firstName?.trim()) missing.push("nome");
  if (!player.lastName?.trim()) missing.push("cognome");
  if (!player.email?.trim()) missing.push("email");
  if (!player.phone?.trim()) missing.push("telefono");
  if (!player.birthDate) missing.push("data di nascita");
  if (!player.gender) missing.push("sesso");

  return missing;
}

export function isProfileComplete(player: Doc<"players">): boolean {
  return missingProfileFields(player).length === 0;
}

/** Fine dell'iscrizione che parte oggi: un anno esatto. */
export function membershipEnd(startsAt: number): number {
  return startsAt + MEMBERSHIP_MS;
}

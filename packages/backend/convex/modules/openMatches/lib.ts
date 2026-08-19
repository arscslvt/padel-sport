import type { Doc, Id } from "../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../_generated/server";
import { externalBlocksBetween } from "../courtCalendar/lib";

export const SLOT_INTERVAL_MINUTES = 30;
export const MATCH_DURATION_MINUTES = 90;

export const SLOT_INTERVAL_MS = SLOT_INTERVAL_MINUTES * 60 * 1000;
export const MATCH_DURATION_MS = MATCH_DURATION_MINUTES * 60 * 1000;

export const MAX_PLAYERS = 4;
export const LEVEL_MIN = 1;
export const LEVEL_MAX = 5;

/**
 * Finestra entro cui il creatore può ancora eliminare la partita: oltre le
 * due ore dall'inizio la struttura non farebbe più in tempo a riassegnare il
 * campo, quindi la cancellazione passa da lei.
 */
export const CANCEL_DEADLINE_MS = 2 * 60 * 60 * 1000;

export type JoinMode = "direct" | "request";
export type OpenMatchStatus = "open" | "full" | "cancelled";
export type MatchVisibility = "public" | "circle" | "private";
export type MatchInviteKind = "direct" | "circle";

export interface PlayerView {
  id: Id<"players">;
  name: string;
  level: number;
  avatarUrl?: string;
  /** Codice pubblico con cui il giocatore è cercabile dagli amici. */
  code?: string;
}

export interface GuestView {
  id: Id<"matchGuests">;
  name: string;
  hasEmail: boolean;
}

export interface OpenMatchView {
  id: Id<"openMatches">;
  bookingId: Id<"bookings">;
  matchDate: number;
  levelMin: number;
  levelMax: number;
  joinMode: JoinMode;
  status: OpenMatchStatus;
  visibility: MatchVisibility;
  /** Valorizzato solo se la partita è nata dentro una cerchia. */
  circle?: { id: Id<"circles">; name: string };
  maxPlayers: number;
  /** Giocatori senza app, aggiunti a mano da chi organizza. */
  guests: GuestView[];
  /** Posti tenuti da inviti nominali ancora senza risposta. */
  reservedSeats: number;
  /** Posti davvero liberi: `maxPlayers` meno giocatori, ospiti e posti tenuti. */
  freeSeats: number;
  notes?: string;
  court?: string;
  creator: PlayerView;
  players: PlayerView[];
}

/**
 * Visibilità effettiva di una partita: le partite create prima delle cerchie
 * non hanno il campo, e per loro l'unico significato possibile è "pubblica".
 */
export function visibilityOf(match: Doc<"openMatches">): MatchVisibility {
  return match.visibility ?? "public";
}

/**
 * Tipo di invito: le righe create prima degli inviti nominali non hanno il
 * campo, ed erano tutte diffusioni a una cerchia.
 */
export function inviteKindOf(invite: Doc<"matchInvites">): MatchInviteKind {
  return invite.kind ?? "circle";
}

function overlaps(startA: number, endA: number, startB: number, endB: number) {
  return startA < endB && endA > startB;
}

/**
 * Trova un campo libero per l'orario richiesto.
 * Stessa logica di disponibilità di bookings/create.ts (flusso web, invariato),
 * con in più l'esclusione delle prenotazioni cancellate: se cambia lì,
 * va allineata anche qui.
 *
 * Conta anche le occupazioni che non nascono da noi (modules/courtCalendar):
 * chi prenota su SumUp occupa un campo vero, e questo è il punto in cui sia il
 * sito sia l'app chiedono «ce n'è uno libero?». Con un calendario SumUp solo
 * non sappiamo *quale* campo sia occupato, quindi ogni appuntamento esterno
 * toglie un posto dal totale: prudente, e nel dubbio si rifiuta.
 */
export async function findAvailableSlot(
  ctx: QueryCtx,
  bookingDate: number,
): Promise<Doc<"slots"> | null> {
  const activeSlots = (await ctx.db.query("slots").collect())
    .filter((slot) => slot.active)
    .sort((a, b) => a.name.localeCompare(b.name));

  const possibleOverlaps = await ctx.db
    .query("bookings")
    .withIndex("by_booking_date", (q) =>
      q
        .gte("bookingDate", bookingDate - MATCH_DURATION_MS + 1)
        .lt("bookingDate", bookingDate + MATCH_DURATION_MS),
    )
    .collect();

  const bookingEnd = bookingDate + MATCH_DURATION_MS;

  const freeSlots = activeSlots.filter((slot) => {
    return !possibleOverlaps.some((existingBooking) => {
      if (existingBooking.status === "cancelled") {
        return false;
      }

      const existingStart = existingBooking.bookingDate;
      const existingEnd = existingStart + MATCH_DURATION_MS;

      if (!overlaps(existingStart, existingEnd, bookingDate, bookingEnd)) {
        return false;
      }

      return !existingBooking.slot || existingBooking.slot === slot._id;
    });
  });

  const externalBlocks = await externalBlocksBetween(
    ctx,
    bookingDate,
    bookingEnd,
  );

  if (freeSlots.length - externalBlocks.length <= 0) {
    return null;
  }

  return freeSlots[0];
}

/** Mappa un range numerico di livello sul livello testuale delle prenotazioni web. */
export function levelLabel(
  levelMin: number,
  levelMax: number,
): "principiante" | "intermedio" | "avanzato" {
  const avg = (levelMin + levelMax) / 2;
  if (avg < 2.5) return "principiante";
  if (avg < 3.5) return "intermedio";
  return "avanzato";
}

/**
 * Codice pubblico di cinque cifre per un nuovo giocatore.
 * Estratto a caso e verificato sull'indice: alla collisione si riprova.
 */
export async function generatePlayerCode(ctx: MutationCtx): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = String(Math.floor(Math.random() * 90000) + 10000);

    const taken = await ctx.db
      .query("players")
      .withIndex("by_code", (q) => q.eq("code", code))
      .first();

    if (!taken) return code;
  }

  throw new Error("Non è stato possibile assegnarti un codice. Riprova.");
}

export async function getIdentityPlayer(
  ctx: QueryCtx,
): Promise<Doc<"players"> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;

  return await ctx.db
    .query("players")
    .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", identity.subject))
    .unique();
}

/** Richiede utente autenticato con profilo giocatore completo. */
export async function requirePlayer(ctx: QueryCtx): Promise<Doc<"players">> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Devi effettuare l'accesso.");
  }

  const player = await ctx.db
    .query("players")
    .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", identity.subject))
    .unique();

  if (!player) {
    throw new Error("Completa il tuo profilo giocatore prima di continuare.");
  }

  return player;
}

export function toPlayerView(player: Doc<"players">): PlayerView {
  return {
    id: player._id,
    name: player.name,
    level: player.level,
    avatarUrl: player.avatarUrl,
    code: player.code,
  };
}

/** Ospiti della partita, in ordine di inserimento. */
export async function guestsOf(
  ctx: QueryCtx,
  matchId: Id<"openMatches">,
): Promise<Doc<"matchGuests">[]> {
  return await ctx.db
    .query("matchGuests")
    .withIndex("by_match", (q) => q.eq("matchId", matchId))
    .collect();
}

/** Inviti di una partita, di qualunque tipo e stato. */
export async function invitesOf(
  ctx: QueryCtx,
  matchId: Id<"openMatches">,
): Promise<Doc<"matchInvites">[]> {
  return await ctx.db
    .query("matchInvites")
    .withIndex("by_match", (q) => q.eq("matchId", matchId))
    .collect();
}

/**
 * Quanto "vale" un invito quando ce n'è più d'uno per la stessa persona:
 * pending batte tutto (è quello a cui deve rispondere), poi accepted, e in
 * fondo le risposte ormai chiuse.
 */
function inviteRank(invite: Doc<"matchInvites">): number {
  switch (invite.status) {
    case "pending":
      return 3;
    case "accepted":
      return 2;
    case "declined":
      return 1;
    default:
      return 0;
  }
}

/**
 * L'invito che riguarda un giocatore in una partita.
 *
 * Normalmente ce n'è uno solo — reinvitare qualcuno riusa la sua riga
 * (modules/openMatches/invite.ts) — ma le righe nate prima di quella regola
 * possono essere più d'una: qui si sceglie quella che conta invece di
 * pretendere che sia unica e schiantarsi.
 */
export async function playerInviteFor(
  ctx: QueryCtx,
  matchId: Id<"openMatches">,
  playerId: Id<"players">,
): Promise<Doc<"matchInvites"> | null> {
  const invites = await ctx.db
    .query("matchInvites")
    .withIndex("by_match_player", (q) =>
      q.eq("matchId", matchId).eq("playerId", playerId),
    )
    .collect();

  return bestInvitePerPlayer(invites)[0] ?? null;
}

/**
 * Un invito per persona, tenendo quello che conta.
 * Serve agli elenchi, che altrimenti mostrerebbero due volte chi ha una riga
 * vecchia oltre a quella valida.
 */
export function bestInvitePerPlayer(
  invites: Doc<"matchInvites">[],
): Doc<"matchInvites">[] {
  const best = new Map<Id<"players">, Doc<"matchInvites">>();

  for (const invite of invites) {
    const current = best.get(invite.playerId);
    const wins =
      !current ||
      inviteRank(invite) > inviteRank(current) ||
      (inviteRank(invite) === inviteRank(current) &&
        invite.createdAt > current.createdAt);

    if (wins) best.set(invite.playerId, invite);
  }

  return [...best.values()];
}

export interface MatchOccupancy {
  players: number;
  guests: number;
  /** Inviti nominali in sospeso: tengono il posto (tables/matchInvites.ts). */
  reserved: number;
  total: number;
  free: number;
}

/**
 * I posti presi da questa partita e basta.
 *
 * Non conta solo `playerIds`: un ospite senza app occupa il campo come chiunque
 * altro, e un invito nominale tiene il posto per chi non ha ancora risposto,
 * così nessuno glielo soffia. Gli inviti di cerchia invece non contano: sono
 * una diffusione, non una prenotazione del posto.
 */
async function ownOccupancy(
  ctx: QueryCtx,
  match: Doc<"openMatches">,
): Promise<{ players: number; guests: number; reserved: number }> {
  const [guests, invites] = await Promise.all([
    guestsOf(ctx, match._id),
    invitesOf(ctx, match._id),
  ]);

  // Una persona tiene un posto solo, anche se ha più di una riga di invito
  const reserved = bestInvitePerPlayer(invites).filter(
    (invite) => invite.status === "pending" && inviteKindOf(invite) === "direct",
  ).length;

  return { players: match.playerIds.length, guests: guests.length, reserved };
}

/** La partita che sta sull'altra prenotazione, quando il campo è condiviso. */
async function mergedPartnerMatch(
  ctx: QueryCtx,
  match: Doc<"openMatches">,
): Promise<Doc<"openMatches"> | null> {
  const booking = await ctx.db.get(match.bookingId);
  if (!booking?.mergedWith) return null;

  const partnerBooking = await ctx.db.get(booking.mergedWith);
  if (!partnerBooking || partnerBooking.status === "cancelled") return null;

  return await ctx.db
    .query("openMatches")
    .withIndex("by_booking", (q) => q.eq("bookingId", partnerBooking._id))
    .first();
}

/**
 * Quanti dei quattro posti sono presi.
 *
 * È l'unico punto in cui questa somma va scritta: chiunque debba sapere se
 * c'è spazio passa da qui.
 *
 * Quando la struttura ha unito due prenotazioni sullo stesso campo
 * (tables/bookings.ts, `mergedWith`) i posti sono quattro **in due**, non
 * quattro a testa: senza sommare anche l'altro gruppo, due partite da due
 * vedrebbero due posti liberi ciascuna e dall'app si finirebbe in cinque su un
 * campo solo. La discesa è di un livello e mai ricorsiva — il legame è una
 * coppia, non una catena.
 */
export async function occupancyOf(
  ctx: QueryCtx,
  match: Doc<"openMatches">,
): Promise<MatchOccupancy> {
  const own = await ownOccupancy(ctx, match);

  const partner = await mergedPartnerMatch(ctx, match);
  const shared = partner ? await ownOccupancy(ctx, partner) : null;

  const players = own.players;
  const total =
    own.players +
    own.guests +
    own.reserved +
    (shared ? shared.players + shared.guests + shared.reserved : 0);

  return {
    players,
    guests: own.guests,
    reserved: own.reserved,
    total,
    free: Math.max(0, match.maxPlayers - total),
  };
}

/**
 * Riallinea `status` all'occupazione reale.
 *
 * Va chiamata da ogni punto che sposta un posto — ingresso, uscita, invito,
 * rifiuto, ospite aggiunto o tolto — altrimenti lo stato racconta una cosa e
 * i posti un'altra. Le partite cancellate restano tali.
 */
export async function syncMatchStatus(
  ctx: MutationCtx,
  matchId: Id<"openMatches">,
): Promise<void> {
  const match = await ctx.db.get(matchId);
  if (!match || match.status === "cancelled") return;

  const { total } = await occupancyOf(ctx, match);
  const status = total >= match.maxPlayers ? "full" : "open";

  if (status !== match.status) {
    await ctx.db.patch(matchId, { status });
  }
}

/**
 * Riscrive i nomi sulla prenotazione con la squadra vera: chi è in partita più
 * gli ospiti. È quello che la struttura legge dalla dashboard web, dove i
 * giocatori sono semplici stringhe e non esistono profili.
 */
export async function syncBookingPlayers(
  ctx: MutationCtx,
  match: Doc<"openMatches">,
): Promise<void> {
  const booking = await ctx.db.get(match.bookingId);
  if (!booking) return;

  const playerDocs = await Promise.all(
    match.playerIds.map((id) => ctx.db.get(id)),
  );
  const guests = await guestsOf(ctx, match._id);

  const names = [
    ...playerDocs.filter((doc) => doc !== null).map((doc) => doc.name),
    ...guests.map((guest) => guest.name),
  ];

  await ctx.db.patch(match.bookingId, { players: names });
}

/** Arricchisce una partita con giocatori e nome del campo. */
export async function toMatchView(
  ctx: QueryCtx,
  match: Doc<"openMatches">,
): Promise<OpenMatchView> {
  const playerDocs = await Promise.all(
    match.playerIds.map((id) => ctx.db.get(id)),
  );
  const players = playerDocs.filter((p) => p !== null).map(toPlayerView);

  const creator = players.find((p) => p.id === match.creatorId) ?? players[0];

  const booking = await ctx.db.get(match.bookingId);
  const slot = booking ? await ctx.db.get(booking.slot) : null;

  const circleDoc = match.circleId ? await ctx.db.get(match.circleId) : null;

  const guests = await guestsOf(ctx, match._id);
  const occupancy = await occupancyOf(ctx, match);

  return {
    id: match._id,
    bookingId: match.bookingId,
    matchDate: match.matchDate,
    levelMin: match.levelMin,
    levelMax: match.levelMax,
    joinMode: match.joinMode,
    status: match.status,
    visibility: visibilityOf(match),
    circle: circleDoc ? { id: circleDoc._id, name: circleDoc.name } : undefined,
    maxPlayers: match.maxPlayers,
    guests: guests.map((guest) => ({
      id: guest._id,
      name: guest.name,
      hasEmail: !!guest.email,
    })),
    reservedSeats: occupancy.reserved,
    freeSeats: occupancy.free,
    notes: match.notes,
    court: slot?.name,
    creator,
    players,
  };
}

/**
 * Annulla gli inviti a una partita ancora senza risposta.
 * Usato quando la partita viene cancellata o quando il creatore la lascia.
 */
export async function cancelPendingMatchInvites(
  ctx: MutationCtx,
  matchId: Id<"openMatches">,
): Promise<void> {
  const invites = await ctx.db
    .query("matchInvites")
    .withIndex("by_match", (q) => q.eq("matchId", matchId))
    .collect();

  await Promise.all(
    invites
      .filter((invite) => invite.status === "pending")
      .map((invite) =>
        ctx.db.patch(invite._id, {
          status: "cancelled",
          respondedAt: Date.now(),
        }),
      ),
  );
}

/**
 * Aggiunge un giocatore a una partita aperta (dopo i controlli del chiamante
 * su modalità di accesso) e tiene allineati i nomi sulla prenotazione,
 * così la dashboard web vede la squadra aggiornata.
 */
export async function addPlayerToMatch(
  ctx: MutationCtx,
  match: Doc<"openMatches">,
  player: Doc<"players">,
): Promise<void> {
  if (match.status !== "open") {
    throw new Error("La partita non è più aperta.");
  }

  if (match.matchDate <= Date.now()) {
    throw new Error("La partita è già iniziata o conclusa.");
  }

  if (match.playerIds.includes(player._id)) {
    throw new Error("Sei già in questa partita.");
  }

  // L'invito in sospeso di chi sta entrando tiene un posto che è già suo:
  // senza scalarlo si troverebbe la partita piena per colpa di sé stesso.
  const invite = await playerInviteFor(ctx, match._id, player._id);

  const holdsOwnSeat =
    invite?.status === "pending" && inviteKindOf(invite) === "direct";

  const { total } = await occupancyOf(ctx, match);
  if (total - (holdsOwnSeat ? 1 : 0) >= match.maxPlayers) {
    throw new Error("La partita è al completo.");
  }

  // Fuori dalle partite aperte il livello non filtra nessuno: in una cerchia o
  // fra invitati si gioca con chi si è scelto, e il range torna a contare solo
  // se poi la partita viene aperta a tutti.
  if (
    visibilityOf(match) === "public" &&
    (player.level < match.levelMin || player.level > match.levelMax)
  ) {
    throw new Error(
      "Il tuo livello non rientra in quello richiesto dalla partita.",
    );
  }

  await ctx.db.patch(match._id, {
    playerIds: [...match.playerIds, player._id],
  });

  // L'invito, se c'era, è ormai una risposta data
  if (invite && invite.status === "pending") {
    await ctx.db.patch(invite._id, {
      status: "accepted",
      respondedAt: Date.now(),
    });
  }

  const updated = await ctx.db.get(match._id);
  if (updated) {
    await syncBookingPlayers(ctx, updated);
  }
  await syncMatchStatus(ctx, match._id);
}

/**
 * Normalizza un numero di telefono italiano: via gli spazi, prefisso `+39` se
 * chi scrive lo dà per scontato. Condivisa dai due flussi che raccolgono un
 * recapito, il modulo web storico e la prenotazione dal sito.
 */
export function normalizePhone(phone: string): string {
  const trimmed = phone.trim();
  if (!trimmed) {
    throw new Error("Il numero di telefono è obbligatorio.");
  }

  const compact = trimmed.replace(/\s+/g, "");
  const withCountryCode = compact.startsWith("+") ? compact : `+39${compact}`;

  if (!/^\+?[0-9]{8,15}$/.test(withCountryCode)) {
    throw new Error("Inserisci un numero di telefono valido.");
  }

  return withCountryCode;
}

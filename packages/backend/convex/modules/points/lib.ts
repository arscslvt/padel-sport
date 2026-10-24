import { internal } from "../../_generated/api";
import type { Doc, Id } from "../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../_generated/server";
import { programState } from "./terms";

/**
 * Il saldo punti e l'unico modo di muoverlo.
 *
 * Carico dello staff, rimozione, riscatto di un premio, annullamento di un
 * riscatto: passano tutti da `applyPoints`. È lì che il registro e il saldo sul
 * giocatore restano d'accordo, ed è lì che parte la mail — se ogni strada
 * scrivesse per conto suo, prima o poi una dimenticherebbe uno dei tre.
 */

/** Il preset con cui nasce il sistema: lo chiedeva il club fin dal primo giorno. */
export const DEFAULT_PRESETS = [{ label: "Partita vinta", points: 3 }] as const;

/** Tetto di un singolo movimento: oltre è quasi certamente un dito scivolato. */
export const MAX_DELTA = 1000;

/**
 * Dopo la richiesta di uscita la persona ha dieci giorni per riscattare i
 * punti che ha: è la promessa del regolamento (sezione 8).
 */
export const EXIT_WINDOW_MS = 10 * 24 * 60 * 60 * 1000;

/** Fino a quando chi sta uscendo può riscattare. */
export function exitDeadline(exit: { requestedAt: number }): number {
  return exit.requestedAt + EXIT_WINDOW_MS;
}

export function balanceOf(player: Doc<"players">): number {
  return player.points ?? 0;
}

/**
 * Con l'account sospeso i punti sono congelati: restano della persona, ma non
 * se ne caricano, non se ne tolgono e non si spendono finché lo staff non la
 * riattiva. È quello che le promette la mail di sospensione.
 */
export function assertPointsUnfrozen(player: Doc<"players">) {
  if (player.deletion?.deletedAt) {
    throw new Error(
      "Questa scheda è stata eliminata: i suoi punti restano solo come copia.",
    );
  }
  if (player.suspension) {
    throw new Error(
      "L'account di questa persona è sospeso: i suoi punti sono congelati fino alla riattivazione.",
    );
  }
}

interface ApplyPointsArgs {
  playerId: Id<"players">;
  delta: number;
  label: string;
  note?: string;
  presetId?: Id<"pointPresets">;
  redemptionId?: Id<"rewardRedemptions">;
  createdByClerkUserId?: string;
}

/**
 * Registra il movimento, aggiorna il saldo e mette in coda la mail.
 *
 * A chi non ha ancora aderito al regolamento in vigore i punti arrivano **in
 * attesa**: lo staff li carica quando la partita è vinta, senza dover
 * ricordarsene settimane dopo, ma non sono della persona finché non accetta le
 * regole. Niente saldo, niente mail: diventano effettivi tutti insieme quando
 * aderisce (`creditPending`). Togliere punti a un conto non attivo non ha
 * senso: si annulla il movimento in attesa sbagliato.
 *
 * Il saldo non scende sotto zero: togliere più punti di quanti ce ne siano non
 * ha un significato, e un saldo negativo direbbe al cliente che deve qualcosa
 * al club.
 */
export async function applyPoints(
  ctx: MutationCtx,
  args: ApplyPointsArgs,
): Promise<{
  transactionId: Id<"pointTransactions">;
  balance: number;
  pending: boolean;
}> {
  if (!Number.isInteger(args.delta) || args.delta === 0) {
    throw new Error("I punti devono essere un numero intero diverso da zero.");
  }

  if (Math.abs(args.delta) > MAX_DELTA) {
    throw new Error(`Un singolo movimento non può superare ${MAX_DELTA} punti.`);
  }

  const player = await ctx.db.get(args.playerId);
  if (!player) throw new Error("Cliente non trovato.");

  // Annullare un riscatto restituisce punti che erano già suoi: da sospeso
  // non li perde, e il premio non consegnato non deve portarseli via.
  const isRefund = Boolean(args.redemptionId) && args.delta > 0;
  if (!isRefund) assertPointsUnfrozen(player);

  // La restituzione di un riscatto annullato passa sempre: quei punti erano
  // già della persona, che per riscattare aveva per forza aderito. Chi sta
  // uscendo tiene il saldo fino alla scadenza, e lo staff può ancora
  // correggerlo; i punti nuovi invece restano in attesa, come per chi non ha
  // aderito.
  const state = programState(player);
  const credited =
    state === "joined" || (state === "leaving" && args.delta < 0);

  if (!credited && !args.redemptionId) {
    if (args.delta < 0) {
      throw new Error(
        state === "left"
          ? "Questa persona è uscita dal programma: non ha punti da togliere."
          : "Questa persona non ha ancora aderito al programma: invece di togliere punti, annulla il movimento in attesa sbagliato.",
      );
    }

    const transactionId = await ctx.db.insert("pointTransactions", {
      playerId: args.playerId,
      delta: args.delta,
      label: args.label.trim(),
      note: args.note?.trim() || undefined,
      presetId: args.presetId,
      pending: true,
      balanceAfter: balanceOf(player),
      createdByClerkUserId: args.createdByClerkUserId,
      createdAt: Date.now(),
    });

    return { transactionId, balance: balanceOf(player), pending: true };
  }

  const balance = balanceOf(player) + args.delta;

  if (balance < 0) {
    throw new Error(
      `Il saldo è di ${balanceOf(player)} punti: non se ne possono togliere ${Math.abs(args.delta)}.`,
    );
  }

  const transactionId = await ctx.db.insert("pointTransactions", {
    playerId: args.playerId,
    delta: args.delta,
    label: args.label.trim(),
    note: args.note?.trim() || undefined,
    presetId: args.presetId,
    redemptionId: args.redemptionId,
    balanceAfter: balance,
    createdByClerkUserId: args.createdByClerkUserId,
    createdAt: Date.now(),
  });

  await ctx.db.patch(args.playerId, { points: balance });

  // Dopo il commit, e fuori dalla mutation: una mail che non parte non deve
  // annullare i punti, che sono già del cliente.
  await ctx.scheduler.runAfter(0, internal.modules.points.mail.default, {
    transactionId,
  });

  return { transactionId, balance, pending: false };
}

/** I movimenti in attesa di un giocatore, dal più vecchio. */
export async function pendingTransactions(
  ctx: QueryCtx,
  playerId: Id<"players">,
) {
  const rows = await ctx.db
    .query("pointTransactions")
    .withIndex("by_player", (q) => q.eq("playerId", playerId))
    .collect();

  return rows.filter((row) => row.pending);
}

/**
 * Accredita tutti i punti in attesa, nell'ordine in cui erano stati caricati.
 *
 * La chiama solo l'adesione al programma. Non manda una mail per movimento:
 * chi aderisce dall'area personale li vede comparire sullo schermo, e dieci
 * mail tutte insieme sarebbero solo rumore.
 */
export async function creditPending(
  ctx: MutationCtx,
  playerId: Id<"players">,
): Promise<{ credited: number; points: number }> {
  const player = await ctx.db.get(playerId);
  if (!player) return { credited: 0, points: 0 };

  const rows = (await pendingTransactions(ctx, playerId)).sort(
    (a, b) => a.createdAt - b.createdAt,
  );

  let balance = balanceOf(player);
  const now = Date.now();

  for (const row of rows) {
    balance += row.delta;
    await ctx.db.patch(row._id, {
      pending: undefined,
      confirmedAt: now,
      balanceAfter: balance,
    });
  }

  if (rows.length > 0) await ctx.db.patch(playerId, { points: balance });

  return {
    credited: rows.length,
    points: rows.reduce((sum, row) => sum + row.delta, 0),
  };
}

/**
 * Chiude l'uscita dal programma: i punti non usati decadono.
 *
 * È l'unico movimento che non passa da `applyPoints`, perché è l'unico che
 * non deve fare quel che fa `applyPoints`: niente mail, che il regolamento
 * promette di fermare, e niente controllo sull'adesione, che a questo punto
 * non c'è più. Il registro lo vede lo stesso, come un movimento in uscita.
 *
 * Non fa nulla se l'uscita non è arrivata a scadenza, è già chiusa o è stata
 * annullata: la chiamano il timer dell'uscita, il controllo quotidiano e
 * l'adesione di chi rientra, e solo uno dei tre deve chiudere davvero.
 */
export async function closeExit(
  ctx: MutationCtx,
  playerId: Id<"players">,
  now: number = Date.now(),
): Promise<{ forfeited: number } | null> {
  const player = await ctx.db.get(playerId);
  const program = player?.pointsProgram;
  const exit = program?.exit;
  if (!player || !program || !exit || exit.closedAt) return null;
  if (now < exitDeadline(exit)) return null;

  const forfeited = balanceOf(player);

  if (forfeited > 0) {
    await ctx.db.insert("pointTransactions", {
      playerId,
      delta: -forfeited,
      label: "Punti decaduti con l'uscita dal programma",
      balanceAfter: 0,
      createdAt: now,
    });
  }

  await ctx.db.patch(playerId, {
    points: forfeited > 0 ? 0 : player.points,
    pointsProgram: { ...program, exit: { ...exit, closedAt: now } },
  });

  return { forfeited };
}

/** Gli ultimi movimenti di un giocatore, dal più recente. */
export async function recentTransactions(
  ctx: QueryCtx,
  playerId: Id<"players">,
  limit: number,
) {
  return await ctx.db
    .query("pointTransactions")
    .withIndex("by_player", (q) => q.eq("playerId", playerId))
    .order("desc")
    .take(limit);
}

/** Un riscatto è ancora utilizzabile? Lo stato scritto non basta: c'è la scadenza. */
export function isRedemptionUsable(
  redemption: Doc<"rewardRedemptions">,
  now: number = Date.now(),
): boolean {
  return (
    redemption.status === "active" &&
    (redemption.expiresAt === undefined || redemption.expiresAt > now)
  );
}

/** Lo stato come lo vede chi guarda, scadenza compresa. */
export function redemptionState(
  redemption: Doc<"rewardRedemptions">,
  now: number = Date.now(),
): "active" | "used" | "cancelled" | "expired" {
  if (redemption.status !== "active") return redemption.status;
  return isRedemptionUsable(redemption, now) ? "active" : "expired";
}

/**
 * Codice del riscatto: sei caratteri senza quelli che si confondono a voce o
 * su uno schermo (0/O, 1/I/L). Lo staff lo legge dal telefono del cliente.
 */
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export async function generateRedemptionCode(ctx: MutationCtx): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    let code = "";
    for (let index = 0; index < 6; index++) {
      code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
    }

    const taken = await ctx.db
      .query("rewardRedemptions")
      .withIndex("by_code", (q) => q.eq("code", code))
      .first();

    if (!taken) return code;
  }

  throw new Error("Non è stato possibile generare il codice. Riprova.");
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function redemptionExpiry(
  validityDays: number | undefined,
  from: number,
): number | undefined {
  return validityDays ? from + validityDays * DAY_MS : undefined;
}

/** I premi in vetrina, dal più economico: è l'ordine in cui si sbloccano. */
export async function activeRewards(ctx: QueryCtx) {
  const rows = await ctx.db
    .query("rewards")
    .withIndex("by_archived", (q) => q.eq("archived", false))
    .collect();

  return rows.sort((a, b) => a.cost - b.cost || a.createdAt - b.createdAt);
}

/**
 * I premi che un cliente può vedere e riscattare: quelli in vetrina, tranne
 * i disattivati. `activeRewards` li tiene tutti, perché lo staff deve poterli
 * riaccendere.
 */
export async function availableRewards(ctx: QueryCtx) {
  return (await activeRewards(ctx)).filter((reward) => !reward.disabled);
}

export async function rewardImageUrl(
  ctx: QueryCtx,
  reward: Doc<"rewards">,
): Promise<string | null> {
  return reward.imageStorageId
    ? await ctx.storage.getUrl(reward.imageStorageId)
    : null;
}

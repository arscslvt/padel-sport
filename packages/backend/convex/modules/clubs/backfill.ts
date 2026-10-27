import { Migrations } from "@convex-dev/migrations";
import { v } from "convex/values";

import { components, internal } from "../../_generated/api";
import type { DataModel, Id, TableNames } from "../../_generated/dataModel";
import { internalMutation, internalQuery } from "../../_generated/server";
import { defaultClubId } from "./lib";

/**
 * Il riempimento di `clubId` sulle righe nate prima che esistesse
 * (docs/multi-club.md, Fase 1). Una migrazione per tabella, tutte in fila:
 *
 *   bunx convex run modules/clubs/backfill:run
 *
 * Ogni riga senza club prende quello di oggi, Padel Sport; chi ce l'ha già
 * resta com'è, quindi si può rilanciare (con `{ reset: true }`) per prendere
 * le righe scritte nel frattempo: serve di nuovo nella Fase 3, subito prima
 * di rendere `clubId` obbligatorio. Lo stato si legge con
 *
 *   bunx convex run --component migrations lib:getStatus
 *
 * e `missing` qui sotto dice, tabella per tabella, se resta qualcosa.
 */
export const migrations = new Migrations<DataModel>(components.migrations, {
  internalMutation,
});

/**
 * Le tabelle che portano `clubId`, con l'indice che comincia da lì. Il tipo
 * sotto fa fallire la compilazione se una tabella nuova non è in elenco.
 */
const CLUB_INDEX = {
  bookingDeliveries: "by_club",
  bookingPlayers: "by_club",
  bookingSettings: "by_club",
  bookings: "by_club_booking_date",
  circleInvites: "by_club",
  circleMembers: "by_club",
  circles: "by_club",
  clientInvites: "by_club_email",
  eventCommunicationDeliveries: "by_club",
  eventCommunications: "by_club",
  eventRsvps: "by_club_email",
  events: "by_club_date",
  externalBookings: "by_club_start",
  friendships: "by_club",
  joinRequests: "by_club",
  matchGuests: "by_club_email",
  matchInvites: "by_club",
  matchRequests: "by_club_status_date",
  memberships: "by_club_end",
  notificationPreferences: "by_club_user",
  openMatches: "by_club_status_date",
  payments: "by_club",
  players: "by_club_clerk_user_id",
  pointPresets: "by_club_archived",
  pointReports: "by_club_created",
  pointRules: "by_club_key",
  pointTransactions: "by_club",
  pointsExitRequests: "by_club",
  pushSubscriptions: "by_club_user",
  referrals: "by_club_email",
  rewardRedemptions: "by_club_status",
  rewards: "by_club_archived",
  services: "by_club_kind",
  slots: "by_club_name",
  supportRequests: "by_club_status_created",
  weatherDays: "by_club_day",
} as const satisfies Record<Exclude<TableNames, "clubs">, string>;

type ClubTable = keyof typeof CLUB_INDEX;
const TABLES = Object.keys(CLUB_INDEX) as ClubTable[];

const fill = <T extends ClubTable>(table: T) =>
  migrations.define({
    table,
    migrateOne: async (ctx, doc) => {
      if (doc.clubId !== undefined) return;
      const clubId = await defaultClubId(ctx);
      if (!clubId) {
        throw new Error(
          "Manca la riga del club: prima modules/clubs/seed:padelSport.",
        );
      }
      // Ogni tabella in elenco ha `clubId`, ma TypeScript non lo sa dire di
      // un `T` generico: l'id si legge come uno qualsiasi di loro, e `patch`
      // scrive comunque sulla tabella vera della riga.
      await ctx.db.patch(doc._id as Id<"bookings">, { clubId });
    },
  });

export const bookingDeliveries = fill("bookingDeliveries");
export const bookingPlayers = fill("bookingPlayers");
export const bookingSettings = fill("bookingSettings");
export const bookings = fill("bookings");
export const circleInvites = fill("circleInvites");
export const circleMembers = fill("circleMembers");
export const circles = fill("circles");
export const clientInvites = fill("clientInvites");
export const eventCommunicationDeliveries = fill(
  "eventCommunicationDeliveries",
);
export const eventCommunications = fill("eventCommunications");
export const eventRsvps = fill("eventRsvps");
export const events = fill("events");
export const externalBookings = fill("externalBookings");
export const friendships = fill("friendships");
export const joinRequests = fill("joinRequests");
export const matchGuests = fill("matchGuests");
export const matchInvites = fill("matchInvites");
export const matchRequests = fill("matchRequests");
export const memberships = fill("memberships");
export const notificationPreferences = fill("notificationPreferences");
export const openMatches = fill("openMatches");
export const payments = fill("payments");
export const players = fill("players");
export const pointPresets = fill("pointPresets");
export const pointReports = fill("pointReports");
export const pointRules = fill("pointRules");
export const pointTransactions = fill("pointTransactions");
export const pointsExitRequests = fill("pointsExitRequests");
export const pushSubscriptions = fill("pushSubscriptions");
export const referrals = fill("referrals");
export const rewardRedemptions = fill("rewardRedemptions");
export const rewards = fill("rewards");
export const services = fill("services");
export const slots = fill("slots");
export const supportRequests = fill("supportRequests");
export const weatherDays = fill("weatherDays");

/** Tutte le tabelle, una dopo l'altra. */
export const run = migrations.runner(
  TABLES.map((table) => internal.modules.clubs.backfill[table]),
);

/**
 * Per ogni tabella, quante righe sono ancora senza club (fino a `limit`).
 * Legge dall'indice che comincia da `clubId`, dove le righe senza club stanno
 * tutte in fila: non scorre la tabella intera.
 */
export const missing = internalQuery({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit = 100 }) => {
    const result: Partial<Record<ClubTable, number>> = {};
    for (const table of TABLES) {
      const rows = await ctx.db
        .query(table as "bookings")
        .withIndex(CLUB_INDEX[table] as "by_club_booking_date", (q) =>
          q.eq("clubId", undefined),
        )
        .take(limit);
      if (rows.length) result[table] = rows.length;
    }
    return result;
  },
});

import { defineSchema } from "convex/server";
import bookings from "./tables/bookings";
import events from "./tables/events";
import joinRequests from "./tables/joinRequests";
import openMatches from "./tables/openMatches";
import players from "./tables/players";
import slots from "./tables/slots";

export default defineSchema({
  events,
  bookings,
  slots,
  players,
  openMatches,
  joinRequests,
});

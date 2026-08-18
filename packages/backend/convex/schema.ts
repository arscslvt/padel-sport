import { defineSchema } from "convex/server";
import bookings from "./tables/bookings";
import circleInvites from "./tables/circleInvites";
import circleMembers from "./tables/circleMembers";
import circles from "./tables/circles";
import eventRsvps from "./tables/eventRsvps";
import events from "./tables/events";
import friendships from "./tables/friendships";
import joinRequests from "./tables/joinRequests";
import matchInvites from "./tables/matchInvites";
import matchRequests from "./tables/matchRequests";
import openMatches from "./tables/openMatches";
import players from "./tables/players";
import slots from "./tables/slots";
import supportRequests from "./tables/supportRequests";

export default defineSchema({
  events,
  bookings,
  slots,
  players,
  openMatches,
  joinRequests,
  friendships,
  matchRequests,
  supportRequests,
  eventRsvps,
  circles,
  circleMembers,
  circleInvites,
  matchInvites,
});

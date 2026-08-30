import { defineSchema } from "convex/server";
import bookingSettings from "./tables/bookingSettings";
import bookings from "./tables/bookings";
import circleInvites from "./tables/circleInvites";
import circleMembers from "./tables/circleMembers";
import circles from "./tables/circles";
import clientInvites from "./tables/clientInvites";
import eventCommunicationDeliveries from "./tables/eventCommunicationDeliveries";
import eventCommunications from "./tables/eventCommunications";
import eventRsvps from "./tables/eventRsvps";
import events from "./tables/events";
import externalBookings from "./tables/externalBookings";
import friendships from "./tables/friendships";
import joinRequests from "./tables/joinRequests";
import matchGuests from "./tables/matchGuests";
import matchInvites from "./tables/matchInvites";
import matchRequests from "./tables/matchRequests";
import memberships from "./tables/memberships";
import openMatches from "./tables/openMatches";
import players from "./tables/players";
import slots from "./tables/slots";
import socialCredentials from "./tables/socialCredentials";
import socialPosts from "./tables/socialPosts";
import socialSettings from "./tables/socialSettings";
import socialTemplates from "./tables/socialTemplates";
import supportRequests from "./tables/supportRequests";

export default defineSchema({
  events,
  bookings,
  bookingSettings,
  externalBookings,
  slots,
  players,
  openMatches,
  joinRequests,
  friendships,
  matchRequests,
  supportRequests,
  eventRsvps,
  eventCommunications,
  eventCommunicationDeliveries,
  circles,
  circleMembers,
  circleInvites,
  clientInvites,
  memberships,
  matchInvites,
  matchGuests,
  socialCredentials,
  socialPosts,
  socialSettings,
  socialTemplates,
});

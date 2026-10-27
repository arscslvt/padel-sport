import { defineSchema } from "convex/server";
import bookingDeliveries from "./tables/bookingDeliveries";
import bookingPlayers from "./tables/bookingPlayers";
import bookingSettings from "./tables/bookingSettings";
import bookings from "./tables/bookings";
import circleInvites from "./tables/circleInvites";
import circleMembers from "./tables/circleMembers";
import circles from "./tables/circles";
import clientInvites from "./tables/clientInvites";
import clubs from "./tables/clubs";
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
import notificationPreferences from "./tables/notificationPreferences";
import memberships from "./tables/memberships";
import openMatches from "./tables/openMatches";
import payments from "./tables/payments";
import players from "./tables/players";
import pointPresets from "./tables/pointPresets";
import pointReports from "./tables/pointReports";
import pointRules from "./tables/pointRules";
import pointsExitRequests from "./tables/pointsExitRequests";
import pointTransactions from "./tables/pointTransactions";
import pushSubscriptions from "./tables/pushSubscriptions";
import referrals from "./tables/referrals";
import rewardRedemptions from "./tables/rewardRedemptions";
import rewards from "./tables/rewards";
import services from "./tables/services";
import slots from "./tables/slots";
import supportRequests from "./tables/supportRequests";
import weatherDays from "./tables/weatherDays";

export default defineSchema({
  clubs,
  events,
  bookings,
  bookingDeliveries,
  bookingPlayers,
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
  pointPresets,
  pointTransactions,
  pointRules,
  rewards,
  rewardRedemptions,
  pointReports,
  pointsExitRequests,
  pushSubscriptions,
  referrals,
  notificationPreferences,
  services,
  payments,
  weatherDays,
});

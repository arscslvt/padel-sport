import { defineSchema } from "convex/server";
import events from "./tables/events";
import bookings from "./tables/bookings";

export default defineSchema({
  events,
  bookings,
});

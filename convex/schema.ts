import { defineSchema } from "convex/server";
import events from "./tables/events";
import bookings from "./tables/bookings";
import slots from "./tables/slots";

export default defineSchema({
  events,
  bookings,
  slots,
});

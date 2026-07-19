import { defineSchema } from "convex/server";
import bookings from "./tables/bookings";
import events from "./tables/events";
import slots from "./tables/slots";

export default defineSchema({
  events,
  bookings,
  slots,
});

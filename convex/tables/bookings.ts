import { defineTable } from "convex/server";
import { v } from "convex/values";

const bookings = defineTable({
  bookedBy: v.string(),
  phone: v.string(),
  players: v.array(v.string()),
  bookingDate: v.float64(),
  level: v.union(
    v.literal("principiante"),
    v.literal("intermedio"),
    v.literal("avanzato"),
  ),
  bookForAll: v.boolean(),
  pricePerPlayer: v.float64(),
  paymentMode: v.literal("on_site"),
  status: v.literal("pending_on_site_payment"),
  createdAt: v.float64(),
})
  .index("by_booking_date", ["bookingDate"])
  .index("by_created_at", ["createdAt"]);

export default bookings;

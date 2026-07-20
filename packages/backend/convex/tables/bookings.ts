import { defineTable } from "convex/server";
import { v } from "convex/values";

const notificationStatus = v.union(
  v.literal("pending"),
  v.literal("sent_with_whatsapp"),
  v.literal("failed_to_send_whatsapp"),
);

const bookings = defineTable({
  bookedBy: v.string(),
  phone: v.optional(v.string()),
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
  status: v.union(
    v.literal("pending_on_site_payment"),
    v.literal("accepted_on_site_payment"),
    v.literal("cancelled"),
  ),
  notificationStatus: v.optional(
    v.union(
      v.literal("pending"),
      v.literal("sent_with_whatsapp"),
      v.literal("failed_to_send_whatsapp"),
    ),
  ),
  createdAt: v.float64(),
  slot: v.id("slots"),
  code: v.optional(v.string()),
  /** Giocatore dell'app mobile che ha creato la prenotazione (assente per il web) */
  createdByPlayer: v.optional(v.id("players")),
})
  .index("by_booking_date", ["bookingDate"])
  .index("by_created_at", ["createdAt"])
  .index("by_status", ["status"])
  .index("by_code", ["code"])
  .index("by_notification_status", ["notificationStatus"])
  .index("by_created_by_player", ["createdByPlayer", "bookingDate"]);

export default bookings;
export { notificationStatus };

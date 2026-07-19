import { type Infer, v } from "convex/values";

const bookingNewSchema = v.object({
  bookedBy: v.string(),
  phone: v.string(),
  players: v.array(v.string()),
  bookingDate: v.number(),
  level: v.union(
    v.literal("principiante"),
    v.literal("intermedio"),
    v.literal("avanzato"),
  ),
  bookForAll: v.boolean(),
});

export type BookingNewT = Infer<typeof bookingNewSchema>;
export { bookingNewSchema };

import { defineTable } from "convex/server";
import { v } from "convex/values";

const circleInviteStatus = v.union(
  v.literal("pending"),
  v.literal("accepted"),
  v.literal("declined"),
  v.literal("cancelled"),
);

/**
 * Invito a entrare in una cerchia, con una nota facoltativa di chi invita.
 *
 * A differenza delle amicizie la riga non viene cancellata al rifiuto: resta
 * come `declined` così il proprietario vede chi ha detto di no e non continua
 * a reinvitarlo per sbaglio. Un nuovo invito alla stessa persona è comunque
 * ammesso, perché il vincolo è solo sugli inviti ancora `pending`.
 */
const circleInvites = defineTable({
  circleId: v.id("circles"),
  inviterId: v.id("players"),
  inviteeId: v.id("players"),
  note: v.optional(v.string()),
  status: circleInviteStatus,
  createdAt: v.float64(),
  respondedAt: v.optional(v.float64()),
})
  .index("by_invitee_status", ["inviteeId", "status"])
  .index("by_circle_status", ["circleId", "status"])
  .index("by_circle_invitee", ["circleId", "inviteeId"]);

export default circleInvites;
export { circleInviteStatus };

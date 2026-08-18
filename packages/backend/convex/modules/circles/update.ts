import { v } from "convex/values";
import { mutation } from "../../_generated/server";
import { requirePlayer } from "../openMatches/lib";
import { requireCircleOwner } from "./lib";

const NAME_MAX = 40;

/** Rinomina la cerchia. Solo il proprietario. */
export default mutation({
  args: {
    circleId: v.id("circles"),
    name: v.string(),
  },
  handler: async (ctx, { circleId, name }) => {
    const player = await requirePlayer(ctx);
    await requireCircleOwner(ctx, circleId, player._id);

    const trimmed = name.trim();
    if (trimmed.length < 2) {
      throw new Error("Dai un nome alla cerchia (almeno due caratteri).");
    }

    if (trimmed.length > NAME_MAX) {
      throw new Error(`Il nome della cerchia non può superare i ${NAME_MAX} caratteri.`);
    }

    await ctx.db.patch(circleId, { name: trimmed });

    return { circleId };
  },
});

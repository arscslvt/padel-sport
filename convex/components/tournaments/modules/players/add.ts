import { v } from "convex/values";
import { mutation } from "../../_generated/server";

export default mutation({
  args: {
    firstName: v.string(),
    lastName: v.string(),
    email: v.optional(v.string()),
    image: v.optional(v.string()),
  },
  async handler({ db }, args_0) {
    const playerId = await db.insert("players", {
      firstName: args_0.firstName,
      lastName: args_0.lastName,
      email: args_0.email,
      image: args_0.image,
    });

    return playerId;
  },
});

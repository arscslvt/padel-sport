import { internalMutation } from "../_generated/server";
import { newEventSchema } from "../types/events/event.new.type";

export default internalMutation({
  args: {
    newEventSchema: newEventSchema,
  },
  handler: async (ctx, { newEventSchema }) => {
    const id = await ctx.db.insert("events", newEventSchema);
    return id;
  },
});

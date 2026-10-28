import { internalMutation } from "../functions";
import { defaultClubId } from "../modules/clubs/lib";
import { newEventSchema } from "../types/events/event.new.type";

export default internalMutation({
  args: {
    newEventSchema: newEventSchema,
  },
  handler: async (ctx, { newEventSchema }) => {
    const id = await ctx.db.insert("events", {
      ...newEventSchema,
      clubId: await defaultClubId(ctx),
    });
    return id;
  },
});

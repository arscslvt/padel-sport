import { v } from "convex/values";

import { internalMutation } from "../functions";
import { newEventSchema } from "../types/events/event.new.type";

/** @deprecated Gli eventi stanno su Sanity: nessuno chiama più questa funzione. */
export default internalMutation({
  args: {
    newEventSchema: newEventSchema,
    clubId: v.id("clubs"),
  },
  handler: async (ctx, { newEventSchema, clubId }) => {
    const id = await ctx.db.insert("events", { ...newEventSchema, clubId });
    return id;
  },
});

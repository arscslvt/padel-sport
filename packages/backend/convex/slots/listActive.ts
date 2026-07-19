import { query } from "../_generated/server";

export default query({
  handler: async (ctx) => {
    return (await ctx.db.query("slots").collect())
      .filter((slot) => slot.active)
      .sort((a, b) => a.name.localeCompare(b.name));
  },
});

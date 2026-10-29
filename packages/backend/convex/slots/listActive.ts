import { clubQuery } from "../functions";
import { clubCourts } from "../modules/settings/lib";

export default clubQuery({
  args: {},
  handler: async (ctx) => {
    return (await clubCourts(ctx, ctx.club._id))
      .filter((slot) => slot.active)
      .sort((a, b) => a.name.localeCompare(b.name));
  },
});

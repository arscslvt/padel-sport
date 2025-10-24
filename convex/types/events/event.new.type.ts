import { type Infer, v } from "convex/values";

const newEventSchema = v.object({
  title: v.string(),
  description: v.string(),
  date: v.number(),
  socials: v.optional(
    v.object({
      instagramPost: v.optional(v.string()),
      facebookPost: v.optional(v.string()),
    })
  ),
});

export type NewEventT = Infer<typeof newEventSchema>;
export { newEventSchema };

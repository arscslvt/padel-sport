"use node";

import { internalAction } from "../../_generated/server";
import { sendAlert } from "../../utils/notification_client";
import { v } from "convex/values";

const schema = {
  title: v.string(),
  message: v.string(),
  tags: v.optional(v.array(v.string())),
  cta: v.optional(
    v.object({
      label: v.string(),
      url: v.string(),
    }),
  ),
  clickUrl: v.optional(v.string()),
  imageUrl: v.optional(v.string()),
  priority: v.optional(
    v.union(
      v.literal("min"),
      v.literal("low"),
      v.literal("default"),
      v.literal("high"),
      v.literal("urgent"),
    ),
  ),
};

export default internalAction({
  args: {
    ...schema,
  },
  async handler(_, args_0) {
    await sendAlert(args_0);
  },
});

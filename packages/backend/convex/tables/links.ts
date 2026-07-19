import { defineTable } from "convex/server";
import { v } from "convex/values";

export default defineTable({
  displayName: v.string(),
  href: v.string(),
  short: v.string(),
  visits: v.number(),
});

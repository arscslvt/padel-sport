import { defineTable } from "convex/server";
import { v } from "convex/values";

export default defineTable({
  name: v.string(),
  description: v.optional(v.string()),
  active: v.boolean(),
}).index("by_name", ["name"]);

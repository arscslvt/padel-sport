import { defineTable } from "convex/server";
import { v } from "convex/values";

const players = defineTable({
  firstName: v.optional(v.string()),
  lastName: v.string(),
  email: v.optional(v.string()),
  image: v.optional(v.string()),
})
  .index("by_full_name", ["firstName", "lastName"])
  .index("by_email", ["email"])
  .searchIndex("search_by_name", {
    searchField: "firstName",
    filterFields: ["lastName"],
  });

export default players;

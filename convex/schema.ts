import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  pages: defineTable({
    html: v.optional(v.string()),
    slug: v.optional(v.string()),
    storageId: v.optional(v.id("_storage")),
  }).index("by_slug", ["slug"]),
});

import { v } from "convex/values";

import { createSlug, isSlug } from "../shared/slug";
import type { Doc } from "./_generated/dataModel";
import { internalMutation, internalQuery } from "./_generated/server";

export const create = internalMutation({
  args: { storageId: v.id("_storage") },
  returns: v.object({ id: v.id("pages"), slug: v.string() }),
  handler: async (ctx, args) => {
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const slug = createSlug();
      const existingPage = await ctx.db
        .query("pages")
        .withIndex("by_slug", (query) => query.eq("slug", slug))
        .unique();

      if (existingPage === null) {
        const id = await ctx.db.insert("pages", {
          slug,
          storageId: args.storageId,
        });
        return { id, slug };
      }
    }

    throw new Error("Could not allocate a short link.");
  },
});

export const get = internalQuery({
  args: { identifier: v.string() },
  returns: v.union(
    v.null(),
    v.object({ kind: v.literal("inline"), html: v.string() }),
    v.object({ kind: v.literal("storage"), storageId: v.id("_storage") }),
  ),
  handler: async (ctx, args) => {
    let page: Doc<"pages"> | null = null;

    if (isSlug(args.identifier)) {
      page = await ctx.db
        .query("pages")
        .withIndex("by_slug", (query) => query.eq("slug", args.identifier))
        .unique();
    } else {
      const pageId = ctx.db.normalizeId("pages", args.identifier);
      if (pageId !== null) {
        page = await ctx.db.get(pageId);
      }
    }

    if (page?.storageId !== undefined) {
      return { kind: "storage" as const, storageId: page.storageId };
    }
    if (page?.html !== undefined) {
      return { kind: "inline" as const, html: page.html };
    }
    return null;
  },
});

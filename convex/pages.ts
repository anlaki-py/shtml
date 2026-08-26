import { v } from "convex/values";

import { validateHtml } from "../shared/html";
import { internalMutation, internalQuery } from "./_generated/server";

export const create = internalMutation({
  args: { html: v.string() },
  returns: v.id("pages"),
  handler: async (ctx, args) => {
    const validation = validateHtml(args.html);
    if (!validation.ok) {
      throw new Error(validation.message);
    }

    return await ctx.db.insert("pages", { html: args.html });
  },
});

export const get = internalQuery({
  args: { id: v.string() },
  returns: v.union(v.null(), v.object({ html: v.string() })),
  handler: async (ctx, args) => {
    const pageId = ctx.db.normalizeId("pages", args.id);
    if (pageId === null) {
      return null;
    }

    const page = await ctx.db.get(pageId);
    return page === null ? null : { html: page.html };
  },
});

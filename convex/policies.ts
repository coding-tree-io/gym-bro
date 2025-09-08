import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const getPolicy = query({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("policies")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .unique();
  },
});

export const getAllPolicies = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const userProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .unique();

    if (!userProfile || userProfile.role !== "admin") {
      throw new Error("Not authorized");
    }

    return await ctx.db.query("policies").collect();
  },
});

export const updatePolicy = mutation({
  args: {
    key: v.string(),
    value: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const userProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .unique();

    if (!userProfile || userProfile.role !== "admin") {
      throw new Error("Not authorized");
    }

    const existing = await ctx.db
      .query("policies")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        value: args.value,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("policies", {
        key: args.key,
        value: args.value,
        updatedAt: Date.now(),
      });
    }

    // Create audit log
    await ctx.db.insert("auditLogs", {
      actorUserId: userId,
      action: "policy_updated",
      entity: "policies",
      entityId: args.key,
      payload: JSON.stringify({ key: args.key, value: args.value }),
      at: Date.now(),
    });
  },
});

// Initialize default policies
export const initializePolicies = mutation({
  args: {},
  handler: async (ctx) => {
    const defaults = [
      { key: "cancellationCutoffHours", value: "24" },
      { key: "defaultWeeklyQuotaExperienced", value: "4" },
      { key: "defaultWeeklyQuotaInexperienced", value: "3" },
      { key: "maxFutureBookings", value: "10" },
      { key: "waitlistOfferTimeoutMinutes", value: "15" },
      { key: "gymTimezone", value: "Europe/Instanbul" },
      { key: "defaultWorkingHours", value: "09:00 - 14:00, 17:00-22:00" },
    ];

    for (const policy of defaults) {
      const existing = await ctx.db
        .query("policies")
        .withIndex("by_key", (q) => q.eq("key", policy.key))
        .unique();

      if (!existing) {
        await ctx.db.insert("policies", {
          key: policy.key,
          value: policy.value,
          updatedAt: Date.now(),
        });
      }
    }
  },
});

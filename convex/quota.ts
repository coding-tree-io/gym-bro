import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const getCurrentQuota = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    
    const userProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .unique();

    if (!userProfile || userProfile.role !== "lifter") {
      throw new Error("Not authorized");
    }

    const weekStart = getWeekStart(Date.now());
    const weekEnd = weekStart + 7 * 24 * 60 * 60 * 1000 - 1;

    let quotaWindow = await ctx.db
      .query("quotaWindows")
      .withIndex("by_lifter_and_week", (q) => 
        q.eq("lifterId", userId).eq("weekStartUtc", weekStart)
      )
      .unique();

    if (!quotaWindow) {
      // Return default values if no quota window exists yet
      return {
        quota: userProfile.weeklyQuota || 0,
        used: 0,
        remaining: userProfile.weeklyQuota || 0,
        weekStart: weekStart,
        weekEnd: weekEnd,
      };
    }

    return {
      quota: quotaWindow.quota,
      used: quotaWindow.used,
      remaining: quotaWindow.quota - quotaWindow.used,
      weekStart: quotaWindow.weekStartUtc,
      weekEnd: quotaWindow.weekEndUtc,
    };
  },
});

export const getUnbookedLifters = query({
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

    const weekStart = getWeekStart(Date.now());
    const lifterProfiles = await ctx.db
      .query("userProfiles")
      .withIndex("by_role", (q) => q.eq("role", "lifter"))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    const unbookedLifters = [];

    for (const lifterProfile of lifterProfiles) {
      const quotaWindow = await ctx.db
        .query("quotaWindows")
        .withIndex("by_lifter_and_week", (q) => 
          q.eq("lifterId", lifterProfile.userId).eq("weekStartUtc", weekStart)
        )
        .unique();

      const quota = quotaWindow?.quota || lifterProfile.weeklyQuota || 0;
      const used = quotaWindow?.used || 0;

      if (used < quota) {
        const authUser = await ctx.db.get(lifterProfile.userId);
        unbookedLifters.push({
          _id: lifterProfile.userId,
          name: authUser?.name || "Unknown User",
          email: authUser?.email || "",
          role: lifterProfile.role,
          experienceLevel: lifterProfile.experienceLevel,
          weeklyQuota: lifterProfile.weeklyQuota,
          status: lifterProfile.status,
          joinedAt: lifterProfile.joinedAt,
          quotaTotal: quota,
          quotaUsed: used,
          quotaRemaining: quota - used,
        });
      }
    }

    return unbookedLifters;
  },
});

export const createQuotaWindow = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    
    const userProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .unique();

    if (!userProfile || userProfile.role !== "lifter") {
      throw new Error("Not authorized");
    }

    const weekStart = getWeekStart(Date.now());
    const weekEnd = weekStart + 7 * 24 * 60 * 60 * 1000 - 1;

    const existing = await ctx.db
      .query("quotaWindows")
      .withIndex("by_lifter_and_week", (q) => 
        q.eq("lifterId", userId).eq("weekStartUtc", weekStart)
      )
      .unique();

    if (existing) {
      return existing._id;
    }

    return await ctx.db.insert("quotaWindows", {
      lifterId: userId,
      weekStartUtc: weekStart,
      weekEndUtc: weekEnd,
      quota: userProfile.weeklyQuota || 0,
      used: 0,
    });
  },
});

function getWeekStart(timestamp: number): number {
  const date = new Date(timestamp);
  const day = date.getUTCDay();
  const diff = date.getUTCDate() - day + (day === 0 ? -6 : 1); // Monday as start
  const monday = new Date(date.setUTCDate(diff));
  monday.setUTCHours(0, 0, 0, 0);
  return monday.getTime();
}

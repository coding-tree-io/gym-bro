import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    
    // Get the auth user
    const authUser = await ctx.db.get(userId);
    if (!authUser) return null;

    // Get the user profile
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .unique();

    if (!profile) return null;

    return {
      _id: userId,
      name: authUser.name || "Unknown User",
      email: authUser.email || "",
      role: profile.role,
      experienceLevel: profile.experienceLevel,
      weeklyQuota: profile.weeklyQuota,
      status: profile.status,
      joinedAt: profile.joinedAt,
    };
  },
});

export const createUserProfile = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    role: v.union(v.literal("admin"), v.literal("lifter")),
    experienceLevel: v.optional(v.union(v.literal("experienced"), v.literal("inexperienced"))),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check if profile already exists
    const existing = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .unique();
    
    if (existing) {
      return existing._id;
    }

    // Update the auth user with name and email
    await ctx.db.patch(userId, {
      name: args.name,
      email: args.email,
    });

    // Get default quota based on experience level
    let weeklyQuota = 0;
    if (args.role === "lifter" && args.experienceLevel) {
      const quotaKey = args.experienceLevel === "experienced" 
        ? "defaultWeeklyQuotaExperienced" 
        : "defaultWeeklyQuotaInexperienced";
      
      const quotaPolicy = await ctx.db
        .query("policies")
        .withIndex("by_key", (q) => q.eq("key", quotaKey))
        .unique();
      
      weeklyQuota = quotaPolicy ? parseInt(quotaPolicy.value) : (args.experienceLevel === "experienced" ? 4 : 3);
    }

    const profileId = await ctx.db.insert("userProfiles", {
      userId,
      role: args.role,
      experienceLevel: args.experienceLevel,
      weeklyQuota: args.role === "lifter" ? weeklyQuota : undefined,
      status: "active",
      joinedAt: Date.now(),
    });

    // Create audit log
    await ctx.db.insert("auditLogs", {
      actorUserId: userId,
      action: "user_profile_created",
      entity: "userProfiles",
      entityId: profileId,
      payload: JSON.stringify({ role: args.role, experienceLevel: args.experienceLevel }),
      at: Date.now(),
    });

    return profileId;
  },
});

export const getAllLifters = query({
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

    const lifterProfiles = await ctx.db
      .query("userProfiles")
      .withIndex("by_role", (q) => q.eq("role", "lifter"))
      .collect();

    // Get auth user data for each profile
    const liftersWithAuthData = await Promise.all(
      lifterProfiles.map(async (profile) => {
        const authUser = await ctx.db.get(profile.userId);
        return {
          _id: profile.userId,
          name: authUser?.name || "Unknown User",
          email: authUser?.email || "",
          role: profile.role,
          experienceLevel: profile.experienceLevel,
          weeklyQuota: profile.weeklyQuota,
          status: profile.status,
          joinedAt: profile.joinedAt,
        };
      })
    );

    return liftersWithAuthData;
  },
});

export const updateUserStatus = mutation({
  args: {
    userId: v.id("users"),
    status: v.union(v.literal("active"), v.literal("frozen")),
  },
  handler: async (ctx, args) => {
    const actorId = await getAuthUserId(ctx);
    if (!actorId) throw new Error("Not authenticated");
    
    const actorProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", actorId))
      .unique();

    if (!actorProfile || actorProfile.role !== "admin") {
      throw new Error("Not authorized");
    }

    const targetProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .unique();

    if (!targetProfile) {
      throw new Error("User profile not found");
    }

    await ctx.db.patch(targetProfile._id, { status: args.status });

    // Create audit log
    await ctx.db.insert("auditLogs", {
      actorUserId: actorId,
      action: "user_status_updated",
      entity: "userProfiles",
      entityId: targetProfile._id,
      payload: JSON.stringify({ status: args.status }),
      at: Date.now(),
    });
  },
});

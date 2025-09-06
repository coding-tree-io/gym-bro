import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  // Application-specific user data
  userProfiles: defineTable({
    userId: v.id("users"), // Reference to auth users table
    role: v.union(v.literal("admin"), v.literal("lifter")),
    experienceLevel: v.optional(v.union(v.literal("experienced"), v.literal("inexperienced"))),
    weeklyQuota: v.optional(v.number()),
    status: v.union(v.literal("active"), v.literal("frozen")),
    joinedAt: v.number(),
  })
    .index("by_user_id", ["userId"])
    .index("by_role", ["role"])
    .index("by_status", ["status"]),

  policies: defineTable({
    key: v.string(),
    value: v.string(),
    updatedAt: v.number(),
  })
    .index("by_key", ["key"]),

  slots: defineTable({
    startsAtUtc: v.number(),
    endsAtUtc: v.number(),
    tz: v.string(),
    capacityTotal: v.number(),
    capacityExp: v.number(),
    capacityInexp: v.number(),
    status: v.union(v.literal("open"), v.literal("closed"), v.literal("canceled")),
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_starts_at", ["startsAtUtc"])
    .index("by_status", ["status"])
    .index("by_time_range", ["startsAtUtc", "endsAtUtc"]),

  bookings: defineTable({
    lifterId: v.id("users"),
    slotId: v.id("slots"),
    level: v.union(v.literal("experienced"), v.literal("inexperienced")),
    status: v.union(
      v.literal("booked"),
      v.literal("canceled_by_lifter"),
      v.literal("canceled_by_admin"),
      v.literal("no_show"),
      v.literal("attended")
    ),
    createdAt: v.number(),
    canceledAt: v.optional(v.number()),
    cancelReason: v.optional(v.string()),
  })
    .index("by_slot_and_status", ["slotId", "status"])
    .index("by_lifter_and_created", ["lifterId", "createdAt"])
    .index("by_lifter_and_slot", ["lifterId", "slotId"])
    .index("by_status", ["status"]),

  quotaWindows: defineTable({
    lifterId: v.id("users"),
    weekStartUtc: v.number(),
    weekEndUtc: v.number(),
    quota: v.number(),
    used: v.number(),
  })
    .index("by_lifter_and_week", ["lifterId", "weekStartUtc"]),

  waitlists: defineTable({
    slotId: v.id("slots"),
    level: v.union(v.literal("experienced"), v.literal("inexperienced")),
    createdAt: v.number(),
  })
    .index("by_slot_and_level", ["slotId", "level"]),

  waitlistEntries: defineTable({
    waitlistId: v.id("waitlists"),
    lifterId: v.id("users"),
    position: v.number(),
    state: v.union(v.literal("queued"), v.literal("offered"), v.literal("confirmed"), v.literal("expired")),
    offeredAt: v.optional(v.number()),
    expiresAt: v.optional(v.number()),
  })
    .index("by_waitlist_and_position", ["waitlistId", "position"])
    .index("by_lifter", ["lifterId"]),

  auditLogs: defineTable({
    actorUserId: v.id("users"),
    action: v.string(),
    entity: v.string(),
    entityId: v.string(),
    payload: v.optional(v.string()),
    at: v.number(),
  })
    .index("by_time", ["at"])
    .index("by_actor", ["actorUserId"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});

import { query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const getDashboardStats = query({
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

    // Get total lifters
    const totalLifters = await ctx.db
      .query("userProfiles")
      .withIndex("by_role", (q) => q.eq("role", "lifter"))
      .collect();

    // Get active slots (next 7 days)
    const now = Date.now();
    const nextWeek = now + 7 * 24 * 60 * 60 * 1000;
    const activeSlots = await ctx.db
      .query("slots")
      .withIndex("by_starts_at", (q) => 
        q.gte("startsAtUtc", now).lt("startsAtUtc", nextWeek)
      )
      .filter((q) => q.eq(q.field("status"), "open"))
      .collect();

    // Get total bookings this week
    const weekStart = getWeekStart(now);
    const weekEnd = weekStart + 7 * 24 * 60 * 60 * 1000;
    const weeklyBookings = await ctx.db
      .query("bookings")
      .filter((q) => 
        q.and(
          q.gte(q.field("createdAt"), weekStart),
          q.lt(q.field("createdAt"), weekEnd),
          q.eq(q.field("status"), "booked")
        )
      )
      .collect();

    // Calculate compliance rate (lifters meeting quota this week)
    const activeLifters = totalLifters.filter(l => l.status === "active");
    let compliantLifters = 0;

    for (const lifter of activeLifters) {
      const quotaWindow = await ctx.db
        .query("quotaWindows")
        .withIndex("by_lifter_and_week", (q) => 
          q.eq("lifterId", lifter.userId).eq("weekStartUtc", weekStart)
        )
        .unique();

      const quota = quotaWindow?.quota || lifter.weeklyQuota || 0;
      const used = quotaWindow?.used || 0;

      if (used >= quota) {
        compliantLifters++;
      }
    }

    const complianceRate = activeLifters.length > 0 ? 
      Math.round((compliantLifters / activeLifters.length) * 100) : 0;

    // Calculate utilization rate for active slots
    const totalCapacity = activeSlots.reduce((sum, slot) => sum + slot.capacityTotal, 0);
    let totalBooked = 0;

    for (const slot of activeSlots) {
      const slotBookings = await ctx.db
        .query("bookings")
        .withIndex("by_slot_and_status", (q) => 
          q.eq("slotId", slot._id).eq("status", "booked")
        )
        .collect();
      totalBooked += slotBookings.length;
    }

    const utilizationRate = totalCapacity > 0 ? 
      Math.round((totalBooked / totalCapacity) * 100) : 0;

    return {
      totalLifters: totalLifters.length,
      activeSlots: activeSlots.length,
      totalBookings: weeklyBookings.length,
      complianceRate,
      utilizationRate,
    };
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

import { v } from "convex/values";
import { query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const getMonthlyReport = query({
  args: { 
    year: v.number(),
    month: v.number(), // 1-12
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

    const monthStart = new Date(args.year, args.month - 1, 1).getTime();
    const monthEnd = new Date(args.year, args.month, 0, 23, 59, 59, 999).getTime();

    // Get all bookings for the month
    const bookings = await ctx.db
      .query("bookings")
      .filter((q) => 
        q.and(
          q.gte(q.field("createdAt"), monthStart),
          q.lte(q.field("createdAt"), monthEnd)
        )
      )
      .collect();

    // Get all slots for the month
    const slots = await ctx.db
      .query("slots")
      .withIndex("by_starts_at", (q) => 
        q.gte("startsAtUtc", monthStart).lt("startsAtUtc", monthEnd + 1)
      )
      .collect();

    // Calculate metrics
    const totalBookings = bookings.length;
    const completedBookings = bookings.filter(b => b.status === "attended").length;
    const canceledByLifter = bookings.filter(b => b.status === "canceled_by_lifter").length;
    const canceledByAdmin = bookings.filter(b => b.status === "canceled_by_admin").length;
    const noShows = bookings.filter(b => b.status === "no_show").length;

    // Calculate late cancellations (within 24 hours)
    const cutoffPolicy = await ctx.db
      .query("policies")
      .withIndex("by_key", (q) => q.eq("key", "cancellationCutoffHours"))
      .unique();
    const cutoffHours = cutoffPolicy ? parseInt(cutoffPolicy.value) : 24;

    let lateCancellations = 0;
    for (const booking of bookings.filter(b => b.status === "canceled_by_lifter" && b.canceledAt)) {
      const slot = await ctx.db.get(booking.slotId);
      if (slot) {
        const cutoffTime = slot.startsAtUtc - (cutoffHours * 60 * 60 * 1000);
        if (booking.canceledAt! > cutoffTime) {
          lateCancellations++;
        }
      }
    }

    // Calculate utilization rate
    const totalCapacity = slots.reduce((sum, slot) => sum + slot.capacityTotal, 0);
    const totalBooked = bookings.filter(b => b.status === "booked" || b.status === "attended").length;
    const utilizationRate = totalCapacity > 0 ? Math.round((totalBooked / totalCapacity) * 100) : 0;

    // Calculate fill rate at cutoff (24 hours before)
    let fillRateAtCutoff = 0;
    if (slots.length > 0) {
      let totalSlotsAtCutoff = 0;
      let filledSlotsAtCutoff = 0;

      for (const slot of slots) {
        const cutoffTime = slot.startsAtUtc - (cutoffHours * 60 * 60 * 1000);
        if (cutoffTime <= Date.now()) { // Only count past cutoffs
          totalSlotsAtCutoff++;
          
          const slotBookings = bookings.filter(b => 
            b.slotId === slot._id && 
            b.createdAt <= cutoffTime &&
            (b.status === "booked" || b.status === "attended")
          );
          
          if (slotBookings.length >= slot.capacityTotal) {
            filledSlotsAtCutoff++;
          }
        }
      }

      fillRateAtCutoff = totalSlotsAtCutoff > 0 ? 
        Math.round((filledSlotsAtCutoff / totalSlotsAtCutoff) * 100) : 0;
    }

    // Get unique lifters
    const uniqueLifters = new Set(bookings.map(b => b.lifterId)).size;

    // Calculate quota compliance
    const lifters = await ctx.db
      .query("userProfiles")
      .withIndex("by_role", (q) => q.eq("role", "lifter"))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    let compliantLifters = 0;
    for (const lifter of lifters) {
      // Get all weeks in the month
      const weeks = getWeeksInMonth(args.year, args.month - 1);
      let lifterCompliant = true;

      for (const weekStart of weeks) {
        const quotaWindow = await ctx.db
          .query("quotaWindows")
          .withIndex("by_lifter_and_week", (q) => 
            q.eq("lifterId", lifter.userId).eq("weekStartUtc", weekStart)
          )
          .unique();

        const quota = quotaWindow?.quota || lifter.weeklyQuota || 0;
        const used = quotaWindow?.used || 0;

        if (used < quota) {
          lifterCompliant = false;
          break;
        }
      }

      if (lifterCompliant) {
        compliantLifters++;
      }
    }

    const quotaComplianceRate = lifters.length > 0 ? 
      Math.round((compliantLifters / lifters.length) * 100) : 0;

    return {
      period: `${args.year}-${args.month.toString().padStart(2, '0')}`,
      totalBookings,
      completedBookings,
      canceledByLifter,
      canceledByAdmin,
      lateCancellations,
      noShows,
      utilizationRate,
      fillRateAtCutoff,
      uniqueLifters,
      quotaComplianceRate,
      totalSlots: slots.length,
      totalCapacity,
    };
  },
});

function getWeeksInMonth(year: number, month: number): number[] {
  const weeks: number[] = [];
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  let current = new Date(firstDay);
  // Find first Monday
  while (current.getDay() !== 1) {
    current.setDate(current.getDate() - 1);
  }

  while (current <= lastDay) {
    weeks.push(current.getTime());
    current.setDate(current.getDate() + 7);
  }

  return weeks;
}

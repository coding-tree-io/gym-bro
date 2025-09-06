import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const getUserBookings = query({
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

    const bookings = await ctx.db
      .query("bookings")
      .withIndex("by_lifter_and_created", (q) => q.eq("lifterId", userId))
      .order("desc")
      .take(50);

    // Get slot details for each booking
    const bookingsWithSlots = await Promise.all(
      bookings.map(async (booking) => {
        const slot = await ctx.db.get(booking.slotId);
        return {
          ...booking,
          slot,
        };
      })
    );

    return bookingsWithSlots;
  },
});

export const bookSlot = mutation({
  args: { slotId: v.id("slots") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    
    const userProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .unique();

    if (!userProfile || userProfile.role !== "lifter" || userProfile.status !== "active") {
      throw new Error("Not authorized or account frozen");
    }

    if (!userProfile.experienceLevel) {
      throw new Error("Experience level not set");
    }

    const slot = await ctx.db.get(args.slotId);
    if (!slot || slot.status !== "open") {
      throw new Error("Slot not available");
    }

    // Check if slot is in the past
    if (slot.startsAtUtc <= Date.now()) {
      throw new Error("Cannot book past slots");
    }

    // Check for overlapping bookings
    const existingBookings = await ctx.db
      .query("bookings")
      .withIndex("by_lifter_and_created", (q) => q.eq("lifterId", userId))
      .filter((q) => q.eq(q.field("status"), "booked"))
      .collect();

    for (const booking of existingBookings) {
      const existingSlot = await ctx.db.get(booking.slotId);
      if (existingSlot && 
          ((slot.startsAtUtc >= existingSlot.startsAtUtc && slot.startsAtUtc < existingSlot.endsAtUtc) ||
           (slot.endsAtUtc > existingSlot.startsAtUtc && slot.endsAtUtc <= existingSlot.endsAtUtc) ||
           (slot.startsAtUtc <= existingSlot.startsAtUtc && slot.endsAtUtc >= existingSlot.endsAtUtc))) {
        throw new Error("You have an overlapping booking");
      }
    }

    // Check weekly quota
    const weekStart = getWeekStart(Date.now());
    const weekEnd = weekStart + 7 * 24 * 60 * 60 * 1000 - 1;

    let quotaWindow = await ctx.db
      .query("quotaWindows")
      .withIndex("by_lifter_and_week", (q) => 
        q.eq("lifterId", userId).eq("weekStartUtc", weekStart)
      )
      .unique();

    if (!quotaWindow) {
      const quotaWindowId = await ctx.db.insert("quotaWindows", {
        lifterId: userId,
        weekStartUtc: weekStart,
        weekEndUtc: weekEnd,
        quota: userProfile.weeklyQuota || 0,
        used: 0,
      });
      
      quotaWindow = await ctx.db.get(quotaWindowId);
      if (!quotaWindow) throw new Error("Failed to create quota window");
    }

    if (quotaWindow.used >= quotaWindow.quota) {
      throw new Error("Weekly quota exceeded");
    }

    // Check capacity for user's experience level
    const currentBookings = await ctx.db
      .query("bookings")
      .withIndex("by_slot_and_status", (q) => 
        q.eq("slotId", args.slotId).eq("status", "booked")
      )
      .collect();

    const expBookings = currentBookings.filter(b => b.level === "experienced").length;
    const inexpBookings = currentBookings.filter(b => b.level === "inexperienced").length;

    if (userProfile.experienceLevel === "experienced" && expBookings >= slot.capacityExp) {
      throw new Error("No experienced slots available");
    }

    if (userProfile.experienceLevel === "inexperienced" && inexpBookings >= slot.capacityInexp) {
      throw new Error("No inexperienced slots available");
    }

    // Check max future bookings
    const maxFuturePolicy = await ctx.db
      .query("policies")
      .withIndex("by_key", (q) => q.eq("key", "maxFutureBookings"))
      .unique();
    
    const maxFuture = maxFuturePolicy ? parseInt(maxFuturePolicy.value) : 10;
    // Get future bookings by checking slot start times
    const futureBookings = [];
    for (const booking of existingBookings) {
      const slot = await ctx.db.get(booking.slotId);
      if (slot && slot.startsAtUtc > Date.now()) {
        futureBookings.push(booking);
      }
    }

    if (futureBookings.length >= maxFuture) {
      throw new Error("Maximum future bookings exceeded");
    }

    // Create booking
    const bookingId = await ctx.db.insert("bookings", {
      lifterId: userId,
      slotId: args.slotId,
      level: userProfile.experienceLevel,
      status: "booked",
      createdAt: Date.now(),
    });

    // Update quota
    await ctx.db.patch(quotaWindow._id, {
      used: quotaWindow.used + 1,
    });

    // Create audit log
    await ctx.db.insert("auditLogs", {
      actorUserId: userId,
      action: "booking_created",
      entity: "bookings",
      entityId: bookingId,
      payload: JSON.stringify({ slotId: args.slotId, level: userProfile.experienceLevel }),
      at: Date.now(),
    });

    return bookingId;
  },
});

export const cancelBooking = mutation({
  args: { bookingId: v.id("bookings") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    
    const booking = await ctx.db.get(args.bookingId);
    if (!booking) throw new Error("Booking not found");

    const userProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .unique();

    if (!userProfile) throw new Error("User profile not found");

    // Check ownership or admin rights
    if (booking.lifterId !== userId && userProfile.role !== "admin") {
      throw new Error("Not authorized");
    }

    if (booking.status !== "booked") {
      throw new Error("Booking cannot be canceled");
    }

    const slot = await ctx.db.get(booking.slotId);
    if (!slot) throw new Error("Slot not found");

    // Check cancellation cutoff
    const cutoffPolicy = await ctx.db
      .query("policies")
      .withIndex("by_key", (q) => q.eq("key", "cancellationCutoffHours"))
      .unique();
    
    const cutoffHours = cutoffPolicy ? parseInt(cutoffPolicy.value) : 24;
    const cutoffTime = slot.startsAtUtc - (cutoffHours * 60 * 60 * 1000);

    const isLifterCancel = booking.lifterId === userId;
    const isWithinCutoff = Date.now() <= cutoffTime;

    if (isLifterCancel && !isWithinCutoff) {
      throw new Error(`Cannot cancel within ${cutoffHours} hours of slot start`);
    }

    // Update booking
    await ctx.db.patch(args.bookingId, {
      status: isLifterCancel ? "canceled_by_lifter" : "canceled_by_admin",
      canceledAt: Date.now(),
    });

    // Refund quota only if canceled by lifter within cutoff or by admin
    if (isWithinCutoff || !isLifterCancel) {
      const weekStart = getWeekStart(booking.createdAt);
      const quotaWindow = await ctx.db
        .query("quotaWindows")
        .withIndex("by_lifter_and_week", (q) => 
          q.eq("lifterId", booking.lifterId).eq("weekStartUtc", weekStart)
        )
        .unique();

      if (quotaWindow && quotaWindow.used > 0) {
        await ctx.db.patch(quotaWindow._id, {
          used: quotaWindow.used - 1,
        });
      }
    }

    // Create audit log
    await ctx.db.insert("auditLogs", {
      actorUserId: userId,
      action: "booking_canceled",
      entity: "bookings",
      entityId: args.bookingId,
      payload: JSON.stringify({ 
        canceledBy: isLifterCancel ? "lifter" : "admin",
        withinCutoff: isWithinCutoff 
      }),
      at: Date.now(),
    });
  },
});

export const markNoShow = mutation({
  args: { bookingId: v.id("bookings") },
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

    const booking = await ctx.db.get(args.bookingId);
    if (!booking) throw new Error("Booking not found");

    if (booking.status !== "booked") {
      throw new Error("Can only mark booked sessions as no-show");
    }

    const slot = await ctx.db.get(booking.slotId);
    if (!slot) throw new Error("Slot not found");

    // Can only mark no-show after slot has ended
    if (Date.now() < slot.endsAtUtc) {
      throw new Error("Cannot mark no-show before slot ends");
    }

    await ctx.db.patch(args.bookingId, {
      status: "no_show",
    });

    // Create audit log
    await ctx.db.insert("auditLogs", {
      actorUserId: userId,
      action: "booking_no_show",
      entity: "bookings",
      entityId: args.bookingId,
      at: Date.now(),
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

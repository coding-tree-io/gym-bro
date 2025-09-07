import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const getSlots = query({
  args: {
    from: v.number(),
    to: v.number(),
  },
  handler: async (ctx, args) => {
    const slots = await ctx.db
      .query("slots")
      .withIndex("by_starts_at", (q) => 
        q.gte("startsAtUtc", args.from).lt("startsAtUtc", args.to)
      )
      .collect();

    // Get booking counts for each slot
    const slotsWithAvailability = await Promise.all(
      slots.map(async (slot) => {
        const bookings = await ctx.db
          .query("bookings")
          .withIndex("by_slot_and_status", (q) => 
            q.eq("slotId", slot._id).eq("status", "booked")
          )
          .collect();

        const expBookings = bookings.filter(b => b.level === "experienced").length;
        const inexpBookings = bookings.filter(b => b.level === "inexperienced").length;

        // Resolve lifter names for booked users
        const lifterEntries = await Promise.all(
          bookings.map(async (b) => {
            const authUser = await ctx.db.get(b.lifterId);
            return { bookingId: b._id, lifterId: b.lifterId, level: b.level, name: authUser?.name || "Unknown" };
          })
        );
        const expNames = lifterEntries.filter(x => x.level === "experienced").map(x => x.name);
        const inexpNames = lifterEntries.filter(x => x.level === "inexperienced").map(x => x.name);
        const expBookingsList = lifterEntries.filter(x => x.level === "experienced");
        const inexpBookingsList = lifterEntries.filter(x => x.level === "inexperienced");

        return {
          ...slot,
          bookedExp: expBookings,
          bookedInexp: inexpBookings,
          availableExp: slot.capacityExp - expBookings,
          availableInexp: slot.capacityInexp - inexpBookings,
          totalBooked: expBookings + inexpBookings,
          totalAvailable: slot.capacityTotal - (expBookings + inexpBookings),
          expBookedNames: expNames,
          inexpBookedNames: inexpNames,
          expBookingsList,
          inexpBookingsList,
        };
      })
    );

    return slotsWithAvailability;
  },
});

export const createSlot = mutation({
  args: {
    startsAtUtc: v.number(),
    endsAtUtc: v.number(),
    capacityTotal: v.number(),
    capacityExp: v.number(),
    capacityInexp: v.number(),
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

    // Validate capacities
    if (args.capacityExp + args.capacityInexp > args.capacityTotal) {
      throw new Error("Sub-capacities cannot exceed total capacity");
    }

    if (args.startsAtUtc >= args.endsAtUtc) {
      throw new Error("Start time must be before end time");
    }

    // Get gym timezone
    const tzPolicy = await ctx.db
      .query("policies")
      .withIndex("by_key", (q) => q.eq("key", "gymTimezone"))
      .unique();
    
    const tz = tzPolicy?.value || "America/New_York";

    const slotId = await ctx.db.insert("slots", {
      startsAtUtc: args.startsAtUtc,
      endsAtUtc: args.endsAtUtc,
      tz,
      capacityTotal: args.capacityTotal,
      capacityExp: args.capacityExp,
      capacityInexp: args.capacityInexp,
      status: "open",
      createdBy: userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Create audit log
    await ctx.db.insert("auditLogs", {
      actorUserId: userId,
      action: "slot_created",
      entity: "slots",
      entityId: slotId,
      payload: JSON.stringify(args),
      at: Date.now(),
    });

    return slotId;
  },
});

export const updateSlot = mutation({
  args: {
    slotId: v.id("slots"),
    capacityTotal: v.optional(v.number()),
    capacityExp: v.optional(v.number()),
    capacityInexp: v.optional(v.number()),
    status: v.optional(v.union(v.literal("open"), v.literal("closed"), v.literal("canceled"))),
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

    const slot = await ctx.db.get(args.slotId);
    if (!slot) throw new Error("Slot not found");

    // If updating capacities, validate against current bookings
    if (args.capacityTotal !== undefined || args.capacityExp !== undefined || args.capacityInexp !== undefined) {
      const bookings = await ctx.db
        .query("bookings")
        .withIndex("by_slot_and_status", (q) => 
          q.eq("slotId", args.slotId).eq("status", "booked")
        )
        .collect();

      const expBookings = bookings.filter(b => b.level === "experienced").length;
      const inexpBookings = bookings.filter(b => b.level === "inexperienced").length;

      const newCapacityExp = args.capacityExp ?? slot.capacityExp;
      const newCapacityInexp = args.capacityInexp ?? slot.capacityInexp;
      const newCapacityTotal = args.capacityTotal ?? slot.capacityTotal;

      if (newCapacityExp + newCapacityInexp > newCapacityTotal) {
        throw new Error("Sub-capacities cannot exceed total capacity");
      }

      if (expBookings > newCapacityExp || inexpBookings > newCapacityInexp) {
        throw new Error(`Cannot reduce capacity below current bookings (${expBookings} exp, ${inexpBookings} inexp)`);
      }
    }

    const updates: any = { updatedAt: Date.now() };
    if (args.capacityTotal !== undefined) updates.capacityTotal = args.capacityTotal;
    if (args.capacityExp !== undefined) updates.capacityExp = args.capacityExp;
    if (args.capacityInexp !== undefined) updates.capacityInexp = args.capacityInexp;
    if (args.status !== undefined) updates.status = args.status;

    await ctx.db.patch(args.slotId, updates);

    // Create audit log
    await ctx.db.insert("auditLogs", {
      actorUserId: userId,
      action: "slot_updated",
      entity: "slots",
      entityId: args.slotId,
      payload: JSON.stringify(updates),
      at: Date.now(),
    });
  },
});

export const deleteSlot = mutation({
  args: { slotId: v.id("slots") },
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

    // Cancel all bookings for this slot
    const bookings = await ctx.db
      .query("bookings")
      .withIndex("by_slot_and_status", (q) => 
        q.eq("slotId", args.slotId).eq("status", "booked")
      )
      .collect();

    for (const booking of bookings) {
      await ctx.db.patch(booking._id, {
        status: "canceled_by_admin",
        canceledAt: Date.now(),
        cancelReason: "Slot deleted by admin",
      });

      // Refund quota
      await refundQuota(ctx, booking.lifterId, booking.createdAt);
    }

    await ctx.db.delete(args.slotId);

    // Create audit log
    await ctx.db.insert("auditLogs", {
      actorUserId: userId,
      action: "slot_deleted",
      entity: "slots",
      entityId: args.slotId,
      at: Date.now(),
    });
  },
});

// Helper function to refund quota
async function refundQuota(ctx: any, lifterId: any, bookingCreatedAt: number) {
  const weekStart = getWeekStart(bookingCreatedAt);
  const weekEnd = weekStart + 7 * 24 * 60 * 60 * 1000 - 1;

  const quotaWindow = await ctx.db
    .query("quotaWindows")
    .withIndex("by_lifter_and_week", (q: any) => 
      q.eq("lifterId", lifterId).eq("weekStartUtc", weekStart)
    )
    .unique();

  if (quotaWindow && quotaWindow.used > 0) {
    await ctx.db.patch(quotaWindow._id, {
      used: quotaWindow.used - 1,
    });
  }
}

function getWeekStart(timestamp: number): number {
  const date = new Date(timestamp);
  const day = date.getUTCDay();
  const diff = date.getUTCDate() - day + (day === 0 ? -6 : 1); // Monday as start
  const monday = new Date(date.setUTCDate(diff));
  monday.setUTCHours(0, 0, 0, 0);
  return monday.getTime();
}

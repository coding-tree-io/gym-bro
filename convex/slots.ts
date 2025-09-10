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

    // For all slots in range, load bookings then batch-resolve lifters per slot
    const slotsWithAvailability = await Promise.all(
      slots.map(async (slot) => {
        const bookings = await ctx.db
          .query("bookings")
          .withIndex("by_slot_and_status", (q) =>
            q.eq("slotId", slot._id).eq("status", "booked")
          )
          .collect();

        const expBookings = bookings.filter((b) => b.level === "experienced").length;
        const inexpBookings = bookings.filter((b) => b.level === "inexperienced").length;

        // Batch lifter resolutions to avoid N+1 get() calls
        const uniqueLifterIds = Array.from(new Set(bookings.map((b) => b.lifterId)));
        const lifterDocs = await Promise.all(uniqueLifterIds.map((id) => ctx.db.get(id)));
        const lifterMap = new Map(uniqueLifterIds.map((id, i) => [id, lifterDocs[i]]));

        const lifterEntries = bookings.map((b) => {
          const authUser = lifterMap.get(b.lifterId);
          return {
            bookingId: b._id,
            lifterId: b.lifterId,
            level: b.level,
            name: (authUser as any)?.name || "Unknown",
          };
        });

        const expNames = lifterEntries.filter((x) => x.level === "experienced").map((x) => x.name);
        const inexpNames = lifterEntries.filter((x) => x.level === "inexperienced").map((x) => x.name);
        const expBookingsList = lifterEntries.filter((x) => x.level === "experienced");
        const inexpBookingsList = lifterEntries.filter((x) => x.level === "inexperienced");

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

    // Fetch the slot to base refunds on its week
    const deletedSlot = await ctx.db.get(args.slotId);
    for (const booking of bookings) {
      await ctx.db.patch(booking._id, {
        status: "canceled_by_admin",
        canceledAt: Date.now(),
        cancelReason: "Slot deleted by admin",
      });

      // Refund quota against the slot's weekly window
      const slotWeekStart = deletedSlot ? getWeekStart(deletedSlot.startsAtUtc) : getWeekStart(booking.createdAt);
      await refundQuota(ctx, booking.lifterId, slotWeekStart);
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
async function refundQuota(ctx: any, lifterId: any, weekStartTs: number) {
  // Determine the week window based on the slot's start time, not when the booking was made
  // We need the slot's startsAtUtc; find the booking by createdAt + lifter? We don't have bookingId here.
  // Since this is invoked within deleteSlot loop with each booking object available, consider fetching the slot from context args.
  // Minimal change: infer by using the slot deletion context: args.slotId isn't available here, so instead refactor caller to pass the slot startsAtUtc.
  // However to keep changes minimal, we'll query recent bookings for lifter within this function isn't ideal.
  // Simpler: fetch the slot by inspecting the most recent patched booking in caller, but we can't access it.
  // Alternative minimal change: add an overload via bookingCreatedAt parameter name change to slotStartsAtUtc and pass slot.startsAtUtc from caller.
  const weekStart = weekStartTs;

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


export const fillDayWithDefaultWorkingHours = mutation({
  args: {
    // Start of the day in milliseconds UTC (e.g., Date(`${YYYY-MM-DD}`).getTime())
    dayStartUtc: v.number(),
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

    const dayStart = args.dayStartUtc;
    const dayEnd = dayStart + 24 * 60 * 60 * 1000;

    // Ensure day is empty or we skip existing overlaps
    const existing = await ctx.db
      .query("slots")
      .withIndex("by_starts_at", (q) => q.gte("startsAtUtc", dayStart).lt("startsAtUtc", dayEnd))
      .collect();

    if (existing.length > 0) {
      throw new Error("Day already has slots; only empty days can be auto-filled");
    }

    // Load policies
    const tzPolicy = await ctx.db
      .query("policies")
      .withIndex("by_key", (q) => q.eq("key", "gymTimezone"))
      .unique();
    const tz = tzPolicy?.value || "America/New_York";

    const hoursPolicy = await ctx.db
      .query("policies")
      .withIndex("by_key", (q) => q.eq("key", "defaultWorkingHours"))
      .unique();

    const rangesRaw = hoursPolicy?.value || "09:00 - 14:00, 17:00-22:00";

    // Helper to parse HH:mm
    const parseTime = (s: string) => {
      const m = s.trim().match(/^(\d{1,2}):(\d{2})$/);
      if (!m) return null;
      const h = parseInt(m[1], 10);
      const min = parseInt(m[2], 10);
      if (isNaN(h) || isNaN(min) || h < 0 || h > 23 || min < 0 || min > 59) return null;
      return { h, min } as const;
    };

    // Helper: convert local time (gym tz) on this day to UTC timestamp
    const toUtcOnLocalDay = (h: number, min: number) => {
      // Build the local date components for the gym timezone based on the provided UTC day start
      const dtf = new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
      const parts = dtf.formatToParts(new Date(dayStart));
      const get = (type: string) => parts.find(p => p.type === type)?.value;
      const year = Number(get("year"));
      const month = Number(get("month"));
      const day = Number(get("day"));

      // Construct an ISO-like string as local time in tz and let Date parse as if local; then fix using timeZone offset
      // But Date lacks tz; instead compute UTC via formatting trick: get the offset by formatting this local wall time in tz.
      const localIso = `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day
        .toString()
        .padStart(2, "0")}T${h.toString().padStart(2, "0")}:${min
        .toString()
        .padStart(2, "0")}:00`;

      // Use Date to get a timestamp for this string as if it's in UTC then adjust by tz offset.
      // To accurately compute, determine what UTC time displays as this local wall time in tz by binary search over offsets.
      // Simpler approach: create a Date from the UTC baseline (dayStart) and adjust hours via formatter inverse.
      const approx = new Date(dayStart);
      // Reset to midnight UTC first to have stable base
      approx.setUTCHours(0, 0, 0, 0);

      // Now find UTC timestamp whose formatted hour/min in tz equals desired h:min on that tz date
      // Since offsets are piecewise constant (with DST changes possibly not on this day except transition moments),
      // a direct construction: compute the tz offset at the desired local wall time by formatting that instant.
      // We can approximate by taking the target UTC guess = Date.UTC(year, month-1, day, h, min), which treats inputs as UTC.
      // Then get formatter output date parts in tz for that guess, and adjust difference until match.
      let guess = Date.UTC(year, month - 1, day, h, min, 0, 0);
      // Correct if the formatter shows a different local date/time due to our guess being interpreted as UTC.
      // We'll compute the delta between desired local and observed local and adjust once (sufficient because mapping is affine around non-transition times).
      const fmtParts = new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).formatToParts(new Date(guess));
      const obsYear = Number(fmtParts.find(p => p.type === "year")?.value);
      const obsMonth = Number(fmtParts.find(p => p.type === "month")?.value);
      const obsDay = Number(fmtParts.find(p => p.type === "day")?.value);
      const obsHour = Number(fmtParts.find(p => p.type === "hour")?.value);
      const obsMinute = Number(fmtParts.find(p => p.type === "minute")?.value);

      // Compute difference in minutes between desired local and observed local
      const desiredMinutes = (((year*12 + (month)) * 31 + day) * 24 + h) * 60 + min; // linearization only for diff
      const observedMinutes = (((obsYear*12 + (obsMonth)) * 31 + obsDay) * 24 + obsHour) * 60 + obsMinute;
      const diffMinutes = desiredMinutes - observedMinutes;
      guess += diffMinutes * 60 * 1000;

      return guess;
    };

    const slotDefs: { startUtc: number; endUtc: number }[] = [];

    for (const part of rangesRaw.split(",")) {
      const [lhs, rhs] = part.split("-");
      if (!lhs || !rhs) continue;
      const startStr = lhs.replace(/\s+/g, "");
      const endStr = rhs.replace(/\s+/g, "");
      const start = parseTime(startStr);
      const end = parseTime(endStr);
      if (!start || !end) continue;

      // Build concrete UTC timestamps by interpreting times in gym local timezone
      const startUtcTs = toUtcOnLocalDay(start.h, start.min);
      const endUtcTs = toUtcOnLocalDay(end.h, end.min);

      let s = startUtcTs;
      let e = endUtcTs;

      // If the range crosses midnight (end <= start), we only fill up to end of day per spec minimal change
      // Compute local end-of-day in UTC
      const endOfLocalDayUtc = toUtcOnLocalDay(23, 59) + 60 * 1000; // next minute ~ start of next day
      if (e <= s) {
        e = endOfLocalDayUtc;
      }

      if (isNaN(s) || isNaN(e) || s >= e) continue;

      // Create 1-hour slots for every full hour block
      while (s + 60 * 60 * 1000 <= e) {
        const slotStart = s;
        const slotEnd = s + 60 * 60 * 1000;
        slotDefs.push({ startUtc: slotStart, endUtc: slotEnd });
        s = slotEnd;
      }
    }

    // Deduplicate in case of overlapping ranges (by start time)
    const uniqueByStart = new Map<number, { startUtc: number; endUtc: number }>();
    for (const def of slotDefs) {
      if (!uniqueByStart.has(def.startUtc)) uniqueByStart.set(def.startUtc, def);
    }
    const uniqueSlots = Array.from(uniqueByStart.values()).sort((a, b) => a.startUtc - b.startUtc);

    // Insert slots
    const capacityTotal = 5;
    const capacityExp = 3;
    const capacityInexp = 2;

    let created = 0;
    for (const def of uniqueSlots) {
      await ctx.db.insert("slots", {
        startsAtUtc: def.startUtc,
        endsAtUtc: def.endUtc,
        tz,
        capacityTotal,
        capacityExp,
        capacityInexp,
        status: "open",
        createdBy: userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      created++;
    }

    // Audit
    await ctx.db.insert("auditLogs", {
      actorUserId: userId,
      action: "slots_autofilled_day",
      entity: "slots",
      entityId: `day_${dayStart}` as any,
      payload: JSON.stringify({ dayStartUtc: dayStart, created, rangesRaw }),
      at: Date.now(),
    });

    return { created };
  },
});

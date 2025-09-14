// Shared time utilities to normalize gym-local times to UTC
// We avoid external deps; use Intl APIs.

export function localDateTimeToUtc(
  dateYYYYMMDD: string,
  timeHHmm: string,
  tz: string,
): number {
  // Validate inputs
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateYYYYMMDD))
    throw new Error("Invalid date format, expected YYYY-MM-DD");
  if (!/^\d{2}:\d{2}$/.test(timeHHmm))
    throw new Error("Invalid time format, expected HH:mm");
  const [y, m, d] = dateYYYYMMDD.split("-").map(Number);
  const [hh, mm] = timeHHmm.split(":").map(Number);

  // Initial guess interprets components as UTC.
  const guess = Date.UTC(y, m - 1, d, hh, mm, 0, 0);

  // Format the guess in the target timezone and compute delta to reach desired local wall time
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(new Date(guess));
  const get = (type: string) =>
    parts.find((p) => p.type === type)?.value as string | undefined;
  const oy = Number(get("year"));
  const om = Number(get("month"));
  const od = Number(get("day"));
  const oh = Number(get("hour"));
  const omin = Number(get("minute"));

  // Map to a linear minute scale and adjust once. This is reliable except at DST gaps; we accept that edge here.
  const desired = (((y * 13 + m) * 35 + d) * 24 + hh) * 60 + mm;
  const observed = (((oy * 13 + om) * 35 + od) * 24 + oh) * 60 + omin;
  const deltaMinutes = desired - observed;

  return guess + deltaMinutes * 60_000;
}

export function gymDayBoundsUtc(
  dateYYYYMMDD: string,
  tz: string,
): { from: number; to: number } {
  // from: 00:00 local at gym tz, to: 00:00 next day local at gym tz, both expressed in UTC
  const from = localDateTimeToUtc(dateYYYYMMDD, "00:00", tz);
  // Add one day in local-time terms by converting next day 00:00
  const [y, m, d] = dateYYYYMMDD.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d));
  next.setUTCDate(next.getUTCDate() + 1);
  const nextDate = `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}-${String(next.getUTCDate()).padStart(2, "0")}`;
  const to = localDateTimeToUtc(nextDate, "00:00", tz);
  return { from, to };
}

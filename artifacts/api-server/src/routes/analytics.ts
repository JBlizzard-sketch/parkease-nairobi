import { Router } from "express";
import { db, bookingsTable, spotsTable, payoutsTable, waitlistTable, surgeEventsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import {
  GetOwnerDashboardQueryParams,
  GetSurgePricingQueryParams,
} from "@workspace/api-zod";

const router = Router();

router.get("/analytics/owner-dashboard", async (req, res) => {
  const parsed = GetOwnerDashboardQueryParams.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const { ownerId } = parsed.data;

  const ownerSpots = await db.query.spotsTable.findMany({ where: eq(spotsTable.ownerId, ownerId) });
  const spotIds = ownerSpots.map((s) => s.id);

  if (spotIds.length === 0) {
    return res.json({
      totalEarnings: 0,
      pendingPayouts: 0,
      totalBookings: 0,
      completedBookings: 0,
      cancelledBookings: 0,
      occupancyRate: 0,
      activeSpots: 0,
      averageSpotRating: null,
      earningsByMonth: [],
      topSpots: [],
    });
  }

  const [
    bookingsData,
    [{ totalEarnings }],
    [{ pendingPayouts }],
  ] = await Promise.all([
    db.query.bookingsTable.findMany({ where: eq(bookingsTable.ownerId, ownerId) }),
    db.select({ totalEarnings: sql<number>`coalesce(sum(net_amount), 0)::float` })
      .from(payoutsTable)
      .where(and(eq(payoutsTable.ownerId, ownerId), eq(payoutsTable.status, "paid"))),
    db.select({ pendingPayouts: sql<number>`coalesce(sum(net_amount), 0)::float` })
      .from(payoutsTable)
      .where(and(eq(payoutsTable.ownerId, ownerId), eq(payoutsTable.status, "pending"))),
  ]);

  const totalBookings = bookingsData.length;
  const completedBookings = bookingsData.filter((b) => b.status === "completed").length;
  const cancelledBookings = bookingsData.filter((b) => b.status === "cancelled").length;
  const confirmedOrCompleted = bookingsData.filter((b) => b.status === "confirmed" || b.status === "completed").length;
  const occupancyRate = totalBookings > 0 ? Math.round((confirmedOrCompleted / totalBookings) * 100) : 0;

  const activeSpots = ownerSpots.filter((s) => s.isActive).length;
  const avgRating = ownerSpots.filter((s) => s.rating != null).reduce((acc, s) => acc + (s.rating ?? 0), 0) / (ownerSpots.filter((s) => s.rating != null).length || 1);

  const monthlyMap: Record<string, { earnings: number; bookings: number }> = {};
  for (const booking of bookingsData) {
    if (booking.status === "completed" || booking.status === "confirmed") {
      const month = booking.date.substring(0, 7);
      if (!monthlyMap[month]) monthlyMap[month] = { earnings: 0, bookings: 0 };
      monthlyMap[month].earnings += booking.ownerEarning;
      monthlyMap[month].bookings += 1;
    }
  }
  const earningsByMonth = Object.entries(monthlyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([month, data]) => ({ month, ...data }));

  const spotEarnings: Record<number, { earnings: number; bookings: number }> = {};
  for (const booking of bookingsData) {
    if (booking.status === "completed" || booking.status === "confirmed") {
      if (!spotEarnings[booking.spotId]) spotEarnings[booking.spotId] = { earnings: 0, bookings: 0 };
      spotEarnings[booking.spotId].earnings += booking.ownerEarning;
      spotEarnings[booking.spotId].bookings += 1;
    }
  }

  const topSpots = ownerSpots
    .map((s) => ({
      id: s.id,
      title: s.title,
      zone: s.zone,
      earnings: spotEarnings[s.id]?.earnings ?? 0,
      bookings: spotEarnings[s.id]?.bookings ?? 0,
      rating: s.rating,
    }))
    .sort((a, b) => b.earnings - a.earnings)
    .slice(0, 5);

  return res.json({
    totalEarnings,
    pendingPayouts,
    totalBookings,
    completedBookings,
    cancelledBookings,
    occupancyRate,
    activeSpots,
    averageSpotRating: ownerSpots.filter((s) => s.rating != null).length > 0 ? avgRating : null,
    earningsByMonth,
    topSpots,
  });
});

router.get("/analytics/zones", async (_req, res) => {
  const zones = ["Westlands", "CBD", "Upperhill", "Kilimani", "Hurlingham", "Parklands", "Karen", "Lavington"] as const;
  const today = new Date().toISOString().split("T")[0];

  const zoneSummaries = await Promise.all(
    zones.map(async (zone) => {
      const [allSpots, surgeEvent, waitlistEntries] = await Promise.all([
        db.query.spotsTable.findMany({ where: eq(spotsTable.zone, zone as any) }),
        db.query.surgeEventsTable.findFirst({ where: and(eq(surgeEventsTable.zone, zone as any), eq(surgeEventsTable.date, today)) }),
        db.query.waitlistTable.findMany({ where: and(eq(waitlistTable.zone, zone as any), eq(waitlistTable.date, today)) }),
      ]);

      const available = allSpots.filter((s) => s.isActive).length;
      const avgPrice = allSpots.length > 0 ? allSpots.reduce((a, s) => a + s.pricePerHour, 0) / allSpots.length : 0;

      return {
        zone,
        availableSpots: available,
        totalSpots: allSpots.length,
        avgPricePerHour: Math.round(avgPrice),
        surgeMultiplier: surgeEvent?.multiplier ?? 1.0,
        waitlistCount: waitlistEntries.length,
      };
    })
  );

  return res.json({ zones: zoneSummaries });
});

router.get("/analytics/surge", async (req, res) => {
  const parsed = GetSurgePricingQueryParams.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const { zone, date } = parsed.data;

  const surgeEvent = await db.query.surgeEventsTable.findFirst({
    where: and(eq(surgeEventsTable.zone, zone as any), eq(surgeEventsTable.date, date)),
  });

  return res.json({
    zone,
    date,
    multiplier: surgeEvent?.multiplier ?? 1.0,
    reason: surgeEvent?.reason ?? null,
    isEventDay: surgeEvent?.isEventDay ?? false,
  });
});

export default router;

import { Router } from "express";
import { db, bookingsTable, spotsTable, usersTable, payoutsTable } from "@workspace/db";
import { eq, and, sql, lt, gt, inArray } from "drizzle-orm";
import {
  CreateBookingBody,
  UpdateBookingStatusBody,
  ListBookingsQueryParams,
  GetBookingParams,
  UpdateBookingStatusParams,
} from "@workspace/api-zod";

const router = Router();

const PLATFORM_FEE_RATE = 0.15;

function formatBooking(booking: any, spot: any, commuter: any, includeAccess: boolean) {
  return {
    ...booking,
    spotTitle: spot?.title ?? "",
    spotAddress: spot?.address ?? "",
    spotLat: spot?.lat ?? 0,
    spotLng: spot?.lng ?? 0,
    commuterName: commuter?.name ?? "",
    commuterPhone: commuter?.phone ?? "",
    accessInstructions:
      includeAccess && (booking.status === "confirmed" || booking.status === "completed")
        ? spot?.accessInstructions
        : undefined,
  };
}

router.get("/bookings", async (req, res) => {
  const parsed = ListBookingsQueryParams.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const { userId, spotId, status, role, limit = 20, offset = 0 } = parsed.data;

  const conditions = [];
  if (spotId) conditions.push(eq(bookingsTable.spotId, spotId));
  if (status) conditions.push(eq(bookingsTable.status, status as any));
  if (userId) {
    if (role === "owner") {
      conditions.push(eq(bookingsTable.ownerId, userId));
    } else {
      conditions.push(eq(bookingsTable.commuterId, userId));
    }
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const [bookings, [{ count }]] = await Promise.all([
    db.query.bookingsTable.findMany({ where, limit: limit ?? 20, offset: offset ?? 0, orderBy: (t, { desc }) => [desc(t.createdAt)] }),
    db.select({ count: sql<number>`count(*)::int` }).from(bookingsTable).where(where),
  ]);

  const enriched = await Promise.all(
    bookings.map(async (b) => {
      const [spot, commuter] = await Promise.all([
        db.query.spotsTable.findFirst({ where: eq(spotsTable.id, b.spotId) }),
        db.query.usersTable.findFirst({ where: eq(usersTable.id, b.commuterId) }),
      ]);
      return formatBooking(b, spot, commuter, true);
    })
  );

  return res.json({ bookings: enriched, total: count });
});

router.post("/bookings", async (req, res) => {
  const parsed = CreateBookingBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const { spotId, commuterId, date: rawDate, startHour, endHour } = parsed.data;
  const date = rawDate instanceof Date ? rawDate.toISOString().split("T")[0] : String(rawDate);

  const spot = await db.query.spotsTable.findFirst({ where: eq(spotsTable.id, spotId) });
  if (!spot) return res.status(404).json({ error: "Spot not found" });

  const overlap = await db.query.bookingsTable.findFirst({
    where: and(
      eq(bookingsTable.spotId, spotId),
      eq(bookingsTable.date, date),
      inArray(bookingsTable.status, ["pending", "confirmed"]),
      lt(bookingsTable.startHour, endHour),
      gt(bookingsTable.endHour, startHour)
    ),
  });
  if (overlap) {
    return res.status(409).json({ error: "This time slot is already booked. Please choose a different time." });
  }

  const totalHours = endHour - startHour;
  const surgeMultiplier = 1.0;
  const totalAmount = totalHours * spot.pricePerHour * surgeMultiplier;
  const platformFee = totalAmount * PLATFORM_FEE_RATE;
  const ownerEarning = totalAmount - platformFee;

  const [booking] = await db
    .insert(bookingsTable)
    .values({
      spotId,
      commuterId,
      ownerId: spot.ownerId,
      date,
      startHour,
      endHour,
      totalHours,
      pricePerHour: spot.pricePerHour,
      surgeMultiplier,
      totalAmount,
      platformFee,
      ownerEarning,
      status: "pending",
    })
    .returning();

  const commuter = await db.query.usersTable.findFirst({ where: eq(usersTable.id, commuterId) });
  return res.status(201).json(formatBooking(booking, spot, commuter, false));
});

router.get("/bookings/:id", async (req, res) => {
  const parsed = GetBookingParams.safeParse(req.params);
  if (!parsed.success) return res.status(400).json({ error: "invalid id" });
  const booking = await db.query.bookingsTable.findFirst({ where: eq(bookingsTable.id, parsed.data.id) });
  if (!booking) return res.status(404).json({ error: "Booking not found" });
  const [spot, commuter] = await Promise.all([
    db.query.spotsTable.findFirst({ where: eq(spotsTable.id, booking.spotId) }),
    db.query.usersTable.findFirst({ where: eq(usersTable.id, booking.commuterId) }),
  ]);
  return res.json(formatBooking(booking, spot, commuter, true));
});

router.put("/bookings/:id", async (req, res) => {
  const paramsParsed = UpdateBookingStatusParams.safeParse(req.params);
  if (!paramsParsed.success) return res.status(400).json({ error: "invalid id" });
  const parsed = UpdateBookingStatusBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

  const { status, mpesaCode, cancellationReason } = parsed.data;

  const existing = await db.query.bookingsTable.findFirst({ where: eq(bookingsTable.id, paramsParsed.data.id) });
  if (!existing) return res.status(404).json({ error: "Booking not found" });

  const [booking] = await db
    .update(bookingsTable)
    .set({ status: status as any, mpesaCode: mpesaCode ?? existing.mpesaCode, cancellationReason: cancellationReason ?? existing.cancellationReason })
    .where(eq(bookingsTable.id, paramsParsed.data.id))
    .returning();

  if (status === "confirmed" || status === "completed") {
    await db.update(spotsTable)
      .set({ totalBookings: sql`${spotsTable.totalBookings} + 1` })
      .where(eq(spotsTable.id, booking.spotId));

    const spot = await db.query.spotsTable.findFirst({ where: eq(spotsTable.id, booking.spotId) });
    const today = new Date().toISOString().split("T")[0];
    await db.insert(payoutsTable).values({
      ownerId: booking.ownerId,
      bookingId: booking.id,
      spotTitle: spot?.title ?? "",
      grossAmount: booking.totalAmount,
      platformFee: booking.platformFee,
      netAmount: booking.ownerEarning,
      mpesaCode: mpesaCode,
      status: "pending",
      periodStart: today,
      periodEnd: today,
    }).onConflictDoNothing();
  }

  if (status === "cancelled") {
    await db.update(usersTable)
      .set({ cancellationCount: sql`${usersTable.cancellationCount} + 1` })
      .where(eq(usersTable.id, booking.commuterId));
  }

  const [spot, commuter] = await Promise.all([
    db.query.spotsTable.findFirst({ where: eq(spotsTable.id, booking.spotId) }),
    db.query.usersTable.findFirst({ where: eq(usersTable.id, booking.commuterId) }),
  ]);

  return res.json(formatBooking(booking, spot, commuter, true));
});

export default router;

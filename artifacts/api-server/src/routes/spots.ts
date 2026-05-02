import { Router } from "express";
import { db, spotsTable, usersTable } from "@workspace/db";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import {
  CreateSpotBody,
  UpdateSpotBody,
  ListSpotsQueryParams,
  GetMapSpotsQueryParams,
  GetSpotParams,
  UpdateSpotParams,
  DeleteSpotParams,
} from "@workspace/api-zod";

const router = Router();

router.get("/spots", async (req, res) => {
  const parsed = ListSpotsQueryParams.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const { zone, ownerId, minPrice, maxPrice, hasCctv, limit = 20, offset = 0 } = parsed.data;

  const conditions = [];
  if (zone) conditions.push(eq(spotsTable.zone, zone as any));
  if (ownerId) conditions.push(eq(spotsTable.ownerId, ownerId));
  if (minPrice != null) conditions.push(gte(spotsTable.pricePerHour, minPrice));
  if (maxPrice != null) conditions.push(lte(spotsTable.pricePerHour, maxPrice));
  if (hasCctv != null) conditions.push(eq(spotsTable.hasCctv, hasCctv));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [spots, [{ count }]] = await Promise.all([
    db.query.spotsTable.findMany({
      where,
      limit: limit ?? 20,
      offset: offset ?? 0,
    }),
    db.select({ count: sql<number>`count(*)::int` }).from(spotsTable).where(where),
  ]);

  const spotsWithOwner = await Promise.all(
    spots.map(async (spot) => {
      const owner = await db.query.usersTable.findFirst({ where: eq(usersTable.id, spot.ownerId) });
      return {
        ...spot,
        ownerName: owner?.name ?? "",
        ownerPhone: owner?.phone ?? "",
      };
    })
  );

  return res.json({ spots: spotsWithOwner, total: count });
});

router.get("/spots/map", async (req, res) => {
  const parsed = GetMapSpotsQueryParams.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const { lat, lng, radiusKm = 3, startHour, endHour } = parsed.data;

  const allSpots = await db.query.spotsTable.findMany({
    where: eq(spotsTable.isActive, true),
  });

  const nearbySpots = allSpots.filter((spot) => {
    const dlat = spot.lat - lat;
    const dlng = spot.lng - lng;
    const dist = Math.sqrt(dlat * dlat + dlng * dlng) * 111;
    return dist <= (radiusKm ?? 3);
  });

  const mapSpots = nearbySpots.map((spot) => {
    let isAvailable = true;
    if (startHour != null && (startHour < spot.availableFrom || startHour >= spot.availableTo)) {
      isAvailable = false;
    }
    if (endHour != null && endHour > spot.availableTo) {
      isAvailable = false;
    }
    return {
      id: spot.id,
      lat: spot.lat,
      lng: spot.lng,
      pricePerHour: spot.pricePerHour,
      zone: spot.zone,
      title: spot.title,
      hasCctv: spot.hasCctv,
      rating: spot.rating,
      isAvailable,
      surgeMultiplier: 1.0,
    };
  });

  return res.json({ spots: mapSpots, centerLat: lat, centerLng: lng });
});

router.get("/spots/:id", async (req, res) => {
  const parsed = GetSpotParams.safeParse(req.params);
  if (!parsed.success) return res.status(400).json({ error: "invalid id" });
  const spot = await db.query.spotsTable.findFirst({ where: eq(spotsTable.id, parsed.data.id) });
  if (!spot) return res.status(404).json({ error: "Spot not found" });
  const owner = await db.query.usersTable.findFirst({ where: eq(usersTable.id, spot.ownerId) });
  const viewerUserId = req.query.userId ? parseInt(req.query.userId as string, 10) : null;
  return res.json({
    ...spot,
    ownerName: owner?.name ?? "",
    ownerPhone: owner?.phone ?? "",
    accessInstructions: viewerUserId ? spot.accessInstructions : undefined,
  });
});

router.post("/spots", async (req, res) => {
  const parsed = CreateSpotBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const [spot] = await db.insert(spotsTable).values(parsed.data as any).returning();
  const owner = await db.query.usersTable.findFirst({ where: eq(usersTable.id, spot.ownerId) });
  return res.status(201).json({ ...spot, ownerName: owner?.name ?? "", ownerPhone: owner?.phone ?? "" });
});

router.put("/spots/:id", async (req, res) => {
  const paramsParsed = UpdateSpotParams.safeParse(req.params);
  if (!paramsParsed.success) return res.status(400).json({ error: "invalid id" });
  const parsed = UpdateSpotBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const [spot] = await db
    .update(spotsTable)
    .set(parsed.data as any)
    .where(eq(spotsTable.id, paramsParsed.data.id))
    .returning();
  if (!spot) return res.status(404).json({ error: "Spot not found" });
  const owner = await db.query.usersTable.findFirst({ where: eq(usersTable.id, spot.ownerId) });
  return res.json({ ...spot, ownerName: owner?.name ?? "", ownerPhone: owner?.phone ?? "" });
});

router.delete("/spots/:id", async (req, res) => {
  const parsed = DeleteSpotParams.safeParse(req.params);
  if (!parsed.success) return res.status(400).json({ error: "invalid id" });
  await db.delete(spotsTable).where(eq(spotsTable.id, parsed.data.id));
  return res.status(204).send();
});

export default router;

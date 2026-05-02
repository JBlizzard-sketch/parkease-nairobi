import { Router } from "express";
import { db, reviewsTable, usersTable, spotsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import {
  CreateReviewBody,
  ListReviewsQueryParams,
} from "@workspace/api-zod";

const router = Router();

router.get("/reviews", async (req, res) => {
  const parsed = ListReviewsQueryParams.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const { spotId, revieweeId, limit = 10, offset = 0 } = parsed.data;

  const conditions = [];
  if (spotId) conditions.push(eq(reviewsTable.spotId, spotId));
  if (revieweeId) conditions.push(eq(reviewsTable.revieweeId, revieweeId));

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const [reviews, [{ count }]] = await Promise.all([
    db.query.reviewsTable.findMany({ where, limit: limit ?? 10, offset: offset ?? 0, orderBy: (t, { desc }) => [desc(t.createdAt)] }),
    db.select({ count: sql<number>`count(*)::int` }).from(reviewsTable).where(where),
  ]);

  const enriched = await Promise.all(
    reviews.map(async (r) => {
      const reviewer = await db.query.usersTable.findFirst({ where: eq(usersTable.id, r.reviewerId) });
      return { ...r, reviewerName: reviewer?.name ?? "", reviewerAvatarUrl: reviewer?.avatarUrl ?? null };
    })
  );

  const avgResult = await db
    .select({ avg: sql<number>`avg(rating)::float` })
    .from(reviewsTable)
    .where(where);

  return res.json({ reviews: enriched, total: count, averageRating: avgResult[0]?.avg ?? null });
});

router.post("/reviews", async (req, res) => {
  const parsed = CreateReviewBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

  const [review] = await db.insert(reviewsTable).values(parsed.data as any).returning();

  if (parsed.data.spotId) {
    const spotId = parsed.data.spotId;
    const [{ avg }, [{ cnt }]] = await Promise.all([
      db.select({ avg: sql<number>`avg(rating)::float` }).from(reviewsTable).where(eq(reviewsTable.spotId, spotId)).then(r => r[0]),
      db.select({ cnt: sql<number>`count(*)::int` }).from(reviewsTable).where(eq(reviewsTable.spotId, spotId)),
    ]);
    await db.update(spotsTable).set({ rating: avg, reviewCount: cnt }).where(eq(spotsTable.id, spotId));
  }

  if (parsed.data.revieweeId) {
    const revieweeId = parsed.data.revieweeId;
    const [{ avg }, [{ cnt }]] = await Promise.all([
      db.select({ avg: sql<number>`avg(rating)::float` }).from(reviewsTable).where(eq(reviewsTable.revieweeId, revieweeId)).then(r => r[0]),
      db.select({ cnt: sql<number>`count(*)::int` }).from(reviewsTable).where(eq(reviewsTable.revieweeId, revieweeId)),
    ]);
    await db.update(usersTable).set({ rating: avg, reviewCount: cnt }).where(eq(usersTable.id, revieweeId));
  }

  const reviewer = await db.query.usersTable.findFirst({ where: eq(usersTable.id, review.reviewerId) });
  return res.status(201).json({ ...review, reviewerName: reviewer?.name ?? "", reviewerAvatarUrl: reviewer?.avatarUrl ?? null });
});

export default router;

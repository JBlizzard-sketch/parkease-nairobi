import { Router } from "express";
import { db, payoutsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { ListPayoutsQueryParams } from "@workspace/api-zod";

const router = Router();

router.get("/payouts", async (req, res) => {
  const parsed = ListPayoutsQueryParams.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const { ownerId, limit = 20, offset = 0 } = parsed.data;

  const where = eq(payoutsTable.ownerId, ownerId);
  const [payouts, [{ count }], [{ totalPaid }], [{ totalPending }]] = await Promise.all([
    db.query.payoutsTable.findMany({ where, limit: limit ?? 20, offset: offset ?? 0, orderBy: (t, { desc }) => [desc(t.createdAt)] }),
    db.select({ count: sql<number>`count(*)::int` }).from(payoutsTable).where(where),
    db.select({ totalPaid: sql<number>`coalesce(sum(net_amount), 0)::float` }).from(payoutsTable).where(and(where, eq(payoutsTable.status, "paid"))),
    db.select({ totalPending: sql<number>`coalesce(sum(net_amount), 0)::float` }).from(payoutsTable).where(and(where, eq(payoutsTable.status, "pending"))),
  ]);

  return res.json({ payouts, total: count, totalPaid, totalPending });
});

export default router;

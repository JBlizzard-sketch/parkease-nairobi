import { Router } from "express";
import { db, waitlistTable, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import {
  JoinWaitlistBody,
  ListWaitlistQueryParams,
  LeaveWaitlistParams,
} from "@workspace/api-zod";

const router = Router();

router.get("/waitlist", async (req, res) => {
  const parsed = ListWaitlistQueryParams.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const { userId, zone } = parsed.data;

  const conditions = [];
  if (userId) conditions.push(eq(waitlistTable.userId, userId));
  if (zone) conditions.push(eq(waitlistTable.zone, zone as any));

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const entries = await db.query.waitlistTable.findMany({ where, orderBy: (t, { asc }) => [asc(t.createdAt)] });

  const enriched = await Promise.all(
    entries.map(async (e) => {
      const user = await db.query.usersTable.findFirst({ where: eq(usersTable.id, e.userId) });
      return { ...e, userName: user?.name ?? "" };
    })
  );

  return res.json({ entries: enriched, total: enriched.length });
});

router.post("/waitlist", async (req, res) => {
  const parsed = JoinWaitlistBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const [entry] = await db.insert(waitlistTable).values(parsed.data as any).returning();
  const user = await db.query.usersTable.findFirst({ where: eq(usersTable.id, entry.userId) });
  return res.status(201).json({ ...entry, userName: user?.name ?? "" });
});

router.delete("/waitlist/:id", async (req, res) => {
  const parsed = LeaveWaitlistParams.safeParse(req.params);
  if (!parsed.success) return res.status(400).json({ error: "invalid id" });
  await db.delete(waitlistTable).where(eq(waitlistTable.id, parsed.data.id));
  return res.status(204).send();
});

export default router;

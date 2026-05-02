import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  CreateUserBody,
  UpdateMeBody,
  GetMeQueryParams,
} from "@workspace/api-zod";

const router = Router();

router.post("/users", async (req, res) => {
  const parsed = CreateUserBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.message });
  }
  const { name, phone, email, role } = parsed.data;
  const [user] = await db
    .insert(usersTable)
    .values({ name, phone, email, role })
    .returning();
  return res.status(201).json(user);
});

router.get("/users/me", async (req, res) => {
  const parsed = GetMeQueryParams.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: "userId is required" });
  }
  const user = await db.query.usersTable.findFirst({
    where: eq(usersTable.id, parsed.data.userId),
  });
  if (!user) return res.status(404).json({ error: "User not found" });
  return res.json(user);
});

router.put("/users/me", async (req, res) => {
  const userIdStr = req.query.userId as string;
  const userId = parseInt(userIdStr, 10);
  if (!userId || isNaN(userId)) {
    return res.status(400).json({ error: "userId query param required" });
  }
  const parsed = UpdateMeBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.message });
  }
  const [user] = await db
    .update(usersTable)
    .set(parsed.data)
    .where(eq(usersTable.id, userId))
    .returning();
  if (!user) return res.status(404).json({ error: "User not found" });
  return res.json(user);
});

export default router;

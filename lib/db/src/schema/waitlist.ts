import { pgTable, serial, integer, boolean, timestamp, date, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const waitlistZoneEnum = pgEnum("waitlist_zone", [
  "Westlands", "CBD", "Upperhill", "Kilimani", "Hurlingham",
  "Parklands", "Karen", "Lavington", "Other"
]);

export const waitlistTable = pgTable("waitlist", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  zone: waitlistZoneEnum("zone").notNull(),
  date: date("date").notNull(),
  startHour: integer("start_hour").notNull(),
  endHour: integer("end_hour").notNull(),
  notified: boolean("notified").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertWaitlistSchema = createInsertSchema(waitlistTable).omit({ id: true, createdAt: true });
export type InsertWaitlist = z.infer<typeof insertWaitlistSchema>;
export type WaitlistEntry = typeof waitlistTable.$inferSelect;

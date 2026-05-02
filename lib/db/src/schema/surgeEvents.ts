import { pgTable, serial, text, real, boolean, date, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const surgeZoneEnum = pgEnum("surge_zone", [
  "Westlands", "CBD", "Upperhill", "Kilimani", "Hurlingham",
  "Parklands", "Karen", "Lavington", "Other"
]);

export const surgeEventsTable = pgTable("surge_events", {
  id: serial("id").primaryKey(),
  zone: surgeZoneEnum("zone").notNull(),
  date: date("date").notNull(),
  multiplier: real("multiplier").notNull().default(1.0),
  reason: text("reason"),
  isEventDay: boolean("is_event_day").notNull().default(false),
});

export const insertSurgeEventSchema = createInsertSchema(surgeEventsTable).omit({ id: true });
export type InsertSurgeEvent = z.infer<typeof insertSurgeEventSchema>;
export type SurgeEvent = typeof surgeEventsTable.$inferSelect;

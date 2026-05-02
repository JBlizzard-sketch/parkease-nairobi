import { pgTable, serial, text, real, integer, timestamp, date, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { bookingsTable } from "./bookings";

export const payoutStatusEnum = pgEnum("payout_status", [
  "pending", "processing", "paid", "failed"
]);

export const payoutsTable = pgTable("payouts", {
  id: serial("id").primaryKey(),
  ownerId: integer("owner_id").notNull().references(() => usersTable.id),
  bookingId: integer("booking_id").notNull().references(() => bookingsTable.id),
  spotTitle: text("spot_title").notNull(),
  grossAmount: real("gross_amount").notNull(),
  platformFee: real("platform_fee").notNull(),
  netAmount: real("net_amount").notNull(),
  mpesaCode: text("mpesa_code"),
  status: payoutStatusEnum("status").notNull().default("pending"),
  periodStart: date("period_start").notNull(),
  periodEnd: date("period_end").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPayoutSchema = createInsertSchema(payoutsTable).omit({ id: true, createdAt: true });
export type InsertPayout = z.infer<typeof insertPayoutSchema>;
export type Payout = typeof payoutsTable.$inferSelect;

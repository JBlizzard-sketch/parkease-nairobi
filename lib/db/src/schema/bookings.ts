import { pgTable, serial, text, real, integer, timestamp, pgEnum, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { spotsTable } from "./spots";

export const bookingStatusEnum = pgEnum("booking_status", [
  "pending", "confirmed", "completed", "cancelled", "no_show"
]);

export const bookingsTable = pgTable("bookings", {
  id: serial("id").primaryKey(),
  spotId: integer("spot_id").notNull().references(() => spotsTable.id),
  commuterId: integer("commuter_id").notNull().references(() => usersTable.id),
  ownerId: integer("owner_id").notNull().references(() => usersTable.id),
  date: date("date").notNull(),
  startHour: integer("start_hour").notNull(),
  endHour: integer("end_hour").notNull(),
  totalHours: real("total_hours").notNull(),
  pricePerHour: real("price_per_hour").notNull(),
  surgeMultiplier: real("surge_multiplier").notNull().default(1.0),
  totalAmount: real("total_amount").notNull(),
  platformFee: real("platform_fee").notNull(),
  ownerEarning: real("owner_earning").notNull(),
  status: bookingStatusEnum("status").notNull().default("pending"),
  mpesaCode: text("mpesa_code"),
  cancellationReason: text("cancellation_reason"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertBookingSchema = createInsertSchema(bookingsTable).omit({ id: true, createdAt: true });
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Booking = typeof bookingsTable.$inferSelect;

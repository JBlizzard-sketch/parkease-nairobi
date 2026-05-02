import { pgTable, serial, text, real, integer, boolean, timestamp, pgEnum, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const zoneEnum = pgEnum("zone", [
  "Westlands", "CBD", "Upperhill", "Kilimani", "Hurlingham",
  "Parklands", "Karen", "Lavington", "Other"
]);

export const spotTypeEnum = pgEnum("spot_type", [
  "driveway", "compound", "basement", "open_plot", "church", "office"
]);

export const spotsTable = pgTable("spots", {
  id: serial("id").primaryKey(),
  ownerId: integer("owner_id").notNull().references(() => usersTable.id),
  title: text("title").notNull(),
  description: text("description"),
  address: text("address").notNull(),
  zone: zoneEnum("zone").notNull(),
  lat: real("lat").notNull(),
  lng: real("lng").notNull(),
  pricePerHour: real("price_per_hour").notNull(),
  currency: text("currency").notNull().default("KES"),
  availableFrom: integer("available_from").notNull().default(7),
  availableTo: integer("available_to").notNull().default(18),
  availableDays: json("available_days").$type<string[]>().notNull().default(["Mon","Tue","Wed","Thu","Fri"]),
  photos: json("photos").$type<string[]>().notNull().default([]),
  hasCctv: boolean("has_cctv").notNull().default(false),
  hasRoofing: boolean("has_roofing").notNull().default(false),
  hasGate: boolean("has_gate").notNull().default(false),
  accessInstructions: text("access_instructions"),
  spotType: spotTypeEnum("spot_type").notNull().default("driveway"),
  rating: real("rating"),
  reviewCount: integer("review_count").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  totalBookings: integer("total_bookings").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertSpotSchema = createInsertSchema(spotsTable).omit({ id: true, createdAt: true });
export type InsertSpot = z.infer<typeof insertSpotSchema>;
export type Spot = typeof spotsTable.$inferSelect;

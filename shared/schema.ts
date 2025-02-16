import { pgTable, text, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const repairRequests = pgTable("repair_requests", {
  id: serial("id").primaryKey(),
  productType: text("product_type").notNull(),
  issueDescription: text("issue_description").notNull(),
  imageUrl: text("image_url"),
  status: text("status").notNull().default("pending"),
});

export const insertRepairRequestSchema = createInsertSchema(repairRequests)
  .pick({
    productType: true,
    issueDescription: true,
    imageUrl: true,
  })
  .extend({
    productType: z.string().min(1, "Product type is required"),
    issueDescription: z.string().min(1, "Issue description is required"),
    imageUrl: z.string().optional(),
  });

export type InsertRepairRequest = z.infer<typeof insertRepairRequestSchema>;
export type RepairRequest = typeof repairRequests.$inferSelect;

export const mockRepairShops = [
  {
    id: 1,
    name: "TechFix Pro",
    rating: 4.5,
    distance: "2.3 miles",
    specialties: ["Phones", "Laptops", "Tablets"],
  },
  {
    id: 2,
    name: "Quick Repair Solutions",
    rating: 4.8,
    distance: "3.1 miles",
    specialties: ["Electronics", "Appliances"],
  },
  {
    id: 3,
    name: "Device Doctors",
    rating: 4.3,
    distance: "1.8 miles",
    specialties: ["Phones", "Gaming Consoles"],
  },
];

export type RepairShop = typeof mockRepairShops[0];
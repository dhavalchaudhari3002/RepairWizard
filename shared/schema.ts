import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table with role-based auth
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role", { enum: ["customer", "repairer", "shop_owner"] }).notNull(),
  email: text("email").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Repair Shops table
export const repairShops = pgTable("repair_shops", {
  id: serial("id").primaryKey(),
  ownerId: integer("owner_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  address: text("address").notNull(),
  phoneNumber: text("phone_number").notNull(),
  specialties: text("specialties").array().notNull(),
  rating: text("rating"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Repairers table
export const repairers = pgTable("repairers", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  shopId: integer("shop_id").references(() => repairShops.id).notNull(),
  specialties: text("specialties").array().notNull(),
  experience: text("experience"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Updated repair requests with relationships - made customerId nullable
export const repairRequests = pgTable("repair_requests", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").references(() => users.id), // Made nullable
  shopId: integer("shop_id").references(() => repairShops.id),
  repairerId: integer("repairer_id").references(() => repairers.id),
  productType: text("product_type").notNull(),
  issueDescription: text("issue_description").notNull(),
  imageUrl: text("image_url"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users)
  .pick({
    username: true,
    password: true,
    role: true,
    email: true,
  })
  .extend({
    username: z.string().min(3, "Username must be at least 3 characters"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    email: z.string().email("Invalid email address"),
    role: z.enum(["customer", "repairer", "shop_owner"]),
  });

export const insertRepairShopSchema = createInsertSchema(repairShops)
  .pick({
    name: true,
    description: true,
    address: true,
    phoneNumber: true,
    specialties: true,
  })
  .extend({
    name: z.string().min(1, "Shop name is required"),
    address: z.string().min(1, "Address is required"),
    phoneNumber: z.string().min(1, "Phone number is required"),
    specialties: z.array(z.string()).min(1, "At least one specialty is required"),
  });

export const insertRepairerSchema = createInsertSchema(repairers)
  .pick({
    specialties: true,
    experience: true,
  })
  .extend({
    specialties: z.array(z.string()).min(1, "At least one specialty is required"),
    experience: z.string().optional(),
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

// Export types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertRepairShop = z.infer<typeof insertRepairShopSchema>;
export type RepairShop = typeof repairShops.$inferSelect;

export type InsertRepairer = z.infer<typeof insertRepairerSchema>;
export type Repairer = typeof repairers.$inferSelect;

export type InsertRepairRequest = z.infer<typeof insertRepairRequestSchema>;
export type RepairRequest = typeof repairRequests.$inferSelect;
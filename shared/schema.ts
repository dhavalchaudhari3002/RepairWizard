import { pgTable, text, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table with role-based auth
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role", { enum: ["customer", "repairer"] }).notNull(),
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

// Notifications table
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type", { enum: ["repair_update", "system", "message"] }).notNull(),
  read: boolean("read").default(false).notNull(),
  relatedEntityId: integer("related_entity_id"), // Can be repairRequestId or other entity IDs
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
    password: z.string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number")
      .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
    email: z.string().email("Invalid email address"),
    role: z.enum(["customer", "repairer"]),
  });

export const insertRepairShopSchema = createInsertSchema(repairShops)
  .omit({
    id: true,
    createdAt: true,
    rating: true,
  })
  .extend({
    name: z.string().min(1, "Shop name is required"),
    address: z.string().min(1, "Address is required"),
    phoneNumber: z.string().min(1, "Phone number is required"),
    specialties: z.array(z.string()).min(1, "At least one specialty is required"),
  });

export const insertRepairerSchema = createInsertSchema(repairers)
  .omit({
    id: true,
    createdAt: true,
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

export const insertNotificationSchema = createInsertSchema(notifications)
  .omit({
    id: true,
    createdAt: true,
    read: true,
  })
  .extend({
    title: z.string().min(1, "Title is required"),
    message: z.string().min(1, "Message is required"),
    type: z.enum(["repair_update", "system", "message"]),
    relatedEntityId: z.number().optional(),
  });

//Export types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertRepairShop = z.infer<typeof insertRepairShopSchema>;
export type RepairShop = typeof repairShops.$inferSelect;

export type InsertRepairer = z.infer<typeof insertRepairerSchema>;
export type Repairer = typeof repairers.$inferSelect;

export type InsertRepairRequest = z.infer<typeof insertRepairRequestSchema>;
export type RepairRequest = typeof repairRequests.$inferSelect;

export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;
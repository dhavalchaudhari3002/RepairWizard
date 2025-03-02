import { users, repairRequests, repairShops, repairers, notifications, type RepairRequest, type InsertRepairRequest, type User, type InsertUser, type RepairShop, type InsertRepairShop, type Repairer, type InsertRepairer, type Notification, type InsertNotification } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // User management
  createUser(user: any): Promise<User>;
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  updateUser(id: number, data: Partial<User>): Promise<User>;
  deleteUser(id: number): Promise<void>;

  // Repair shop management
  createRepairShop(shop: InsertRepairShop): Promise<RepairShop>;
  getAllRepairShops(): Promise<RepairShop[]>;

  // Repairer management
  createRepairer(repairer: InsertRepairer): Promise<Repairer>;

  // Repair request management
  createRepairRequest(request: InsertRepairRequest): Promise<RepairRequest>;
  getRepairRequest(id: number): Promise<RepairRequest | undefined>;
  updateRepairRequestStatus(id: number, status: string): Promise<RepairRequest>;

  // Notification management
  createNotification(notification: InsertNotification): Promise<Notification>;
  getUserNotifications(userId: number): Promise<Notification[]>;
  markNotificationAsRead(id: number): Promise<void>;
  markAllNotificationsAsRead(userId: number): Promise<void>;

  // Session store
  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      conObject: {
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
      },
      createTableIfMissing: true,
      tableName: 'session'
    });
  }

  // User management methods
  async createUser(userData: any): Promise<User> {
    try {
      console.log("Creating user in database:", { ...userData, password: '[REDACTED]' });
      const [user] = await db
        .insert(users)
        .values(userData)
        .returning();
      console.log("User created successfully:", { id: user.id, email: user.email });
      return user;
    } catch (error) {
      console.error("Error in createUser:", error);
      throw error;
    }
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email));
    return user;
  }

  async updateUser(id: number, data: Partial<User>): Promise<User> {
    const [user] = await db
      .update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async deleteUser(id: number): Promise<void> {
    await db
      .delete(users)
      .where(eq(users.id, id));
  }

  // Repair shop management methods
  async createRepairShop(shopData: InsertRepairShop): Promise<RepairShop> {
    const [shop] = await db
      .insert(repairShops)
      .values(shopData)
      .returning();
    return shop;
  }

  async getAllRepairShops(): Promise<RepairShop[]> {
    return db.select().from(repairShops);
  }

  // Repairer management methods
  async createRepairer(repairerData: InsertRepairer): Promise<Repairer> {
    const [repairer] = await db
      .insert(repairers)
      .values(repairerData)
      .returning();
    return repairer;
  }

  // Repair request management methods
  async createRepairRequest(requestData: InsertRepairRequest): Promise<RepairRequest> {
    const [request] = await db
      .insert(repairRequests)
      .values(requestData)
      .returning();
    return request;
  }

  async getRepairRequest(id: number): Promise<RepairRequest | undefined> {
    const [request] = await db
      .select()
      .from(repairRequests)
      .where(eq(repairRequests.id, id));
    return request;
  }

  async updateRepairRequestStatus(id: number, status: string): Promise<RepairRequest> {
    const [request] = await db
      .update(repairRequests)
      .set({ status })
      .where(eq(repairRequests.id, id))
      .returning();
    return request;
  }

  // Notification management methods
  async createNotification(notificationData: InsertNotification): Promise<Notification> {
    const [notification] = await db
      .insert(notifications)
      .values(notificationData)
      .returning();
    return notification;
  }

  async getUserNotifications(userId: number): Promise<Notification[]> {
    return db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(notifications.createdAt);
  }

  async markNotificationAsRead(id: number): Promise<void> {
    await db
      .update(notifications)
      .set({ read: true })
      .where(eq(notifications.id, id));
  }

  async markAllNotificationsAsRead(userId: number): Promise<void> {
    await db
      .update(notifications)
      .set({ read: true })
      .where(eq(notifications.userId, userId));
  }
}

export const storage = new DatabaseStorage();
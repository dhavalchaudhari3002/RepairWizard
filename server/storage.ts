import { repairRequests, users, repairShops, repairers, type RepairRequest, type InsertRepairRequest, type User, type InsertUser, type RepairShop, type InsertRepairShop, type Repairer, type InsertRepairer } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // User management
  createUser(user: InsertUser): Promise<User>;
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;

  // Repair shops
  getAllRepairShops(): Promise<RepairShop[]>;
  getRepairShop(id: number): Promise<RepairShop | undefined>;
  createRepairShop(shop: InsertRepairShop): Promise<RepairShop>;

  // Repairers
  createRepairer(repairer: InsertRepairer): Promise<Repairer>;

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
    });
  }

  // User management methods
  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .returning();
    return user;
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username));
    return user;
  }

  // Repair shop methods
  async getAllRepairShops(): Promise<RepairShop[]> {
    return await db.select().from(repairShops);
  }

  async getRepairShop(id: number): Promise<RepairShop | undefined> {
    const [shop] = await db
      .select()
      .from(repairShops)
      .where(eq(repairShops.id, id));
    return shop;
  }

  async createRepairShop(shopData: InsertRepairShop): Promise<RepairShop> {
    const [shop] = await db
      .insert(repairShops)
      .values([shopData])
      .returning();
    return shop;
  }

  // Repairer methods
  async createRepairer(repairerData: InsertRepairer): Promise<Repairer> {
    const [repairer] = await db
      .insert(repairers)
      .values([repairerData])
      .returning();
    return repairer;
  }
}

export const storage = new DatabaseStorage();
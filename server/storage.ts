import { repairRequests, users, type RepairRequest, type InsertRepairRequest, type User, type InsertUser } from "@shared/schema";
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

  // Repair requests
  createRepairRequest(request: InsertRepairRequest): Promise<RepairRequest>;
  getRepairRequest(id: number): Promise<RepairRequest | undefined>;
  getAllRepairRequests(): Promise<RepairRequest[]>;

  // Session store
  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    // Initialize session store with PostgreSQL
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

  // Repair request methods (existing code)
  async createRepairRequest(request: InsertRepairRequest): Promise<RepairRequest> {
    const [repairRequest] = await db
      .insert(repairRequests)
      .values({
        ...request,
        status: "pending",
        customerId: 1, // TODO: Update this with actual user ID once auth is implemented
      })
      .returning();
    return repairRequest;
  }

  async getRepairRequest(id: number): Promise<RepairRequest | undefined> {
    const [repairRequest] = await db
      .select()
      .from(repairRequests)
      .where(eq(repairRequests.id, id));
    return repairRequest;
  }

  async getAllRepairRequests(): Promise<RepairRequest[]> {
    return await db.select().from(repairRequests);
  }
}

export const storage = new DatabaseStorage();
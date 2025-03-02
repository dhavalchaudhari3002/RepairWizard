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

  async createUser(userData: any): Promise<User> {
    try {
      console.log("Creating user in database:", { ...userData, password: '[REDACTED]' });

      // Check for existing user
      const existingUser = await this.getUserByEmail(userData.email);
      if (existingUser) {
        throw new Error("Email already registered");
      }

      // Ensure the data matches the schema
      const userToCreate = {
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        password: userData.password,
        role: userData.role,
        emailVerified: true, // Always set to true since we're not verifying
        tosAccepted: userData.tosAccepted,
        createdAt: new Date(),
      };

      const [user] = await db
        .insert(users)
        .values(userToCreate)
        .returning();

      console.log("User created successfully:", { id: user.id, email: user.email });
      return user;
    } catch (error) {
      console.error("Error in createUser:", error);
      throw error;
    }
  }

  async getUser(id: number): Promise<User | undefined> {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, id));
      return user;
    } catch (error) {
      console.error("Error in getUser:", error);
      throw error;
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email));
      return user;
    } catch (error) {
      console.error("Error in getUserByEmail:", error);
      throw error;
    }
  }

  async updateUser(id: number, data: Partial<User>): Promise<User> {
    try {
      const [user] = await db
        .update(users)
        .set(data)
        .where(eq(users.id, id))
        .returning();
      return user;
    } catch (error) {
      console.error("Error in updateUser:", error);
      throw error;
    }
  }

  async deleteUser(id: number): Promise<void> {
    try {
      await db
        .delete(users)
        .where(eq(users.id, id));
      console.log("User deleted successfully:", id);
    } catch (error) {
      console.error("Error in deleteUser:", error);
      throw error;
    }
  }
}

export const storage = new DatabaseStorage();
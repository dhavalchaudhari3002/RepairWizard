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
  getUserByVerificationToken(token: string): Promise<User | undefined>;
  verifyUserEmail(id: number): Promise<User>;
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

  // User management methods
  async createUser(userData: any): Promise<User> {
    try {
      console.log("Creating user in database:", { ...userData, password: '[REDACTED]' });

      // Ensure the data matches the schema
      const userToCreate = {
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        password: userData.password,
        role: userData.role,
        emailVerified: false,
        verificationToken: userData.verificationToken,
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

  // Add new method to get user by verification token
  async getUserByVerificationToken(token: string): Promise<User | undefined> {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.verificationToken, token));
      return user;
    } catch (error) {
      console.error("Error in getUserByVerificationToken:", error);
      throw error;
    }
  }

  // Add new method to verify user's email
  async verifyUserEmail(id: number): Promise<User> {
    try {
      const [user] = await db
        .update(users)
        .set({
          emailVerified: true,
          verificationToken: null,
        })
        .where(eq(users.id, id))
        .returning();

      if (!user) {
        throw new Error("User not found");
      }

      return user;
    } catch (error) {
      console.error("Error in verifyUserEmail:", error);
      throw error;
    }
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
}

export const storage = new DatabaseStorage();
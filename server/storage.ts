import { users, repairShops, repairRequests, notifications, type User, type RepairShop, type RepairRequest, type Notification } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { sendWelcomeEmail } from "./services/email";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // User operations
  createUser(user: any): Promise<User>;
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  updateUser(id: number, data: Partial<User>): Promise<User>;
  deleteUser(id: number): Promise<void>;

  // Repair shop operations
  getAllRepairShops(): Promise<RepairShop[]>;

  // Repair request operations
  createRepairRequest(request: any): Promise<RepairRequest>;
  getRepairRequest(id: number): Promise<RepairRequest | undefined>;
  updateRepairRequestStatus(id: number, status: string): Promise<RepairRequest>;

  // Notification operations
  createNotification(notification: any): Promise<Notification>;
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

  // Implement all the required methods from IStorage interface
  async getAllRepairShops(): Promise<RepairShop[]> {
    try {
      return await db.select().from(repairShops); 
    } catch (error) {
      console.error("Error in getAllRepairShops:", error);
      throw error;
    }
  }

  async createRepairRequest(requestData: any): Promise<RepairRequest> {
    try {
      const [request] = await db
        .insert(repairRequests)
        .values(requestData)
        .returning(); 
      return request;
    } catch (error) {
      console.error("Error in createRepairRequest:", error);
      throw error;
    }
  }

  async getRepairRequest(id: number): Promise<RepairRequest | undefined> {
    try {
      const [request] = await db
        .select()
        .from(repairRequests)
        .where(eq(repairRequests.id, id)); 
      return request;
    } catch (error) {
      console.error("Error in getRepairRequest:", error);
      throw error;
    }
  }

  async updateRepairRequestStatus(id: number, status: string): Promise<RepairRequest> {
    try {
      const [request] = await db
        .update(repairRequests)
        .set({ status })
        .where(eq(repairRequests.id, id))
        .returning(); 
      return request;
    } catch (error) {
      console.error("Error in updateRepairRequestStatus:", error);
      throw error;
    }
  }

  async createNotification(notificationData: any): Promise<Notification> {
    try {
      const [notification] = await db
        .insert(notifications)
        .values(notificationData)
        .returning(); 
      return notification;
    } catch (error) {
      console.error("Error in createNotification:", error);
      throw error;
    }
  }

  async getUserNotifications(userId: number): Promise<Notification[]> {
    try {
      return await db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, userId)); 
    } catch (error) {
      console.error("Error in getUserNotifications:", error);
      throw error;
    }
  }

  async markNotificationAsRead(id: number): Promise<void> {
    try {
      await db
        .update(notifications)
        .set({ read: true })
        .where(eq(notifications.id, id)); 
    } catch (error) {
      console.error("Error in markNotificationAsRead:", error);
      throw error;
    }
  }

  async markAllNotificationsAsRead(userId: number): Promise<void> {
    try {
      await db
        .update(notifications)
        .set({ read: true })
        .where(eq(notifications.userId, userId)); 
    } catch (error) {
      console.error("Error in markAllNotificationsAsRead:", error);
      throw error;
    }
  }

  async createUser(userData: any): Promise<User> {
    try {
      console.log("Creating user in database:", { ...userData, password: '[REDACTED]' });

      // Check for existing user
      const existingUser = await this.getUserByEmail(userData.email);
      if (existingUser) {
        const error = new Error("This email is already registered. Please login or use a different email address.");
        (error as any).statusCode = 409;
        throw error;
      }

      const userToCreate = {
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        password: userData.password,
        role: userData.role,
        emailVerified: false, // Set to false initially
        tosAccepted: userData.tosAccepted,
        createdAt: new Date(),
      };

      // Create user first
      const [user] = await db
        .insert(users)
        .values(userToCreate)
        .returning();

      console.log("User created successfully:", { id: user.id, email: user.email });

      // Try to send welcome email, but don't block registration if it fails
      try {
        const emailSent = await sendWelcomeEmail(user.email, user.firstName);
        if (emailSent) {
          console.log('Welcome email sent successfully to:', user.email);
          // Update email verified status
          await this.updateUser(user.id, { emailVerified: true });
        } else {
          console.warn('Failed to send welcome email to:', user.email);
        }
      } catch (emailError) {
        console.error("Welcome email error (non-blocking):", emailError);
      }

      // Create welcome notification
      try {
        await this.createNotification({
          userId: user.id,
          title: "Welcome to AI Repair Assistant!",
          message: `Welcome ${user.firstName}! Thank you for joining our platform. We're here to help with all your repair needs.`,
          type: "system",
          read: false,
          relatedEntityId: user.id
        });
      } catch (notificationError) {
        console.error("Welcome notification error (non-blocking):", notificationError);
      }

      return user;
    } catch (error) {
      console.error("Error in createUser:", error);
      if (!(error as any).statusCode) {
        (error as any).statusCode = 500;
      }
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
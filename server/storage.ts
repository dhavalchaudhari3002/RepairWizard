import { 
  users, 
  repairRequests, 
  notifications, 
  userInteractions,
  repairAnalytics,
  products,
  diagnosticQuestionTrees,
  failurePatterns,
  repairHistory,
  storageFiles,
  repairSessions,
  repairSessionFiles,
  type User, 
  type RepairRequest, 
  type Notification,
  type UserInteraction,
  type InsertUserInteraction,
  type InsertRepairAnalytics,
  type RepairAnalytics,
  type Product,
  type InsertProduct,
  type DiagnosticQuestionTree,
  type InsertDiagnosticQuestionTree,
  type FailurePattern,
  type InsertFailurePattern,
  type RepairHistory,
  type InsertRepairHistory,
  type StorageFile,
  type InsertStorageFile,
  type RepairSession,
  type InsertRepairSession,
  type RepairSessionFile,
  type InsertRepairSessionFile
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, count } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { sendWelcomeEmail } from "./services/email";
import { sql } from "drizzle-orm";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // User operations
  createUser(user: any): Promise<User>;
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  updateUser(id: number, data: Partial<User>): Promise<User>;
  deleteUser(id: number): Promise<void>;

  // Repair request operations
  createRepairRequest(request: any): Promise<RepairRequest>;
  getRepairRequest(id: number): Promise<RepairRequest | undefined>;
  updateRepairRequestStatus(id: number, status: string): Promise<RepairRequest>;

  // Notification operations
  createNotification(notification: any): Promise<Notification>;
  getUserNotifications(userId: number): Promise<Notification[]>;
  markNotificationAsRead(id: number): Promise<void>;
  markAllNotificationsAsRead(userId: number): Promise<void>;

  // User Interaction Tracking
  trackUserInteraction(interaction: InsertUserInteraction): Promise<UserInteraction>;
  getUserInteractions(userId: number, limit?: number): Promise<UserInteraction[]>;
  getRepairRequestInteractions(repairRequestId: number): Promise<UserInteraction[]>;
  getInteractionStats(
    type?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{ 
    count: number; 
    avgDuration?: number;
    topProductTypes?: {productType: string, count: number}[];
    interactionsByType?: {type: string, count: number}[];
  }>;
  
  // AI Repair Analytics
  trackRepairAnalytics(data: InsertRepairAnalytics): Promise<RepairAnalytics>;

  // Product Knowledge Base
  createProduct(product: InsertProduct): Promise<Product>;
  getProduct(id: number): Promise<Product | undefined>;
  getProductsByCategory(category: string): Promise<Product[]>;
  updateProduct(id: number, data: Partial<Product>): Promise<Product>;
  
  // Diagnostic Question Trees
  createDiagnosticQuestionTree(tree: InsertDiagnosticQuestionTree): Promise<DiagnosticQuestionTree>;
  getDiagnosticQuestionTree(id: number): Promise<DiagnosticQuestionTree | undefined>;
  getDiagnosticQuestionTreeByCategory(category: string, subCategory?: string): Promise<DiagnosticQuestionTree | undefined>;
  updateDiagnosticQuestionTree(id: number, data: Partial<DiagnosticQuestionTree>): Promise<DiagnosticQuestionTree>;
  
  // Failure Patterns
  createFailurePattern(pattern: InsertFailurePattern): Promise<FailurePattern>;
  getFailurePattern(id: number): Promise<FailurePattern | undefined>;
  getFailurePatternsByCategory(category: string): Promise<FailurePattern[]>;
  getFailurePatternsBySymptoms(symptoms: string[]): Promise<FailurePattern[]>;
  
  // Repair History
  createRepairHistory(history: InsertRepairHistory): Promise<RepairHistory>;
  getRepairHistoryByRequestId(repairRequestId: number): Promise<RepairHistory | undefined>;
  updateRepairHistory(id: number, data: Partial<RepairHistory>): Promise<RepairHistory>;
  
  // Storage Files
  createStorageFile(file: InsertStorageFile): Promise<StorageFile>;
  getStorageFilesByUser(userId: number): Promise<StorageFile[]>;
  getStorageFile(id: number): Promise<StorageFile | undefined>;
  getStorageFileByUrl(url: string): Promise<StorageFile | undefined>;
  deleteStorageFile(id: number): Promise<void>;
  deleteStorageFileByUrl(url: string): Promise<void>;
  
  // Repair Journey Management
  createRepairSession(sessionData: InsertRepairSession): Promise<RepairSession>;
  getRepairSession(id: number): Promise<RepairSession | undefined>;
  getRepairSessionsByUserId(userId: number): Promise<RepairSession[]>;
  updateRepairSession(id: number, data: Partial<RepairSession>): Promise<RepairSession>;
  deleteRepairSession(id: number): Promise<void>;
  
  // Repair Session Files
  createRepairSessionFile(fileData: any): Promise<RepairSessionFile>;
  getRepairSessionFile(id: number): Promise<RepairSessionFile | undefined>;
  getRepairSessionFiles(sessionId: number): Promise<RepairSessionFile[]>;
  deleteRepairSessionFile(id: number): Promise<void>;

  // Session store
  sessionStore: session.Store;

  createPasswordResetToken(userId: number, token: string, expiresAt: Date): Promise<void>;
  getPasswordResetToken(token: string): Promise<{ userId: number; expiresAt: Date } | undefined>;
  deletePasswordResetToken(token: string): Promise<void>;
  updateUserPassword(userId: number, newPassword: string): Promise<void>;
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

  async createPasswordResetToken(userId: number, token: string, expiresAt: Date): Promise<void> {
    try {
      // Create the password_reset_tokens table if it doesn't exist
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS password_reset_tokens (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          token TEXT NOT NULL UNIQUE,
          expires_at TIMESTAMP NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await db.execute(
        sql`INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (${userId}, ${token}, ${expiresAt})`
      );
    } catch (error) {
      console.error("Error in createPasswordResetToken:", error);
      throw error;
    }
  }

  async getPasswordResetToken(token: string): Promise<{ userId: number; expiresAt: Date } | undefined> {
    try {
      const result = await db.execute<{ user_id: number; expires_at: Date }>(
        sql`
        SELECT user_id, expires_at 
        FROM password_reset_tokens 
        WHERE token = ${token} 
          AND expires_at > NOW()
        LIMIT 1
        `
      );

      if (!result.rows || result.rows.length === 0) {
        return undefined;
      }

      return {
        userId: result.rows[0].user_id,
        expiresAt: result.rows[0].expires_at
      };
    } catch (error) {
      console.error("Error in getPasswordResetToken:", error);
      throw error;
    }
  }

  async deletePasswordResetToken(token: string): Promise<void> {
    try {
      await db.execute(
        sql`DELETE FROM password_reset_tokens WHERE token = ${token}`
      );
    } catch (error) {
      console.error("Error in deletePasswordResetToken:", error);
      throw error;
    }
  }

  async updateUserPassword(userId: number, newPassword: string): Promise<void> {
    try {
      await db.update(users)
        .set({ password: newPassword })
        .where(eq(users.id, userId));
    } catch (error) {
      console.error("Error in updateUserPassword:", error);
      throw error;
    }
  }

  // User Interaction Tracking Methods
  async trackUserInteraction(interactionData: InsertUserInteraction): Promise<UserInteraction> {
    try {
      const [interaction] = await db
        .insert(userInteractions)
        .values(interactionData)
        .returning();
      return interaction;
    } catch (error) {
      console.error("Error in trackUserInteraction:", error);
      throw error;
    }
  }

  async getUserInteractions(userId: number, limit: number = 50): Promise<UserInteraction[]> {
    try {
      return await db
        .select()
        .from(userInteractions)
        .where(eq(userInteractions.userId, userId))
        .orderBy(desc(userInteractions.timestamp))
        .limit(limit);
    } catch (error) {
      console.error("Error in getUserInteractions:", error);
      throw error;
    }
  }

  async getRepairRequestInteractions(repairRequestId: number): Promise<UserInteraction[]> {
    try {
      return await db
        .select()
        .from(userInteractions)
        .where(eq(userInteractions.repairRequestId, repairRequestId))
        .orderBy(desc(userInteractions.timestamp));
    } catch (error) {
      console.error("Error in getRepairRequestInteractions:", error);
      throw error;
    }
  }

  async getInteractionStats(
    type?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{ 
    count: number; 
    avgDuration?: number;
    topProductTypes?: {productType: string, count: number}[];
    interactionsByType?: {type: string, count: number}[];
  }> {
    try {
      // Build filter conditions first
      const conditions = [];
      
      if (type) {
        conditions.push(eq(userInteractions.interactionType, type));
      }
      
      if (startDate) {
        conditions.push(sql`${userInteractions.timestamp} >= ${startDate}`);
      }
      
      if (endDate) {
        conditions.push(sql`${userInteractions.timestamp} <= ${endDate}`);
      }
      
      // Get total count with conditions
      let countQuery = db.select({ count: count() }).from(userInteractions);
      if (conditions.length > 0) {
        countQuery = countQuery.where(and(...conditions));
      }
      const [countResult] = await countQuery;
      
      // Calculate average duration for interactions with duration data
      let durationQuery = db
        .select({
          avgDuration: sql`AVG(${userInteractions.durationSeconds})::float`
        })
        .from(userInteractions)
        .where(sql`${userInteractions.durationSeconds} IS NOT NULL`);
      
      if (conditions.length > 0) {
        durationQuery = durationQuery.where(and(...conditions));
      }
      const [durationResult] = await durationQuery;
      
      // Get top product types
      let productTypesQuery = db
        .select({
          productType: userInteractions.productType,
          count: count()
        })
        .from(userInteractions)
        .where(sql`${userInteractions.productType} IS NOT NULL`);
      
      if (conditions.length > 0) {
        productTypesQuery = productTypesQuery.where(and(...conditions));
      }
      
      const topProductTypes = await productTypesQuery
        .groupBy(userInteractions.productType)
        .orderBy(desc(count()))
        .limit(5);
      
      // Get interactions grouped by type
      let interactionsByTypeQuery = db
        .select({
          type: userInteractions.interactionType,
          count: count()
        })
        .from(userInteractions);
      
      // Only apply date filters to the interactions by type query
      const dateConditions = conditions.filter(c => 
        c.toString().includes('timestamp'));
      
      if (dateConditions.length > 0) {
        interactionsByTypeQuery = interactionsByTypeQuery.where(and(...dateConditions));
      }
      
      const interactionsByType = await interactionsByTypeQuery
        .groupBy(userInteractions.interactionType)
        .orderBy(desc(count()));
      
      return {
        count: countResult?.count || 0,
        avgDuration: durationResult?.avgDuration as number | undefined,
        topProductTypes: topProductTypes.map(pt => ({ 
          productType: pt.productType || 'Unknown', 
          count: Number(pt.count) 
        })),
        interactionsByType: interactionsByType.map(it => ({ 
          type: it.type as string, 
          count: Number(it.count) 
        })),
      };
    } catch (error) {
      console.error("Error in getInteractionStats:", error);
      throw error;
    }
  }
  
  // AI Repair Analytics methods
  async trackRepairAnalytics(data: InsertRepairAnalytics): Promise<RepairAnalytics> {
    try {
      // Don't need to create the table as it's already defined in the schema
      // and should have been created with the correct column names via drizzle
      
      // Now perform the insert with the proper types and column names
      // For PostgreSQL array types, we need to use the array constructor syntax
      const result = await db.execute<{ 
        id: number, 
        repair_request_id: number,
        product_type: string,
        issue_description: string,
        prompt_tokens: number,
        completion_tokens: number,
        response_time_ms: number, // Fixed column name to match schema
        consistency_score: string,
        ai_response_summary: string,
        inconsistency_flags: string[],
        timestamp: Date
      }>(
        sql`
        INSERT INTO repair_analytics 
          (repair_request_id, product_type, issue_description, prompt_tokens, 
           completion_tokens, response_time_ms, consistency_score, ai_response_summary, 
           inconsistency_flags, timestamp) 
        VALUES 
          (
            ${data.repairRequestId}, 
            ${data.productType}, 
            ${data.issueDescription}, 
            ${data.promptTokens}, 
            ${data.completionTokens}, 
            ${data.responseTime}, 
            ${data.consistencyScore}, 
            ${data.aiResponseSummary}, 
            ARRAY[${data.inconsistencyFlags ? data.inconsistencyFlags.map(flag => sql`${flag}`).join(sql`, `) : sql``}]::text[], 
            CURRENT_TIMESTAMP
          )
        RETURNING *
        `
      );
      
      if (!result.rows || result.rows.length === 0) {
        throw new Error("Failed to insert repair analytics data");
      }
      
      // Return the created analytics record
      const row = result.rows[0];
      // The inconsistency_flags is already a string array in PostgreSQL
      const inconsistencyFlags = row.inconsistency_flags || [];
        
      // Convert to the expected RepairAnalytics format
      const analytics: RepairAnalytics = {
        id: row.id,
        repairRequestId: row.repair_request_id,
        productType: row.product_type,
        issueDescription: row.issue_description,
        promptTokens: row.prompt_tokens,
        completionTokens: row.completion_tokens,
        responseTime: row.response_time_ms, // Fixed to match schema column name
        consistencyScore: Number(row.consistency_score),
        aiResponseSummary: row.ai_response_summary,
        inconsistencyFlags: inconsistencyFlags,
        // Use timestamp for the database column
        timestamp: row.timestamp || new Date()
      };
      
      return analytics;
    } catch (error) {
      console.error("Error in trackRepairAnalytics:", error);
      throw error;
    }
  }

  // Product Knowledge Base methods
  async createProduct(productData: InsertProduct): Promise<Product> {
    try {
      const [product] = await db
        .insert(products)
        .values(productData)
        .returning();
      return product;
    } catch (error) {
      console.error("Error in createProduct:", error);
      throw error;
    }
  }

  async getProduct(id: number): Promise<Product | undefined> {
    try {
      const [product] = await db
        .select()
        .from(products)
        .where(eq(products.id, id));
      return product;
    } catch (error) {
      console.error("Error in getProduct:", error);
      throw error;
    }
  }

  async getProductsByCategory(category: string): Promise<Product[]> {
    try {
      return await db
        .select()
        .from(products)
        .where(eq(products.category, category));
    } catch (error) {
      console.error("Error in getProductsByCategory:", error);
      throw error;
    }
  }

  async updateProduct(id: number, data: Partial<Product>): Promise<Product> {
    try {
      const [product] = await db
        .update(products)
        .set(data)
        .where(eq(products.id, id))
        .returning();
      return product;
    } catch (error) {
      console.error("Error in updateProduct:", error);
      throw error;
    }
  }

  // Diagnostic Question Trees methods
  async createDiagnosticQuestionTree(treeData: InsertDiagnosticQuestionTree): Promise<DiagnosticQuestionTree> {
    try {
      const [tree] = await db
        .insert(diagnosticQuestionTrees)
        .values(treeData)
        .returning();
      return tree;
    } catch (error) {
      console.error("Error in createDiagnosticQuestionTree:", error);
      throw error;
    }
  }

  async getDiagnosticQuestionTree(id: number): Promise<DiagnosticQuestionTree | undefined> {
    try {
      const [tree] = await db
        .select()
        .from(diagnosticQuestionTrees)
        .where(eq(diagnosticQuestionTrees.id, id));
      return tree;
    } catch (error) {
      console.error("Error in getDiagnosticQuestionTree:", error);
      throw error;
    }
  }

  async getDiagnosticQuestionTreeByCategory(category: string, subCategory?: string): Promise<DiagnosticQuestionTree | undefined> {
    try {
      // Create base query
      let query = db
        .select()
        .from(diagnosticQuestionTrees)
        .where(eq(diagnosticQuestionTrees.productCategory, category))
        .orderBy(desc(diagnosticQuestionTrees.version));
        
      // If subCategory is provided, refine the query
      if (subCategory) {
        query = query.where(eq(diagnosticQuestionTrees.subCategory, subCategory));
      }
      
      // Get the first result (most recent version)
      const results = await query.limit(1);
      return results.length > 0 ? results[0] : undefined;
    } catch (error) {
      console.error("Error in getDiagnosticQuestionTreeByCategory:", error);
      throw error;
    }
  }

  async updateDiagnosticQuestionTree(id: number, data: Partial<DiagnosticQuestionTree>): Promise<DiagnosticQuestionTree> {
    try {
      const [tree] = await db
        .update(diagnosticQuestionTrees)
        .set(data)
        .where(eq(diagnosticQuestionTrees.id, id))
        .returning();
      return tree;
    } catch (error) {
      console.error("Error in updateDiagnosticQuestionTree:", error);
      throw error;
    }
  }

  // Failure Patterns methods
  async createFailurePattern(patternData: InsertFailurePattern): Promise<FailurePattern> {
    try {
      const [pattern] = await db
        .insert(failurePatterns)
        .values(patternData)
        .returning();
      return pattern;
    } catch (error) {
      console.error("Error in createFailurePattern:", error);
      throw error;
    }
  }

  async getFailurePattern(id: number): Promise<FailurePattern | undefined> {
    try {
      const [pattern] = await db
        .select()
        .from(failurePatterns)
        .where(eq(failurePatterns.id, id));
      return pattern;
    } catch (error) {
      console.error("Error in getFailurePattern:", error);
      throw error;
    }
  }

  async getFailurePatternsByCategory(category: string): Promise<FailurePattern[]> {
    try {
      return await db
        .select()
        .from(failurePatterns)
        .where(eq(failurePatterns.productCategory, category));
    } catch (error) {
      console.error("Error in getFailurePatternsByCategory:", error);
      throw error;
    }
  }

  async getFailurePatternsBySymptoms(symptoms: string[]): Promise<FailurePattern[]> {
    try {
      // For each symptom, we'll create a query for patterns that contain that symptom
      // This is a simple implementation - for a more sophisticated search, you might 
      // want to consider using a PostgreSQL full-text search or a more complex query
      
      // Get all patterns first
      const allPatterns = await db.select().from(failurePatterns);
      
      // Filter patterns that match any of the symptoms
      // This is done in-memory since SQL array contains queries can be complex
      const matchingPatterns = allPatterns.filter(pattern => {
        if (!pattern.symptoms) return false;
        
        // Check if any of the pattern's symptoms match any of the input symptoms
        return pattern.symptoms.some(patternSymptom => 
          symptoms.some(inputSymptom => 
            patternSymptom.toLowerCase().includes(inputSymptom.toLowerCase())
          )
        );
      });
      
      return matchingPatterns;
    } catch (error) {
      console.error("Error in getFailurePatternsBySymptoms:", error);
      throw error;
    }
  }

  // Repair History methods
  async createRepairHistory(historyData: InsertRepairHistory): Promise<RepairHistory> {
    try {
      const [history] = await db
        .insert(repairHistory)
        .values(historyData)
        .returning();
      return history;
    } catch (error) {
      console.error("Error in createRepairHistory:", error);
      throw error;
    }
  }

  async getRepairHistoryByRequestId(repairRequestId: number): Promise<RepairHistory | undefined> {
    try {
      const [history] = await db
        .select()
        .from(repairHistory)
        .where(eq(repairHistory.repairRequestId, repairRequestId));
      return history;
    } catch (error) {
      console.error("Error in getRepairHistoryByRequestId:", error);
      throw error;
    }
  }

  async updateRepairHistory(id: number, data: Partial<RepairHistory>): Promise<RepairHistory> {
    try {
      const [history] = await db
        .update(repairHistory)
        .set(data)
        .where(eq(repairHistory.id, id))
        .returning();
      return history;
    } catch (error) {
      console.error("Error in updateRepairHistory:", error);
      throw error;
    }
  }

  // Storage Files Implementation
  async createStorageFile(fileData: InsertStorageFile): Promise<StorageFile> {
    try {
      const [file] = await db
        .insert(storageFiles)
        .values(fileData)
        .returning();
      return file;
    } catch (error) {
      console.error("Error in createStorageFile:", error);
      throw error;
    }
  }

  async getStorageFilesByUser(userId: number): Promise<StorageFile[]> {
    try {
      return await db
        .select()
        .from(storageFiles)
        .where(eq(storageFiles.userId, userId))
        .orderBy(desc(storageFiles.createdAt));
    } catch (error) {
      console.error("Error in getStorageFilesByUser:", error);
      throw error;
    }
  }

  async getStorageFile(id: number): Promise<StorageFile | undefined> {
    try {
      const [file] = await db
        .select()
        .from(storageFiles)
        .where(eq(storageFiles.id, id));
      return file;
    } catch (error) {
      console.error("Error in getStorageFile:", error);
      throw error;
    }
  }

  async getStorageFileByUrl(url: string): Promise<StorageFile | undefined> {
    try {
      const [file] = await db
        .select()
        .from(storageFiles)
        .where(eq(storageFiles.fileUrl, url));
      return file;
    } catch (error) {
      console.error("Error in getStorageFileByUrl:", error);
      throw error;
    }
  }

  async deleteStorageFile(id: number): Promise<void> {
    try {
      await db
        .delete(storageFiles)
        .where(eq(storageFiles.id, id));
    } catch (error) {
      console.error("Error in deleteStorageFile:", error);
      throw error;
    }
  }

  async deleteStorageFileByUrl(url: string): Promise<void> {
    try {
      await db
        .delete(storageFiles)
        .where(eq(storageFiles.fileUrl, url));
    } catch (error) {
      console.error("Error in deleteStorageFileByUrl:", error);
      throw error;
    }
  }
  
  // Repair Journey Management Methods
  
  async createRepairSession(sessionData: InsertRepairSession): Promise<RepairSession> {
    try {
      console.log("Creating repair session in database:", sessionData);
      const [session] = await db
        .insert(repairSessions)
        .values(sessionData)
        .returning();
      
      console.log("Repair session created successfully:", { id: session.id });
      return session;
    } catch (error) {
      console.error("Error in createRepairSession:", error);
      throw error;
    }
  }
  
  async getRepairSession(id: number): Promise<RepairSession | undefined> {
    try {
      const [session] = await db
        .select()
        .from(repairSessions)
        .where(eq(repairSessions.id, id));
      
      return session;
    } catch (error) {
      console.error("Error in getRepairSession:", error);
      throw error;
    }
  }
  
  async getRepairSessionsByUserId(userId: number): Promise<RepairSession[]> {
    try {
      return await db
        .select()
        .from(repairSessions)
        .where(eq(repairSessions.userId, userId))
        .orderBy(desc(repairSessions.createdAt));
    } catch (error) {
      console.error("Error in getRepairSessionsByUserId:", error);
      throw error;
    }
  }
  
  async updateRepairSession(id: number, data: Partial<RepairSession>): Promise<RepairSession> {
    try {
      const [updatedSession] = await db
        .update(repairSessions)
        .set({
          ...data,
          updatedAt: new Date()
        })
        .where(eq(repairSessions.id, id))
        .returning();
      
      return updatedSession;
    } catch (error) {
      console.error("Error in updateRepairSession:", error);
      throw error;
    }
  }
  
  async deleteRepairSession(id: number): Promise<void> {
    try {
      // Delete any associated files first
      await db
        .delete(repairSessionFiles)
        .where(eq(repairSessionFiles.repairSessionId, id));
      
      // Then delete the session
      await db
        .delete(repairSessions)
        .where(eq(repairSessions.id, id));
      
      console.log("Repair session and related files deleted successfully:", id);
    } catch (error) {
      console.error("Error in deleteRepairSession:", error);
      throw error;
    }
  }
  
  // Repair Session Files Methods
  
  async createRepairSessionFile(fileData: any): Promise<RepairSessionFile> {
    try {
      const [file] = await db
        .insert(repairSessionFiles)
        .values(fileData)
        .returning();
      
      return file;
    } catch (error) {
      console.error("Error in createRepairSessionFile:", error);
      throw error;
    }
  }
  
  async getRepairSessionFile(id: number): Promise<RepairSessionFile | undefined> {
    try {
      const [file] = await db
        .select()
        .from(repairSessionFiles)
        .where(eq(repairSessionFiles.id, id));
      
      return file;
    } catch (error) {
      console.error("Error in getRepairSessionFile:", error);
      throw error;
    }
  }
  
  async getRepairSessionFiles(sessionId: number): Promise<RepairSessionFile[]> {
    try {
      return await db
        .select()
        .from(repairSessionFiles)
        .where(eq(repairSessionFiles.repairSessionId, sessionId))
        .orderBy(desc(repairSessionFiles.createdAt));
    } catch (error) {
      console.error("Error in getRepairSessionFiles:", error);
      throw error;
    }
  }
  
  async deleteRepairSessionFile(id: number): Promise<void> {
    try {
      await db
        .delete(repairSessionFiles)
        .where(eq(repairSessionFiles.id, id));
    } catch (error) {
      console.error("Error in deleteRepairSessionFile:", error);
      throw error;
    }
  }
}

export const storage = new DatabaseStorage();
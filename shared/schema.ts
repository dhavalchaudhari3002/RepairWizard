import { pgTable, text, serial, integer, timestamp, boolean, decimal, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table with auth and email verification
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  password: text("password").notNull(),
  role: text("role", { enum: ["customer", "admin"] }).notNull(), // Added "admin" role
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  verificationToken: text("verification_token"),
  tosAccepted: boolean("tos_accepted").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  profileData: text("profile_data"), // Store all profile data as JSON in SQL database
});

// Create a base schema for common fields
const baseUserSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
});

// Update the insert schema with new validations
export const insertUserSchema = createInsertSchema(users)
  .pick({
    firstName: true,
    lastName: true,
    password: true,
    role: true,
    email: true,
    tosAccepted: true,
  })
  .extend({
    firstName: z.string()
      .min(2, "First name must be at least 2 characters")
      .max(50, "First name cannot exceed 50 characters")
      .regex(/^[a-zA-Z\s-']+$/, "First name can only contain letters, spaces, hyphens and apostrophes"),
    lastName: z.string()
      .min(2, "Last name must be at least 2 characters")
      .max(50, "Last name cannot exceed 50 characters")
      .regex(/^[a-zA-Z\s-']+$/, "Last name can only contain letters, spaces, hyphens and apostrophes"),
    confirmPassword: z.string(),
    email: baseUserSchema.shape.email,
    password: baseUserSchema.shape.password,
    role: z.enum(["customer", "admin"]), // Added "admin" role
    tosAccepted: z.boolean()
      .refine((val) => val === true, "You must accept the Terms of Service"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

// Export login schema separately using the base schema
export const loginSchema = baseUserSchema;

// Removed the Repair Shops and Repairers tables

// Updated repair requests to focus on AI assistance only
export const repairRequests = pgTable("repair_requests", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").references(() => users.id), // Made nullable
  productType: text("product_type").notNull(),
  issueDescription: text("issue_description").notNull(),
  imageUrl: text("image_url"), // Keep for backward compatibility
  imageUrls: text("image_urls").array(), // New field for multiple images
  audioUrl: text("audio_url"), // New field for sound recording
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

export const insertRepairRequestSchema = createInsertSchema(repairRequests)
  .pick({
    productType: true,
    issueDescription: true,
    imageUrl: true,
    imageUrls: true,
    audioUrl: true,
    customerId: true, // Add customerId to the schema
  })
  .extend({
    productType: z.string().min(1, "Product type is required"),
    issueDescription: z.string().min(1, "Issue description is required"),
    imageUrl: z.string().optional(),
    imageUrls: z.array(z.string()).optional().default([]),
    audioUrl: z.string().optional(),
    customerId: z.number().optional(), // Make it optional since it's added by the server
  });

// Update the insert schema for notifications
export const insertNotificationSchema = createInsertSchema(notifications)
  .omit({
    id: true,
    createdAt: true,
  })
  .extend({
    title: z.string().min(1, "Title is required"),
    message: z.string().min(1, "Message is required"),
    type: z.enum(["repair_update", "system", "message"]),
    relatedEntityId: z.number().optional(),
    read: z.boolean().optional().default(false),
  });

// Errors table for tracking application errors with enhanced context
export const errors = pgTable("errors", {
  id: serial("id").primaryKey(),
  message: text("message").notNull(),
  stack: text("stack"),
  type: text("type").notNull(),
  userId: integer("user_id").references(() => users.id),
  // Enhanced context data
  path: text("path"), // URL path where the error occurred
  requestId: text("request_id"), // Unique ID for the request (for correlation)
  environment: text("environment"), // e.g., 'production', 'development', 'staging'
  version: text("version"), // Application version
  userAgent: text("user_agent"), // Browser/client info
  severity: text("severity", { enum: ["low", "medium", "high", "critical"] }).default("medium"), // Error severity
  component: text("component"), // Component/module where error occurred
  metadata: jsonb("metadata"), // Additional structured data about the error
  resolved: boolean("resolved").default(false), // Whether the error has been resolved
  // Maintain the original timestamp for error occurrence
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

// Repair request analytics for monitoring request patterns and AI response quality
export const repairAnalytics = pgTable("repair_analytics", {
  id: serial("id").primaryKey(),
  repairRequestId: integer("repair_request_id").references(() => repairRequests.id).notNull(),
  productType: text("product_type").notNull(),
  issueDescription: text("issue_description").notNull(),
  promptTokens: integer("prompt_tokens").notNull(),
  completionTokens: integer("completion_tokens").notNull(),
  responseTime: integer("response_time_ms").notNull(), // in milliseconds
  consistencyScore: decimal("consistency_score"), // calculated score for consistency analysis
  userFeedback: integer("user_feedback"), // user rating of response quality (1-5)
  feedbackNotes: text("feedback_notes"), // user comments on response quality
  aiResponseSummary: text("ai_response_summary"), // summary of AI response for analysis
  inconsistencyFlags: text("inconsistency_flags").array(), // flags for potential inconsistencies
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

// Type exports
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type LoginData = z.infer<typeof loginSchema>;

export type InsertRepairRequest = z.infer<typeof insertRepairRequestSchema>;
export type RepairRequest = typeof repairRequests.$inferSelect;

export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

export type Error = typeof errors.$inferSelect;

// Create an enhanced error insert schema with validation
export const insertErrorSchema = createInsertSchema(errors)
  .omit({
    id: true,
    timestamp: true,
  })
  .extend({
    message: z.string().min(1, "Error message is required"),
    type: z.string().min(1, "Error type is required"),
    stack: z.string().optional(),
    userId: z.number().optional(),
    path: z.string().optional(),
    requestId: z.string().optional(),
    environment: z.enum(["development", "testing", "staging", "production"]).optional(),
    version: z.string().optional(),
    userAgent: z.string().optional(),
    severity: z.enum(["low", "medium", "high", "critical"]).default("medium"),
    component: z.string().optional(),
    metadata: z.record(z.any()).optional(),
    resolved: z.boolean().default(false),
  });

export type InsertError = z.infer<typeof insertErrorSchema>;

// Create insert schema for repair analytics
export const insertRepairAnalyticsSchema = createInsertSchema(repairAnalytics)
  .omit({
    id: true,
    timestamp: true,
  })
  .extend({
    consistencyScore: z.number().min(0).max(1).optional(),
    userFeedback: z.number().min(1).max(5).optional(),
    feedbackNotes: z.string().optional(),
    inconsistencyFlags: z.array(z.string()).optional(),
  });

export type RepairAnalytics = typeof repairAnalytics.$inferSelect;
export type InsertRepairAnalytics = z.infer<typeof insertRepairAnalyticsSchema>;


// New tables for product recommendations

// Products table
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(), // e.g., "electronics", "furniture", "appliance", "vehicle"
  brand: text("brand").notNull(),
  imageUrl: text("image_url"),
  specs: jsonb("specifications"), // Technical specifications as JSON
  commonFailurePoints: jsonb("common_failure_points"), // Common parts that fail for this product type
  maintenanceTips: jsonb("maintenance_tips"), // Product-specific maintenance suggestions
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Product prices across platforms
export const productPrices = pgTable("product_prices", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").references(() => products.id).notNull(),
  platform: text("platform").notNull(), // e.g., "Amazon", "eBay", etc.
  price: decimal("price").notNull(),
  currency: text("currency").default("USD").notNull(),
  url: text("url").notNull(), // Link to the product
  inStock: boolean("in_stock").default(true).notNull(),
  lastChecked: timestamp("last_checked").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Product reviews aggregated from various platforms
export const productReviews = pgTable("product_reviews", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").references(() => products.id).notNull(),
  platform: text("platform").notNull(),
  rating: decimal("rating").notNull(), // Average rating
  reviewCount: integer("review_count").notNull(),
  positivePoints: text("positive_points").array(), // Key positive points
  negativePoints: text("negative_points").array(), // Key negative points
  lastUpdated: timestamp("last_updated").notNull(),
});

// Product recommendations based on repair requests
export const productRecommendations = pgTable("product_recommendations", {
  id: serial("id").primaryKey(),
  repairRequestId: integer("repair_request_id").references(() => repairRequests.id).notNull(),
  productId: integer("product_id").references(() => products.id).notNull(),
  reason: text("reason").notNull(), // Why this product is recommended
  priority: integer("priority").notNull(), // Order of recommendation
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Insert schemas for new tables
export const insertProductSchema = createInsertSchema(products)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    name: z.string().min(1, "Product name is required"),
    description: z.string().min(1, "Description is required"),
    category: z.string().min(1, "Category is required"),
    brand: z.string().min(1, "Brand is required"),
    imageUrl: z.string().url().optional(),
    specs: z.record(z.string(), z.any()).optional(),
  });

export const insertProductPriceSchema = createInsertSchema(productPrices)
  .omit({
    id: true,
    createdAt: true,
  })
  .extend({
    platform: z.string().min(1, "Platform is required"),
    price: z.number().positive("Price must be positive"),
    url: z.string().url("Must be a valid URL"),
    currency: z.string().length(3, "Must be a valid currency code"),
  });

export const insertProductReviewSchema = createInsertSchema(productReviews)
  .omit({
    id: true,
  })
  .extend({
    rating: z.number().min(0).max(5, "Rating must be between 0 and 5"),
    reviewCount: z.number().positive("Review count must be positive"),
    positivePoints: z.array(z.string()),
    negativePoints: z.array(z.string()),
  });

export const insertProductRecommendationSchema = createInsertSchema(productRecommendations)
  .omit({
    id: true,
    createdAt: true,
  })
  .extend({
    reason: z.string().min(1, "Recommendation reason is required"),
    priority: z.number().int().positive("Priority must be a positive integer"),
  });

// Type exports for new tables
export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;

export type ProductPrice = typeof productPrices.$inferSelect;
export type InsertProductPrice = z.infer<typeof insertProductPriceSchema>;

export type ProductReview = typeof productReviews.$inferSelect;
export type InsertProductReview = z.infer<typeof insertProductReviewSchema>;

export type ProductRecommendation = typeof productRecommendations.$inferSelect;
export type InsertProductRecommendation = z.infer<typeof insertProductRecommendationSchema>;

// Diagnostic Question Trees - For capturing branching question logic
export const diagnosticQuestionTrees = pgTable("diagnostic_question_trees", {
  id: serial("id").primaryKey(),
  productCategory: text("product_category").notNull(), // e.g., "electronics", "furniture", "appliance", "vehicle"
  subCategory: text("sub_category"), // Optional subcategory like "laptop", "refrigerator", "car"
  version: integer("version").notNull().default(1), // For tracking updates to the question tree
  treeData: jsonb("tree_data").notNull(), // JSON structure with questions, answer choices, and next question IDs
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Common failure patterns with symptoms and causes
export const failurePatterns = pgTable("failure_patterns", {
  id: serial("id").primaryKey(),
  productCategory: text("product_category").notNull(),
  title: text("title").notNull(), // Name of the failure pattern
  symptoms: text("symptoms").array(), // Observable symptoms
  causes: text("causes").array(), // Common causes
  telltaleAudioCues: text("telltale_audio_cues").array(), // Specific sounds that indicate this failure
  visualIndicators: text("visual_indicators").array(), // What to look for in images
  recommendedQuestions: text("recommended_questions").array(), // Questions to ask to confirm this failure
  urgencyLevel: text("urgency_level", { enum: ["low", "medium", "high", "critical"] }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Product repair history for learning from past repairs
export const repairHistory = pgTable("repair_history", {
  id: serial("id").primaryKey(),
  repairRequestId: integer("repair_request_id").references(() => repairRequests.id).notNull(),
  diagnosisAccuracy: decimal("diagnosis_accuracy"), // How accurate the initial diagnosis was (0-1)
  actualProblem: text("actual_problem"), // What the problem turned out to be
  solutionEffectiveness: decimal("solution_effectiveness"), // How effective the solution was (0-1)
  followupNotes: text("followup_notes"), // Notes from after the repair
  userReported: boolean("user_reported").default(false), // Whether this data came from user feedback
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// User Interaction Tracking
export const userInteractions = pgTable("user_interactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  repairRequestId: integer("repair_request_id").references(() => repairRequests.id),
  interactionType: text("interaction_type", { 
    enum: ["view_guide", "view_step", "ask_question", "skip_step", "complete_guide", "abandon_guide", "click_product", "search_video", "diagnostic_generated", "diagnostic_feedback", "diagnostic_questions_answered", "guide_updated_with_answers", "question_effective", "question_ineffective", "questions_led_to_guide"]
  }).notNull(),
  guideStep: integer("guide_step"), // For step-specific interactions
  guideTitle: text("guide_title"), // Store the guide title for easier reporting
  productType: text("product_type"), // Store the product type for analytics
  durationSeconds: integer("duration_seconds"), // Time spent on a particular step
  metadata: jsonb("metadata"), // Additional data like search terms, clicked products
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const insertUserInteractionSchema = createInsertSchema(userInteractions)
  .omit({
    id: true,
    timestamp: true,
  })
  .extend({
    metadata: z.record(z.any()).optional(),
  });

export type UserInteraction = typeof userInteractions.$inferSelect;
export type InsertUserInteraction = z.infer<typeof insertUserInteractionSchema>;

// Create insert schema for diagnostic question trees
export const insertDiagnosticQuestionTreeSchema = createInsertSchema(diagnosticQuestionTrees)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    productCategory: z.string().min(1, "Product category is required"),
    subCategory: z.string().optional(),
    version: z.number().int().positive().optional(),
    treeData: z.record(z.any()).refine(data => {
      // Validate that the tree structure is correct
      // This is a simple validation; you may want to add more detailed validation based on your structure
      return typeof data === 'object' && data !== null;
    }, {
      message: "Tree data must be a valid JSON object with the correct question tree structure"
    }),
  });

// Create insert schema for failure patterns
export const insertFailurePatternSchema = createInsertSchema(failurePatterns)
  .omit({
    id: true,
    createdAt: true,
  })
  .extend({
    productCategory: z.string().min(1, "Product category is required"),
    title: z.string().min(1, "Title is required"),
    symptoms: z.array(z.string()),
    causes: z.array(z.string()),
    telltaleAudioCues: z.array(z.string()).optional().default([]),
    visualIndicators: z.array(z.string()).optional().default([]),
    recommendedQuestions: z.array(z.string()).optional().default([]),
    urgencyLevel: z.enum(["low", "medium", "high", "critical"]),
  });

// Create insert schema for repair history
export const insertRepairHistorySchema = createInsertSchema(repairHistory)
  .omit({
    id: true,
    createdAt: true,
  })
  .extend({
    diagnosisAccuracy: z.number().min(0).max(1).optional(),
    actualProblem: z.string().min(1, "Actual problem is required"),
    solutionEffectiveness: z.number().min(0).max(1).optional(),
    followupNotes: z.string().optional(),
    userReported: z.boolean().optional().default(false),
  });

// Type exports for new schemas
export type DiagnosticQuestionTree = typeof diagnosticQuestionTrees.$inferSelect;
export type InsertDiagnosticQuestionTree = z.infer<typeof insertDiagnosticQuestionTreeSchema>;

export type FailurePattern = typeof failurePatterns.$inferSelect;
export type InsertFailurePattern = z.infer<typeof insertFailurePatternSchema>;

export type RepairHistory = typeof repairHistory.$inferSelect;
export type InsertRepairHistory = z.infer<typeof insertRepairHistorySchema>;

// Storage files table to track uploaded files
export const storageFiles = pgTable("storage_files", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  fileName: text("file_name").notNull(),
  originalName: text("original_name").notNull(),
  fileUrl: text("file_url").notNull(),
  fileSize: integer("file_size").notNull(),
  contentType: text("content_type").notNull(),
  folder: text("folder").notNull(),
  metadata: jsonb("metadata").default({}).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Create insert schema for storage files
export const insertStorageFileSchema = createInsertSchema(storageFiles)
  .omit({
    id: true,
    createdAt: true,
  });

export type StorageFile = typeof storageFiles.$inferSelect;
export type InsertStorageFile = z.infer<typeof insertStorageFileSchema>;

// Repair Sessions table to track complete repair journeys
export const repairSessions = pgTable("repair_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  deviceType: text("device_type").notNull(),
  deviceBrand: text("device_brand").notNull(),
  deviceModel: text("device_model"),
  issueDescription: text("issue_description").notNull(),
  symptoms: text("symptoms").array(),
  diagnosticResults: jsonb("diagnostic_results"),
  issueConfirmation: jsonb("issue_confirmation"),
  repairGuide: jsonb("repair_guide"),
  metadataUrl: text("metadata_url"),  // URL to the metadata JSON in Google Cloud Storage
  status: text("status").notNull().default("started"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Create insert schema for repair sessions
export const insertRepairSessionSchema = createInsertSchema(repairSessions)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  });

// Repair Session Files table to link files to repair sessions
export const repairSessionFiles = pgTable("repair_session_files", {
  id: serial("id").primaryKey(),
  repairSessionId: integer("repair_session_id").references(() => repairSessions.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  fileName: text("file_name").notNull(),
  fileUrl: text("file_url").notNull(),
  contentType: text("content_type").notNull(),
  filePurpose: text("file_purpose").notNull(),
  stepName: text("step_name"),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Create insert schema for repair session files
export const insertRepairSessionFileSchema = createInsertSchema(repairSessionFiles)
  .omit({
    id: true,
    createdAt: true,
    uploadedAt: true,
  });

export type RepairSession = typeof repairSessions.$inferSelect;
export type InsertRepairSession = z.infer<typeof insertRepairSessionSchema>;
export type RepairSessionFile = typeof repairSessionFiles.$inferSelect;
export type InsertRepairSessionFile = z.infer<typeof insertRepairSessionFileSchema>;
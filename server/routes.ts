import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer } from 'ws';
import { WebSocket } from 'ws';
import { storage } from "./storage";
import { 
  insertRepairRequestSchema,
  insertUserInteractionSchema, 
  type User,
  type InsertUserInteraction
} from "@shared/schema";
import { generateMockEstimate } from "./mock-data";
import { getRepairAnswer, generateRepairGuide, generateRepairDiagnostic, type RepairDiagnostic } from "./services/openai";
import { setupAuth } from "./auth";
import type { IncomingMessage } from "http";
import { parse as parseCookie } from "cookie";
import { promisify } from "util";
import type { SessionData } from "express-session";
import { getProductRecommendations, updateProductPrices, updateProductReviews } from "./services/product-service";
import { setupRepairCostAPI } from "./ml-services/repair-cost-api";
import { 
  predictRepairCost, 
  getRepairDifficulty, 
  estimateRepairTime, 
  getIssuesAndRecommendations 
} from "./ml-services/repair-cost-model";
import { createBasicDiagnosticTree, treeToDbFormat } from "./utils/diagnostic-tree";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { googleCloudStorage } from "./services/google-cloud-storage";

declare module 'express-session' {
  interface SessionData {
    passport?: {
      user: number;
    };
  }
}

declare global {
  namespace Express {
    interface User {
      id: number;
      firstName: string;
      lastName: string;
      email: string;
      role: string;
    }
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  console.log("Created HTTP server instance");

  setupAuth(app);
  console.log("Authentication setup complete");

  // Add a simple ping endpoint for debugging
  app.get('/api/ping', (req, res) => {
    res.status(200).json({ 
      message: 'pong', 
      timestamp: new Date().toISOString(),
      server: 'express'
    });
  });

  const wss = new WebSocketServer({ 
    server: httpServer,
    path: '/ws',
    clientTracking: true,
    // TypeScript doesn't recognize these WebSocket options in its types
    // but they're supported by the ws library
    ...(({
      // Add ping/pong to keep connections alive
      pingInterval: 30000,
      pingTimeout: 5000
    }) as any)
  });
  console.log("WebSocket server initialized");

  const clients = new Map<number, WebSocket>();

  const getUserFromRequest = async (req: IncomingMessage): Promise<User | null> => {
    try {
      const cookieHeader = req.headers.cookie;
      if (!cookieHeader) {
        console.log('No cookie header found');
        return null;
      }

      const cookies = parseCookie(cookieHeader);
      const sessionId = cookies['connect.sid'];
      if (!sessionId) {
        console.log('No session ID found in cookies');
        return null;
      }

      // Clean the session ID - remove 's:' prefix and signature
      const actualSessionId = sessionId.split('.')[0].slice(2);

      // Get session from store
      const getSession = promisify(storage.sessionStore.get.bind(storage.sessionStore));
      const session = await getSession(actualSessionId) as SessionData;

      if (!session?.passport?.user) {
        console.log('No user found in session');
        return null;
      }

      const user = await storage.getUser(session.passport.user);
      if (!user) {
        console.log('User not found in database');
        return null;
      }

      console.log('Successfully authenticated user:', user.id);
      return user;
    } catch (error) {
      console.error('Error in getUserFromRequest:', error);
      return null;
    }
  };

  wss.on('connection', async (ws, req) => {
    console.log('New WebSocket connection attempt');

    try {
      const user = await getUserFromRequest(req);

      if (user) {
        console.log(`Authenticated WebSocket connection for user ${user.id}`);
        // Store the WebSocket connection for this user
        clients.set(user.id, ws);

        ws.on('message', (message) => {
          try {
            const data = JSON.parse(message.toString());
            console.log(`Message from user ${user.id}:`, data);

            // Handle ping messages for connection health check
            if (data.type === 'ping') {
              ws.send(JSON.stringify({
                type: 'ping',
                timestamp: new Date().toISOString()
              }));
            }
          } catch (error) {
            console.error(`Error parsing message from user ${user.id}:`, error);
          }
        });

        ws.on('error', (error) => {
          console.error(`WebSocket error for user ${user.id}:`, error);
        });

        ws.on('close', () => {
          console.log(`Client disconnected for user ${user.id}`);
          clients.delete(user.id);
        });

        // Send initial connection success message
        ws.send(JSON.stringify({
          type: 'connection',
          status: 'connected',
          userId: user.id,
          timestamp: new Date().toISOString()
        }));
      } else {
        // For development, allow unauthenticated connections but with limited functionality
        console.log('Allowing connection without authentication temporarily');

        ws.on('message', (message) => {
          try {
            const data = JSON.parse(message.toString());
            console.log('Message from unauthenticated client:', data);

            // Handle ping messages for connection health check
            if (data.type === 'ping') {
              ws.send(JSON.stringify({
                type: 'ping',
                timestamp: new Date().toISOString()
              }));
            }
          } catch (error) {
            console.error('Error parsing message from unauthenticated client:', error);
          }
        });

        ws.on('error', (error) => {
          console.error('WebSocket error:', error);
        });

        ws.on('close', () => {
          console.log('Client disconnected');
        });

        // Send initial connection success message (without user ID)
        ws.send(JSON.stringify({
          type: 'connection',
          status: 'connected',
          timestamp: new Date().toISOString()
        }));
      }
    } catch (error) {
      console.error('Error handling WebSocket connection:', error);
      ws.close(1011, 'Internal Server Error');
    }
  });

  // API Routes

  app.post("/api/repair-requests", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = req.user as Express.User;
      const data = insertRepairRequestSchema.parse(req.body);
      
      // Handle backwards compatibility
      // If imageUrl is provided but imageUrls is not, initialize imageUrls with imageUrl
      if (data.imageUrl && (!data.imageUrls || data.imageUrls.length === 0)) {
        data.imageUrls = [data.imageUrl];
      }
      
      // If we have imageUrls but no imageUrl, set imageUrl to the first image
      if (data.imageUrls && data.imageUrls.length > 0 && !data.imageUrl) {
        data.imageUrl = data.imageUrls[0];
      }
      
      const repairRequest = await storage.createRepairRequest({
        ...data,
        customerId: user.id
      });

      // We've removed the code that creates and sends the "Repair Request Created" notification
      // as per user request

      res.json(repairRequest);
    } catch (error) {
      console.error("Error creating repair request:", error);
      res.status(400).json({ error: "Invalid request data" });
    }
  });

  app.get("/api/repair-requests/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const repairRequest = await storage.getRepairRequest(id);
    if (!repairRequest) {
      res.status(404).json({ error: "Repair request not found" });
      return;
    }
    res.json(repairRequest);
  });

  app.get("/api/notifications", async (req, res) => {
    if (!req.isAuthenticated()) {
      console.log("Unauthorized notification request");
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const user = req.user as Express.User;
      console.log("Fetching notifications for user:", user.id);
      const notifications = await storage.getUserNotifications(user.id);
      console.log("Found notifications:", notifications.length);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ 
        error: "Failed to fetch notifications",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.patch("/api/notifications/:id/read", async (req, res) => {
    if (!req.isAuthenticated()) {
      console.log("Unauthorized attempt to mark notification as read");
      return res.status(401).json({ error: "Not authenticated" });
    }
    try {
      const notificationId = parseInt(req.params.id);
      if (isNaN(notificationId)) {
        return res.status(400).json({ error: "Invalid notification ID" });
      }

      await storage.markNotificationAsRead(notificationId);
      const user = req.user as Express.User;
      console.log(`Marked notification ${notificationId} as read for user ${user.id}`);
      res.sendStatus(200);
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ 
        error: "Failed to mark notification as read",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.patch("/api/notifications/read-all", async (req, res) => {
    if (!req.isAuthenticated()) {
      console.log("Unauthorized attempt to mark all notifications as read");
      return res.status(401).json({ error: "Not authenticated" });
    }
    try {
      const user = req.user as Express.User;
      await storage.markAllNotificationsAsRead(user.id);
      console.log(`Marked all notifications as read for user ${user.id}`);
      res.sendStatus(200);
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      res.status(500).json({ 
        error: "Failed to mark all notifications as read",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.patch("/api/repair-requests/:id/status", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const requestId = parseInt(req.params.id);
      const { status } = req.body;

      const repairRequest = await storage.updateRepairRequestStatus(requestId, status);

      if (repairRequest.customerId) {
        const notification = await storage.createNotification({
          userId: repairRequest.customerId,
          title: "Repair Status Updated",
          message: `Your repair request status has been updated to: ${status}`,
          type: "repair_update",
          relatedEntityId: requestId,
          read: false 
        });

        // Send real-time notification via WebSocket if client is connected
        const userWs = clients.get(repairRequest.customerId);
        if (userWs?.readyState === WebSocket.OPEN) {
          console.log(`Sending WebSocket notification to user ${repairRequest.customerId}`);
          userWs.send(JSON.stringify({
            type: 'notification',
            data: notification,
            timestamp: new Date().toISOString()
          }));
        } else {
          console.log(`User ${repairRequest.customerId} not connected via WebSocket`);
        }
      }

      res.json(repairRequest);
    } catch (error) {
      console.error("Error updating repair request status:", error);
      res.status(500).json({ error: "Failed to update repair request status" });
    }
  });

  app.get("/api/repair-requests/:id/estimate", async (req, res) => {
    const productType = req.query.productType as string;
    const useML = req.query.useML === 'true';
    console.log(`Generating estimate for product type: "${productType}", useML: ${useML}`);

    // Check if we should use ML-based estimation
    if (useML) {
      try {
        console.log('Using ML model for repair estimation');
        // Get cost prediction from ML model
        const prediction = await predictRepairCost(
          productType,
          'general_repair',
          0,  // Default parts cost
          1,  // Default labor hours
          'medium'  // Default complexity
        );

        // Get additional information
        const difficulty = getRepairDifficulty(prediction.predictedCost, 'medium');
        const timeEstimate = estimateRepairTime(prediction.predictedCost, 'medium');
        const { commonIssues, recommendations } = getIssuesAndRecommendations(productType);

        const mlEstimate = {
          costRange: prediction.costRange,
          timeEstimate,
          difficulty,
          commonIssues,
          recommendations,
          modelType: 'machine-learning',
          confidence: prediction.confidence
        };

        console.log(`Generated ML estimate: ${JSON.stringify(mlEstimate)}`);
        return res.json(mlEstimate);
      } catch (error) {
        console.warn('ML estimation failed, falling back to mock data:', error);
        // If ML fails, fall back to mock data silently
      }
    }

    // Fallback to mock data or if useML is false
    const estimate = generateMockEstimate(productType);
    console.log(`Generated rule-based estimate: ${JSON.stringify(estimate)}`);
    res.json({
      ...estimate,
      modelType: 'rule-based'
    });
  });

  app.post("/api/repair-questions", async (req, res) => {
    try {
      const { question, productType, issueDescription, imageUrl, imageUrls, context, currentStep, repairRequestId } = req.body;
      if (!question || !productType) {
        res.status(400).json({ error: "Question and product type are required" });
        return;
      }

      // Handle multiple images or fall back to single image
      const finalImageUrl = imageUrl || (imageUrls && imageUrls.length > 0 ? imageUrls[0] : undefined);
      
      // Get answer with conversation context and track analytics if repairRequestId is provided
      const answer = await getRepairAnswer({ 
        question, 
        productType, 
        issueDescription,
        imageUrl: finalImageUrl, 
        imageUrls: imageUrls, // Pass all images for potential future use
        context, 
        currentStep 
      }, repairRequestId);

      res.json(answer);
    } catch (error) {
      console.error("Error processing repair question:", error);
      res.status(500).json({ error: "Failed to get repair answer" });
    }
  });

  app.post("/api/repair-guides", async (req, res) => {
    try {
      const { productType, issue, repairRequestId, diagnosticInfo } = req.body;
      if (!productType || !issue) {
        res.status(400).json({ error: "Product type and issue are required" });
        return;
      }

      console.log("Generating repair guide for:", { 
        productType, 
        issue, 
        repairRequestId,
        hasDiagnosticInfo: !!diagnosticInfo 
      });
      
      // Pass the diagnostic info to the guide generation function
      const guide = await generateRepairGuide(productType, issue, repairRequestId, diagnosticInfo);

      if (!guide || !guide.title || !Array.isArray(guide.steps)) {
        console.error("Invalid guide generated:", guide);
        res.status(500).json({ error: "Generated guide is invalid" });
        return;
      }

      res.json(guide);
    } catch (error) {
      console.error("Error generating repair guide:", error);
      res.status(500).json({
        error: "Failed to generate repair guide",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.post("/api/repair-diagnostics", async (req, res) => {
    // Add request timeout
    const timeout = setTimeout(() => {
      res.status(504).json({ 
        error: "Request timeout",
        message: "Diagnostic analysis is taking too long" 
      });
    }, 15000); // 15 second timeout

    try {
      const { productType, issueDescription, repairRequestId, audioUrl } = req.body;
      if (!productType || !issueDescription) {
        clearTimeout(timeout);
        res.status(400).json({ error: "Product type and issue description are required" });
        return;
      }

      console.log("Generating repair diagnostic for:", { productType, issueDescription, repairRequestId, hasAudio: !!audioUrl });
      
      try {
        const diagnostic = await Promise.race([
          generateRepairDiagnostic(productType, issueDescription, repairRequestId, audioUrl),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error("Operation timeout")), 12000)
          )
        ]);
        
        clearTimeout(timeout);

        if (!diagnostic) {
          console.error("Empty diagnostic returned");
          res.status(500).json({ error: "No diagnostic information was generated" });
          return;
        }

        // Validate diagnostic properties
        if (!diagnostic || typeof diagnostic !== 'object') {
          console.error("Invalid diagnostic structure, not an object:", diagnostic);
          res.status(500).json({ error: "Generated diagnostic is invalid" });
          return;
        }

        // Type assertion to ensure TypeScript knows the structure
        const typedDiagnostic = diagnostic as RepairDiagnostic;

        // Ensure all required properties exist
        if (!typedDiagnostic.symptomInterpretation || !Array.isArray(typedDiagnostic.possibleCauses)) {
          console.error("Invalid diagnostic structure, missing required properties:", diagnostic);
          res.status(500).json({ error: "Generated diagnostic is missing required fields" });
          return;
        }

        // Ensure all arrays are present and valid
        const validatedDiagnostic: RepairDiagnostic = {
          symptomInterpretation: typedDiagnostic.symptomInterpretation || "",
          possibleCauses: Array.isArray(typedDiagnostic.possibleCauses) ? typedDiagnostic.possibleCauses : [],
          informationGaps: Array.isArray(typedDiagnostic.informationGaps) ? typedDiagnostic.informationGaps : [],
          diagnosticSteps: Array.isArray(typedDiagnostic.diagnosticSteps) ? typedDiagnostic.diagnosticSteps : [],
          likelySolutions: Array.isArray(typedDiagnostic.likelySolutions) ? typedDiagnostic.likelySolutions : [],
          safetyWarnings: Array.isArray(typedDiagnostic.safetyWarnings) ? typedDiagnostic.safetyWarnings : []
        };

        console.log("Sending validated diagnostic response to client");
        res.json(validatedDiagnostic);
      } catch (innerError) {
        clearTimeout(timeout);
        console.error("Error in diagnostic generation:", innerError);
        res.status(500).json({
          error: "Failed to generate repair diagnostic",
          details: innerError instanceof Error ? innerError.message : String(innerError)
        });
      }
    } catch (error) {
      clearTimeout(timeout);
      console.error("Error in repair diagnostic route:", error);
      res.status(500).json({
        error: "Failed to process diagnostic request",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Error tracking routes have been removed and replaced with Sentry integration

  // Add new routes for product recommendations
  app.get("/api/recommendations/:repairRequestId", async (req, res) => {
    try {
      const repairRequestId = parseInt(req.params.repairRequestId);
      if (isNaN(repairRequestId)) {
        return res.status(400).json({ error: "Invalid repair request ID" });
      }

      const recommendations = await getProductRecommendations(repairRequestId);
      res.json(recommendations);
    } catch (error) {
      console.error("Error fetching product recommendations:", error);
      res.status(500).json({ 
        error: "Failed to fetch product recommendations",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // User Interaction Tracking Routes
  app.post("/api/interactions", async (req, res) => {
    try {
      // User ID is optional (anonymous interactions allowed)
      const userId = req.isAuthenticated() ? (req.user as Express.User).id : null;

      // Validate the data with the schema
      const interactionData = insertUserInteractionSchema.parse({
        ...req.body,
        userId: userId || req.body.userId
      });

      // Track the interaction in the database
      const interaction = await storage.trackUserInteraction(interactionData);
      console.log("Tracked user interaction:", {
        id: interaction.id,
        type: interaction.interactionType,
        userId: interaction.userId,
        repairRequestId: interaction.repairRequestId
      });

      res.status(201).json(interaction);
    } catch (error) {
      console.error("Error tracking user interaction:", error);
      res.status(400).json({ 
        error: "Failed to track interaction",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.get("/api/interactions/user/:userId", async (req, res) => {
    try {
      // Only allow users to access their own interactions or admins
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = req.user as Express.User;
      const targetUserId = parseInt(req.params.userId);

      if (isNaN(targetUserId)) {
        return res.status(400).json({ error: "Invalid user ID" });
      }

      // Only allow users to see their own interactions (unless admin)
      if (user.id !== targetUserId && user.role !== "admin") {
        return res.status(403).json({ error: "Not authorized to view these interactions" });
      }

      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const interactions = await storage.getUserInteractions(targetUserId, limit);

      res.json(interactions);
    } catch (error) {
      console.error("Error fetching user interactions:", error);
      res.status(500).json({ 
        error: "Failed to fetch interactions",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.get("/api/interactions/repair/:repairRequestId", async (req, res) => {
    try {
      const repairRequestId = parseInt(req.params.repairRequestId);

      if (isNaN(repairRequestId)) {
        return res.status(400).json({ error: "Invalid repair request ID" });
      }

      const interactions = await storage.getRepairRequestInteractions(repairRequestId);
      res.json(interactions);
    } catch (error) {
      console.error("Error fetching repair request interactions:", error);
      res.status(500).json({ 
        error: "Failed to fetch interactions",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.get("/api/interactions/stats", async (req, res) => {
    try {
      // This endpoint should be admin-only in production
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = req.user as Express.User;
      if (user.role !== "admin") {
        return res.status(403).json({ error: "Not authorized to view interaction stats" });
      }

      // Parse query parameters
      const type = req.query.type as string || undefined;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

      const stats = await storage.getInteractionStats(type, startDate, endDate);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching interaction stats:", error);
      res.status(500).json({ 
        error: "Failed to fetch interaction statistics",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Diagnostic Question Trees API Routes
  app.get("/api/diagnostic-trees", async (req, res) => {
    try {
      const category = req.query.category as string;
      const subcategory = req.query.subcategory as string | undefined;
      
      if (!category) {
        return res.status(400).json({ error: 'Product category is required' });
      }
      
      // Get the most recent version of the question tree for this category/subcategory
      const tree = await storage.getDiagnosticQuestionTreeByCategory(category, subcategory);
      
      if (tree) {
        return res.status(200).json(tree);
      } else {
        // If no tree exists, create a basic one
        const basicTree = createBasicDiagnosticTree(category, subcategory);
        const treeData = treeToDbFormat(basicTree);
        
        // Store the new tree in the database
        const newTree = await storage.createDiagnosticQuestionTree({
          productCategory: category,
          subCategory: subcategory || undefined,
          version: 1,
          treeData: JSON.stringify(basicTree)
        });
        
        return res.status(201).json(newTree);
      }
    } catch (error) {
      console.error('Error fetching diagnostic trees:', error);
      return res.status(500).json({ error: 'Failed to fetch diagnostic trees' });
    }
  });

  app.get("/api/diagnostic-trees/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Valid ID is required' });
      }
      
      const tree = await storage.getDiagnosticQuestionTree(id);
      
      if (tree) {
        return res.status(200).json(tree);
      } else {
        return res.status(404).json({ error: 'Diagnostic tree not found' });
      }
    } catch (error) {
      console.error('Error fetching diagnostic tree:', error);
      return res.status(500).json({ error: 'Failed to fetch diagnostic tree' });
    }
  });

  app.post("/api/diagnostic-trees", async (req, res) => {
    try {
      // Validation is handled in the storage layer
      const { productCategory, subCategory, treeData, version } = req.body;
      
      if (!productCategory || !treeData) {
        return res.status(400).json({ 
          error: 'Invalid request data', 
          details: 'Product category and tree data are required' 
        });
      }
      
      // Get the current highest version for this category/subcategory
      const existingTree = await storage.getDiagnosticQuestionTreeByCategory(productCategory, subCategory);
      const newVersion = existingTree ? existingTree.version + 1 : 1;
      
      // Create the new tree with incremented version
      const newTree = await storage.createDiagnosticQuestionTree({
        productCategory,
        subCategory: subCategory || undefined,
        version: version || newVersion,
        treeData: typeof treeData === 'string' ? treeData : JSON.stringify(treeData)
      });
      
      return res.status(201).json(newTree);
    } catch (error) {
      console.error('Error creating diagnostic tree:', error);
      return res.status(500).json({ error: 'Failed to create diagnostic tree' });
    }
  });

  app.put("/api/diagnostic-trees/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Valid ID is required' });
      }
      
      const { treeData } = req.body;
      
      if (!treeData) {
        return res.status(400).json({ 
          error: 'Invalid request data', 
          details: 'Tree data is required' 
        });
      }
      
      // Check if the tree exists
      const existingTree = await storage.getDiagnosticQuestionTree(id);
      
      if (!existingTree) {
        return res.status(404).json({ error: 'Diagnostic tree not found' });
      }
      
      // Update the tree
      const updatedTree = await storage.updateDiagnosticQuestionTree(id, {
        treeData: typeof treeData === 'string' ? treeData : JSON.stringify(treeData),
        updatedAt: new Date()
      });
      
      return res.status(200).json(updatedTree);
    } catch (error) {
      console.error('Error updating diagnostic tree:', error);
      return res.status(500).json({ error: 'Failed to update diagnostic tree' });
    }
  });

  // Initialize ML-based repair cost estimation API
  try {
    await setupRepairCostAPI(app);
    console.log("ML-based repair cost API initialized successfully");
  } catch (error) {
    console.error("Failed to initialize ML-based repair cost API:", error);
    console.log("Application will continue with rule-based estimation only");
  }

  // Google Cloud Storage routes
  app.get("/api/cloud-storage/status", (req, res) => {
    try {
      const isConfigured = googleCloudStorage.isConfigured();
      res.json({
        status: isConfigured ? "configured" : "not_configured",
        message: isConfigured 
          ? "Google Cloud Storage is properly configured" 
          : "Google Cloud Storage is not configured. Please check your environment variables."
      });
    } catch (error) {
      console.error("Error checking Google Cloud Storage status:", error);
      res.status(500).json({ 
        status: "error", 
        message: "Failed to check Google Cloud Storage status",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // File upload endpoint
  app.post("/api/cloud-storage/upload", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      if (!googleCloudStorage.isConfigured()) {
        return res.status(503).json({ 
          error: "Google Cloud Storage is not configured" 
        });
      }

      if (!req.body.file) {
        return res.status(400).json({ error: "No file data provided" });
      }

      // Extract file data from the request
      // Client should send base64 encoded data
      const { file, contentType, fileName, folder } = req.body;
      
      if (!file || !contentType) {
        return res.status(400).json({ 
          error: "File data and content type are required" 
        });
      }

      // Convert base64 to buffer
      let fileBuffer;
      try {
        // Handle data URIs (e.g., "data:image/jpeg;base64,/9j/4AAQSkZJRg...")
        const base64Data = file.includes('base64,') 
          ? file.split('base64,')[1] 
          : file;
          
        fileBuffer = Buffer.from(base64Data, 'base64');
      } catch (error) {
        console.error("Error decoding base64 data:", error);
        return res.status(400).json({ error: "Invalid file data" });
      }

      // Upload to Google Cloud Storage
      const url = await googleCloudStorage.uploadFile(fileBuffer, {
        contentType,
        customName: fileName,
        folder: folder || `user_${req.user.id}`,
        isPublic: true
      });

      res.json({ 
        success: true, 
        url,
        message: "File uploaded successfully" 
      });
    } catch (error) {
      console.error("Error uploading file to Google Cloud Storage:", error);
      res.status(500).json({ 
        error: "Failed to upload file", 
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // File deletion endpoint
  app.delete("/api/cloud-storage/files", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      if (!googleCloudStorage.isConfigured()) {
        return res.status(503).json({ 
          error: "Google Cloud Storage is not configured" 
        });
      }

      const { url } = req.body;
      if (!url) {
        return res.status(400).json({ error: "File URL is required" });
      }

      await googleCloudStorage.deleteFile(url);
      res.json({ 
        success: true, 
        message: "File deleted successfully" 
      });
    } catch (error) {
      console.error("Error deleting file from Google Cloud Storage:", error);
      res.status(500).json({ 
        error: "Failed to delete file", 
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  console.log("All routes registered successfully");
  return httpServer;
}
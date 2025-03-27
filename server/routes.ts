import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer } from 'ws';
import { WebSocket } from 'ws';
import { storage } from "./storage";
import { insertRepairRequestSchema, type User } from "@shared/schema";
import { generateMockEstimate } from "./mock-data";
import { getRepairAnswer, generateRepairGuide } from "./services/openai";
import { setupAuth } from "./auth";
import type { IncomingMessage } from "http";
import { parse as parseCookie } from "cookie";
import { promisify } from "util";
import { getErrorStats } from "./services/error-tracking";
import type { SessionData } from "express-session";
import { getProductRecommendations, updateProductPrices, updateProductReviews } from "./services/product-service";

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
    path: '/ws'
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
    const estimate = generateMockEstimate(req.query.productType as string);
    res.json(estimate);
  });

  app.post("/api/repair-questions", async (req, res) => {
    try {
      const { question, productType, issueDescription, imageUrl, context, currentStep } = req.body;
      if (!question || !productType) {
        res.status(400).json({ error: "Question and product type are required" });
        return;
      }

      // Get answer with conversation context
      const answer = await getRepairAnswer({ 
        question, 
        productType, 
        issueDescription,
        imageUrl, 
        context, 
        currentStep 
      });
      
      res.json(answer);
    } catch (error) {
      console.error("Error processing repair question:", error);
      res.status(500).json({ error: "Failed to get repair answer" });
    }
  });

  app.post("/api/repair-guides", async (req, res) => {
    try {
      const { productType, issue } = req.body;
      if (!productType || !issue) {
        res.status(400).json({ error: "Product type and issue are required" });
        return;
      }

      console.log("Generating repair guide for:", { productType, issue });
      const guide = await generateRepairGuide(productType, issue);

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

  app.get("/api/errors/stats", async (req, res) => {
    try {
      const stats = await getErrorStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching error statistics:", error);
      res.status(500).json({ error: "Failed to fetch error statistics" });
    }
  });

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

  console.log("All routes registered successfully");
  return httpServer;
}
import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer } from 'ws';
import { WebSocket } from 'ws';
import { storage } from "./storage";
import { insertRepairRequestSchema } from "@shared/schema";
import { generateMockEstimate } from "./mock-data";
import { getRepairAnswer, generateRepairGuide } from "./services/openai";
import { setupAuth } from "./auth";
import type { IncomingMessage } from "http";
import { parse as parseCookie } from "cookie";
import { promisify } from "util";
import { getErrorStats } from "./services/error-tracking";
import type { SessionData } from "express-session";

// Extend SessionData type to include passport
declare module 'express-session' {
  interface SessionData {
    passport?: {
      user: number;
    };
  }
}

// Keep track of connected clients and their user IDs
const clients = new Map<string, { ws: WebSocket; userId: number }>();

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  console.log("Created HTTP server instance");

  // Initialize WebSocket server
  const wss = new WebSocketServer({ 
    server: httpServer,
    path: '/ws'
  });
  console.log("WebSocket server initialized");

  // Setup authentication before any routes
  setupAuth(app);
  console.log("Authentication setup complete");

  // Helper function to get session and user from request
  const getUserFromRequest = async (req: IncomingMessage) => {
    try {
      const cookieHeader = req.headers.cookie;
      if (!cookieHeader) return null;

      const cookies = parseCookie(cookieHeader);
      const sessionId = cookies['connect.sid'];
      if (!sessionId) return null;

      const actualSessionId = sessionId.split('.')[0].slice(2);
      const getSession = promisify(storage.sessionStore.get.bind(storage.sessionStore));
      const session = await getSession(actualSessionId);

      if (!session?.passport?.user) return null;
      return await storage.getUser(session.passport.user);
    } catch (error) {
      console.error('Error getting user from session:', error);
      return null;
    }
  };

  // WebSocket connection handler with immediate welcome notification
  wss.on('connection', async (ws, req) => {
    console.log('New WebSocket connection attempt');
    const user = await getUserFromRequest(req);

    if (!user) {
      ws.close(1008, 'Unauthorized');
      return;
    }

    const clientId = req.headers['sec-websocket-key'];
    if (clientId) {
      clients.set(clientId, { ws, userId: user.id });

      // Send an immediate connection confirmation
      ws.send(JSON.stringify({
        type: 'connection',
        data: { message: 'Connected successfully' }
      }));

      // Check for any unread notifications
      const notifications = await storage.getUserNotifications(user.id);
      if (notifications.length > 0) {
        ws.send(JSON.stringify({
          type: 'notifications',
          data: notifications
        }));
      }
    }

    ws.on('close', () => {
      if (clientId) clients.delete(clientId);
    });
  });

  // API Routes
  app.get("/api/repair-shops", async (_req, res) => {
    try {
      const shops = await storage.getAllRepairShops();
      res.json(shops);
    } catch (error) {
      console.error("Error fetching repair shops:", error);
      res.status(500).json({ error: "Failed to fetch repair shops" });
    }
  });

  app.post("/api/repair-requests", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const data = insertRepairRequestSchema.parse(req.body);
      const repairRequest = await storage.createRepairRequest({
        ...data,
        customerId: req.user.id
      });

      const notification = await storage.createNotification({
        userId: req.user.id,
        title: "Repair Request Created",
        message: `Your repair request for ${data.productType} has been submitted successfully.`,
        type: "repair_update",
        read: false,
        relatedEntityId: repairRequest.id
      });

      // Broadcast notification
      const clientEntries = Array.from(clients.values());
      const targetClient = clientEntries.find(({ userId }) => userId === req.user.id);
      if (targetClient?.ws.readyState === WebSocket.OPEN) {
        targetClient.ws.send(JSON.stringify({
          type: 'notification',
          data: notification
        }));
      }

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
      console.log("Fetching notifications for user:", req.user.id);
      const notifications = await storage.getUserNotifications(req.user.id);
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
      console.log(`Marked notification ${notificationId} as read for user ${req.user.id}`);
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
      await storage.markAllNotificationsAsRead(req.user.id);
      console.log(`Marked all notifications as read for user ${req.user.id}`);
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
        await storage.createNotification({
          userId: repairRequest.customerId,
          title: "Repair Status Updated",
          message: `Your repair request status has been updated to: ${status}`,
          type: "repair_update",
          relatedEntityId: requestId,
          read: false 
        });
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
      const { question, productType, imageUrl } = req.body;
      if (!question || !productType) {
        res.status(400).json({ error: "Question and product type are required" });
        return;
      }

      const answer = await getRepairAnswer({ question, productType, imageUrl });
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

  console.log("All routes registered successfully");
  return httpServer;
}
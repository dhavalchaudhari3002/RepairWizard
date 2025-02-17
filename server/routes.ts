import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertRepairRequestSchema } from "@shared/schema";
import { generateMockEstimate } from "./mock-data";
import { getRepairAnswer, generateRepairGuide } from "./services/openai";
import { setupAuth } from "./auth";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication routes (/api/register, /api/login, /api/logout, /api/user)
  setupAuth(app);

  // Existing repair request routes
  app.post("/api/repair-requests", async (req, res) => {
    try {
      const data = insertRepairRequestSchema.parse(req.body);
      const repairRequest = await storage.createRepairRequest(data);
      res.json(repairRequest);
    } catch (error) {
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

  const httpServer = createServer(app);
  return httpServer;
}
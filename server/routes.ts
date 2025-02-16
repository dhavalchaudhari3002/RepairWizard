import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertRepairRequestSchema } from "@shared/schema";
import { generateMockEstimate } from "./mock-data";

export async function registerRoutes(app: Express): Promise<Server> {
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

  const httpServer = createServer(app);
  return httpServer;
}

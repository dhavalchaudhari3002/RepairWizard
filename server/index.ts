import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, log } from "./vite";

// Initialize Express app
const app = express();

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Simple request logging
app.use((req, res, next) => {
  log(`${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/ping', (_req, res) => {
  res.send('pong');
});

// Initialize server
(async () => {
  try {
    log("Starting server...");

    // Register API routes
    const server = await registerRoutes(app);

    // Error handling middleware
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      console.error("Server error:", err);
      res.status(500).json({ message: "Internal Server Error" });
    });

    // Force development mode since we're using Vite
    process.env.NODE_ENV = "development";

    // In development, always use Vite middleware
    log("Setting up Vite development server...");
    await setupVite(app, server);

    // Start server
    const PORT = 5000;
    const HOST = "0.0.0.0";

    server.listen(PORT, HOST, () => {
      log(`Server running at http://${HOST}:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
})();
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
    log("Starting server initialization...");

    // Register API routes
    log("Registering routes...");
    const server = await registerRoutes(app);
    log("Routes registered successfully");

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
    log("Vite setup complete");

    // ALWAYS serve the app on port 5000
    const PORT = 5000;
    const HOST = "0.0.0.0";

    server.listen(PORT, HOST, () => {
      log(`Server is now listening on http://${HOST}:${PORT}`);
      log("Server initialization complete - ready to handle requests");
    });

    // Handle server errors
    server.on('error', (error: any) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use`);
      } else {
        console.error('Server error:', error);
      }
      process.exit(1);
    });

  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
})();
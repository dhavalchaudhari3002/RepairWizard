import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, log } from "./vite";
import session from "express-session";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import path from "path";
import fs from "fs";
// Import Sentry modules 
import * as Sentry from "@sentry/node";
// We don't need additional imports with the simplified approach

// Initialize Express app
const app = express();

// Initialize Sentry at the earliest point possible with a simplified approach
// This configuration avoids TypeScript errors while still enabling error tracking
Sentry.init({
  // Use environment variable for DSN to avoid hardcoding sensitive values
  dsn: process.env.SENTRY_DSN_BACKEND || "",
  release: 'repair-ai-assistant@1.0.0',
  environment: process.env.NODE_ENV || 'development', 
  // Only enable debug mode in development
  debug: process.env.NODE_ENV !== 'production',
});

// We're using a simplified approach for Sentry middleware
// to avoid TypeScript errors with the Handlers namespace
// This works well with current version available in the project

// Continue with basic Express middleware

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
const sessionSettings = {
  secret: process.env.SESSION_SECRET || "your-secret-key",
  resave: false,
  saveUninitialized: false,
  store: storage.sessionStore,
  cookie: {
    secure: process.env.NODE_ENV === "production",
    sameSite: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
};

app.set("trust proxy", 1);
app.use(session(sessionSettings));

// Setup authentication before routes
setupAuth(app);

// Simple request logging
app.use((req, res, next) => {
  log(`${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/ping', (_req, res) => {
  log("Health check endpoint hit");
  res.send('pong');
});

// Test endpoint for Sentry error tracking
app.get('/debug-sentry', (_req, res) => {
  log("Testing Sentry error tracking");
  try {
    // Create a unique test error with timestamp for better tracking
    const timestamp = new Date().toISOString();
    const errorMessage = `Backend Test Error for Sentry - ${timestamp}`;
    
    // Log before throwing for easier debugging
    console.log(`About to throw test error for Sentry: ${errorMessage}`);
    
    // Intentionally throw an error to test Sentry
    throw new Error(errorMessage);
  } catch (error) {
    // Capture and send to Sentry with extra context
    const eventId = Sentry.captureException(error, {
      extra: {
        source: 'debug-sentry-endpoint',
        timestamp: new Date().toISOString(),
        testing: true
      }
    });
    
    console.log(`Backend test error captured with Sentry ID: ${eventId}`);
    
    // Respond with the Sentry event ID
    res.status(200).json({ 
      message: 'Backend error successfully captured by Sentry',
      sentryEventId: eventId,
      timestamp: new Date().toISOString(),
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Initialize server
(async () => {
  try {
    log("Starting server initialization...");

    // Register API routes after auth setup
    log("Registering routes...");
    const server = await registerRoutes(app);
    log("Routes registered successfully");

    // Add catch-all route to handle client-side routing
    // This needs to be after all API routes
    app.get("*", (req, res, next) => {
      // Skip API routes
      if (req.path.startsWith('/api/')) {
        return next();
      }
      
      log(`Handling client-side route: ${req.path}`);
      // In development, let Vite handle it
      if (process.env.NODE_ENV !== "production") {
        return next();
      }
      
      // In production, serve the index.html
      const indexPath = path.resolve(process.cwd(), 'dist', 'index.html');
      if (fs.existsSync(indexPath)) {
        return res.sendFile(indexPath);
      }
      next();
    });
    
    // We're using a simple error handling approach that works with any Sentry version
    // Custom middleware will handle error tracking with Sentry directly
    
    // Custom error handler with Sentry integration
    app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
      console.error("Server error:", err);
      
      // Get the Sentry event ID from the response locals that was set by the Sentry error handler
      const eventId = (res as any).sentry || Sentry.captureException(err, {
        extra: {
          path: req.path,
          method: req.method,
          timestamp: new Date().toISOString(),
        },
      });
      
      console.log(`Error captured with Sentry ID: ${eventId}`);
      
      // Send a user-friendly response with the Sentry event ID for reference
      res.status(500).json({ 
        error: "Internal Server Error",
        message: err.message,
        sentryEventId: eventId,
        timestamp: new Date().toISOString(),
      });
    });

    // ALWAYS serve the app on port 5000
    const PORT = 5000;
    const HOST = "0.0.0.0";

    server.listen(PORT, HOST, async () => {
      log(`Server is now listening on http://${HOST}:${PORT}`);

      // Setup Vite only after server is listening
      if (process.env.NODE_ENV !== "production") {
        log("Setting up Vite development server...");
        try {
          await setupVite(app, server);
          log("Vite setup complete");
        } catch (error) {
          console.error("Vite setup failed:", error);
          // Continue running the server even if Vite setup fails
        }
      }

      log("Server initialization complete - ready to handle requests");

      // Test server health immediately after startup
      fetch(`http://${HOST}:${PORT}/ping`)
        .then(response => response.text())
        .then(text => {
          log(`Health check response: ${text}`);
        })
        .catch(error => {
          console.error("Health check failed:", error);
        });
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
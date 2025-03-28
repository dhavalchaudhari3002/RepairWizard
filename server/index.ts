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
import * as Tracing from "@sentry/tracing";

// Initialize Express app
const app = express();

// Initialize Sentry with a basic configuration
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || 'development',
  // Set tracesSampleRate to 1.0 to capture 100% of transactions for performance monitoring
  tracesSampleRate: 1.0,
});

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
    // Intentionally throw an error to test Sentry
    throw new Error('Test error for Sentry tracking');
  } catch (error) {
    // Capture and send to Sentry
    const eventId = Sentry.captureException(error);
    // Respond with the Sentry event ID
    res.status(200).json({ 
      message: 'Error successfully captured by Sentry',
      sentryEventId: eventId,
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
    
    // Add a simple middleware to capture errors for Sentry before other error handlers
    app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
      // Capture the error in Sentry and get the eventId
      const eventId = Sentry.captureException(err);
      // Add the Sentry event ID to the response for reference
      (res as any).sentry = eventId;
      next(err);
    });

    // Error handling middleware
    app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
      console.error("Server error:", err);
      
      // Include the Sentry event ID for reference
      const eventId = (res as any).sentry || 'Unknown';
      
      res.status(500).json({ 
        error: "Internal Server Error",
        message: err.message,
        sentryEventId: eventId
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
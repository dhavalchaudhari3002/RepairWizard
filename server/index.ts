import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, log } from "./vite";
import session from "express-session";
import { storage } from "./storage";
import { setupAuth } from "./auth";

// Initialize Express app
const app = express();

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

// Initialize server
(async () => {
  try {
    log("Starting server initialization...");

    // Register API routes after auth setup
    log("Registering routes...");
    const server = await registerRoutes(app);
    log("Routes registered successfully");

    // Error handling middleware
    app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
      console.error("Server error:", err);
      res.status(500).json({ 
        error: "Internal Server Error",
        message: err.message 
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
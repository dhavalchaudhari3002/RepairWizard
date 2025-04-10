import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { randomBytes } from "crypto";
import { directUserStorage } from "./services/direct-user-storage";
import { sendWelcomeEmail, sendPasswordResetEmail } from "./services/email";
import * as bcrypt from 'bcrypt';

// Session types are imported automatically - no need to explicitly import .d.ts files

/**
 * Setup authentication routes that use direct cloud storage
 * instead of local database for user data.
 * 
 * This implementation stores all user data directly in the 'user-data' folder
 * in Google Cloud Storage.
 */
export function setupCloudAuth(app: Express) {
  // Session middleware is applied in server/index.ts

  // Session serialization/deserialization middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    // Add user to req.user if in session
    if (req.session && req.session.userId && req.session.user) {
      // We'll keep a simple approach for this example
      req.user = {
        id: req.session.user.id,
        email: req.session.user.email,
        firstName: req.session.user.firstName,
        lastName: req.session.user.lastName,
        role: req.session.user.role
      };
    }
    next();
  });

  // User registration endpoint
  app.post("/api/cloud/register", async (req: Request, res: Response) => {
    try {
      console.log("Cloud registration request received:", { ...req.body, password: '[REDACTED]' });

      const { firstName, lastName, email, password, role = "customer", tosAccepted } = req.body;

      // Validate required fields
      if (!firstName || !lastName || !email || !password) {
        return res.status(400).json({ message: "All fields are required" });
      }

      if (!tosAccepted) {
        return res.status(400).json({ message: "You must accept the Terms of Service" });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: "Please provide a valid email address" });
      }

      // Check for existing user
      const existingUser = await directUserStorage.getUserByEmail(email);
      if (existingUser) {
        return res.status(409).json({
          message: "This email is already registered. Please login or use a different email address."
        });
      }

      // Create the user directly in cloud storage
      const user = await directUserStorage.createUser({
        firstName,
        lastName,
        email,
        password,
        role,
        tosAccepted
      });

      console.log("User created successfully in cloud storage:", { id: user.id, email: user.email });

      // Send welcome email
      try {
        const emailSent = await sendWelcomeEmail(user.email, user.firstName);
        if (!emailSent) {
          console.warn("Failed to send welcome email to:", user.email);
        }
      } catch (emailError) {
        console.error("Welcome email error (non-blocking):", emailError);
      }

      return res.status(201).json({
        message: "Registration successful! You can now log in to your account.",
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
      });
    } catch (err: any) {
      console.error("Registration error:", err);
      const statusCode = err.statusCode || 500;
      const message = err.message || "Registration failed. Please try again.";
      return res.status(statusCode).json({ message });
    }
  });

  // User login endpoint
  app.post("/api/cloud/login", async (req: Request, res: Response) => {
    try {
      console.log("Cloud login attempt received:", { email: req.body.email });
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      // Validate credentials
      const user = await directUserStorage.validateCredentials(email, password);
      if (!user) {
        console.log("Invalid credentials for:", email);
        return res.status(401).json({ message: "Invalid email or password" });
      }

      console.log("User successfully authenticated:", { id: user.id, email: user.email });

      // Store user in session
      if (req.session) {
        req.session.userId = user.id;
        req.session.user = {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role
        };
        
        console.log("User session created successfully");
      } else {
        console.error("Session object not available");
        return res.status(500).json({ message: "Session error" });
      }

      return res.json({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        authenticated: true
      });
    } catch (err) {
      console.error("Login error:", err);
      return res.status(500).json({ message: "Login failed. Please try again." });
    }
  });

  // User logout endpoint
  app.post("/api/cloud/logout", (req: Request, res: Response) => {
    if (req.session) {
      req.session.destroy((err) => {
        if (err) {
          return res.status(500).json({ message: "Could not log out" });
        }
        return res.status(200).json({ message: "Logged out successfully" });
      });
    } else {
      return res.status(200).json({ message: "Already logged out" });
    }
  });

  // Get current user endpoint
  app.get("/api/cloud/user", (req: Request, res: Response) => {
    if (!req.session || !req.session.userId || !req.session.user) {
      return res.status(401).json({ 
        message: "Not authenticated",
        authenticated: false
      });
    }
    
    return res.json({
      ...req.session.user,
      authenticated: true
    });
  });

  // Password reset request
  app.post("/api/cloud/forgot-password", async (req: Request, res: Response) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      // Generate a reset token
      const resetToken = randomBytes(32).toString('hex');
      
      // Find user
      const user = await directUserStorage.getUserByEmail(email);
      
      if (user) {
        // We would store this token in cloud storage in a real implementation
        // For this example, we'll just log it
        console.log(`Reset token for ${email}: ${resetToken}`);
        
        // Send reset email with the token
        await sendPasswordResetEmail(email, resetToken);
      }

      // Always return success to prevent user enumeration
      return res.status(200).json({
        success: true,
        message: "If your email is registered, you will receive password reset instructions."
      });
    } catch (error) {
      console.error("Password reset request error:", error);
      return res.status(500).json({
        message: "An error occurred while processing your request. Please try again later."
      });
    }
  });

  // Test endpoint to check if cloud auth is working
  app.get("/api/cloud/auth-test", (req: Request, res: Response) => {
    return res.json({
      message: "Cloud auth endpoints are working",
      authenticated: req.session && req.session.userId ? true : false,
      sessionData: {
        hasSession: !!req.session,
        hasUserId: req.session && !!req.session.userId,
        hasUserData: req.session && !!req.session.user
      }
    });
  });

  console.log("Cloud storage authentication routes registered");
}
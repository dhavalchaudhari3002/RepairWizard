import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { randomBytes } from "crypto";
import { sqlUserStorage } from "./services/sql-user-storage";
import { sendWelcomeEmail, sendPasswordResetEmail } from "./services/email";

/**
 * Setup authentication routes that use SQL database for user data
 * with extended profile data stored in Google Cloud Storage.
 * 
 * This implementation stores core user data in PostgreSQL database
 * and extended user data in the 'user-data' folder in Google Cloud Storage.
 */
export function setupSQLAuth(app: Express) {
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
  app.post("/api/sql/register", async (req: Request, res: Response) => {
    try {
      console.log("SQL registration request received:", { ...req.body, password: '[REDACTED]' });

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
      const existingUser = await sqlUserStorage.getUserByEmail(email);
      if (existingUser) {
        return res.status(409).json({
          message: "This email is already registered. Please login or use a different email address."
        });
      }

      // Create the user using the hybrid approach
      const user = await sqlUserStorage.createUser({
        firstName,
        lastName,
        email,
        password,
        role,
        tosAccepted
      });

      console.log("User created with hybrid approach:", { id: user.id, email: user.email });

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
  app.post("/api/sql/login", async (req: Request, res: Response) => {
    try {
      console.log("SQL login attempt received:", { email: req.body.email });
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      // Validate credentials
      const user = await sqlUserStorage.validateCredentials(email, password);
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
  app.post("/api/sql/logout", (req: Request, res: Response) => {
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
  app.get("/api/sql/user", (req: Request, res: Response) => {
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
  
  // Get extended profile endpoint
  app.get("/api/sql/user/profile", async (req: Request, res: Response) => {
    if (!req.session || !req.session.userId || !req.session.user) {
      return res.status(401).json({ 
        message: "Not authenticated",
        authenticated: false
      });
    }
    
    try {
      const extendedProfile = await sqlUserStorage.getExtendedProfile(req.session.userId);
      
      if (!extendedProfile) {
        return res.status(404).json({
          message: "Extended profile not found",
          userId: req.session.userId
        });
      }
      
      return res.json(extendedProfile);
    } catch (error) {
      console.error("Error fetching extended profile:", error);
      return res.status(500).json({
        message: "Failed to fetch extended profile",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Update extended profile endpoint
  app.post("/api/sql/user/profile", async (req: Request, res: Response) => {
    if (!req.session || !req.session.userId || !req.session.user) {
      return res.status(401).json({ 
        message: "Not authenticated",
        authenticated: false
      });
    }
    
    try {
      const { preferences, settings, ...otherData } = req.body;
      
      // Create the profile data structure
      const profileData = {
        // Basic info from session
        id: req.session.user.id,
        email: req.session.user.email,
        firstName: req.session.user.firstName,
        lastName: req.session.user.lastName,
        role: req.session.user.role,
        // Extended data from request
        preferences: preferences || {},
        settings: settings || {},
        ...otherData,
        // Add metadata fields
        _metadata: {
          dataType: 'user-profile',
          timestamp: new Date().toISOString(),
          version: '1.0'
        }
      };
      
      // Update the extended profile
      const cloudStorageUrl = await sqlUserStorage.updateExtendedProfile(req.session.userId, profileData);
      
      if (!cloudStorageUrl) {
        return res.status(500).json({
          message: "Failed to update extended profile"
        });
      }
      
      return res.json({
        message: "Extended profile updated successfully",
        cloudStorageUrl
      });
    } catch (error) {
      console.error("Error updating extended profile:", error);
      return res.status(500).json({
        message: "Failed to update extended profile",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Password reset request
  app.post("/api/sql/forgot-password", async (req: Request, res: Response) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      // Generate a reset token
      const resetToken = randomBytes(32).toString('hex');
      
      // Find user
      const user = await sqlUserStorage.getUserByEmail(email);
      
      if (user) {
        // We would store this token in database in a real implementation
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

  // Test endpoint to check if SQL auth is working
  app.get("/api/sql/auth-test", (req: Request, res: Response) => {
    return res.json({
      message: "SQL auth endpoints are working",
      authenticated: req.session && req.session.userId ? true : false,
      sessionData: {
        hasSession: !!req.session,
        hasUserId: req.session && !!req.session.userId,
        hasUserData: req.session && !!req.session.user
      }
    });
  });

  console.log("SQL-based authentication routes registered");
}
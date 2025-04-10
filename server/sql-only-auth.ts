import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { randomBytes } from "crypto";
import { sqlOnlyUserStorage } from "./services/sql-only-user-storage";
import { sendWelcomeEmail, sendPasswordResetEmail } from "./services/email";

/**
 * Setup authentication routes that use SQL database for ALL user data
 * - All user information is stored directly in PostgreSQL database
 * - No user data is stored in Cloud Storage for better querying and data management
 * - Only repair session data and user uploaded content is kept in Cloud Storage
 */
export function setupSQLOnlyAuth(app: Express) {
  // Session middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    // Add user to req.user if in session
    if (req.session && req.session.userId && req.session.user) {
      // Keep a simple approach for this example
      req.user = {
        id: req.session.userId,
        email: req.session.user.email,
        firstName: req.session.user.firstName,
        lastName: req.session.user.lastName,
        role: req.session.user.role
      };
    }
    next();
  });

  // User registration endpoint
  app.post("/api/sql-only/register", async (req: Request, res: Response) => {
    try {
      console.log("SQL-only registration request received:", { ...req.body, password: '[REDACTED]' });

      const { 
        firstName, lastName, email, password, 
        role = "customer", tosAccepted, 
        // Additional profile fields
        phone, address, preferences, settings
      } = req.body;

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
      const existingUser = await sqlOnlyUserStorage.getUserByEmail(email);
      if (existingUser) {
        return res.status(409).json({
          message: "This email is already registered. Please login or use a different email address."
        });
      }

      // Create the user with the SQL-only approach
      const user = await sqlOnlyUserStorage.createUser({
        firstName,
        lastName,
        email,
        password,
        role,
        tosAccepted,
        // Include additional profile fields if provided
        phone,
        address,
        preferences,
        settings
      });

      console.log("User created with SQL-only approach:", { id: user.id, email: user.email });

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
  app.post("/api/sql-only/login", async (req: Request, res: Response) => {
    try {
      console.log("SQL-only login attempt received:", { email: req.body.email });
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      // Validate credentials
      const user = await sqlOnlyUserStorage.validateCredentials(email, password);
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
  app.post("/api/sql-only/logout", (req: Request, res: Response) => {
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
  app.get("/api/sql-only/user", (req: Request, res: Response) => {
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
  
  // Get user profile endpoint
  app.get("/api/sql-only/user/profile", async (req: Request, res: Response) => {
    if (!req.session || !req.session.userId || !req.session.user) {
      return res.status(401).json({ 
        message: "Not authenticated",
        authenticated: false
      });
    }
    
    try {
      const profile = await sqlOnlyUserStorage.getProfile(req.session.userId);
      
      if (!profile) {
        return res.status(404).json({
          message: "Profile not found",
          userId: req.session.userId
        });
      }
      
      return res.json(profile);
    } catch (error) {
      console.error("Error fetching profile:", error);
      return res.status(500).json({
        message: "Failed to fetch profile",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Update user profile endpoint
  app.post("/api/sql-only/user/profile", async (req: Request, res: Response) => {
    if (!req.session || !req.session.userId || !req.session.user) {
      return res.status(401).json({ 
        message: "Not authenticated",
        authenticated: false
      });
    }
    
    try {
      const { preferences, settings, ...otherData } = req.body;
      
      // Update the profile
      const updatedProfile = await sqlOnlyUserStorage.updateProfile(req.session.userId, req.body);
      
      if (!updatedProfile) {
        return res.status(500).json({
          message: "Failed to update profile"
        });
      }
      
      // Update session data if basic info was changed
      if (otherData.firstName || otherData.lastName || otherData.email) {
        req.session.user = {
          id: req.session.userId,
          email: otherData.email || req.session.user.email,
          firstName: otherData.firstName || req.session.user.firstName,
          lastName: otherData.lastName || req.session.user.lastName,
          role: req.session.user.role
        };
      }
      
      return res.json({
        message: "Profile updated successfully",
        profile: updatedProfile
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      return res.status(500).json({
        message: "Failed to update profile",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Update password endpoint
  app.post("/api/sql-only/user/password", async (req: Request, res: Response) => {
    if (!req.session || !req.session.userId || !req.session.user) {
      return res.status(401).json({ 
        message: "Not authenticated",
        authenticated: false
      });
    }
    
    try {
      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ 
          message: "Current password and new password are required" 
        });
      }
      
      // Password validation
      if (newPassword.length < 8) {
        return res.status(400).json({ 
          message: "New password must be at least 8 characters long" 
        });
      }
      
      // Update the password
      const success = await sqlOnlyUserStorage.updatePassword(
        req.session.userId, 
        currentPassword, 
        newPassword
      );
      
      if (!success) {
        return res.status(400).json({
          message: "Current password is incorrect"
        });
      }
      
      return res.json({
        message: "Password updated successfully"
      });
    } catch (error) {
      console.error("Error updating password:", error);
      return res.status(500).json({
        message: "Failed to update password",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Password reset request
  app.post("/api/sql-only/forgot-password", async (req: Request, res: Response) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      // Generate a reset token
      const resetToken = randomBytes(32).toString('hex');
      
      // Find user
      const user = await sqlOnlyUserStorage.getUserByEmail(email);
      
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

  // Test endpoint to check if SQL-only auth is working
  app.get("/api/sql-only/auth-test", (req: Request, res: Response) => {
    return res.json({
      message: "SQL-only auth endpoints are working",
      authenticated: req.session && req.session.userId ? true : false,
      sessionData: {
        hasSession: !!req.session,
        hasUserId: req.session && !!req.session.userId,
        hasUserData: req.session && !!req.session.user
      }
    });
  });

  console.log("SQL-only authentication routes registered");
}
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, randomInt } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { sendWelcomeEmail, sendPasswordResetEmail } from "./services/email";
import type { User } from "@shared/schema";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return hashedBuf.equals(suppliedBuf);
}

// Add new function to generate OTP
async function generateOTP(): Promise<string> {
  // Generate a 6-digit OTP
  return String(randomInt(100000, 999999));
}

export function setupAuth(app: Express) {
  app.use(session({
    secret: process.env.SESSION_SECRET || "your-secret-key",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      sameSite: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  }));

  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(
      { usernameField: 'email' },
      async (email, password, done) => {
        try {
          const user = await storage.getUserByEmail(email);
          if (!user) {
            return done(null, false, { message: "Invalid email or password" });
          }

          const passwordValid = await comparePasswords(password, user.password);
          if (!passwordValid) {
            return done(null, false, { message: "Invalid email or password" });
          }

          return done(null, user);
        } catch (err) {
          console.error("Login error:", err);
          return done(err);
        }
      }
    )
  );

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      if (!user) {
        return done(null, false);
      }
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  app.post("/api/register", async (req, res) => {
    try {
      console.log("Registration request received:", { ...req.body, password: '[REDACTED]' });

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

      // Check for existing user first
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(409).json({
          message: "This email is already registered. Please login or use a different email address."
        });
      }

      // Hash password
      const hashedPassword = await hashPassword(password);

      const userData = {
        firstName,
        lastName,
        email,
        password: hashedPassword,
        role,
        tosAccepted,
        emailVerified: false,
        createdAt: new Date(),
      };

      // Create user
      const user = await storage.createUser(userData);
      console.log("User created successfully:", { id: user.id, email: user.email });

      // Send welcome email
      const emailSent = await sendWelcomeEmail(user.email, user.firstName);
      if (!emailSent) {
        console.warn("Failed to send welcome email to:", user.email);
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

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: Express.User | false, info: { message: string } | undefined) => {
      if (err) {
        console.error("Login error:", err);
        return next(err);
      }
      if (!user) {
        return res.status(401).json({ message: info?.message || "Authentication failed" });
      }
      req.login(user, (err) => {
        if (err) {
          return next(err);
        }
        res.json(user);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) {
        return next(err);
      }
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    res.json(req.user);
  });

  // Modify the forgot password endpoint
  app.post("/api/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      const user = await storage.getUserByEmail(email);

      if (!user) {
        // Don't reveal if user exists for security
        return res.status(200).json({
          success: true,
          message: "If an account exists with this email, you will receive a reset code."
        });
      }

      // Generate OTP
      const otp = await generateOTP();
      const expiresAt = new Date(Date.now() + 3600000); // 1 hour from now

      // Store OTP
      await storage.createPasswordResetToken(user.id, otp, expiresAt);

      // Send OTP via email
      const emailSent = await sendPasswordResetEmail(email, otp);

      if (!emailSent) {
        console.error("Failed to send password reset email to:", email);
        return res.status(500).json({
          message: "Error sending password reset email. Please try again later."
        });
      }

      res.status(200).json({
        success: true,
        message: "Reset code sent successfully."
      });
    } catch (error) {
      console.error("Password reset request error:", error);
      res.status(500).json({
        message: "An error occurred while processing your request. Please try again later."
      });
    }
  });

  // Add endpoint to verify OTP and reset password
  app.post("/api/reset-password", async (req, res) => {
    try {
      const { otp, email, newPassword } = req.body;

      if (!otp || !newPassword || !email) {
        return res.status(400).json({
          message: "OTP, new password and email are required"
        });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(400).json({
          message: "Invalid or expired reset code"
        });
      }

      const resetToken = await storage.getPasswordResetToken(otp);
      console.log("Reset token found:", resetToken ? "Yes" : "No");

      if (!resetToken || resetToken.userId !== user.id) {
        return res.status(400).json({
          message: "Invalid or expired reset code"
        });
      }

      // Hash the new password
      const hashedPassword = await hashPassword(newPassword);

      // Update the password
      await storage.updateUserPassword(resetToken.userId, hashedPassword);

      // Delete the used token
      await storage.deletePasswordResetToken(otp);

      res.status(200).json({
        message: "Password has been reset successfully. You can now log in with your new password."
      });
    } catch (error) {
      console.error("Password reset error:", error);
      res.status(500).json({
        message: "An error occurred while resetting your password. Please try again."
      });
    }
  });
}
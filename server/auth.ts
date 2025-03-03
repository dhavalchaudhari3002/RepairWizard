import { Resend } from 'resend';
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import type { User } from "@shared/schema";

const scryptAsync = promisify(scrypt);

// Update Resend response type to match actual API response
interface ResendEmailResponse {
  id: string;
  from: string;
  to: string[];
  created_at: string;
}

// Initialize Resend with proper error handling
const resend = new Resend(process.env.RESEND_API_KEY);

async function sendWelcomeEmail(email: string, firstName: string) {
  if (!process.env.RESEND_API_KEY) {
    console.error('Resend API key is not configured');
    return { success: true }; // Continue with registration even if email fails
  }

  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Welcome, ${firstName}! 🎉</h2>
      <p>Thank you for joining AI Repair Assistant. We're excited to help you with your repair needs!</p>
      <p>You can now log in to your account and start using our services.</p>
      <hr>
      <p style="color: #666; font-size: 12px;">AI Repair Assistant - Your intelligent repair companion</p>
    </div>
  `;

  try {
    const response = await resend.emails.send({
      from: 'AI Repair Assistant <onboarding@resend.dev>',
      to: [email],
      subject: 'Welcome to AI Repair Assistant',
      html: emailHtml,
    });

    if (!response.id) {
      console.error('No email ID received from Resend');
      return { success: true }; // Continue with registration even if email fails
    }

    console.log('Welcome email sent successfully:', {
      messageId: response.id,
      to: email,
      firstName: firstName
    });

    return { success: true };
  } catch (error: any) {
    console.error('Failed to send welcome email:', {
      error: error.message,
      code: error.statusCode,
      data: error.data,
      email,
      firstName
    });
    return { success: true }; // Continue with registration even if email fails
  }
}

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
        emailVerified: true,
        createdAt: new Date(),
      };

      try {
        const user = await storage.createUser(userData);
        console.log("User created successfully:", { id: user.id, email: user.email });

        // Send welcome email but don't wait for it
        sendWelcomeEmail(user.email, user.firstName).catch(err => {
          console.error("Welcome email error (non-blocking):", err);
        });

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
      } catch (error: any) {
        console.error("Database error during user creation:", error);
        throw error;
      }
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
}
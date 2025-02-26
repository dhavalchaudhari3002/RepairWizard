import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import nodemailer from "nodemailer";
import { storage } from "./storage";
import { User as SelectUser, InsertUser, InsertRepairShop, InsertRepairer } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

// Add session type declaration
declare module "express-session" {
  interface SessionData {
    passport: {
      user: number;
    };
  }
}

const scryptAsync = promisify(scrypt);

// Email configuration
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

async function sendVerificationEmail(email: string, token: string, username: string) {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD || !process.env.APP_URL) {
      throw new Error("Missing email configuration");
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error("Invalid email address format");
    }

    const verificationLink = `${process.env.APP_URL}/api/verify?token=${token}`;

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Welcome to Repair Assistant - Please Verify Your Email",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Welcome to Repair Assistant, ${username}! 🎉</h2>
          <p>Thank you for registering with us. We're excited to have you on board!</p>

          <p>To get started, please verify your email address by clicking the button below:</p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationLink}" 
               style="background-color: #4CAF50; color: white; padding: 14px 28px; 
                      text-align: center; text-decoration: none; display: inline-block; 
                      border-radius: 4px; font-weight: bold;">
              Verify Email
            </a>
          </div>

          <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #666;">${verificationLink}</p>

          <p><strong>Note:</strong> This verification link will expire in 24 hours.</p>

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
            <p style="color: #666; font-size: 14px;">
              If you didn't create an account with Repair Assistant, please ignore this email.
            </p>
          </div>
        </div>
      `,
    });
    console.log(`Verification and welcome email sent to ${email}`);
  } catch (error) {
    console.error("Failed to send verification email:", error);
    throw new Error(error instanceof Error ? error.message : "Failed to send verification email");
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
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET ?? "your-secret-key",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      sameSite: true,
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    },
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        console.log(`Login attempt for username: ${username}`);
        const user = await storage.getUserByUsername(username);

        if (!user) {
          console.log(`User not found: ${username}`);
          return done(null, false, { message: "Invalid username or password" });
        }

        const passwordValid = await comparePasswords(password, user.password);
        if (!passwordValid) {
          console.log(`Invalid password for user: ${username}`);
          return done(null, false, { message: "Invalid username or password" });
        }

        if (!user.emailVerified) {
          console.log(`Unverified email for user: ${username}`);
          return done(null, false, { message: "Please verify your email before logging in" });
        }

        console.log(`Successful login for user: ${username}`);
        return done(null, user);
      } catch (err) {
        console.error("Login error:", err);
        return done(err);
      }
    })
  );

  passport.serializeUser((user, done) => {
    console.log(`Serializing user: ${user.id}`);
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      console.log(`Deserializing user: ${id}`);
      const user = await storage.getUser(id);
      if (!user) {
        console.log(`User not found during deserialization: ${id}`);
        return done(null, false);
      }
      done(null, user);
    } catch (err) {
      console.error("Deserialization error:", err);
      done(err);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      console.log("Registration request received:", {
        username: req.body.username,
        email: req.body.email,
        role: req.body.role,
        tosAccepted: req.body.tosAccepted
      });

      // Validate ToS acceptance
      if (!req.body.tosAccepted) {
        return res.status(400).json({ message: "You must accept the Terms of Service" });
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(req.body.email)) {
        return res.status(400).json({ message: "Please provide a valid email address" });
      }

      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        console.log(`Username already exists: ${req.body.username}`);
        return res.status(400).json({ message: "Username already exists" });
      }

      const hashedPassword = await hashPassword(req.body.password);
      const verificationToken = randomBytes(32).toString("hex");

      const userData: InsertUser = {
        username: req.body.username,
        password: hashedPassword,
        email: req.body.email,
        role: req.body.role || "customer",
        phoneNumber: req.body.phoneNumber,
        tosAccepted: req.body.tosAccepted,
        emailVerified: false,
        verificationToken,
      };

      console.log("Creating user with data:", {
        ...userData,
        password: "[REDACTED]",
        verificationToken: "[REDACTED]"
      });

      const user = await storage.createUser(userData);
      console.log(`User created successfully: ${user.id}`);

      // Send verification email
      try {
        await sendVerificationEmail(user.email, verificationToken, user.username);

        // Continue with repairer profile creation if applicable
        if (req.body.role === "repairer") {
          console.log("Creating repairer profile...");
          try {
            const shopData: InsertRepairShop = {
              ownerId: user.id,
              name: req.body.shopName || `${user.username}'s Shop`,
              description: "",
              address: req.body.shopAddress || "",
              phoneNumber: req.body.phoneNumber || "",
              specialties: req.body.specialties || [],
            };

            const shop = await storage.createRepairShop(shopData);
            console.log(`Shop created: ${shop.id}`);

            const repairerData: InsertRepairer = {
              userId: user.id,
              shopId: shop.id,
              specialties: req.body.specialties || [],
              experience: req.body.experience || "",
            };

            await storage.createRepairer(repairerData);
            console.log("Repairer profile created");
          } catch (profileError) {
            console.error("Failed to create repairer profile:", profileError);
            // Continue with registration even if profile creation fails
          }
        }

        res.status(201).json({
          message: "Registration successful! Please check your email to verify your account.",
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
          },
        });
      } catch (emailError) {
        // If email sending fails, delete the created user
        await storage.deleteUser(user.id);
        console.error("Failed to send verification email:", emailError);
        return res.status(400).json({ 
          message: "Failed to send verification email. Please ensure you provided a valid email address." 
        });
      }

    } catch (err) {
      console.error("Registration error:", err);
      next(err);
    }
  });

  app.get("/api/verify", async (req, res) => {
    try {
      console.log("Email verification request received:", req.query);

      const { token } = req.query;
      if (!token) {
        console.log("No verification token provided");
        return res.status(400).json({ message: "Verification token is required" });
      }

      const user = await storage.getUserByVerificationToken(token as string);
      if (!user) {
        console.log(`Invalid verification token: ${token}`);
        return res.status(400).json({ message: "Invalid or expired verification token" });
      }

      console.log(`Verifying email for user: ${user.id}`);
      await storage.updateUser(user.id, {
        emailVerified: true,
        verificationToken: null,
      });

      console.log(`Email verified for user: ${user.id}`);
      res.redirect("/auth?verified=true");
    } catch (err) {
      console.error("Email verification error:", err);
      res.status(500).json({ message: "Error verifying email" });
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: Express.User | false, info: { message: string } | undefined) => {
      if (err) {
        console.error("Login error:", err);
        return next(err);
      }
      if (!user) {
        console.log("Authentication failed:", info?.message);
        return res.status(401).json({ message: info?.message || "Authentication failed" });
      }
      req.login(user, (err) => {
        if (err) {
          console.error("Session creation error:", err);
          return next(err);
        }
        console.log(`User logged in successfully: ${user.id}`);
        res.json(user);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    console.log(`Logout request received for user: ${req.user?.id}`);
    req.logout((err) => {
      if (err) {
        console.error("Logout error:", err);
        return next(err);
      }
      console.log("User logged out successfully");
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      console.log("Unauthenticated user info request");
      return res.status(401).json({ message: "Not authenticated" });
    }
    console.log(`User info requested for: ${req.user.id}`);
    res.json(req.user);
  });
}
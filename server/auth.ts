import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import nodemailer from "nodemailer";
import { storage } from "./storage";
import { users } from "@shared/schema";
import type { User } from "@shared/schema";

const scryptAsync = promisify(scrypt);

declare global {
  namespace Express {
    interface User extends User {}
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

async function sendVerificationEmail(email: string, token: string, firstName: string) {
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
          <h2>Welcome to Repair Assistant, ${firstName}! 🎉</h2>
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
    return true;
  } catch (error) {
    console.error("Failed to send verification email:", error);
    return false;
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

          if (!user.emailVerified) {
            return done(null, false, { message: "Please verify your email before logging in" });
          }

          return done(null, user);
        } catch (err) {
          console.error("Login error:", err);
          return done(err);
        }
      }
    )
  );

  passport.serializeUser((user, done) => {
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
      const { email, password, firstName, lastName, role = "customer", phoneNumber, tosAccepted } = req.body;

      if (!tosAccepted) {
        return res.status(400).json({ message: "You must accept the Terms of Service" });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: "Please provide a valid email address" });
      }

      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already registered" });
      }

      const hashedPassword = await hashPassword(password);
      const verificationToken = randomBytes(32).toString("hex");

      const userData = {
        email,
        firstName,
        lastName,
        password: hashedPassword,
        role,
        phoneNumber,
        tosAccepted,
        emailVerified: false,
        verificationToken,
      };

      const user = await storage.createUser(userData);

      // Send verification email
      const emailSent = await sendVerificationEmail(user.email, verificationToken, user.firstName);

      if (!emailSent) {
        // If email sending fails, delete the created user
        await storage.deleteUser(user.id);
        return res.status(400).json({ 
          message: "Failed to send verification email. Please ensure you provided a valid email address." 
        });
      }

      // If role is repairer, create additional profiles
      if (req.body.role === "repairer") {
        try {
          const shopData = {
            ownerId: user.id,
            name: req.body.shopName || `${user.firstName}'s Shop`,
            description: "",
            address: req.body.shopAddress || "",
            phoneNumber: req.body.phoneNumber || "",
            specialties: req.body.specialties || [],
          };

          const shop = await storage.createRepairShop(shopData);

          const repairerData = {
            userId: user.id,
            shopId: shop.id,
            specialties: req.body.specialties || [],
            experience: req.body.experience || "",
          };

          await storage.createRepairer(repairerData);
        } catch (profileError) {
          console.error("Failed to create repairer profile:", profileError);
          // Continue with registration even if profile creation fails
        }
      }

      res.status(201).json({
        message: "Registration successful! Please check your email to verify your account.",
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
      });

    } catch (err) {
      console.error("Registration error:", err);
      res.status(500).json({ message: "Registration failed. Please try again." });
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: Express.User | false, info: { message: string } | undefined) => {
      if (err) {
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
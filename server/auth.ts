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

    const verificationLink = `${process.env.APP_URL}/api/verify?token=${token}`;

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Verify Your Email",
      html: `
        <h2>Welcome ${username}!</h2>
        <p>Thank you for registering. Please click the button below to verify your email address:</p>
        <a href="${verificationLink}" 
           style="background-color: #4CAF50; color: white; padding: 14px 20px; 
                  text-align: center; text-decoration: none; display: inline-block; 
                  border-radius: 4px; margin: 10px 0;">
          Verify Email
        </a>
        <p>If the button doesn't work, copy and paste this link into your browser:</p>
        <p>${verificationLink}</p>
        <p>This link will expire in 24 hours.</p>
      `,
    });
    console.log(`Verification email sent to ${email}`);
  } catch (error) {
    console.error("Failed to send verification email:", error);
    throw error;
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
        role: req.body.role
      });

      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        console.log(`Username already exists: ${req.body.username}`);
        return res.status(400).json({ message: "Username already exists" });
      }

      const verificationToken = randomBytes(32).toString("hex");
      const hashedPassword = await hashPassword(req.body.password);

      const userData: InsertUser = {
        username: req.body.username,
        password: hashedPassword,
        email: req.body.email,
        role: req.body.role || "customer",
      };

      console.log("Creating user with data:", {
        ...userData,
        password: "[REDACTED]"
      });

      const user = await storage.createUser({
        ...userData,
        verificationToken,
        emailVerified: false,
      });

      console.log(`User created successfully: ${user.id}`);

      try {
        await sendVerificationEmail(user.email, verificationToken, user.username);
      } catch (emailError) {
        console.error("Failed to send verification email:", emailError);
        // Don't fail registration if email fails, but let the user know
        return res.status(201).json({
          message: "Registration successful, but we couldn't send the verification email. Please try logging in later or contact support.",
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
          },
        });
      }

      // If user is a repairer, create shop and profile
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
    console.log("Login request received:", { username: req.body.username });

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
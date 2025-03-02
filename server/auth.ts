import { Resend } from 'resend';
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { users } from "@shared/schema";
import type { User, InsertUser } from "@shared/schema";

const scryptAsync = promisify(scrypt);

// Initialize Resend with more detailed setup verification
const resend = new Resend(process.env.RESEND_API_KEY);

// Verify Resend configuration on startup
(async function verifyResendSetup() {
  try {
    const domains = await resend.domains.list();
    console.log('Resend API key verified successfully');
    console.log('Available domains:', domains.data?.map(d => d.name).join(', ') || 'Using default testing domain');
  } catch (error) {
    console.error('Failed to verify Resend API key:', error);
  }
})();

async function sendVerificationEmail(email: string, token: string, firstName: string) {
  try {
    // Validate required environment variables
    if (!process.env.RESEND_API_KEY) {
      console.error("Missing Resend API key");
      throw new Error("Email service not properly configured");
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.error("Invalid email format:", email);
      throw new Error("Invalid email format");
    }

    // Use the current host as APP_URL if not provided
    const appUrl = process.env.APP_URL || `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`;
    const verificationLink = `${appUrl}/api/verify?token=${token}`;

    // Log the full email request for debugging
    console.log("Sending verification email request:", {
      to: email,
      from: 'AI Repair Assistant <onboarding@resend.dev>',
      subject: 'Verify Your Email - AI Repair Assistant',
      firstName: firstName,
      verificationLink: verificationLink
    });

    try {
      const emailResponse = await resend.emails.send({
        from: 'AI Repair Assistant <onboarding@resend.dev>',
        to: [email],
        subject: 'Verify Your Email - AI Repair Assistant',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Welcome, ${firstName}! 🎉</h2>
            <p>Thank you for joining AI Repair Assistant. We're excited to help you with your repair needs!</p>
            <p>To get started, please verify your email address:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationLink}" 
                 style="background-color: #4CAF50; color: white; padding: 14px 28px; 
                        text-align: center; text-decoration: none; display: inline-block; 
                        border-radius: 4px; font-weight: bold;">
                Verify Email
              </a>
            </div>
            <p>Or copy and paste this link in your browser:</p>
            <p style="word-break: break-all; color: #666;">${verificationLink}</p>
            <p><strong>Note:</strong> This link expires in 24 hours.</p>
            <hr>
            <p style="color: #666; font-size: 12px;">AI Repair Assistant - Your intelligent repair companion</p>
          </div>
        `,
      });

      // Log the full Resend API response
      console.log('Resend API Response:', emailResponse);

      if (!emailResponse || !emailResponse.id) {
        throw new Error("Failed to get valid response from email service");
      }

      console.log('Verification email sent successfully:', {
        messageId: emailResponse.id,
        to: email,
        firstName: firstName
      });

      return true;
    } catch (resendError: any) {
      // Log detailed error information
      console.error('Resend API Error:', {
        error: resendError,
        message: resendError.message,
        code: resendError.statusCode,
        details: resendError.details || {},
        response: resendError.response?.data
      });

      // Handle specific error cases
      if (resendError.statusCode === 401) {
        throw new Error("Invalid API key. Please check your Resend API key configuration.");
      } else if (resendError.statusCode === 403) {
        throw new Error("Email sending forbidden. Please verify your Resend account.");
      } else if (resendError.statusCode === 429) {
        throw new Error("Too many requests. Please try again later.");
      } else if (resendError.statusCode === 422) {
        throw new Error("Invalid email address or sender domain not verified. Please contact support.");
      }

      throw new Error(`Failed to send verification email: ${resendError.message}`);
    }
  } catch (error: any) {
    console.error('Email Service Error:', error);
    throw error;
  }
}

declare global {
  namespace Express {
    // Fix the recursive type reference
    interface User extends Omit<User, keyof Express.User> {}
  }
}

declare module "express-session" {
  interface SessionData {
    passport: {
      user: number;
    };
  }
}

// Initialize Resend
//const resend = new Resend(process.env.RESEND_API_KEY);

// Verify Resend configuration on startup
//(async function verifyResendSetup() {
//  try {
//    const domains = await resend.domains.list();
//    console.log('Resend API key verified successfully');
//    console.log('Available domains:', domains.data?.map(d => d.name).join(', ') || 'Using default testing domain');
//  } catch (error) {
//    console.error('Failed to verify Resend API key:', error);
//  }
//})();


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

      // Check for existing user
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already registered" });
      }

      // Create verification token and hash password
      const hashedPassword = await hashPassword(password);
      const verificationToken = randomBytes(32).toString("hex");

      const userData = {
        firstName,
        lastName,
        email,
        password: hashedPassword,
        role,
        tosAccepted,
        emailVerified: false,
        verificationToken,
        createdAt: new Date(),
      };

      try {
        const user = await storage.createUser(userData);
        console.log("User created successfully:", { id: user.id, email: user.email });

        try {
          await sendVerificationEmail(user.email, verificationToken, user.firstName);
          console.log("Verification email sent successfully for user:", { id: user.id });

          return res.status(201).json({
            message: "Registration successful! Please check your email to verify your account.",
            user: {
              id: user.id,
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName,
              role: user.role,
            },
          });
        } catch (emailError) {
          console.error("Failed to send verification email, deleting user:", { id: user.id, error: emailError });
          await storage.deleteUser(user.id);
          return res.status(400).json({
            message: "Failed to send verification email. Please ensure you provided a valid email address.",
          });
        }
      } catch (error) {
        console.error("Error creating user:", error);
        throw error;
      }
    } catch (err) {
      console.error("Registration error:", err);
      return res.status(500).json({ message: "Registration failed. Please try again." });
    }
  });

  app.get("/api/verify", async (req, res) => {
    try {
      const { token } = req.query;

      if (!token || typeof token !== 'string') {
        return res.status(400).json({ message: "Invalid verification token" });
      }

      const user = await storage.getUserByVerificationToken(token);
      if (!user) {
        return res.status(400).json({ message: "Invalid or expired verification token" });
      }

      await storage.verifyUserEmail(user.id);
      return res.redirect('/auth?verified=true');
    } catch (error) {
      console.error("Email verification error:", error);
      return res.status(500).json({ message: "Failed to verify email. Please try again." });
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
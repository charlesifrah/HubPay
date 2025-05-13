import jwt from 'jsonwebtoken';
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { Express } from "express";
import { storage } from "./storage";
import { LoginUser, InsertUser, User } from "@shared/schema";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";

const scryptAsync = promisify(scrypt);
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';
const JWT_EXPIRY = '24h';

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

export function generateToken(user: User): string {
  const payload = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

export function verifyToken(token: string): any {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

export function setupAuth(app: Express) {
  // Register a new user
  app.post("/api/register", async (req, res) => {
    try {
      const userData = req.body as InsertUser;
      const validatedData = z.object({
        email: z.string().email(),
        password: z.string().min(6),
        name: z.string().min(1),
        role: z.enum(['admin', 'ae'])
      }).parse(userData);

      const existingUser = await storage.getUserByEmail(validatedData.email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already exists" });
      }

      const hashedPassword = await hashPassword(validatedData.password);
      const user = await storage.createUser({
        ...validatedData,
        password: hashedPassword
      });

      const token = generateToken(user);
      res.status(201).json({ user: { id: user.id, email: user.email, name: user.name, role: user.role }, token });
    } catch (error) {
      if (error instanceof z.ZodError) {
        const formattedError = fromZodError(error);
        return res.status(400).json({ message: "Invalid input data", errors: formattedError });
      }
      res.status(500).json({ message: "Server error during registration" });
    }
  });

  // Login user
  app.post("/api/login", async (req, res) => {
    try {
      const { email, password } = req.body as LoginUser;

      const user = await storage.getUserByEmail(email);
      if (!user || !(await comparePasswords(password, user.password))) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const token = generateToken(user);
      res.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role }, token });
    } catch (error) {
      res.status(500).json({ message: "Server error during login" });
    }
  });

  // Get current user
  app.get("/api/user", async (req, res) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: "Unauthorized, no token provided" });
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyToken(token);

    if (!payload) {
      return res.status(401).json({ message: "Unauthorized, invalid token" });
    }

    const user = await storage.getUser(payload.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ id: user.id, email: user.email, name: user.name, role: user.role });
  });

  // Auth middleware for protected routes
  app.use("/api/admin/*", async (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: "Unauthorized, no token provided" });
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyToken(token);

    if (!payload) {
      return res.status(401).json({ message: "Unauthorized, invalid token" });
    }

    if (payload.role !== 'admin') {
      return res.status(403).json({ message: "Forbidden, admin role required" });
    }

    next();
  });

  app.use("/api/ae/*", async (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: "Unauthorized, no token provided" });
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyToken(token);

    if (!payload) {
      return res.status(401).json({ message: "Unauthorized, invalid token" });
    }

    // For AE routes, both admin and AE roles are allowed
    // but we're checking the user exists and storing their ID for later use
    req.body.currentUserId = payload.id;
    next();
  });
}

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { initializeStorage } from "./storage";
import { eq, sql } from 'drizzle-orm';
import { contracts, users, invoices, commissions } from '@shared/schema';
import { db } from './db';
import { spawn } from 'child_process';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Initialize database storage
  try {
    // Initialize the storage with database implementation only
    const storage = await initializeStorage();
    
    // Check database table counts
    const usersCount = await db.select({ count: sql<number>`count(*)` }).from(users);
    const contractsCount = await db.select({ count: sql<number>`count(*)` }).from(contracts);
    const invoicesCount = await db.select({ count: sql<number>`count(*)` }).from(invoices);
    const commissionsCount = await db.select({ count: sql<number>`count(*)` }).from(commissions);
    
    console.log('Database tables status:', {
      users: usersCount[0].count.toString(),
      contracts: contractsCount[0].count.toString(),
      invoices: invoicesCount[0].count.toString(),
      commissions: commissionsCount[0].count.toString()
    });
    
    // Check if we need to seed the database (no users)
    if (usersCount[0].count === 0) {
      console.log("Database needs seeding, running seed script...");
      // Run database seeding script to create initial data
      const seedProcess = spawn('node', ['-r', 'tsx', 'server/seed-db.ts']);
      
      seedProcess.stdout.on('data', (data: any) => {
        console.log(`Seed script: ${data}`);
      });
      
      seedProcess.stderr.on('data', (data: any) => {
        console.error(`Seed script error: ${data}`);
      });
      
      seedProcess.on('close', (code: number) => {
        console.log(`Seed script exited with code ${code}`);
      });
    } 
    // Check if we have users but need to seed contracts
    else if (contractsCount[0].count === 0) {
      console.log("No contracts found, seeding contracts, invoices, and commissions...");
      // Run contracts seeding script to create just the contracts/invoices/commissions
      const seedProcess = spawn('node', ['-r', 'tsx', 'server/seed-contracts.ts']);
      
      seedProcess.stdout.on('data', (data: any) => {
        console.log(`Contracts seed script: ${data}`);
      });
      
      seedProcess.stderr.on('data', (data: any) => {
        console.error(`Contracts seed script error: ${data}`);
      });
      
      seedProcess.on('close', (code: number) => {
        console.log(`Contracts seed script exited with code ${code}`);
      });
    } else {
      console.log("Database already has data, skipping seeding");
    }
  } catch (error) {
    console.error("CRITICAL ERROR: Failed to initialize database storage:", error);
    process.exit(1); // Exit with error code if database setup fails
  }
  
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();

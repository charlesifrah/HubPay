import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { DatabaseStorage } from "./storage-db";
import { storage, setStorage } from "./storage";

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
  // Switch to database storage in production
  if (app.get("env") !== "development") {
    try {
      // Use database storage in production
      console.log("Using DatabaseStorage for production environment");
      const dbStorage = new DatabaseStorage();
      setStorage(dbStorage);
      
      // Run database seeding script to create initial data if needed
      const { spawn } = require('child_process');
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
    } catch (error) {
      console.error("Failed to initialize database storage:", error);
      console.log("Falling back to in-memory storage");
    }
  } else {
    console.log("Using in-memory storage for development environment");
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

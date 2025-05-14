import { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { CommissionEngine } from "./commissionEngine";
import { setupAEManagementRoutes } from "./ae-management";
import { z } from "zod";
import { insertContractSchema, insertInvoiceSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes and middleware
  setupAuth(app);
  
  // Set up Account Executive management routes
  setupAEManagementRoutes(app);

  // Admin Dashboard Overview
  app.get("/api/admin/dashboard", async (req, res) => {
    try {
      console.log("Fetching admin dashboard data");
      
      // Wrap each operation in try/catch to identify specific errors
      let totalCommissions = { total: "0", count: 0 };
      let aeCommissions = [];
      let recentUploads = [];
      let pendingPayouts = [];
      
      try {
        totalCommissions = await storage.getTotalCommissions();
        console.log("Total commissions:", totalCommissions);
      } catch (err) {
        console.error("Error getting total commissions:", err);
      }
      
      try {
        aeCommissions = await storage.getCommissionsByAE();
        console.log("AE commissions:", aeCommissions);
      } catch (err) {
        console.error("Error getting AE commissions:", err);
      }
      
      try {
        recentUploads = await storage.getRecentUploads(10);
        console.log("Recent uploads count:", recentUploads.length);
      } catch (err) {
        console.error("Error getting recent uploads:", err);
      }
      
      try {
        pendingPayouts = await storage.getCommissionsByStatus("pending");
        console.log("Pending payouts count:", pendingPayouts.length);
      } catch (err) {
        console.error("Error getting pending payouts:", err);
      }

      res.json({
        totalCommissions,
        aeCommissions,
        recentUploads,
        pendingPayoutsCount: pendingPayouts.length
      });
    } catch (error) {
      console.error("Admin dashboard error:", error);
      res.status(500).json({ message: "Error fetching admin dashboard data" });
    }
  });

  // AE Dashboard Overview
  app.get("/api/ae/dashboard/:aeId", async (req, res) => {
    try {
      const aeId = parseInt(req.params.aeId);
      
      // Verify user has permission to access this AE's data
      const currentUserId = req.body.currentUserId;
      if (currentUserId !== aeId) {
        const currentUser = await storage.getUser(currentUserId);
        if (currentUser?.role !== 'admin') {
          return res.status(403).json({ message: "Not authorized to view this AE's dashboard" });
        }
      }
      
      const monthlyCommission = await storage.getCurrentMonthCommissionForAE(aeId);
      const ytdCommission = await storage.getYTDCommissionsForAE(aeId);
      const pendingApprovals = await storage.getPendingCommissionsForAE(aeId);
      const totalDeals = await storage.getTotalDealsForAE(aeId);
      const oteProgress = await storage.getOTEProgressForAE(aeId);
      const recentDeals = await storage.getRecentDealsForAE(aeId, 5); // Get 5 most recent deals
      
      res.json({
        monthlyCommission,
        ytdCommission,
        pendingApprovals,
        totalDeals,
        oteProgress,
        recentDeals
      });
    } catch (error) {
      res.status(500).json({ message: "Error fetching AE dashboard data" });
    }
  });

  // Upload Contract (Admin)
  app.post("/api/admin/contracts", async (req, res) => {
    try {
      console.log("Contract upload request body:", req.body);
      
      const contractData = insertContractSchema.parse(req.body);
      console.log("Parsed contract data:", contractData);
      
      // Verify AE exists
      const ae = await storage.getUser(contractData.aeId);
      if (!ae || ae.role !== 'ae') {
        console.log("Invalid AE:", contractData.aeId, ae);
        return res.status(400).json({ message: "Invalid AE selected" });
      }
      
      // Create contract
      const contract = await storage.createContract(contractData);
      
      res.status(201).json({
        message: "Contract created successfully",
        contractId: contract.id
      });
    } catch (error) {
      console.error("Contract creation error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid contract data", errors: error.errors });
      }
      res.status(500).json({ message: "Error creating contract" });
    }
  });

  // Upload Invoice (Admin)
  app.post("/api/admin/invoices", async (req, res) => {
    try {
      console.log("Invoice upload request body:", req.body);
      
      // Fix amount to ensure it's a string (similar to how we handled contractValue)
      if (typeof req.body.amount === 'number') {
        req.body.amount = req.body.amount.toString();
      }
      
      const invoiceData = insertInvoiceSchema.parse(req.body);
      console.log("Parsed invoice data:", invoiceData);
      
      // Verify contract exists
      const contract = await storage.getContract(invoiceData.contractId);
      if (!contract) {
        return res.status(400).json({ message: "Invalid contract selected" });
      }
      
      // Create invoice
      const invoice = await storage.createInvoice(invoiceData);
      
      // Calculate commission
      const commissionEngine = CommissionEngine.getInstance();
      const commissionData = await commissionEngine.calculateCommission(invoice);
      
      // Save commission
      const commission = await storage.createCommission(commissionData);
      
      res.status(201).json({
        message: "Invoice and commission created successfully",
        invoiceId: invoice.id,
        commission
      });
    } catch (error) {
      console.error("Invoice creation error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid invoice data", errors: error.errors });
      }
      res.status(500).json({ message: "Error creating invoice" });
    }
  });

  // Get Commission Statement (AE)
  app.get("/api/ae/commissions/:aeId", async (req, res) => {
    try {
      const aeId = parseInt(req.params.aeId);
      const filterParams = {
        startDate: req.query.startDate as string | undefined,
        endDate: req.query.endDate as string | undefined,
        contractId: req.query.contractId ? parseInt(req.query.contractId as string) : undefined,
        status: req.query.status as string | undefined,
      };
      
      // Verify user has permission to access this AE's data
      const currentUserId = req.body.currentUserId;
      if (currentUserId !== aeId) {
        const currentUser = await storage.getUser(currentUserId);
        if (currentUser?.role !== 'admin') {
          return res.status(403).json({ message: "Not authorized to view this AE's commissions" });
        }
      }
      
      const commissions = await storage.getCommissionsForAE(aeId, filterParams);
      
      res.json(commissions);
    } catch (error) {
      res.status(500).json({ message: "Error fetching commission statement" });
    }
  });

  // Payout Approval (Admin)
  app.get("/api/admin/approvals", async (req, res) => {
    try {
      const filterParams = {
        aeId: req.query.aeId ? parseInt(req.query.aeId as string) : undefined,
      };
      
      const pendingCommissions = await storage.getPendingCommissions(filterParams);
      
      res.json(pendingCommissions);
    } catch (error) {
      res.status(500).json({ message: "Error fetching pending approvals" });
    }
  });

  // Approve Commission
  app.patch("/api/admin/commissions/:id/approve", async (req, res) => {
    try {
      const commissionId = parseInt(req.params.id);
      const adminId = req.body.currentUserId;
      
      const updatedCommission = await storage.updateCommissionStatus(
        commissionId, 
        'approved', 
        adminId
      );
      
      res.json({
        message: "Commission approved successfully",
        commission: updatedCommission
      });
    } catch (error) {
      res.status(500).json({ message: "Error approving commission" });
    }
  });

  // Reject Commission
  app.patch("/api/admin/commissions/:id/reject", async (req, res) => {
    try {
      const commissionId = parseInt(req.params.id);
      const adminId = req.body.currentUserId;
      const reason = req.body.reason;
      
      if (!reason) {
        return res.status(400).json({ message: "Rejection reason is required" });
      }
      
      const updatedCommission = await storage.updateCommissionStatus(
        commissionId, 
        'rejected', 
        adminId, 
        reason
      );
      
      res.json({
        message: "Commission rejected successfully",
        commission: updatedCommission
      });
    } catch (error) {
      res.status(500).json({ message: "Error rejecting commission" });
    }
  });

  // Reports
  app.get("/api/admin/reports", async (req, res) => {
    try {
      const filterParams = {
        startDate: req.query.startDate as string | undefined,
        endDate: req.query.endDate as string | undefined,
        aeId: req.query.aeId ? parseInt(req.query.aeId as string) : undefined,
        minValue: req.query.minValue ? parseFloat(req.query.minValue as string) : undefined,
        maxValue: req.query.maxValue ? parseFloat(req.query.maxValue as string) : undefined,
        contractType: req.query.contractType as string | undefined,
      };
      
      const reportData = await storage.generateReport(filterParams);
      
      res.json(reportData);
    } catch (error) {
      res.status(500).json({ message: "Error generating report" });
    }
  });

  // Get all AEs (for dropdown selections)
  app.get("/api/aes", async (req, res) => {
    try {
      const aes = await storage.getAllAEs();
      res.json(aes);
    } catch (error) {
      res.status(500).json({ message: "Error fetching AEs" });
    }
  });

  // Get all contracts (for dropdown selections)
  app.get("/api/contracts", async (req, res) => {
    try {
      const contracts = await storage.getAllContracts();
      res.json(contracts);
    } catch (error) {
      res.status(500).json({ message: "Error fetching contracts" });
    }
  });
  
  // Profile update endpoint
  app.patch("/api/user/profile", async (req: any, res) => {
    try {
      // Get the JWT token from Authorization header
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: "Unauthorized: No token provided" });
      }
      
      const token = authHeader.split(' ')[1];
      console.log("Token received:", token ? "Yes" : "No");
      
      // Verify the token
      const userData = await import('./auth').then(auth => auth.verifyToken(token));
      if (!userData) {
        return res.status(401).json({ message: "Unauthorized: Invalid token" });
      }
      
      console.log("Token verified, user ID:", userData.id);
      
      // Use the user information from the token
      const user = await storage.getUser(userData.id);
      if (!user) {
        return res.status(401).json({ message: "Unauthorized: User not found" });
      }
      
      const { name, email } = req.body;
      
      // Validate input
      if (!name || !email) {
        return res.status(400).json({ message: "Name and email are required" });
      }
      
      // Check if email already exists but belongs to a different user
      if (email !== user.email) {
        const existingUser = await storage.getUserByEmail(email);
        if (existingUser && existingUser.id !== user.id) {
          return res.status(400).json({ message: "Email already in use by another account" });
        }
      }
      
      // Actually update the user in the in-memory storage
      // Update user fields directly in storage
      const userToUpdate = await storage.getUser(userData.id);
      if (userToUpdate) {
        userToUpdate.name = name;
        userToUpdate.email = email;
        
        // If we had a database implementation, we would save changes here
        console.log(`User data updated: ${userToUpdate.id}, ${userToUpdate.name}, ${userToUpdate.email}`);
      }
      
      const updatedUser = userToUpdate || user;
      
      console.log("Profile updated for user:", updatedUser.id);
      
      // Return success
      res.status(200).json({ 
        user: { 
          id: updatedUser.id, 
          email: updatedUser.email, 
          name: updatedUser.name, 
          role: updatedUser.role 
        } 
      });
    } catch (error) {
      console.error("Profile update error:", error);
      res.status(500).json({ message: "Server error updating profile" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

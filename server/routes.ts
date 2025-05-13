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
      const totalCommissions = await storage.getTotalCommissions();
      const aeCommissions = await storage.getCommissionsByAE();
      const recentUploads = await storage.getRecentUploads(10); // Get 10 most recent uploads
      const pendingPayouts = await storage.getCommissionsByStatus("pending");

      res.json({
        totalCommissions,
        aeCommissions,
        recentUploads,
        pendingPayoutsCount: pendingPayouts.length
      });
    } catch (error) {
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
      const contractData = insertContractSchema.parse(req.body);
      
      // Verify AE exists
      const ae = await storage.getUser(contractData.aeId);
      if (!ae || ae.role !== 'ae') {
        return res.status(400).json({ message: "Invalid AE selected" });
      }
      
      // Create contract
      const contract = await storage.createContract(contractData);
      
      res.status(201).json({
        message: "Contract created successfully",
        contractId: contract.id
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid contract data", errors: error.errors });
      }
      res.status(500).json({ message: "Error creating contract" });
    }
  });

  // Upload Invoice (Admin)
  app.post("/api/admin/invoices", async (req, res) => {
    try {
      const invoiceData = insertInvoiceSchema.parse(req.body);
      
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

  const httpServer = createServer(app);
  return httpServer;
}

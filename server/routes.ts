import { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { getStorage } from "./storage";
import { setupAuth, verifyToken } from "./auth";
import { CommissionEngine } from "./commissionEngine";
import { setupAEManagementRoutes } from "./ae-management";
import { setupAdminManagementRoutes } from "./admin-management";
import { clearDatabase } from "./clear-database";
import { setupTabsApiRoutes } from "./tabs-api";
import { z } from "zod";
import { insertContractSchema, insertInvoiceSchema } from "@shared/schema";

// Add types for Express user authentication
declare global {
  namespace Express {
    interface User {
      id: number;
      email: string;
      name: string;
      role: string;
    }
    
    interface Request {
      isAuthenticated(): boolean;
      logout(callback: (err: any) => void): void;
      login(user: any, callback: (err: any) => void): void;
    }
  }
}

// Middleware functions
const adminOnly = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const user = req.user as any;
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ message: "Forbidden - Admin access required" });
  }

  next();
};

const aeOrAdminOnly = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const user = req.user as any;
  if (!user || (user.role !== 'admin' && user.role !== 'ae')) {
    return res.status(403).json({ message: "Forbidden - AE or Admin access required" });
  }

  next();
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes and middleware
  setupAuth(app);
  
  // Set up Account Executive management routes
  setupAEManagementRoutes(app);
  
  // Set up Admin management routes
  setupAdminManagementRoutes(app);
  
  // Set up Tabs API integration routes
  setupTabsApiRoutes(app);
  
  // Database management API endpoint
  app.post("/api/admin/clear-database", clearDatabase);
  
  // Get contracts with invoices
  app.get("/api/contracts/with-invoices", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authorized" });
      }
      
      // Get all contracts
      const contracts = await getStorage().getAllContracts();
      
      // Get all invoices
      const invoices = await getStorage().getInvoicesWithDetails();
      
      // Create a map of contract IDs to boolean (has invoices or not)
      const contractInvoiceMap: Record<number, boolean> = {};
      
      // Initialize all contracts as having no invoices
      contracts.forEach(contract => {
        contractInvoiceMap[contract.id] = false;
      });
      
      // Mark contracts that have invoices
      invoices.forEach(invoice => {
        if (invoice.contractId) {
          contractInvoiceMap[invoice.contractId] = true;
        }
      });
      
      res.json(contractInvoiceMap);
    } catch (error) {
      console.error("Error getting contracts with invoices:", error);
      res.status(500).json({ message: "Error checking contracts for invoices" });
    }
  });
  
  // Delete a contract (only if it has no invoices)
  app.delete("/api/contracts/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user.role !== 'admin') {
        return res.status(401).json({ message: "Not authorized" });
      }
      
      const contractId = parseInt(req.params.id);
      
      // Check if contract exists
      const contract = await getStorage().getContract(contractId);
      if (!contract) {
        return res.status(404).json({ message: "Contract not found" });
      }
      
      // Check if contract has invoices
      const invoices = await getStorage().getInvoicesForContract(contractId);
      if (invoices && invoices.length > 0) {
        return res.status(400).json({ message: "Cannot delete contract with invoices" });
      }
      
      // Delete the contract
      await getStorage().deleteContract(contractId);
      
      res.json({ message: "Contract deleted successfully" });
    } catch (error) {
      console.error("Error deleting contract:", error);
      res.status(500).json({ message: "Error deleting contract" });
    }
  });

  // Admin Dashboard Overview
  app.get("/api/admin/dashboard", async (req, res) => {
    try {
      console.log("Fetching admin dashboard data");
      
      // Wrap each operation in try/catch to identify specific errors
      let totalCommissions = { total: "0", count: 0 };
      let aeCommissions = [];
      let recentUploads = [];
      let pendingPayouts = [];
      let activeAECount = 0;
      
      try {
        totalCommissions = await getStorage().getTotalCommissions();
        console.log("Total commissions:", totalCommissions);
      } catch (err) {
        console.error("Error getting total commissions:", err);
      }
      
      try {
        aeCommissions = await getStorage().getCommissionsByAE();
        console.log("AE commissions:", aeCommissions);
      } catch (err) {
        console.error("Error getting AE commissions:", err);
      }
      
      try {
        // Get all active AEs regardless of commissions
        const allAEs = await getStorage().getAllAEs();
        activeAECount = allAEs.filter(ae => ae.status === 'active').length;
        console.log("Active AE count:", activeAECount);
      } catch (err) {
        console.error("Error getting active AE count:", err);
      }
      
      try {
        recentUploads = await getStorage().getRecentUploads(10);
        console.log("Recent uploads count:", recentUploads.length);
      } catch (err) {
        console.error("Error getting recent uploads:", err);
      }
      
      try {
        pendingPayouts = await getStorage().getCommissionsByStatus("pending");
        console.log("Pending payouts count:", pendingPayouts.length);
      } catch (err) {
        console.error("Error getting pending payouts:", err);
      }

      res.json({
        totalCommissions,
        aeCommissions,
        recentUploads,
        pendingPayoutsCount: pendingPayouts.length,
        activeAECount
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
      let months = 6; // Default to 6 months
      
      // Handle the period parameter from query string
      if (req.query.period) {
        if (req.query.period === "ytd") {
          // Calculate months from January to current month for YTD option
          const now = new Date();
          months = now.getMonth() + 1; // +1 because months are 0-indexed
        } else {
          // For numeric periods (6, 12)
          months = parseInt(req.query.period as string);
        }
      }
      
      // Check for authentication using JWT token
      const authHeader = req.headers.authorization;
      
      // For debugging purposes - let's check what we received
      console.log("Authorization header:", authHeader ? "Present" : "Missing");
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: "Unauthorized, no token provided" });
      }
      
      const token = authHeader.split(' ')[1];
      console.log("Token received in AE dashboard API");
      
      const payload: any = verifyToken(token);
      
      if (!payload) {
        return res.status(401).json({ message: "Unauthorized, invalid token" });
      }
      
      console.log("Token payload:", payload);
      
      // Get the user from token
      const user = await getStorage().getUser(payload.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      console.log("User retrieved:", { id: user.id, role: user.role });
      
      // Verify user has permission to access this AE's data
      if (user.id !== aeId && user.role !== 'admin') {
        return res.status(403).json({ message: "Not authorized to view this AE's dashboard" });
      }
      
      const monthlyCommission = await getStorage().getCurrentMonthCommissionForAE(aeId);
      const ytdCommission = await getStorage().getYTDCommissionsForAE(aeId);
      const pendingApprovals = await getStorage().getPendingCommissionsForAE(aeId);
      const totalDeals = await getStorage().getTotalDealsForAE(aeId);
      const oteProgress = await getStorage().getOTEProgressForAE(aeId);
      const recentDeals = await getStorage().getRecentDealsForAE(aeId, 5); // Get 5 most recent deals
      
      const monthlyPerformance = await getStorage().getMonthlyCommissionsForAE(aeId, months);
      
      res.json({
        monthlyCommission,
        ytdCommission,
        pendingApprovals,
        totalDeals,
        oteProgress,
        recentDeals,
        monthlyPerformance
      });
    } catch (error) {
      console.error("Error fetching AE dashboard data:", error);
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
      const ae = await getStorage().getUser(contractData.aeId);
      if (!ae || ae.role !== 'ae') {
        console.log("Invalid AE:", contractData.aeId, ae);
        return res.status(400).json({ message: "Invalid AE selected" });
      }
      
      // Create contract
      const contract = await getStorage().createContract(contractData);
      
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
      const contract = await getStorage().getContract(invoiceData.contractId);
      if (!contract) {
        return res.status(400).json({ message: "Invalid contract selected" });
      }
      
      // Create invoice
      const invoice = await getStorage().createInvoice(invoiceData);
      
      // Calculate commission
      const commissionEngine = CommissionEngine.getInstance();
      const commissionData = await commissionEngine.calculateCommission(invoice);
      
      // Save commission
      const commission = await getStorage().createCommission(commissionData);
      
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
        const currentUser = await getStorage().getUser(currentUserId);
        if (currentUser?.role !== 'admin') {
          return res.status(403).json({ message: "Not authorized to view this AE's commissions" });
        }
      }
      
      const commissions = await getStorage().getCommissionsForAE(aeId, filterParams);
      
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
      
      const pendingCommissions = await getStorage().getPendingCommissions(filterParams);
      
      res.json(pendingCommissions);
    } catch (error) {
      res.status(500).json({ message: "Error fetching pending approvals" });
    }
  });

  // Approve Commission (with email notification)
  app.patch("/api/admin/commissions/:id/approve", async (req, res) => {
    try {
      const commissionId = parseInt(req.params.id);
      const adminId = req.body.currentUserId;
      
      // Get commission details for payout
      const commission = await getStorage().getCommission(commissionId);
      if (!commission) {
        return res.status(404).json({ message: "Commission not found" });
      }

      // Get invoice and contract details
      const invoice = await getStorage().getInvoice(commission.invoiceId);
      const contract = invoice ? await getStorage().getContract(invoice.contractId) : null;
      const ae = contract ? await getStorage().getUser(contract.aeId) : null;

      if (!invoice || !contract || !ae) {
        return res.status(400).json({ message: "Missing required data for approval" });
      }

      // Update commission status to approved
      const updatedCommission = await getStorage().updateCommissionStatus(
        commissionId, 
        'approved', 
        adminId
      );

      // Send email notification to admin
      try {
        const admin = await getStorage().getUser(adminId);
        
        if (admin) {
          const { emailNotificationService } = await import('./tabs-api');
          await emailNotificationService.sendPayoutApprovalNotification({
            commissionId: commissionId,
            aeName: ae.name,
            aeEmail: ae.email,
            amount: commission.totalCommission,
            contractClient: contract.clientName,
            adminEmail: admin.email
          });

          console.log('Email notification sent to admin:', admin.email);
        }

        res.json({
          message: "Commission approved and notification sent successfully",
          commission: updatedCommission
        });
      } catch (emailError) {
        console.error('Error sending email notification:', emailError);
        
        // Commission is still approved even if email fails
        res.json({
          message: "Commission approved but email notification failed",
          commission: updatedCommission,
          emailError: emailError instanceof Error ? emailError.message : 'Unknown email error'
        });
      }
    } catch (error) {
      console.error('Error approving commission:', error);
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
      
      const updatedCommission = await getStorage().updateCommissionStatus(
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
  
  // Get Approved Payouts
  app.get("/api/admin/payouts", async (req, res) => {
    try {
      const filterParams = {
        aeId: req.query.aeId ? parseInt(req.query.aeId as string) : undefined,
      };
      
      const approvedPayouts = await getStorage().getCommissionsByStatus('approved');
      
      // Enhance the commissions with more details
      const payoutsWithDetails = await Promise.all(
        approvedPayouts.map(async (payout) => {
          const invoice = await getStorage().getInvoice(payout.invoiceId);
          const contract = invoice ? await getStorage().getContract(invoice.contractId) : null;
          const ae = contract ? await getStorage().getUser(contract.aeId) : null;
          
          return {
            ...payout,
            contractClientName: contract ? contract.clientName : 'Unknown',
            contractType: contract ? contract.contractType : 'Unknown',
            aeName: ae ? ae.name : 'Unknown',
            invoiceAmount: invoice ? invoice.amount : '0',
            approvedByName: payout.approvedBy ? 
              (await getStorage().getUser(payout.approvedBy))?.name || 'Unknown Admin' : 'Unknown',
          };
        })
      );
      
      res.json(payoutsWithDetails);
    } catch (error) {
      res.status(500).json({ message: "Error fetching approved payouts" });
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
      
      const reportData = await getStorage().generateReport(filterParams);
      
      res.json(reportData);
    } catch (error) {
      res.status(500).json({ message: "Error generating report" });
    }
  });

  // Get all AEs (for dropdown selections)
  app.get("/api/aes", async (req, res) => {
    try {
      const aes = await getStorage().getAllAEs();
      res.json(aes);
    } catch (error) {
      res.status(500).json({ message: "Error fetching AEs" });
    }
  });

  // Get all contracts
  app.get("/api/contracts", async (req, res) => {
    try {
      const contracts = await getStorage().getAllContracts();
      res.json(contracts);
    } catch (error) {
      console.error("Error fetching contracts:", error);
      res.status(500).json({ message: "Error fetching contracts" });
    }
  });
  
  // Get all invoices
  app.get("/api/invoices", async (req, res) => {
    try {
      const invoices = await getStorage().getInvoicesWithDetails();
      res.json(invoices);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      res.status(500).json({ message: "Error fetching invoices" });
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
      const user = await getStorage().getUser(userData.id);
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
        const existingUser = await getStorage().getUserByEmail(email);
        if (existingUser && existingUser.id !== user.id) {
          return res.status(400).json({ message: "Email already in use by another account" });
        }
      }
      
      // Actually update the user in the in-memory storage
      // Update user fields directly in storage
      const userToUpdate = await getStorage().getUser(userData.id);
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

  // Commission Configuration endpoints
  app.post("/api/admin/commission-configs", adminOnly, async (req: Request, res: Response) => {
    try {
      const { insertCommissionConfigSchema } = await import("@shared/schema");
      const validatedData = insertCommissionConfigSchema.parse({
        ...req.body,
        createdBy: req.user?.id
      });
      const config = await getStorage().createCommissionConfig(validatedData);
      res.status(201).json(config);
    } catch (error) {
      console.error("Error creating commission config:", error);
      res.status(400).json({ error: "Failed to create commission configuration" });
    }
  });

  app.get("/api/admin/commission-configs", adminOnly, async (req: Request, res: Response) => {
    try {
      const configs = await getStorage().getAllCommissionConfigs();
      res.json(configs);
    } catch (error) {
      console.error("Error fetching commission configs:", error);
      res.status(500).json({ error: "Failed to fetch commission configurations" });
    }
  });

  app.get("/api/admin/commission-configs/:id", adminOnly, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const config = await getStorage().getCommissionConfig(id);
      if (!config) {
        return res.status(404).json({ error: "Commission configuration not found" });
      }
      res.json(config);
    } catch (error) {
      console.error("Error fetching commission config:", error);
      res.status(500).json({ error: "Failed to fetch commission configuration" });
    }
  });

  app.put("/api/admin/commission-configs/:id", adminOnly, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const updates = {
        ...req.body,
        updatedBy: req.user?.id
      };
      const config = await getStorage().updateCommissionConfig(id, updates);
      res.json(config);
    } catch (error) {
      console.error("Error updating commission config:", error);
      res.status(400).json({ error: "Failed to update commission configuration" });
    }
  });

  app.delete("/api/admin/commission-configs/:id", adminOnly, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await getStorage().deleteCommissionConfig(id);
      res.sendStatus(204);
    } catch (error) {
      console.error("Error deleting commission config:", error);
      res.status(500).json({ error: "Failed to delete commission configuration" });
    }
  });

  // Debug migration endpoint
  app.post("/api/admin/debug-migration", adminOnly, async (req: Request, res: Response) => {
    try {
      const { debugMigration } = await import('./debug-migration');
      await debugMigration();
      res.json({ success: true, message: 'Debug migration completed successfully' });
    } catch (error) {
      console.error('Debug migration error:', error);
      res.status(500).json({ error: 'Debug migration failed', details: error.message });
    }
  });

  // Commission configuration migration endpoint
  app.post("/api/admin/migrate-commission-config", adminOnly, async (req: Request, res: Response) => {
    try {
      console.log('Starting commission configuration migration...');
      const { migrateCommissionConfig } = await import('./migrate-commission-config');
      await migrateCommissionConfig();
      console.log('Migration completed successfully');
      res.json({ success: true, message: 'Commission configuration migration completed successfully' });
    } catch (error) {
      console.error('Commission migration error details:', error);
      res.status(500).json({ error: 'Failed to migrate commission configuration', details: error.message });
    }
  });

  // AE Commission Assignment endpoints
  app.post("/api/admin/ae-commission-assignments", adminOnly, async (req: Request, res: Response) => {
    try {
      const { insertAeCommissionAssignmentSchema } = await import("@shared/schema");
      
      // Clean up the request body to handle optional dates
      const cleanedBody = {
        ...req.body,
        createdBy: req.user?.id,
        endDate: req.body.endDate === '' || req.body.endDate === undefined ? null : req.body.endDate
      };
      
      const validatedData = insertAeCommissionAssignmentSchema.parse(cleanedBody);
      const assignment = await getStorage().assignCommissionConfig(validatedData);
      res.status(201).json(assignment);
    } catch (error) {
      console.error("Error creating commission assignment:", error);
      res.status(400).json({ error: "Failed to assign commission configuration" });
    }
  });

  app.get("/api/admin/ae-commission-assignments/:aeId", adminOnly, async (req: Request, res: Response) => {
    try {
      const aeId = parseInt(req.params.aeId);
      const assignments = await getStorage().getCommissionAssignmentsForAE(aeId);
      res.json(assignments);
    } catch (error) {
      console.error("Error fetching commission assignments:", error);
      res.status(500).json({ error: "Failed to fetch commission assignments" });
    }
  });

  app.get("/api/admin/ae-commission-assignments", adminOnly, async (req: Request, res: Response) => {
    try {
      const assignments = await getStorage().getAllCommissionAssignments();
      res.json(assignments);
    } catch (error) {
      console.error("Error fetching all commission assignments:", error);
      res.status(500).json({ error: "Failed to fetch commission assignments" });
    }
  });

  app.get("/api/ae/commission-config", aeOrAdminOnly, async (req: Request, res: Response) => {
    try {
      const aeId = req.user?.role === 'admin' ? parseInt(req.query.aeId as string) : req.user?.id;
      if (!aeId) {
        return res.status(400).json({ error: "AE ID is required" });
      }
      const config = await getStorage().getActiveCommissionConfigForAE(aeId);
      res.json(config || null);
    } catch (error) {
      console.error("Error fetching active commission config:", error);
      res.status(500).json({ error: "Failed to fetch commission configuration" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

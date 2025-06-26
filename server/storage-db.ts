import session from "express-session";
import connectPg from "connect-pg-simple";
import { LoginUser, InsertUser, User, InsertContract, Contract, Invoice, InsertInvoice, Commission, InsertCommission, ContractWithAE, InvoiceWithDetails, CommissionWithDetails, CommissionConfig, InsertCommissionConfig, AeCommissionAssignment, InsertAeCommissionAssignment } from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, lte, sql, SQL, or } from "drizzle-orm";
import { users, contracts, invoices, commissions, invitations, commissionConfigs, aeCommissionAssignments } from "@shared/schema";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // Database initialization
  shouldSeedDatabase(): Promise<boolean>;
  
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllAEs(): Promise<User[]>;
  getAllUsers(): Promise<User[]>;
  updateUser(id: number, updates: Partial<User>): Promise<User>;
  deleteUser(id: number): Promise<void>;

  // Invitation operations
  getInvitation(id: number): Promise<any>;
  getInvitationByEmail(email: string): Promise<any>;
  createInvitation(invitation: { email: string, token: string, role: string, expiresAt: Date, createdBy: number }): Promise<any>;
  updateInvitation(id: number, updates: Partial<{ token: string, expiresAt: Date }>): Promise<any>;
  deleteInvitation(id: number): Promise<void>;
  getAllInvitations(): Promise<any[]>;

  // Contract operations
  getContract(id: number): Promise<Contract | undefined>;
  createContract(contract: InsertContract): Promise<Contract>;
  getAllContracts(): Promise<ContractWithAE[]>;
  deleteContract(id: number): Promise<void>;
  
  // Helper operations for contract and invoice relationships
  getInvoicesForContract(contractId: number): Promise<Invoice[]>;
  getInvoicesWithDetails(): Promise<InvoiceWithDetails[]>;

  // Invoice operations
  getInvoice(id: number): Promise<Invoice | undefined>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  getRecentUploads(limit: number): Promise<(Contract | InvoiceWithDetails)[]>;

  // Commission operations
  createCommission(commission: InsertCommission): Promise<Commission>;
  getCommission(id: number): Promise<Commission | undefined>;
  updateCommissionStatus(
    id: number, 
    status: 'approved' | 'rejected' | 'paid', 
    adminId: number,
    rejectionReason?: string
  ): Promise<Commission>;
  
  // Dashboard data
  getTotalCommissions(): Promise<{ total: string, count: number }>;
  getCommissionsByAE(): Promise<{ aeId: number, aeName: string, total: string, count: number, oteProgress: number }[]>;
  getPendingCommissions(filters?: { aeId?: number }): Promise<CommissionWithDetails[]>;
  
  // AE dashboard
  getCurrentMonthCommissionForAE(aeId: number): Promise<{ total: string, count: number }>;
  getYTDCommissionsForAE(aeId: number): Promise<Commission[]>;
  getPendingCommissionsForAE(aeId: number): Promise<{ count: number, total: string }>;
  getTotalDealsForAE(aeId: number): Promise<number>;
  getOTEProgressForAE(aeId: number): Promise<{ current: string, percentage: number }>;
  getRecentDealsForAE(aeId: number, limit: number): Promise<CommissionWithDetails[]>;
  getMonthlyCommissionsForAE(aeId: number, months: number): Promise<Array<{name: string, commission: number}>>;
  
  // Commission statement
  getCommissionsForAE(
    aeId: number, 
    filters?: { 
      startDate?: string, 
      endDate?: string, 
      contractId?: number,
      status?: string
    }
  ): Promise<CommissionWithDetails[]>;
  
  // Commissions by status
  getCommissionsByStatus(status: string): Promise<Commission[]>;
  
  // Reports
  generateReport(filters?: {
    startDate?: string,
    endDate?: string,
    aeId?: number,
    minValue?: number,
    maxValue?: number,
    contractType?: string
  }): Promise<any>;

  // Commission Configuration operations
  createCommissionConfig(config: InsertCommissionConfig): Promise<CommissionConfig>;
  getCommissionConfig(id: number): Promise<CommissionConfig | undefined>;
  getAllCommissionConfigs(): Promise<CommissionConfig[]>;
  updateCommissionConfig(id: number, updates: Partial<CommissionConfig>): Promise<CommissionConfig>;
  deleteCommissionConfig(id: number): Promise<void>;
  
  // AE Commission Assignment operations
  assignCommissionConfig(assignment: InsertAeCommissionAssignment): Promise<AeCommissionAssignment>;
  getActiveCommissionConfigForAE(aeId: number): Promise<CommissionConfig | undefined>;
  getCommissionAssignmentsForAE(aeId: number): Promise<AeCommissionAssignment[]>;
  getAllCommissionAssignments(): Promise<any[]>;
  updateCommissionAssignment(id: number, updates: Partial<AeCommissionAssignment>): Promise<AeCommissionAssignment>;

  // Session store
  sessionStore: any; // Using any because SessionStore type has issues
}

export class DatabaseStorage implements IStorage {
  sessionStore: any; // Using any type for session store

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true,
      tableName: 'session'
    });
  }
  
  // Check if the database needs to be seeded
  async shouldSeedDatabase(): Promise<boolean> {
    try {
      // Check if users exist
      const userCount = await db.select({ count: sql<number>`count(*)` }).from(users);
      
      // If no users exist, we definitely need to seed
      if (userCount[0].count === 0) {
        return true;
      }
      
      // Check if contracts, invoices, and commissions exist
      const contractCount = await db.select({ count: sql<number>`count(*)` }).from(contracts);
      const invoiceCount = await db.select({ count: sql<number>`count(*)` }).from(invoices);
      const commissionCount = await db.select({ count: sql<number>`count(*)` }).from(commissions);
      
      // If any of these tables are empty, we should seed
      console.log("Database tables status:", {
        users: userCount[0].count,
        contracts: contractCount[0].count,
        invoices: invoiceCount[0].count,
        commissions: commissionCount[0].count
      });
      
      // Use force=true in the URL to force reseeding
      const shouldSeed = 
        contractCount[0].count === 0 || 
        invoiceCount[0].count === 0 || 
        commissionCount[0].count === 0;
      
      return shouldSeed;
    } catch (error) {
      console.error("Error checking if database needs seeding:", error);
      // Return true to ensure tables are created
      return true;
    }
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getAllAEs(): Promise<User[]> {
    // Get all users and filter for AEs to avoid SQL enum type issues
    const allUsers = await db.select().from(users);
    return allUsers.filter(user => user.role === 'ae');
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users);
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    
    if (!user) {
      throw new Error(`User with ID ${id} not found`);
    }
    
    return user;
  }

  async deleteUser(id: number): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }
  
  // Invitation operations
  async getInvitation(id: number): Promise<any> {
    try {
      const [invitation] = await db.select().from(invitations).where(eq(invitations.id, id));
      if (invitation) {
        return {
          ...invitation,
          role: invitation.role || 'ae' // Provide default if missing
        };
      }
      return null;
    } catch (error) {
      console.error("Error in getInvitation:", error);
      return null;
    }
  }
  
  async getInvitationByEmail(email: string): Promise<any> {
    try {
      const [invitation] = await db.select().from(invitations).where(eq(invitations.email, email));
      if (invitation) {
        return {
          ...invitation,
          role: invitation.role || 'ae' // Provide default if missing
        };
      }
      return null;
    } catch (error) {
      console.error("Error in getInvitationByEmail:", error);
      return null;
    }
  }
  
  async createInvitation(invitation: { email: string, token: string, role: string, expiresAt: Date, createdBy: number }): Promise<any> {
    try {
      // Create base invitation data excluding problematic role field
      const invitationData: any = {
        email: invitation.email,
        token: invitation.token,
        expires: invitation.expiresAt,
        createdBy: invitation.createdBy
      };
      
      // Only include role if it's likely to be in the schema (based on enum)
      try {
        // Try inserting with role
        const [result] = await db.insert(invitations).values({
          ...invitationData,
          role: invitation.role as any // Cast to match the enum type
        }).returning();
        
        // Add role to result if it doesn't exist
        return {
          ...result,
          role: result.role || invitation.role || 'ae'
        };
      } catch (roleError) {
        console.error("Error inserting with role, trying without:", roleError);
        // Try inserting without role field
        const [result] = await db.insert(invitations).values(invitationData).returning();
        
        // Add role to result for code consistency
        return {
          ...result,
          role: invitation.role || 'ae'
        };
      }
    } catch (error) {
      console.error("Error in createInvitation:", error);
      throw error;
    }
  }
  
  async updateInvitation(id: number, updates: Partial<{ token: string, expiresAt: Date }>): Promise<any> {
    // Convert expiresAt to expires to match the database schema
    const dbUpdates: any = {};
    if (updates.token) dbUpdates.token = updates.token;
    if (updates.expiresAt) dbUpdates.expires = updates.expiresAt;
    
    const [result] = await db
      .update(invitations)
      .set(dbUpdates)
      .where(eq(invitations.id, id))
      .returning();
    
    if (!result) {
      throw new Error(`Invitation with ID ${id} not found`);
    }
    
    return result;
  }
  
  async deleteInvitation(id: number): Promise<void> {
    await db.delete(invitations).where(eq(invitations.id, id));
  }
  
  async getAllInvitations(): Promise<any[]> {
    try {
      const results = await db.select().from(invitations);
      // Add default role if missing
      return results.map(invitation => ({
        ...invitation,
        role: invitation.role || 'ae' // Provide default if missing
      }));
    } catch (error) {
      console.error("Error in getAllInvitations:", error);
      // Return empty array on error to avoid breaking UI
      return [];
    }
  }

  // Contract operations
  async getContract(id: number): Promise<Contract | undefined> {
    const [contract] = await db.select().from(contracts).where(eq(contracts.id, id));
    return contract;
  }

  async createContract(contract: InsertContract): Promise<Contract> {
    const [newContract] = await db.insert(contracts).values(contract).returning();
    return newContract;
  }

  async getAllContracts(): Promise<ContractWithAE[]> {
    const contractResults = await db
      .select({
        contract: contracts,
        aeName: users.name
      })
      .from(contracts)
      .leftJoin(users, eq(contracts.aeId, users.id));

    return contractResults.map(({ contract, aeName }) => ({
      ...contract,
      aeName: aeName || 'Unknown AE'
    }));
  }

  // Invoice operations
  async getInvoice(id: number): Promise<Invoice | undefined> {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id));
    return invoice;
  }

  async createInvoice(invoice: InsertInvoice): Promise<Invoice> {
    const [newInvoice] = await db.insert(invoices).values(invoice).returning();
    return newInvoice;
  }

  async getRecentUploads(limit: number): Promise<any[]> {
    // Get recent contracts with user information
    const recentContractsQuery = await db
      .select({
        contract: contracts,
        aeName: users.name
      })
      .from(contracts)
      .leftJoin(users, eq(contracts.aeId, users.id))
      .orderBy(desc(contracts.createdAt))
      .limit(limit);

    const recentContracts = recentContractsQuery.map(({ contract, aeName }) => {
      console.log("Contract with AE data:", { contract, aeName });
      return {
        ...contract,
        type: 'contract',
        aeName: aeName || 'Unknown AE'
      };
    });

    // Get recent invoices with details
    const recentInvoicesQuery = await db
      .select({
        invoice: invoices,
        contractClientName: contracts.clientName,
        contractAEName: users.name,
        contractAEId: contracts.aeId
      })
      .from(invoices)
      .leftJoin(contracts, eq(invoices.contractId, contracts.id))
      .leftJoin(users, eq(contracts.aeId, users.id))
      .orderBy(desc(invoices.createdAt))
      .limit(limit);

    const recentInvoices = recentInvoicesQuery.map(({ invoice, contractClientName, contractAEName, contractAEId }) => ({
      ...invoice,
      type: 'invoice',
      contractClientName: contractClientName || 'Unknown Client',
      contractAEName: contractAEName || 'Unknown AE',
      contractAEId: contractAEId || 0
    }));

    // Combine and sort by createdAt
    const combined = [...recentContracts, ...recentInvoices];
    combined.sort((a, b) => {
      // Handle null createdAt dates
      const aTime = a.createdAt ? a.createdAt.getTime() : 0;
      const bTime = b.createdAt ? b.createdAt.getTime() : 0;
      return bTime - aTime;
    });
    
    return combined.slice(0, limit);
  }
  
  async getInvoicesWithDetails(): Promise<InvoiceWithDetails[]> {
    // Get all invoices with details
    const invoicesQuery = await db
      .select({
        invoice: invoices,
        contractClientName: contracts.clientName,
        contractAEName: users.name,
        contractAEId: contracts.aeId
      })
      .from(invoices)
      .leftJoin(contracts, eq(invoices.contractId, contracts.id))
      .leftJoin(users, eq(contracts.aeId, users.id))
      .orderBy(desc(invoices.createdAt));

    // Convert query result to InvoiceWithDetails[]
    return invoicesQuery.map(({ invoice, contractClientName, contractAEName, contractAEId }) => ({
      ...invoice,
      contractClientName: contractClientName || 'Unknown Client',
      contractAEName: contractAEName || 'Unknown AE',
      contractAEId: contractAEId || 0
    }));
  }
  
  // Get invoices for a specific contract
  async getInvoicesForContract(contractId: number): Promise<Invoice[]> {
    const result = await db
      .select()
      .from(invoices)
      .where(eq(invoices.contractId, contractId));
    
    return result;
  }
  
  // Delete a contract
  async deleteContract(id: number): Promise<void> {
    await db
      .delete(contracts)
      .where(eq(contracts.id, id));
  }

  // Commission operations
  async createCommission(commission: InsertCommission): Promise<Commission> {
    const [newCommission] = await db.insert(commissions).values(commission).returning();
    return newCommission;
  }

  async getCommission(id: number): Promise<Commission | undefined> {
    const [commission] = await db.select().from(commissions).where(eq(commissions.id, id));
    return commission;
  }

  async updateCommissionStatus(
    id: number, 
    status: 'approved' | 'rejected' | 'paid', 
    adminId: number,
    rejectionReason?: string
  ): Promise<Commission> {
    const [updatedCommission] = await db
      .update(commissions)
      .set({
        status,
        approvedBy: adminId,
        approvedAt: new Date(),
        rejectionReason
      })
      .where(eq(commissions.id, id))
      .returning();
    
    if (!updatedCommission) {
      throw new Error(`Commission with id ${id} not found`);
    }
    
    return updatedCommission;
  }

  // Dashboard data
  async getTotalCommissions(): Promise<{ total: string, count: number }> {
    const result = await db
      .select({
        total: sql<string>`COALESCE(SUM(${commissions.totalCommission}), 0)::text`,
        count: sql<number>`COUNT(*)`
      })
      .from(commissions)
      .where(
        sql`${commissions.status} = 'approved' OR ${commissions.status} = 'paid'`
      );

    return result[0] || { total: "0.00", count: 0 };
  }

  async getCommissionsByAE(): Promise<{ aeId: number, aeName: string, total: string, count: number, oteProgress: number }[]> {
    const result = await db
      .select({
        aeId: commissions.aeId,
        aeName: users.name,
        total: sql<string>`COALESCE(SUM(${commissions.totalCommission}), 0)::text`,
        count: sql<number>`COUNT(*)`
      })
      .from(commissions)
      .leftJoin(users, eq(commissions.aeId, users.id))
      .where(
        sql`${commissions.status} = 'approved' OR ${commissions.status} = 'paid'`
      )
      .groupBy(commissions.aeId, users.name);

    return result.map(row => ({
      ...row,
      aeName: row.aeName || 'Unknown AE',
      oteProgress: Math.min((parseFloat(row.total) / 1000000) * 100, 100) // Assuming OTE cap is $1M
    }));
  }

  async getPendingCommissions(filters?: { aeId?: number }): Promise<CommissionWithDetails[]> {
    // Get all pending commissions
    let pendingCommissionsQuery = db.select().from(commissions).where(eq(commissions.status, 'pending'));
    
    // Apply AE filter if provided
    if (filters?.aeId) {
      pendingCommissionsQuery = pendingCommissionsQuery.where(eq(commissions.aeId, filters.aeId));
    }
    
    const pendingCommissions = await pendingCommissionsQuery;
    
    // For each commission, get the associated data and build the response object
    const results = await Promise.all(pendingCommissions.map(async (commission) => {
      // Get invoice
      const invoiceResult = await db.select().from(invoices).where(eq(invoices.id, commission.invoiceId));
      const invoice = invoiceResult[0]; 
      
      if (!invoice) {
        console.error(`Invoice ${commission.invoiceId} not found for commission ${commission.id}`);
        return null;
      }
      
      // Get contract
      const contractResult = await db.select().from(contracts).where(eq(contracts.id, invoice.contractId));
      const contract = contractResult[0];
      
      if (!contract) {
        console.error(`Contract ${invoice.contractId} not found for invoice ${invoice.id}`);
        return null;
      }
      
      // Get AE
      const aeResult = await db.select().from(users).where(eq(users.id, commission.aeId));
      const ae = aeResult[0];
      
      if (!ae) {
        console.error(`AE ${commission.aeId} not found for commission ${commission.id}`);
        return null;
      }
      
      return {
        ...commission,
        invoiceAmount: invoice.amount,
        contractClientName: contract.clientName,
        contractType: contract.contractType,
        aeName: ae.name
      };
    }));
    
    // Filter out any null values (where we couldn't find related data)
    return results.filter(item => item !== null) as CommissionWithDetails[];
  }

  // AE dashboard
  async getCurrentMonthCommissionForAE(aeId: number): Promise<{ total: string, count: number }> {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const result = await db
      .select({
        total: sql<string>`COALESCE(SUM(${commissions.totalCommission}), 0)::text`,
        count: sql<number>`COUNT(*)`
      })
      .from(commissions)
      .where(
        and(
          eq(commissions.aeId, aeId),
          gte(commissions.createdAt, firstDayOfMonth),
          sql`(${commissions.status} = 'approved' OR ${commissions.status} = 'paid')`
        )
      );

    return result[0] || { total: "0.00", count: 0 };
  }

  async getYTDCommissionsForAE(aeId: number): Promise<Commission[]> {
    const now = new Date();
    const firstDayOfYear = new Date(now.getFullYear(), 0, 1);
    
    return db
      .select()
      .from(commissions)
      .where(
        and(
          eq(commissions.aeId, aeId),
          gte(commissions.createdAt, firstDayOfYear),
          sql`(${commissions.status} = 'approved' OR ${commissions.status} = 'paid')`
        )
      );
  }

  async getPendingCommissionsForAE(aeId: number): Promise<{ count: number, total: string }> {
    const result = await db
      .select({
        total: sql<string>`COALESCE(SUM(${commissions.totalCommission}), 0)::text`,
        count: sql<number>`COUNT(*)`
      })
      .from(commissions)
      .where(
        and(
          eq(commissions.aeId, aeId),
          eq(commissions.status, 'pending')
        )
      );

    return result[0] || { total: "0.00", count: 0 };
  }

  async getTotalDealsForAE(aeId: number): Promise<number> {
    const result = await db
      .select({
        count: sql<number>`COUNT(*)`
      })
      .from(commissions)
      .where(eq(commissions.aeId, aeId));

    return result[0]?.count || 0;
  }

  async getOTEProgressForAE(aeId: number): Promise<{ current: string, percentage: number }> {
    const ytdCommissions = await this.getYTDCommissionsForAE(aeId);
    const total = ytdCommissions.reduce((sum, comm) => sum + Number(comm.totalCommission), 0);
    const percentage = Math.min((total / 1000000) * 100, 100); // Assuming OTE cap is $1M
    
    return {
      current: total.toFixed(2),
      percentage
    };
  }

  async getRecentDealsForAE(aeId: number, limit: number): Promise<CommissionWithDetails[]> {
    const results = await db
      .select({
        commission: commissions,
        invoiceAmount: invoices.amount,
        contractClientName: contracts.clientName,
        contractType: contracts.contractType,
        aeName: users.name
      })
      .from(commissions)
      .leftJoin(invoices, eq(commissions.invoiceId, invoices.id))
      .leftJoin(contracts, eq(invoices.contractId, contracts.id))
      .leftJoin(users, eq(commissions.aeId, users.id))
      .where(eq(commissions.aeId, aeId))
      .orderBy(desc(commissions.createdAt))
      .limit(limit);

    return results.map(({ commission, invoiceAmount, contractClientName, contractType, aeName }) => ({
      ...commission,
      invoiceAmount: invoiceAmount?.toString() || '0',
      contractClientName: contractClientName || 'Unknown Client',
      contractType: contractType || 'unknown',
      aeName: aeName || 'Unknown AE'
    }));
  }
  
  async getMonthlyCommissionsForAE(aeId: number, months: number): Promise<Array<{name: string, commission: number}>> {
    try {
      // Create a date object for filtering (go back X months from today)
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - months + 1); // Include current month
      startDate.setDate(1); // First day of the month
      startDate.setHours(0, 0, 0, 0); // Beginning of the day
      
      // Get all commissions for this AE within the timeframe
      const commissionsByMonth = await db
        .select({
          month: sql`date_trunc('month', ${commissions.createdAt})::date`,
          total: sql`sum(${commissions.baseCommission}::numeric + ${commissions.pilotBonus}::numeric + ${commissions.multiYearBonus}::numeric + ${commissions.upfrontBonus}::numeric)`,
        })
        .from(commissions)
        .where(
          and(
            eq(commissions.aeId, aeId),
            gte(commissions.createdAt, startDate),
            sql`(${commissions.status} = 'approved' OR ${commissions.status} = 'paid')`
          )
        )
        .groupBy(sql`date_trunc('month', ${commissions.createdAt})`)
        .orderBy(sql`date_trunc('month', ${commissions.createdAt})`);
      
      // Format the data for the chart
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      // Create an array of the last X months with 0 values
      const result = [];
      const currentDate = new Date();
      
      for (let i = months - 1; i >= 0; i--) {
        const monthDate = new Date();
        monthDate.setMonth(currentDate.getMonth() - i);
        
        const monthName = monthNames[monthDate.getMonth()];
        const year = monthDate.getFullYear();
        
        // Find commission data for this month
        const monthData = commissionsByMonth.find(item => {
          const date = new Date(item.month);
          return date.getMonth() === monthDate.getMonth() && date.getFullYear() === monthDate.getFullYear();
        });
        
        result.push({
          name: monthName,
          commission: monthData ? parseFloat(monthData.total as string) : 0
        });
      }
      
      return result;
    } catch (error) {
      console.error("Error getting monthly commissions for AE:", error);
      // Return dummy data for last 6 months if there's an error
      return [
        { name: 'Jan', commission: 0 },
        { name: 'Feb', commission: 0 },
        { name: 'Mar', commission: 0 },
        { name: 'Apr', commission: 0 },
        { name: 'May', commission: 0 },
        { name: 'Jun', commission: 0 }
      ];
    }
  }

  // Commission statement
  async getCommissionsForAE(
    aeId: number, 
    filters?: { 
      startDate?: string, 
      endDate?: string, 
      contractId?: number,
      status?: string
    }
  ): Promise<CommissionWithDetails[]> {
    let conditions = [eq(commissions.aeId, aeId)];
    
    if (filters?.startDate) {
      const startDate = new Date(filters.startDate);
      conditions.push(gte(commissions.createdAt, startDate));
    }
    
    if (filters?.endDate) {
      const endDate = new Date(filters.endDate);
      endDate.setHours(23, 59, 59, 999); // End of the day
      conditions.push(lte(commissions.createdAt, endDate));
    }
    
    if (filters?.status) {
      conditions.push(eq(commissions.status, filters.status));
    }
    
    let query = db
      .select({
        commission: commissions,
        invoiceAmount: invoices.amount,
        contractClientName: contracts.clientName,
        contractType: contracts.contractType,
        aeName: users.name,
        contractId: contracts.id
      })
      .from(commissions)
      .leftJoin(invoices, eq(commissions.invoiceId, invoices.id))
      .leftJoin(contracts, eq(invoices.contractId, contracts.id))
      .leftJoin(users, eq(commissions.aeId, users.id))
      .where(and(...conditions));
    
    if (filters?.contractId) {
      query = query.where(eq(contracts.id, filters.contractId));
    }
    
    const results = await query;
    
    return results.map(({ commission, invoiceAmount, contractClientName, contractType, aeName }) => ({
      ...commission,
      invoiceAmount: invoiceAmount?.toString() || '0',
      contractClientName: contractClientName || 'Unknown Client',
      contractType: contractType || 'unknown',
      aeName: aeName || 'Unknown AE'
    }));
  }

  // Commissions by status
  async getCommissionsByStatus(status: string): Promise<Commission[]> {
    return db
      .select()
      .from(commissions)
      .where(eq(commissions.status, status));
  }

  // Reports
  async generateReport(filters?: {
    startDate?: string,
    endDate?: string,
    aeId?: number,
    minValue?: number,
    maxValue?: number,
    contractType?: string
  }): Promise<any> {
    try {
      // Step 1: Get all commissions that are approved or paid - base query
      const whereConditions = [
        sql`(${commissions.status} = 'approved' OR ${commissions.status} = 'paid')`
      ];
      
      // Step 2: Apply all filters from the request
      if (filters?.startDate) {
        const startDate = new Date(filters.startDate);
        whereConditions.push(gte(commissions.createdAt, startDate));
      }
      
      if (filters?.endDate) {
        const endDate = new Date(filters.endDate);
        endDate.setHours(23, 59, 59, 999);
        whereConditions.push(lte(commissions.createdAt, endDate));
      }
      
      if (filters?.aeId) {
        whereConditions.push(eq(commissions.aeId, filters.aeId));
      }
      
      // Step 3: Execute the query to get all data
      const rawData = await db
        .select({
          commission: commissions,
          ae: users,
          invoice: invoices,
          contract: contracts
        })
        .from(commissions)
        .leftJoin(users, eq(commissions.aeId, users.id))
        .leftJoin(invoices, eq(commissions.invoiceId, invoices.id))
        .leftJoin(contracts, eq(invoices.contractId, contracts.id))
        .where(and(...whereConditions));
        
      // Step 4: Apply remaining filters in memory
      let filteredData = [...rawData];
      
      if (filters?.contractType) {
        filteredData = filteredData.filter(
          r => r.contract && r.contract.contractType === filters.contractType
        );
      }
      
      if (filters?.minValue !== undefined) {
        filteredData = filteredData.filter(
          r => r.invoice && Number(r.invoice.amount) >= (filters.minValue || 0)
        );
      }
      
      if (filters?.maxValue !== undefined) {
        filteredData = filteredData.filter(
          r => r.invoice && Number(r.invoice.amount) <= (filters.maxValue || 0)
        );
      }
      
      // Step 5: Calculate summary statistics
      const totalCommission = filteredData.reduce(
        (sum, item) => sum + Number(item.commission.totalCommission), 
        0
      );
      
      const commissionCount = filteredData.length;
      const avgCommission = commissionCount > 0 ? totalCommission / commissionCount : 0;
      
      // Step 6: Count status distribution
      const statusCounts = {
        pending: 0,
        approved: 0,
        rejected: 0,
        paid: 0
      };
      
      filteredData.forEach(item => {
        const status = item.commission.status as keyof typeof statusCounts;
        statusCounts[status]++;
      });
      
      // Step 7: Group by AE for the table
      const aeGroups = new Map<number, {
        aeId: number;
        aeName: string;
        totalCommission: number;
        deals: number;
      }>();
      
      for (const item of filteredData) {
        const aeId = item.commission.aeId;
        const aeName = item.ae?.name || 'Unknown AE';
        
        if (!aeGroups.has(aeId)) {
          aeGroups.set(aeId, {
            aeId,
            aeName,
            totalCommission: 0,
            deals: 0
          });
        }
        
        const aeData = aeGroups.get(aeId)!;
        aeData.totalCommission += Number(item.commission.totalCommission);
        aeData.deals += 1;
      }
      
      // Step 8: Calculate OTE progress for each AE
      const aePromises = Array.from(aeGroups.values()).map(async aeData => {
        const oteData = await this.getOTEProgressForAE(aeData.aeId);
        
        return {
          aeId: aeData.aeId,
          aeName: aeData.aeName,
          totalCommission: aeData.totalCommission.toString(),
          deals: aeData.deals,
          avgDealSize: (aeData.deals > 0 ? 
                       aeData.totalCommission / aeData.deals : 
                       0).toFixed(2),
          ytdPercentage: oteData.percentage
        };
      });
      
      const byAE = await Promise.all(aePromises);
      
      // Step 9: Format commission items for detailed view
      const commissionItems = filteredData.map(({ commission, ae, invoice, contract }) => ({
        commissionId: commission.id,
        aeId: commission.aeId,
        aeName: ae ? ae.name : 'Unknown AE',
        clientName: contract ? contract.clientName : 'Unknown Client',
        contractType: contract ? contract.contractType : 'unknown',
        invoiceAmount: invoice ? invoice.amount.toString() : '0',
        baseCommission: commission.baseCommission,
        pilotBonus: commission.pilotBonus,
        multiYearBonus: commission.multiYearBonus,
        upfrontBonus: commission.upfrontBonus,
        totalCommission: commission.totalCommission,
        status: commission.status,
        createdAt: commission.createdAt,
        oteApplied: commission.oteApplied
      }));
      
      // Step 10: Return the complete report data
      return {
        commissions: commissionItems,
        summary: {
          totalCommission: totalCommission.toString(),
          totalDeals: commissionCount,
          avgCommission: avgCommission.toFixed(2),
          byStatus: statusCounts
        },
        byAE
      };
    } catch (error) {
      console.error("Error generating report:", error);
      throw error;
    }
  }

  // Commission Configuration operations
  async createCommissionConfig(config: InsertCommissionConfig): Promise<CommissionConfig> {
    const [newConfig] = await db.insert(commissionConfigs).values(config).returning();
    return newConfig;
  }

  async getCommissionConfig(id: number): Promise<CommissionConfig | undefined> {
    const [config] = await db.select().from(commissionConfigs).where(eq(commissionConfigs.id, id));
    return config || undefined;
  }

  async getAllCommissionConfigs(): Promise<CommissionConfig[]> {
    return db.select().from(commissionConfigs).orderBy(desc(commissionConfigs.createdAt));
  }

  async updateCommissionConfig(id: number, updates: Partial<CommissionConfig>): Promise<CommissionConfig> {
    const [updatedConfig] = await db
      .update(commissionConfigs)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(commissionConfigs.id, id))
      .returning();
    return updatedConfig;
  }

  async deleteCommissionConfig(id: number): Promise<void> {
    await db.delete(commissionConfigs).where(eq(commissionConfigs.id, id));
  }

  // AE Commission Assignment operations
  async assignCommissionConfig(assignment: InsertAeCommissionAssignment): Promise<AeCommissionAssignment> {
    const [newAssignment] = await db.insert(aeCommissionAssignments).values(assignment).returning();
    return newAssignment;
  }

  async getActiveCommissionConfigForAE(aeId: number): Promise<CommissionConfig | undefined> {
    const currentDate = new Date().toISOString().split('T')[0];
    
    const [assignment] = await db
      .select({
        config: commissionConfigs
      })
      .from(aeCommissionAssignments)
      .leftJoin(commissionConfigs, eq(aeCommissionAssignments.commissionConfigId, commissionConfigs.id))
      .where(
        and(
          eq(aeCommissionAssignments.aeId, aeId),
          lte(aeCommissionAssignments.effectiveDate, currentDate),
          or(
            eq(aeCommissionAssignments.endDate, null),
            gte(aeCommissionAssignments.endDate, currentDate)
          )
        )
      )
      .orderBy(desc(aeCommissionAssignments.effectiveDate));

    return assignment?.config || undefined;
  }

  async getCommissionAssignmentsForAE(aeId: number): Promise<AeCommissionAssignment[]> {
    return db
      .select()
      .from(aeCommissionAssignments)
      .where(eq(aeCommissionAssignments.aeId, aeId))
      .orderBy(desc(aeCommissionAssignments.effectiveDate));
  }

  async getAllCommissionAssignments(): Promise<any[]> {
    return db
      .select({
        id: aeCommissionAssignments.id,
        aeId: aeCommissionAssignments.aeId,
        commissionConfigId: aeCommissionAssignments.commissionConfigId,
        effectiveDate: aeCommissionAssignments.effectiveDate,
        endDate: aeCommissionAssignments.endDate,
        config: {
          id: commissionConfigs.id,
          name: commissionConfigs.name,
          baseRate: commissionConfigs.baseCommissionRate,
        },
        ae: {
          id: users.id,
          name: users.name,
          email: users.email,
        }
      })
      .from(aeCommissionAssignments)
      .leftJoin(commissionConfigs, eq(aeCommissionAssignments.commissionConfigId, commissionConfigs.id))
      .leftJoin(users, eq(aeCommissionAssignments.aeId, users.id))
      .orderBy(desc(aeCommissionAssignments.effectiveDate));
  }

  async updateCommissionAssignment(id: number, updates: Partial<AeCommissionAssignment>): Promise<AeCommissionAssignment> {
    const [updatedAssignment] = await db
      .update(aeCommissionAssignments)
      .set(updates)
      .where(eq(aeCommissionAssignments.id, id))
      .returning();
    return updatedAssignment;
  }
}

import session from "express-session";
import connectPg from "connect-pg-simple";
import { LoginUser, InsertUser, User, InsertContract, Contract, Invoice, InsertInvoice, Commission, InsertCommission, ContractWithAE, InvoiceWithDetails, CommissionWithDetails } from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, lte, sql, SQL, or } from "drizzle-orm";
import { users, contracts, invoices, commissions, invitations } from "@shared/schema";
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

  // Session store
  sessionStore: session.SessionStore;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.SessionStore;

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

  async getRecentUploads(limit: number): Promise<(Contract | InvoiceWithDetails)[]> {
    // Get recent contracts
    const recentContracts = await db
      .select()
      .from(contracts)
      .orderBy(desc(contracts.createdAt))
      .limit(limit);

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
      contractClientName: contractClientName || 'Unknown Client',
      contractAEName: contractAEName || 'Unknown AE',
      contractAEId: contractAEId || 0
    }));

    // Combine and sort by createdAt
    const combined = [...recentContracts, ...recentInvoices];
    combined.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
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
        eq(commissions.status, 'approved').or(eq(commissions.status, 'paid'))
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
        eq(commissions.status, 'approved').or(eq(commissions.status, 'paid'))
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
          or(
            eq(commissions.status, 'approved'),
            eq(commissions.status, 'paid')
          )
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
          or(
            eq(commissions.status, 'approved'),
            eq(commissions.status, 'paid')
          )
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
    let conditions = [];
    
    if (filters?.startDate) {
      const startDate = new Date(filters.startDate);
      conditions.push(gte(commissions.createdAt, startDate));
    }
    
    if (filters?.endDate) {
      const endDate = new Date(filters.endDate);
      endDate.setHours(23, 59, 59, 999);
      conditions.push(lte(commissions.createdAt, endDate));
    }
    
    if (filters?.aeId) {
      conditions.push(eq(commissions.aeId, filters.aeId));
    }
    
    if (filters?.contractType) {
      conditions.push(eq(contracts.contractType, filters.contractType));
    }
    
    // For min/max value filters, we'll need to filter in the application code
    // since they depend on the invoice amount
    
    let query = db
      .select({
        commission: commissions,
        ae: users,
        invoice: invoices,
        contract: contracts
      })
      .from(commissions)
      .leftJoin(users, eq(commissions.aeId, users.id))
      .leftJoin(invoices, eq(commissions.invoiceId, invoices.id))
      .leftJoin(contracts, eq(invoices.contractId, contracts.id));
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    const results = await query;
    
    // Filter by min/max invoice amount if provided
    let filteredResults = results;
    if (filters?.minValue !== undefined) {
      filteredResults = filteredResults.filter(
        r => r.invoice && Number(r.invoice.amount) >= (filters.minValue || 0)
      );
    }
    if (filters?.maxValue !== undefined) {
      filteredResults = filteredResults.filter(
        r => r.invoice && Number(r.invoice.amount) <= (filters.maxValue || 0)
      );
    }
    
    // Build the report
    const commissionItems = filteredResults.map(({ commission, ae, invoice, contract }) => ({
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
    
    // Calculate summary
    let totalCommission = 0;
    const statusCounts = {
      pending: 0,
      approved: 0,
      rejected: 0,
      paid: 0
    };
    
    for (const item of commissionItems) {
      totalCommission += Number(item.totalCommission);
      statusCounts[item.status as keyof typeof statusCounts]++;
    }
    
    const avgCommission = commissionItems.length > 0 
      ? totalCommission / commissionItems.length 
      : 0;
    
    return {
      commissions: commissionItems,
      summary: {
        totalCommission: totalCommission.toFixed(2),
        count: commissionItems.length,
        avgCommission: avgCommission.toFixed(2),
        byStatus: statusCounts
      }
    };
  }
}
import session from "express-session";
import connectPg from "connect-pg-simple";
import { LoginUser, InsertUser, User, InsertContract, Contract, Invoice, InsertInvoice, Commission, InsertCommission, ContractWithAE, InvoiceWithDetails, CommissionWithDetails } from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, lte, sql, SQL, or } from "drizzle-orm";
import { users, contracts, invoices, commissions } from "@shared/schema";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllAEs(): Promise<User[]>;

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
    return db.select().from(users).where(eq(users.role, 'ae'));
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
    let query = db
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
      .where(eq(commissions.status, 'pending'));

    if (filters?.aeId) {
      query = query.where(eq(commissions.aeId, filters.aeId));
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
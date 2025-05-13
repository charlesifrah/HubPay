import { 
  User, InsertUser, Contract, InsertContract, Invoice, InsertInvoice, 
  Commission, InsertCommission, ContractWithAE, InvoiceWithDetails, CommissionWithDetails
} from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

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

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private contracts: Map<number, Contract>;
  private invoices: Map<number, Invoice>;
  private commissions: Map<number, Commission>;
  private userId: number;
  private contractId: number;
  private invoiceId: number;
  private commissionId: number;
  sessionStore: session.SessionStore;

  constructor() {
    this.users = new Map();
    this.contracts = new Map();
    this.invoices = new Map();
    this.commissions = new Map();
    this.userId = 1;
    this.contractId = 1;
    this.invoiceId = 1;
    this.commissionId = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000
    });
    
    // Add some sample users
    this.createUser({
      email: "admin@example.com",
      password: "$2b$10$RJgaBF1wPQ/9YQFK3oxXzeGQ76/S1QITIJ9CJ0fpf5YZ.hB.tGFa6", // "password"
      name: "Admin User",
      role: "admin"
    });
    
    this.createUser({
      email: "ae@example.com",
      password: "$2b$10$RJgaBF1wPQ/9YQFK3oxXzeGQ76/S1QITIJ9CJ0fpf5YZ.hB.tGFa6", // "password"
      name: "Sarah Johnson",
      role: "ae"
    });
    
    // Add user-specific accounts 
    this.createUser({
      email: "charlieifrah+admin@gmail.com",
      password: "$2b$10$RJgaBF1wPQ/9YQFK3oxXzeGQ76/S1QITIJ9CJ0fpf5YZ.hB.tGFa6", // "password"
      name: "Admin User",
      role: "admin"
    });
    
    this.createUser({
      email: "charlieifrah@gmail.com",
      password: "$2b$10$RJgaBF1wPQ/9YQFK3oxXzeGQ76/S1QITIJ9CJ0fpf5YZ.hB.tGFa6", // "password"
      name: "Charlie Ifrah",
      role: "ae"
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userId++;
    const user: User = { ...insertUser, id, createdAt: new Date() };
    this.users.set(id, user);
    return user;
  }

  async getAllAEs(): Promise<User[]> {
    return Array.from(this.users.values()).filter(user => user.role === 'ae');
  }

  // Contract operations
  async getContract(id: number): Promise<Contract | undefined> {
    return this.contracts.get(id);
  }

  async createContract(contract: InsertContract): Promise<Contract> {
    const id = this.contractId++;
    const newContract: Contract = { ...contract, id, createdAt: new Date() };
    this.contracts.set(id, newContract);
    return newContract;
  }

  async getAllContracts(): Promise<ContractWithAE[]> {
    return Array.from(this.contracts.values()).map(contract => {
      const ae = this.users.get(contract.aeId);
      return {
        ...contract,
        aeName: ae ? ae.name : 'Unknown'
      };
    });
  }

  // Invoice operations
  async getInvoice(id: number): Promise<Invoice | undefined> {
    return this.invoices.get(id);
  }

  async createInvoice(invoice: InsertInvoice): Promise<Invoice> {
    const id = this.invoiceId++;
    const newInvoice: Invoice = { ...invoice, id, createdAt: new Date() };
    this.invoices.set(id, newInvoice);
    return newInvoice;
  }

  async getRecentUploads(limit: number): Promise<(Contract | InvoiceWithDetails)[]> {
    // Combine contracts and invoices, sort by createdAt desc, and limit
    const contractsWithType = Array.from(this.contracts.values()).map(c => ({ 
      ...c, 
      type: 'contract' 
    }));
    
    const invoicesWithDetails = Array.from(this.invoices.values()).map(i => {
      const contract = this.contracts.get(i.contractId);
      const ae = contract ? this.users.get(contract.aeId) : undefined;
      
      return {
        ...i,
        type: 'invoice',
        contractClientName: contract ? contract.clientName : 'Unknown',
        contractAEName: ae ? ae.name : 'Unknown',
        contractAEId: contract ? contract.aeId : 0
      };
    });
    
    const combined = [...contractsWithType, ...invoicesWithDetails];
    
    // Sort by created date (newest first)
    combined.sort((a, b) => 
      b.createdAt.getTime() - a.createdAt.getTime()
    );
    
    return combined.slice(0, limit);
  }

  // Commission operations
  async createCommission(commission: InsertCommission): Promise<Commission> {
    const id = this.commissionId++;
    const newCommission: Commission = { 
      ...commission, 
      id, 
      createdAt: new Date(),
      approvedAt: null,
      approvedBy: null,
      rejectionReason: null
    };
    this.commissions.set(id, newCommission);
    return newCommission;
  }

  async getCommission(id: number): Promise<Commission | undefined> {
    return this.commissions.get(id);
  }

  async updateCommissionStatus(
    id: number, 
    status: 'approved' | 'rejected' | 'paid', 
    adminId: number,
    rejectionReason?: string
  ): Promise<Commission> {
    const commission = this.commissions.get(id);
    if (!commission) {
      throw new Error('Commission not found');
    }
    
    const updatedCommission: Commission = {
      ...commission,
      status,
      approvedBy: adminId,
      approvedAt: new Date(),
      rejectionReason: rejectionReason || null
    };
    
    this.commissions.set(id, updatedCommission);
    return updatedCommission;
  }

  // Dashboard data
  async getTotalCommissions(): Promise<{ total: string, count: number }> {
    const commissions = Array.from(this.commissions.values());
    const total = commissions.reduce(
      (sum, commission) => sum + Number(commission.totalCommission), 
      0
    );
    
    return {
      total: total.toString(),
      count: commissions.length
    };
  }

  async getCommissionsByAE(): Promise<{ aeId: number, aeName: string, total: string, count: number, oteProgress: number }[]> {
    const commissions = Array.from(this.commissions.values());
    const aeCommissions = new Map<number, { total: number, count: number }>();
    
    // Group commissions by AE
    for (const commission of commissions) {
      const current = aeCommissions.get(commission.aeId) || { total: 0, count: 0 };
      aeCommissions.set(commission.aeId, {
        total: current.total + Number(commission.totalCommission),
        count: current.count + 1
      });
    }
    
    // Format the results
    const results = [];
    for (const [aeId, data] of aeCommissions) {
      const ae = this.users.get(aeId);
      if (ae) {
        results.push({
          aeId,
          aeName: ae.name,
          total: data.total.toString(),
          count: data.count,
          oteProgress: Math.min(data.total / 1000000 * 100, 100) // OTE progress as percentage of $1M
        });
      }
    }
    
    // Sort by total commission (highest first)
    results.sort((a, b) => Number(b.total) - Number(a.total));
    
    return results;
  }

  async getPendingCommissions(filters?: { aeId?: number }): Promise<CommissionWithDetails[]> {
    let pendingCommissions = Array.from(this.commissions.values())
      .filter(c => c.status === 'pending');
    
    // Apply filters if provided
    if (filters?.aeId) {
      pendingCommissions = pendingCommissions.filter(c => c.aeId === filters.aeId);
    }
    
    // Enrich with related data
    return pendingCommissions.map(commission => {
      const invoice = this.invoices.get(commission.invoiceId);
      const contract = invoice ? this.contracts.get(invoice.contractId) : undefined;
      const ae = this.users.get(commission.aeId);
      
      return {
        ...commission,
        invoiceAmount: invoice ? invoice.amount : '0',
        contractClientName: contract ? contract.clientName : 'Unknown',
        contractType: contract ? contract.contractType : 'unknown',
        aeName: ae ? ae.name : 'Unknown'
      };
    });
  }

  // AE dashboard
  async getCurrentMonthCommissionForAE(aeId: number): Promise<{ total: string, count: number }> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const commissions = Array.from(this.commissions.values())
      .filter(c => 
        c.aeId === aeId && 
        c.createdAt >= startOfMonth &&
        (c.status === 'approved' || c.status === 'paid')
      );
    
    const total = commissions.reduce(
      (sum, commission) => sum + Number(commission.totalCommission), 
      0
    );
    
    return {
      total: total.toString(),
      count: commissions.length
    };
  }

  async getYTDCommissionsForAE(aeId: number): Promise<Commission[]> {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    
    return Array.from(this.commissions.values())
      .filter(c => 
        c.aeId === aeId && 
        c.createdAt >= startOfYear &&
        (c.status === 'approved' || c.status === 'paid')
      );
  }

  async getPendingCommissionsForAE(aeId: number): Promise<{ count: number, total: string }> {
    const pendingCommissions = Array.from(this.commissions.values())
      .filter(c => c.aeId === aeId && c.status === 'pending');
    
    const total = pendingCommissions.reduce(
      (sum, commission) => sum + Number(commission.totalCommission), 
      0
    );
    
    return {
      count: pendingCommissions.length,
      total: total.toString()
    };
  }

  async getTotalDealsForAE(aeId: number): Promise<number> {
    return Array.from(this.commissions.values())
      .filter(c => c.aeId === aeId && (c.status === 'approved' || c.status === 'paid'))
      .length;
  }

  async getOTEProgressForAE(aeId: number): Promise<{ current: string, percentage: number }> {
    const ytdCommissions = await this.getYTDCommissionsForAE(aeId);
    const total = ytdCommissions.reduce(
      (sum, commission) => sum + Number(commission.totalCommission), 
      0
    );
    
    return {
      current: total.toString(),
      percentage: Math.min(total / 1000000 * 100, 100) // OTE progress as percentage of $1M
    };
  }

  async getRecentDealsForAE(aeId: number, limit: number): Promise<CommissionWithDetails[]> {
    // Get all commissions for this AE
    const aeCommissions = Array.from(this.commissions.values())
      .filter(c => c.aeId === aeId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()) // Sort by date (newest first)
      .slice(0, limit);
    
    // Enrich with related data
    return aeCommissions.map(commission => {
      const invoice = this.invoices.get(commission.invoiceId);
      const contract = invoice ? this.contracts.get(invoice.contractId) : undefined;
      
      return {
        ...commission,
        invoiceAmount: invoice ? invoice.amount : '0',
        contractClientName: contract ? contract.clientName : 'Unknown',
        contractType: contract ? contract.contractType : 'unknown',
        aeName: this.users.get(aeId)?.name || 'Unknown'
      };
    });
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
    let aeCommissions = Array.from(this.commissions.values())
      .filter(c => c.aeId === aeId);
    
    // Apply date filters if provided
    if (filters?.startDate) {
      const startDate = new Date(filters.startDate);
      aeCommissions = aeCommissions.filter(c => c.createdAt >= startDate);
    }
    
    if (filters?.endDate) {
      const endDate = new Date(filters.endDate);
      aeCommissions = aeCommissions.filter(c => c.createdAt <= endDate);
    }
    
    // Apply contract filter if provided
    if (filters?.contractId) {
      aeCommissions = aeCommissions.filter(c => {
        const invoice = this.invoices.get(c.invoiceId);
        return invoice?.contractId === filters.contractId;
      });
    }
    
    // Apply status filter if provided
    if (filters?.status) {
      aeCommissions = aeCommissions.filter(c => c.status === filters.status);
    }
    
    // Sort by date (newest first)
    aeCommissions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    // Enrich with related data
    return aeCommissions.map(commission => {
      const invoice = this.invoices.get(commission.invoiceId);
      const contract = invoice ? this.contracts.get(invoice.contractId) : undefined;
      
      return {
        ...commission,
        invoiceAmount: invoice ? invoice.amount : '0',
        contractClientName: contract ? contract.clientName : 'Unknown',
        contractType: contract ? contract.contractType : 'unknown',
        aeName: this.users.get(aeId)?.name || 'Unknown'
      };
    });
  }

  // Commissions by status
  async getCommissionsByStatus(status: string): Promise<Commission[]> {
    return Array.from(this.commissions.values())
      .filter(c => c.status === status);
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
    let commissions = Array.from(this.commissions.values());
    
    // Apply date filters
    if (filters?.startDate) {
      const startDate = new Date(filters.startDate);
      commissions = commissions.filter(c => c.createdAt >= startDate);
    }
    
    if (filters?.endDate) {
      const endDate = new Date(filters.endDate);
      commissions = commissions.filter(c => c.createdAt <= endDate);
    }
    
    // Apply AE filter
    if (filters?.aeId) {
      commissions = commissions.filter(c => c.aeId === filters.aeId);
    }
    
    // Apply value range filters
    if (filters?.minValue) {
      commissions = commissions.filter(c => Number(c.totalCommission) >= filters.minValue);
    }
    
    if (filters?.maxValue) {
      commissions = commissions.filter(c => Number(c.totalCommission) <= filters.maxValue);
    }
    
    // Apply contract type filter
    if (filters?.contractType) {
      commissions = commissions.filter(c => {
        const invoice = this.invoices.get(c.invoiceId);
        const contract = invoice ? this.contracts.get(invoice.contractId) : undefined;
        return contract?.contractType === filters.contractType;
      });
    }
    
    // Group by AE
    const aeData = new Map<number, { 
      total: number, 
      count: number, 
      avgDealSize: number,
      ytdPercentage: number
    }>();
    
    for (const commission of commissions) {
      const current = aeData.get(commission.aeId) || { 
        total: 0, 
        count: 0, 
        avgDealSize: 0,
        ytdPercentage: 0
      };
      
      const newTotal = current.total + Number(commission.totalCommission);
      const newCount = current.count + 1;
      
      aeData.set(commission.aeId, {
        total: newTotal,
        count: newCount,
        avgDealSize: newTotal / newCount,
        ytdPercentage: newTotal / 1000000 * 100 // as percentage of $1M OTE
      });
    }
    
    // Format results
    const results = {
      summary: {
        totalCommission: commissions.reduce((sum, c) => sum + Number(c.totalCommission), 0).toString(),
        totalDeals: commissions.length,
        avgCommission: commissions.length > 0 
          ? (commissions.reduce((sum, c) => sum + Number(c.totalCommission), 0) / commissions.length).toString()
          : '0'
      },
      byAE: Array.from(aeData.entries()).map(([aeId, data]) => {
        const ae = this.users.get(aeId);
        return {
          aeId,
          aeName: ae ? ae.name : 'Unknown',
          totalCommission: data.total.toString(),
          deals: data.count,
          avgDealSize: data.avgDealSize.toString(),
          ytdPercentage: data.ytdPercentage
        };
      }).sort((a, b) => Number(b.totalCommission) - Number(a.totalCommission)) // Sort by total (highest first)
    };
    
    return results;
  }
}

// Import DatabaseStorage
import { DatabaseStorage } from './storage-db';

// Use DatabaseStorage instead of MemStorage for persistence
export const storage = new MemStorage();

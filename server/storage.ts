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
    
    // Add sample users directly to the maps to avoid async issues
    const adminUser: User = {
      id: 1,
      email: "charlieifrah+admin@gmail.com",
      password: "$2b$10$RJgaBF1wPQ/9YQFK3oxXzeGQ76/S1QITIJ9CJ0fpf5YZ.hB.tGFa6", // "password"
      name: "Charlie Ifrah",  // Restored to previous value
      role: "admin",
      status: "active",
      createdAt: new Date(),
      createdBy: null,
      updatedAt: null,
      updatedBy: null
    };
    this.users.set(adminUser.id, adminUser);
    this.userId = 2; // Set to next available ID
    
    const aeUser: User = {
      id: 2,
      email: "charlieifrah@gmail.com",
      password: "$2b$10$RJgaBF1wPQ/9YQFK3oxXzeGQ76/S1QITIJ9CJ0fpf5YZ.hB.tGFa6", // "password"
      name: "Charlie Ifrah",
      role: "ae",
      status: "active",
      createdAt: new Date(),
      createdBy: null,
      updatedAt: null,
      updatedBy: null
    };
    this.users.set(aeUser.id, aeUser);
    
    // Add sample contract directly 
    const contract1: Contract = {
      id: 1,
      clientName: "Acme Corp",
      aeId: 2, // Charlie's user ID
      contractValue: "256000",
      acv: "64000",
      contractType: "new",
      contractLength: 4,
      paymentTerms: "monthly",
      isPilot: false,
      notes: "Sample contract added to show dashboard functionality",
      createdBy: 1, // Admin's user ID
      createdAt: new Date()
    };
    this.contracts.set(contract1.id, contract1);
    
    // Add the Apple contract that was created
    const contract2: Contract = {
      id: 2,
      clientName: "Apple",
      aeId: 2, // Charlie's user ID
      contractValue: "4000000",
      acv: "1000000",
      contractType: "new", 
      contractLength: 4,
      paymentTerms: "annual",
      isPilot: false,
      notes: "",
      createdBy: 1, // Admin's user ID
      createdAt: new Date()
    };
    this.contracts.set(contract2.id, contract2);
    
    this.contractId = 3; // Set to next available ID
    
    // Add sample invoice for Acme Corp
    const invoice1: Invoice = {
      id: 1,
      contractId: contract1.id,
      amount: "64000",
      invoiceDate: new Date().toISOString().split('T')[0],
      revenueType: "recurring",
      notes: "First quarterly payment",
      createdBy: 1,
      createdAt: new Date()
    };
    this.invoices.set(invoice1.id, invoice1);
    
    // Add sample invoice for Apple
    const invoice2: Invoice = {
      id: 2,
      contractId: contract2.id,
      amount: "1000000",
      invoiceDate: new Date().toISOString().split('T')[0],
      revenueType: "recurring",
      notes: "First annual payment",
      createdBy: 1,
      createdAt: new Date()
    };
    this.invoices.set(invoice2.id, invoice2);
    
    this.invoiceId = 3; // Set to next available ID
    
    // Add sample commission for Acme Corp
    const commission1: Commission = {
      id: 1,
      aeId: 2,
      invoiceId: invoice1.id,
      baseCommission: "6400",
      pilotBonus: "0",
      multiYearBonus: "1600",
      upfrontBonus: "0",
      totalCommission: "8000",
      status: "pending",
      approvedAt: null,
      approvedBy: null,
      rejectionReason: null,
      oteApplied: false,
      // Use a fixed historical date (May 1, 2025) instead of current date/time
      createdAt: new Date('2025-05-01T10:30:00')
    };
    this.commissions.set(1, commission1);
    
    // Add sample commission for Apple
    const commission2: Commission = {
      id: 2,
      aeId: 2,
      invoiceId: invoice2.id,
      baseCommission: "100000",
      pilotBonus: "0",
      multiYearBonus: "10000",
      upfrontBonus: "0",
      totalCommission: "110000",
      status: "pending",
      approvedAt: null,
      approvedBy: null,
      rejectionReason: null,
      oteApplied: false,
      createdAt: new Date('2025-05-13T14:45:00')
    };
    this.commissions.set(2, commission2);
    this.commissionId = 3; // Set to next available ID
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
    const contractsWithType = Array.from(this.contracts.values()).map(c => {
      // Get the AE name from the users map
      const ae = this.users.get(c.aeId);
      return {
        ...c, 
        type: 'contract',
        aeName: ae ? ae.name : 'Unknown'
      };
    });
    
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
// Create an instance of MemStorage for development by default
let _storage: IStorage = new MemStorage();

// Export a function to allow changing the storage implementation
export function setStorage(storageImplementation: IStorage) {
  _storage = storageImplementation;
  console.log("Storage implementation switched");
}

// Export the current storage implementation
export const storage = _storage;

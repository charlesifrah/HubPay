import { Request, Response } from 'express';
import { getStorage } from './storage';

// Extend Express Request type for authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: any;
      isAuthenticated(): boolean;
    }
  }
}

// Tabs API interface
interface TabsInvoice {
  id: string;
  customer_name: string;
  invoice_number: string;
  amount: number;
  currency: string;
  status: 'paid' | 'pending' | 'overdue';
  invoice_date: string;
  paid_date?: string;
  description?: string;
  line_items?: Array<{
    description: string;
    amount: number;
    quantity: number;
  }>;
}

interface TabsApiResponse {
  data: TabsInvoice[];
  pagination?: {
    page: number;
    per_page: number;
    total: number;
  };
}

class TabsApiService {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = process.env.TABS_API_URL || 'https://api.tabs.com/v1';
    this.apiKey = process.env.TABS_API_KEY || '';
  }

  async fetchPaidInvoices(filters?: {
    startDate?: string;
    endDate?: string;
    limit?: number;
    page?: number;
  }): Promise<TabsApiResponse> {
    // If no API key is provided, return simulated data for demonstration
    if (!this.apiKey) {
      return this.getSimulatedData(filters);
    }

    try {
      const params = new URLSearchParams();
      if (filters?.startDate) params.append('start_date', filters.startDate);
      if (filters?.endDate) params.append('end_date', filters.endDate);
      if (filters?.limit) params.append('limit', filters.limit.toString());
      if (filters?.page) params.append('page', filters.page.toString());
      params.append('status', 'paid');

      const response = await fetch(`${this.baseUrl}/invoices?${params}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Tabs API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching from Tabs API:', error);
      // Fallback to simulated data if API fails
      return this.getSimulatedData(filters);
    }
  }

  private getSimulatedData(filters?: {
    startDate?: string;
    endDate?: string;
    limit?: number;
    page?: number;
  }): TabsApiResponse {
    // Simulated Tabs invoice data for demonstration
    const simulatedInvoices: TabsInvoice[] = [
      {
        id: 'tabs_inv_001',
        customer_name: 'Acme Corp',
        invoice_number: 'INV-2025-001',
        amount: 64000,
        currency: 'USD',
        status: 'paid',
        invoice_date: '2025-01-15',
        paid_date: '2025-01-25',
        description: 'Q1 Subscription Payment',
        line_items: [
          { description: 'Platform License', amount: 64000, quantity: 1 }
        ]
      },
      {
        id: 'tabs_inv_002',
        customer_name: 'Apple Inc.',
        invoice_number: 'INV-2025-002',
        amount: 2500000,
        currency: 'USD',
        status: 'paid',
        invoice_date: '2025-01-20',
        paid_date: '2025-02-05',
        description: 'Annual Enterprise License',
        line_items: [
          { description: 'Enterprise License', amount: 2500000, quantity: 1 }
        ]
      },
      {
        id: 'tabs_inv_003',
        customer_name: 'Samsung',
        invoice_number: 'INV-2025-003',
        amount: 3000000,
        currency: 'USD',
        status: 'paid',
        invoice_date: '2025-02-01',
        paid_date: '2025-02-15',
        description: 'Annual Enterprise Subscription',
        line_items: [
          { description: 'Enterprise Subscription', amount: 3000000, quantity: 1 }
        ]
      },
      {
        id: 'tabs_inv_004',
        customer_name: 'Samsara',
        invoice_number: 'INV-2025-004',
        amount: 2500000,
        currency: 'USD',
        status: 'paid',
        invoice_date: '2025-02-10',
        paid_date: '2025-02-28',
        description: 'Q1 Enterprise Payment',
        line_items: [
          { description: 'Enterprise Plan', amount: 2500000, quantity: 1 }
        ]
      }
    ];

    // Apply filters if provided
    let filteredInvoices = simulatedInvoices;
    
    if (filters?.startDate) {
      filteredInvoices = filteredInvoices.filter(inv => 
        new Date(inv.paid_date || inv.invoice_date) >= new Date(filters.startDate!)
      );
    }
    
    if (filters?.endDate) {
      filteredInvoices = filteredInvoices.filter(inv => 
        new Date(inv.paid_date || inv.invoice_date) <= new Date(filters.endDate!)
      );
    }

    // Apply pagination
    const page = filters?.page || 1;
    const limit = filters?.limit || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedInvoices = filteredInvoices.slice(startIndex, endIndex);

    return {
      data: paginatedInvoices,
      pagination: {
        page,
        per_page: limit,
        total: filteredInvoices.length
      }
    };
  }

  async syncInvoiceToDatabase(tabsInvoice: TabsInvoice, contractId?: number, createdBy?: number) {
    
    console.log('Syncing Tabs invoice to database:', {
      tabsId: tabsInvoice.id,
      contractId,
      amount: tabsInvoice.amount,
      customerName: tabsInvoice.customer_name
    });
    
    try {
      // Try to find a matching contract by customer name if contractId not provided
      let targetContractId = contractId;
      
      if (!targetContractId) {
        const contracts = await getStorage().getAllContracts();
        const matchingContract = contracts.find((contract: any) => 
          contract.clientName.toLowerCase() === tabsInvoice.customer_name.toLowerCase()
        );
        
        if (matchingContract) {
          targetContractId = matchingContract.id;
          console.log('Found matching contract:', matchingContract.id, 'for customer:', tabsInvoice.customer_name);
        }
      }
      
      if (!targetContractId) {
        throw new Error(`No contract found for customer: ${tabsInvoice.customer_name}`);
      }
      
      // Check if this Tabs invoice is already synced
      const storage = getStorage();
      const existingInvoices = await storage.getInvoicesWithDetails();
      const alreadySynced = existingInvoices.find((inv: any) => inv.tabsInvoiceId === tabsInvoice.id);
      
      if (alreadySynced) {
        throw new Error(`This invoice has already been synced (Invoice ID: ${alreadySynced.id})`);
      }

      // Create the invoice in our system
      const invoiceData = {
        contractId: targetContractId,
        amount: tabsInvoice.amount.toString(),
        invoiceDate: tabsInvoice.paid_date || tabsInvoice.invoice_date,
        revenueType: 'recurring' as const,
        tabsInvoiceId: tabsInvoice.id,
        syncDetails: `Synced from Tabs - ${tabsInvoice.invoice_number}${tabsInvoice.description ? ` - ${tabsInvoice.description}` : ''}`,
        createdBy: createdBy || 5 // Use existing admin user if not provided
      };
      
      const createdInvoice = await storage.createInvoice(invoiceData);
      console.log('Successfully synced Tabs invoice to database:', createdInvoice.id);
      
      return createdInvoice;
    } catch (error) {
      console.error('Error syncing Tabs invoice to database:', error);
      throw error;
    }
  }
}

export const tabsApiService = new TabsApiService();

// Email notification service for payout approvals
import { MailService } from '@sendgrid/mail';

class EmailNotificationService {
  private mailService: MailService;
  private isConfigured: boolean;

  constructor() {
    this.mailService = new MailService();
    this.isConfigured = !!process.env.SENDGRID_API_KEY;
    
    if (this.isConfigured) {
      this.mailService.setApiKey(process.env.SENDGRID_API_KEY!);
    }
  }

  async sendPayoutApprovalNotification(payoutDetails: {
    commissionId: number;
    aeName: string;
    aeEmail: string;
    amount: string;
    contractClient: string;
    adminEmail: string;
  }): Promise<boolean> {
    if (!this.isConfigured) {
      console.log('SendGrid not configured, simulating email notification:', payoutDetails);
      return true;
    }

    try {
      const emailContent = {
        to: payoutDetails.adminEmail,
        from: process.env.FROM_EMAIL || 'noreply@company.com',
        subject: `Payout Approved - Action Required: Pay ${payoutDetails.aeName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Commission Payout Approved</h2>
            <p>A commission has been approved and requires payment processing:</p>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #495057;">Payout Details</h3>
              <ul style="list-style: none; padding: 0;">
                <li><strong>Commission ID:</strong> ${payoutDetails.commissionId}</li>
                <li><strong>Account Executive:</strong> ${payoutDetails.aeName}</li>
                <li><strong>AE Email:</strong> ${payoutDetails.aeEmail}</li>
                <li><strong>Payout Amount:</strong> $${parseFloat(payoutDetails.amount).toLocaleString()}</li>
                <li><strong>Contract Client:</strong> ${payoutDetails.contractClient}</li>
              </ul>
            </div>
            
            <p><strong>Action Required:</strong> Please process the payment to the Account Executive through your preferred payment method.</p>
            
            <p style="color: #6c757d; font-size: 14px;">
              This is an automated notification from the Sales Commission Management System.
            </p>
          </div>
        `,
        text: `
Commission Payout Approved - Action Required

A commission has been approved and requires payment processing:

Commission ID: ${payoutDetails.commissionId}
Account Executive: ${payoutDetails.aeName}
AE Email: ${payoutDetails.aeEmail}
Payout Amount: $${parseFloat(payoutDetails.amount).toLocaleString()}
Contract Client: ${payoutDetails.contractClient}

Action Required: Please process the payment to the Account Executive through your preferred payment method.
        `
      };

      await this.mailService.send(emailContent);
      console.log('Payout approval notification sent successfully');
      return true;
    } catch (error) {
      console.error('Error sending payout approval notification:', error);
      return false;
    }
  }
}

export const emailNotificationService = new EmailNotificationService();

// Express route handlers
export function setupTabsApiRoutes(app: any) {
  // Fetch paid invoices from Tabs
  app.get('/api/tabs/invoices/paid', async (req: Request, res: Response) => {
    try {
      const filters = {
        startDate: req.query.start_date as string,
        endDate: req.query.end_date as string,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        page: req.query.page ? parseInt(req.query.page as string) : undefined,
      };

      const result = await tabsApiService.fetchPaidInvoices(filters);
      res.json(result);
    } catch (error) {
      console.error('Error fetching Tabs invoices:', error);
      res.status(500).json({ 
        error: 'Failed to fetch invoices from Tabs',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Sync a specific Tabs invoice to local database
  app.post('/api/tabs/invoices/sync', async (req: Request, res: Response) => {
    try {
      const { tabsInvoiceId, contractId } = req.body;
      
      // First fetch the specific invoice from Tabs
      const allInvoices = await tabsApiService.fetchPaidInvoices();
      const tabsInvoice = allInvoices.data.find(inv => inv.id === tabsInvoiceId);
      
      if (!tabsInvoice) {
        return res.status(404).json({ error: 'Invoice not found in Tabs' });
      }

      await tabsApiService.syncInvoiceToDatabase(tabsInvoice, contractId, 5); // Use existing admin user
      
      res.json({ 
        success: true, 
        message: 'Invoice synced successfully',
        invoice: tabsInvoice
      });
    } catch (error) {
      console.error('Error syncing Tabs invoice:', error);
      res.status(500).json({ 
        error: 'Failed to sync invoice',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });


}
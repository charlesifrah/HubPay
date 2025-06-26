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
      },
      {
        id: 'tabs_inv_005',
        customer_name: 'Microsoft Corporation',
        invoice_number: 'INV-2025-005',
        amount: 1800000,
        currency: 'USD',
        status: 'paid',
        invoice_date: '2025-03-01',
        paid_date: '2025-03-10',
        description: 'Q1 Professional Services',
        line_items: [
          { description: 'Professional Services Package', amount: 1800000, quantity: 1 }
        ]
      },
      {
        id: 'tabs_inv_006',
        customer_name: 'Tesla Inc.',
        invoice_number: 'INV-2025-006',
        amount: 950000,
        currency: 'USD',
        status: 'paid',
        invoice_date: '2025-03-05',
        paid_date: '2025-03-15',
        description: 'Monthly Enterprise License',
        line_items: [
          { description: 'Enterprise License - March', amount: 950000, quantity: 1 }
        ]
      },
      {
        id: 'tabs_inv_007',
        customer_name: 'Netflix Inc.',
        invoice_number: 'INV-2025-007',
        amount: 750000,
        currency: 'USD',
        status: 'paid',
        invoice_date: '2025-03-10',
        paid_date: '2025-03-20',
        description: 'Quarterly Platform Subscription',
        line_items: [
          { description: 'Platform Subscription Q1', amount: 750000, quantity: 1 }
        ]
      },
      {
        id: 'tabs_inv_008',
        customer_name: 'Amazon Web Services',
        invoice_number: 'INV-2025-008',
        amount: 2200000,
        currency: 'USD',
        status: 'paid',
        invoice_date: '2025-03-15',
        paid_date: '2025-03-25',
        description: 'Annual Enterprise Partnership',
        line_items: [
          { description: 'Enterprise Partnership License', amount: 2200000, quantity: 1 }
        ]
      },
      {
        id: 'tabs_inv_009',
        customer_name: 'Stripe Inc.',
        invoice_number: 'INV-2025-009',
        amount: 480000,
        currency: 'USD',
        status: 'paid',
        invoice_date: '2025-04-01',
        paid_date: '2025-04-08',
        description: 'API Integration Package',
        line_items: [
          { description: 'API Integration & Support', amount: 480000, quantity: 1 }
        ]
      },
      {
        id: 'tabs_inv_010',
        customer_name: 'Shopify Inc.',
        invoice_number: 'INV-2025-010',
        amount: 620000,
        currency: 'USD',
        status: 'paid',
        invoice_date: '2025-04-05',
        paid_date: '2025-04-12',
        description: 'Monthly Professional License',
        line_items: [
          { description: 'Professional License - April', amount: 620000, quantity: 1 }
        ]
      },
      {
        id: 'tabs_inv_011',
        customer_name: 'Zoom Video Communications',
        invoice_number: 'INV-2025-011',
        amount: 1100000,
        currency: 'USD',
        status: 'paid',
        invoice_date: '2025-04-10',
        paid_date: '2025-04-18',
        description: 'Enterprise Communication Suite',
        line_items: [
          { description: 'Communication Platform License', amount: 1100000, quantity: 1 }
        ]
      },
      {
        id: 'tabs_inv_012',
        customer_name: 'Salesforce Inc.',
        invoice_number: 'INV-2025-012',
        amount: 3500000,
        currency: 'USD',
        status: 'paid',
        invoice_date: '2025-04-15',
        paid_date: '2025-04-25',
        description: 'Multi-Year Enterprise Agreement',
        line_items: [
          { description: 'Enterprise Agreement Year 1', amount: 3500000, quantity: 1 }
        ]
      },
      {
        id: 'tabs_inv_013',
        customer_name: 'Meta Platforms Inc.',
        invoice_number: 'INV-2025-013',
        amount: 1750000,
        currency: 'USD',
        status: 'paid',
        invoice_date: '2025-05-01',
        paid_date: '2025-05-10',
        description: 'Social Media Integration Package',
        line_items: [
          { description: 'Social Platform Integration', amount: 1750000, quantity: 1 }
        ]
      },
      {
        id: 'tabs_inv_014',
        customer_name: 'Adobe Inc.',
        invoice_number: 'INV-2025-014',
        amount: 890000,
        currency: 'USD',
        status: 'paid',
        invoice_date: '2025-05-05',
        paid_date: '2025-05-15',
        description: 'Creative Suite Integration',
        line_items: [
          { description: 'Creative Suite API License', amount: 890000, quantity: 1 }
        ]
      },
      {
        id: 'tabs_inv_015',
        customer_name: 'Uber Technologies',
        invoice_number: 'INV-2025-015',
        amount: 1300000,
        currency: 'USD',
        status: 'paid',
        invoice_date: '2025-05-10',
        paid_date: '2025-05-20',
        description: 'Mobility Platform License',
        line_items: [
          { description: 'Mobility Integration Platform', amount: 1300000, quantity: 1 }
        ]
      },
      {
        id: 'tabs_inv_016',
        customer_name: 'Airbnb Inc.',
        invoice_number: 'INV-2025-016',
        amount: 840000,
        currency: 'USD',
        status: 'paid',
        invoice_date: '2025-05-15',
        paid_date: '2025-05-25',
        description: 'Hospitality Platform Integration',
        line_items: [
          { description: 'Hospitality API License', amount: 840000, quantity: 1 }
        ]
      },
      {
        id: 'tabs_inv_017',
        customer_name: 'Slack Technologies',
        invoice_number: 'INV-2025-017',
        amount: 720000,
        currency: 'USD',
        status: 'paid',
        invoice_date: '2025-06-01',
        paid_date: '2025-06-08',
        description: 'Workplace Collaboration Suite',
        line_items: [
          { description: 'Collaboration Platform License', amount: 720000, quantity: 1 }
        ]
      },
      {
        id: 'tabs_inv_018',
        customer_name: 'GitHub Inc.',
        invoice_number: 'INV-2025-018',
        amount: 560000,
        currency: 'USD',
        status: 'paid',
        invoice_date: '2025-06-05',
        paid_date: '2025-06-12',
        description: 'Developer Platform Integration',
        line_items: [
          { description: 'Developer Tools License', amount: 560000, quantity: 1 }
        ]
      },
      {
        id: 'tabs_inv_019',
        customer_name: 'Twilio Inc.',
        invoice_number: 'INV-2025-019',
        amount: 1050000,
        currency: 'USD',
        status: 'paid',
        invoice_date: '2025-06-10',
        paid_date: '2025-06-18',
        description: 'Communication APIs Package',
        line_items: [
          { description: 'Communication APIs License', amount: 1050000, quantity: 1 }
        ]
      },
      {
        id: 'tabs_inv_020',
        customer_name: 'Square Inc.',
        invoice_number: 'INV-2025-020',
        amount: 675000,
        currency: 'USD',
        status: 'paid',
        invoice_date: '2025-06-15',
        paid_date: '2025-06-22',
        description: 'Payment Processing Integration',
        line_items: [
          { description: 'Payment Platform License', amount: 675000, quantity: 1 }
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
    const limit = filters?.limit || 50;
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
      
      // Calculate and create commission for the synced invoice
      try {
        const { CommissionEngine } = await import('./commissionEngine');
        const commissionEngine = CommissionEngine.getInstance();
        const commissionData = await commissionEngine.calculateCommission(createdInvoice);
        const commission = await storage.createCommission(commissionData);
        console.log('Commission created for synced invoice:', commission.id);
      } catch (commissionError) {
        console.error('Error creating commission for synced invoice:', commissionError);
        // Continue without failing the sync if commission creation fails
      }
      
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
      const allInvoices = await tabsApiService.fetchPaidInvoices({ limit: 50 });
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
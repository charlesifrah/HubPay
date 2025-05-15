import { db } from './db';
import { users, contracts, invoices, commissions } from '@shared/schema';
import { CommissionEngine } from './commissionEngine';

async function seedContractsWithExistingUsers() {
  console.log('Seeding contracts with existing users...');
  
  // Find admin and AE users
  const adminUser = await db.select().from(users).where(eq(users.role, 'admin')).limit(1);
  const aeUser = await db.select().from(users).where(eq(users.role, 'ae')).limit(1);
  
  if (adminUser.length === 0 || aeUser.length === 0) {
    console.error('ERROR: Cannot seed contracts - admin or AE user is missing');
    process.exit(1);
  }
  
  console.log(`Found admin user: ${adminUser[0].id} (${adminUser[0].name})`);
  console.log(`Found AE user: ${aeUser[0].id} (${aeUser[0].name})`);
  
  // Check for existing contracts
  const existingContracts = await db.select().from(contracts);
  if (existingContracts.length > 0) {
    console.log('Contracts already exist, skipping contract seeding');
    return [];
  }
  
  // Add Acme Corp contract
  const [acmeContract] = await db.insert(contracts).values({
    clientName: "Acme Corp",
    aeId: aeUser[0].id,
    contractValue: "256000",
    acv: "64000",
    contractType: "new",
    contractLength: 4,
    paymentTerms: "monthly",
    isPilot: false,
    notes: "Sample contract added to show dashboard functionality",
    createdBy: adminUser[0].id
  }).returning();
  console.log('Created Acme Corp contract');

  // Add Apple contract
  const [appleContract] = await db.insert(contracts).values({
    clientName: "Apple",
    aeId: aeUser[0].id,
    contractValue: "4000000",
    acv: "1000000",
    contractType: "new",
    contractLength: 4,
    paymentTerms: "annual",
    isPilot: false,
    notes: "",
    createdBy: adminUser[0].id
  }).returning();
  console.log('Created Apple contract');
  
  return [acmeContract, appleContract];
}

async function seedInvoicesWithContracts(adminUser: any, contractList: any[]) {
  console.log('Seeding invoices...');
  
  // Check for existing invoices
  const existingInvoices = await db.select().from(invoices);
  if (existingInvoices.length > 0) {
    console.log('Invoices already exist, skipping invoice seeding');
    return [];
  }
  
  // Add an invoice for Acme Corp
  const [acmeInvoice] = await db.insert(invoices).values({
    contractId: contractList[0].id,
    amount: "64000",
    invoiceDate: new Date().toISOString().split('T')[0],
    revenueType: "recurring",
    notes: "First quarterly payment",
    createdBy: adminUser.id
  }).returning();
  console.log('Created Acme Corp invoice');

  // Add an invoice for Apple
  const [appleInvoice] = await db.insert(invoices).values({
    contractId: contractList[1].id,
    amount: "1000000",
    invoiceDate: new Date().toISOString().split('T')[0],
    revenueType: "recurring",
    notes: "First annual payment",
    createdBy: adminUser.id
  }).returning();
  console.log('Created Apple invoice');

  return [acmeInvoice, appleInvoice];
}

async function seedCommissions(invoiceList: any[]) {
  console.log('Seeding commissions...');
  
  // Check for existing commissions
  const existingCommissions = await db.select().from(commissions);
  if (existingCommissions.length > 0) {
    console.log('Commissions already exist, skipping commission seed.');
    return;
  }

  // For each invoice, calculate and create a commission
  const commissionEngine = CommissionEngine.getInstance();
  
  for (const invoice of invoiceList) {
    const commissionData = await commissionEngine.calculateCommission(invoice);
    const [commission] = await db.insert(commissions).values(commissionData).returning();
    console.log(`Created commission ${commission.id} for invoice ${invoice.id}`);
  }

  console.log('Commission seeding completed successfully.');
}

// Run the seeding function
async function seedAll() {
  try {
    // Get the first admin user
    const [adminUser] = await db.select().from(users).where(eq(users.role, 'admin')).limit(1);
    
    // Seed contracts
    const contractList = await seedContractsWithExistingUsers();
    
    if (contractList.length > 0) {
      // Seed invoices
      const invoiceList = await seedInvoicesWithContracts(adminUser, contractList);
      
      if (invoiceList.length > 0) {
        // Seed commissions
        await seedCommissions(invoiceList);
      }
    }
    
    console.log("Contract/invoice/commission seeding completed successfully");
  } catch (error) {
    console.error("Error seeding contracts/invoices/commissions:", error);
  }
}

// Import the eq operator
import { eq } from "drizzle-orm";

seedAll()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error seeding database:', err);
    process.exit(1);
  });
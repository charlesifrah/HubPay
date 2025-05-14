import { db } from './db';
import { users, contracts, invoices, commissions } from '@shared/schema';
import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';
import { CommissionEngine } from './commissionEngine';

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function seedUsers() {
  console.log('Seeding database with initial users...');
  
  // Check if users already exist
  const existingUsers = await db.select().from(users);
  if (existingUsers.length > 0) {
    console.log('Users already exist in the database, skipping user seed.');
    return existingUsers;
  }

  // Create admin user
  const adminPassword = await hashPassword("password");
  const [adminUser] = await db.insert(users).values({
    email: "charlieifrah+admin@gmail.com",
    password: adminPassword,
    name: "Charlie Ifrah",
    role: "admin",
    status: "active"
  }).returning();
  console.log('Created admin user:', adminUser.email);

  // Create AE user
  const aePassword = await hashPassword("password");
  const [aeUser] = await db.insert(users).values({
    email: "charlieifrah@gmail.com",
    password: aePassword,
    name: "Charlie Ifrah",
    role: "ae",
    status: "active"
  }).returning();
  console.log('Created AE user:', aeUser.email);

  console.log('User seeding completed successfully.');
  return [adminUser, aeUser];
}

async function seedContracts(adminUser: any, aeUser: any) {
  console.log('Seeding contracts...');
  
  // Check if contracts already exist
  const existingContracts = await db.select().from(contracts);
  if (existingContracts.length > 0) {
    console.log('Contracts already exist in the database, skipping contract seed.');
    return existingContracts;
  }

  // Add Acme Corp contract
  const [acmeContract] = await db.insert(contracts).values({
    clientName: "Acme Corp",
    aeId: aeUser.id,
    contractValue: "256000",
    acv: "64000",
    contractType: "new",
    contractLength: 4,
    paymentTerms: "monthly",
    isPilot: false,
    notes: "Sample contract added to show dashboard functionality",
    createdBy: adminUser.id
  }).returning();
  console.log('Created Acme Corp contract');

  // Add Apple contract
  const [appleContract] = await db.insert(contracts).values({
    clientName: "Apple",
    aeId: aeUser.id,
    contractValue: "4000000",
    acv: "1000000",
    contractType: "new",
    contractLength: 4,
    paymentTerms: "annual",
    isPilot: false,
    notes: "",
    createdBy: adminUser.id
  }).returning();
  console.log('Created Apple contract');

  console.log('Contract seeding completed successfully.');
  return [acmeContract, appleContract];
}

async function seedInvoices(adminUser: any, contractList: any[]) {
  console.log('Seeding invoices...');
  
  // Check if invoices already exist
  const existingInvoices = await db.select().from(invoices);
  if (existingInvoices.length > 0) {
    console.log('Invoices already exist in the database, skipping invoice seed.');
    return existingInvoices;
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

  console.log('Invoice seeding completed successfully.');
  return [acmeInvoice, appleInvoice];
}

async function seedCommissions(invoiceList: any[]) {
  console.log('Seeding commissions...');
  
  // Check if commissions already exist
  const existingCommissions = await db.select().from(commissions);
  if (existingCommissions.length > 0) {
    console.log('Commissions already exist in the database, skipping commission seed.');
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
  const userList = await seedUsers();
  if (userList.length > 0) {
    const adminUser = userList.find(u => u.role === 'admin');
    const aeUser = userList.find(u => u.role === 'ae');
    
    if (adminUser && aeUser) {
      const contractList = await seedContracts(adminUser, aeUser);
      if (contractList.length > 0) {
        const invoiceList = await seedInvoices(adminUser, contractList);
        if (invoiceList.length > 0) {
          await seedCommissions(invoiceList);
        }
      }
    }
  }
}

seedAll()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error seeding database:', err);
    process.exit(1);
  });
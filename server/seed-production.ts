import { db } from './db';
import { users, contracts, invoices, commissions } from '@shared/schema';
import { CommissionEngine } from './commissionEngine';
import { eq } from 'drizzle-orm';

async function seedProductionData() {
  try {
    console.log('Starting production database seeding...');
    
    // 1. Find existing users 
    const adminUser = await db.query.users.findFirst({
      where: eq(users.role, 'admin')
    });
    
    const aeUser = await db.query.users.findFirst({
      where: eq(users.role, 'ae')
    });
    
    if (!adminUser || !aeUser) {
      console.error('Required users not found. Need both admin and ae users.');
      return;
    }
    
    console.log(`Using admin: ${adminUser.email} (ID: ${adminUser.id})`);
    console.log(`Using AE: ${aeUser.email} (ID: ${aeUser.id})`);
    
    // 2. Seed contracts if needed
    let contractList = await db.select().from(contracts);
    if (contractList.length === 0) {
      console.log('Seeding contracts...');
      
      // Add Acme Corp contract
      const [acmeContract] = await db.insert(contracts).values({
        clientName: "Acme Corp",
        aeId: aeUser.id,  // Using existing AE user ID
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
        aeId: aeUser.id,  // Using existing AE user ID
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
      
      contractList = [acmeContract, appleContract];
    } else {
      console.log(`Found ${contractList.length} existing contracts`);
    }
    
    // 3. Seed invoices if needed
    let invoiceList = await db.select().from(invoices);
    if (invoiceList.length === 0 && contractList.length > 0) {
      console.log('Seeding invoices...');
      
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
      
      // Add an invoice for Apple (if there's a second contract)
      if (contractList.length > 1) {
        const [appleInvoice] = await db.insert(invoices).values({
          contractId: contractList[1].id,
          amount: "1000000",
          invoiceDate: new Date().toISOString().split('T')[0],
          revenueType: "recurring",
          notes: "First annual payment",
          createdBy: adminUser.id
        }).returning();
        console.log('Created Apple invoice');
        
        invoiceList = [acmeInvoice, appleInvoice];
      } else {
        invoiceList = [acmeInvoice];
      }
    } else {
      console.log(`Found ${invoiceList.length} existing invoices`);
    }
    
    // 4. Seed commissions if needed
    const existingCommissions = await db.select().from(commissions);
    if (existingCommissions.length === 0 && invoiceList.length > 0) {
      console.log('Seeding commissions...');
      
      // For each invoice, calculate and create a commission
      const commissionEngine = CommissionEngine.getInstance();
      
      for (const invoice of invoiceList) {
        // Fetch the full invoice with relations to pass to the commission engine
        const fullInvoice = await db.query.invoices.findFirst({
          where: eq(invoices.id, invoice.id),
          with: { contract: true }
        });
        
        if (fullInvoice) {
          const commissionData = await commissionEngine.calculateCommission(invoice);
          
          // Make sure the AE ID is set correctly for the commission
          commissionData.aeId = fullInvoice.contract?.aeId || aeUser.id;
          
          const [commission] = await db.insert(commissions).values(commissionData).returning();
          console.log(`Created commission ${commission.id} for invoice ${invoice.id}`);
        }
      }
      
      console.log('Commission seeding completed successfully.');
    } else {
      console.log(`Found ${existingCommissions.length} existing commissions`);
    }
    
    console.log('Production seeding completed successfully!');
  } catch (error) {
    console.error('Error seeding production database:', error);
  }
}

// Run the seeding function
seedProductionData()
  .then(() => {
    console.log('Production seeding completed.');
    process.exit(0);
  })
  .catch(err => {
    console.error('Error in production seeding process:', err);
    process.exit(1);
  });
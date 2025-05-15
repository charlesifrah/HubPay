import { db } from './db';
import { invoices, commissions, contracts } from '@shared/schema';
import { eq } from 'drizzle-orm';

async function createMissingCommissions() {
  try {
    console.log('Creating missing commissions for existing invoices...');
    
    // Get all invoices
    const allInvoices = await db.select().from(invoices);
    console.log(`Found ${allInvoices.length} invoices in the database`);
    
    // For each invoice, check if a commission exists
    for (const invoice of allInvoices) {
      const existingCommission = await db
        .select()
        .from(commissions)
        .where(eq(commissions.invoiceId, invoice.id));
      
      if (existingCommission.length === 0) {
        console.log(`No commission found for invoice ${invoice.id}. Creating one...`);
        
        // Get the contract to find the AE
        const contractResult = await db
          .select()
          .from(contracts)
          .where(eq(contracts.id, invoice.contractId));
        
        if (contractResult.length === 0) {
          console.error(`Contract ${invoice.contractId} not found for invoice ${invoice.id}`);
          continue;
        }
        
        const contract = contractResult[0];
        
        // Calculate basic commission (10% of invoice amount)
        const invoiceAmount = Number(invoice.amount);
        const baseCommission = invoiceAmount * 0.1;
        
        // Create a basic commission record
        const [commission] = await db.insert(commissions).values({
          invoiceId: invoice.id,
          aeId: contract.aeId,
          baseCommission: baseCommission.toString(),
          pilotBonus: "0",
          multiYearBonus: "0",
          upfrontBonus: "0",
          totalCommission: baseCommission.toString(),
          oteApplied: false,
          status: 'pending'
        }).returning();
        
        console.log(`Created commission ${commission.id} for invoice ${invoice.id}`);
      } else {
        console.log(`Commission already exists for invoice ${invoice.id}`);
      }
    }
    
    console.log('Commission creation complete!');
  } catch (error) {
    console.error('Error creating commissions:', error);
  }
}

// Run the function
createMissingCommissions()
  .then(() => {
    console.log('Process completed.');
    process.exit(0);
  })
  .catch(err => {
    console.error('Process failed:', err);
    process.exit(1);
  });
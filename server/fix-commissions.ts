import { db } from './db';
import { commissions, invoices, contracts, users } from '@shared/schema';
import { eq } from 'drizzle-orm';

async function fixCommissions() {
  try {
    console.log('Checking commissions status in database...');
    
    // Get all commissions
    const allCommissions = await db.select().from(commissions);
    console.log(`Found ${allCommissions.length} commissions in the database`);
    
    // Get related data
    for (const commission of allCommissions) {
      console.log(`Commission ID: ${commission.id}, Status: ${commission.status}, AE ID: ${commission.aeId}`);
      
      // Get invoice
      const invoice = await db.select().from(invoices).where(eq(invoices.id, commission.invoiceId));
      if (invoice.length > 0) {
        console.log(`  Invoice: ${invoice[0].id}, Amount: ${invoice[0].amount}`);
        
        // Get contract
        const contract = await db.select().from(contracts).where(eq(contracts.id, invoice[0].contractId));
        if (contract.length > 0) {
          console.log(`  Contract: ${contract[0].id}, Client: ${contract[0].clientName}, AE ID: ${contract[0].aeId}`);
          
          // Fix commission AE ID if it doesn't match contract AE ID
          if (commission.aeId !== contract[0].aeId) {
            console.log(`  ❌ Commission AE ID (${commission.aeId}) doesn't match Contract AE ID (${contract[0].aeId}). Fixing...`);
            
            await db.update(commissions)
              .set({ aeId: contract[0].aeId })
              .where(eq(commissions.id, commission.id));
              
            console.log(`  ✅ Updated commission to use Contract AE ID: ${contract[0].aeId}`);
          }
        }
      }
    }
    
    console.log('Done checking commissions.');
    
    // Check if there are any pending commissions
    const pendingCommissions = await db.select().from(commissions).where(eq(commissions.status, 'pending'));
    console.log(`Found ${pendingCommissions.length} pending commissions`);
    
    // Log each pending commission
    for (const commission of pendingCommissions) {
      // Get invoice
      const invoice = await db.select().from(invoices).where(eq(invoices.id, commission.invoiceId));
      if (invoice.length > 0) {
        // Get contract
        const contract = await db.select().from(contracts).where(eq(contracts.id, invoice[0].contractId));
        if (contract.length > 0) {
          // Get AE
          const ae = await db.select().from(users).where(eq(users.id, contract[0].aeId));
          if (ae.length > 0) {
            console.log(`  Pending Commission ID: ${commission.id}`);
            console.log(`  - Invoice: ${invoice[0].id}, Amount: ${invoice[0].amount}`);
            console.log(`  - Contract: ${contract[0].id}, Client: ${contract[0].clientName}`);
            console.log(`  - AE: ${ae[0].id}, Name: ${ae[0].name}`);
          }
        }
      }
    }
    
    console.log('Commission verification process completed!');
  } catch (error) {
    console.error('Error checking commissions:', error);
  }
}

// Run the function
fixCommissions()
  .then(() => {
    console.log('Process completed.');
    process.exit(0);
  })
  .catch(err => {
    console.error('Process failed:', err);
    process.exit(1);
  });
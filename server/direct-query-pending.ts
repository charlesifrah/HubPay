import { db } from './db';
import { commissions, invoices, contracts, users } from '@shared/schema';
import { and, eq, sql } from 'drizzle-orm';

// Create a function to directly query pending commissions to bypass the complex joins
async function getPendingCommissionsDirectly() {
  try {
    console.log('Creating temporary API endpoint for pending commissions...');
    
    // Simplified query that just gets the basic info we need
    const pendingCommissions = await db.select().from(commissions).where(eq(commissions.status, 'pending'));
    console.log(`Found ${pendingCommissions.length} pending commissions directly`);
    
    // For each commission, get the associated data and build the response object
    const result = await Promise.all(pendingCommissions.map(async (commission) => {
      // Get invoice
      const invoiceResult = await db.select().from(invoices).where(eq(invoices.id, commission.invoiceId));
      const invoice = invoiceResult[0]; 
      
      if (!invoice) {
        console.error(`Invoice ${commission.invoiceId} not found for commission ${commission.id}`);
        return null;
      }
      
      // Get contract
      const contractResult = await db.select().from(contracts).where(eq(contracts.id, invoice.contractId));
      const contract = contractResult[0];
      
      if (!contract) {
        console.error(`Contract ${invoice.contractId} not found for invoice ${invoice.id}`);
        return null;
      }
      
      // Get AE
      const aeResult = await db.select().from(users).where(eq(users.id, commission.aeId));
      const ae = aeResult[0];
      
      if (!ae) {
        console.error(`AE ${commission.aeId} not found for commission ${commission.id}`);
        return null;
      }
      
      return {
        ...commission,
        invoiceAmount: invoice.amount,
        contractClientName: contract.clientName,
        contractType: contract.contractType,
        aeName: ae.name
      };
    }));
    
    // Filter out any null values (where we couldn't find related data)
    const validResults = result.filter(item => item !== null);
    
    console.log('Data that should be returned by the API:');
    console.log(JSON.stringify(validResults, null, 2));
    
    console.log('Commissions check completed!');
    return validResults;
  } catch (error) {
    console.error('Error processing pending commissions:', error);
    return [];
  }
}

// Run the function
getPendingCommissionsDirectly()
  .then((result) => {
    console.log(`Found ${result.length} valid pending commissions`);
    process.exit(0);
  })
  .catch(err => {
    console.error('Process failed:', err);
    process.exit(1);
  });
import { db } from './db';
import { commissions, invoices, contracts } from '@shared/schema';
import { Response, Request, NextFunction } from 'express';
import { getStorage } from './storage';

/**
 * Clears all contracts, invoices, and commissions from the database.
 * Middleware for admin-only API endpoint.
 */
export async function clearDatabase(req: Request, res: Response, next: NextFunction) {
  try {
    // Get the storage instance
    const storage = getStorage();
    
    // Get user ID from body and verify admin status
    const userId = req.body.currentUserId || (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized: User not authenticated' });
    }
    
    const user = await storage.getUser(userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Only administrators can clear the database' });
    }
    
    console.log('Starting database clear operation...');
    
    // Delete commissions first (due to foreign key constraints)
    console.log('Deleting commissions...');
    const deletedCommissions = await db.delete(commissions).returning();
    console.log(`Deleted ${deletedCommissions.length} commissions`);
    
    // Then delete invoices
    console.log('Deleting invoices...');
    const deletedInvoices = await db.delete(invoices).returning();
    console.log(`Deleted ${deletedInvoices.length} invoices`);
    
    // Finally delete contracts
    console.log('Deleting contracts...');
    const deletedContracts = await db.delete(contracts).returning();
    console.log(`Deleted ${deletedContracts.length} contracts`);
    
    console.log('Database clear operation completed successfully');
    
    return res.status(200).json({
      message: 'Database cleared successfully',
      deletedCounts: {
        commissions: deletedCommissions.length,
        invoices: deletedInvoices.length,
        contracts: deletedContracts.length
      }
    });
  } catch (error) {
    console.error('Error clearing database:', error);
    return res.status(500).json({ message: 'An error occurred while clearing the database' });
  }
}
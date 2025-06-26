import { getStorage } from './storage';

/**
 * Creates a default commission configuration based on current commission engine logic
 * and assigns it to all existing AEs
 */
async function migrateCommissionConfig() {
  const storage = getStorage();
  
  try {
    console.log('Creating default commission configuration...');
    
    // Create default commission configuration based on current logic
    const defaultConfig = await storage.createCommissionConfig({
      name: 'Standard Commission Structure',
      description: 'Default commission structure based on existing engine logic - 10% base rate with various bonuses',
      baseCommissionRate: 0.10, // 10% base commission
      pilotBonusUnpaid: 500,     // $500 for unpaid pilots
      pilotBonusPaid25k: 2500,   // $2,500 for paid pilots $25K-$49,999
      pilotBonusPaid50k: 5000,   // $5,000 for paid pilots $50K+
      multiYearBonus: 10000,     // $10,000 for multi-year contracts with ACV > $250K
      multiYearAcvThreshold: 250000, // ACV threshold for multi-year bonus
      upfrontBonus: 15000,       // $15,000 for upfront payment terms
      highValueCapThreshold: 8250000, // High-value deal cap at $8.25M
      highValueReducedRate: 0.025,    // 2.5% rate after high-value cap
      oteCapAmount: 1000000,     // $1M OTE cap
      oteDeceleratorRate: 0.90,  // 90% rate after OTE cap
      effectiveStartDate: '2025-01-01', // Start of current year
      effectiveEndDate: null,    // No end date (ongoing)
      isActive: true
    });
    
    console.log('Default commission configuration created:', defaultConfig);
    
    // Get all AEs
    const allAEs = await storage.getAllAEs();
    console.log(`Found ${allAEs.length} AEs to assign configuration to`);
    
    // Assign the default configuration to all existing AEs
    for (const ae of allAEs) {
      const assignment = await storage.assignCommissionConfig({
        aeId: ae.id,
        commissionConfigId: defaultConfig.id,
        startDate: '2025-01-01', // Start of current year
        endDate: null,           // No end date (ongoing)
        isActive: true
      });
      
      console.log(`Assigned commission config to AE ${ae.name} (ID: ${ae.id})`);
    }
    
    console.log('Commission configuration migration completed successfully!');
    
  } catch (error) {
    console.error('Error migrating commission configuration:', error);
    throw error;
  }
}

export { migrateCommissionConfig };
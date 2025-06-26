import { getStorage } from './storage';

async function debugMigration() {
  const storage = getStorage();
  
  try {
    console.log('=== DEBUG: Starting migration debug ===');
    
    // Test getting AEs first
    console.log('1. Testing getAllAEs...');
    const allAEs = await storage.getAllAEs();
    console.log(`Found AEs:`, allAEs);
    
    // Test creating commission config
    console.log('2. Testing createCommissionConfig...');
    const testConfig = {
      name: 'Test Commission Structure',
      description: 'Test configuration',
      status: 'active' as const,
      baseCommissionRate: '0.10',
      highValueCap: '8250000',
      highValueRate: '0.025',
      pilotBonusUnpaid: '500',
      pilotBonusLow: '2500',
      pilotBonusHigh: '5000',
      pilotBonusLowMin: '25000',
      pilotBonusHighMin: '50000',
      multiYearBonus: '10000',
      multiYearMinAcv: '250000',
      upfrontBonus: '15000',
      oteCapAmount: '1000000',
      oteDecelerator: '0.90',
      createdBy: 5
    };
    
    console.log('Config to create:', testConfig);
    const defaultConfig = await storage.createCommissionConfig(testConfig);
    console.log('Created config:', defaultConfig);
    
    // Test AE assignment if we have AEs
    if (allAEs.length > 0) {
      console.log('3. Testing assignCommissionConfig...');
      const ae = allAEs[0];
      const assignmentData = {
        aeId: ae.id,
        commissionConfigId: defaultConfig.id,
        startDate: '2025-01-01',
        endDate: null,
        isActive: true,
        createdBy: 5
      };
      
      console.log('Assignment to create:', assignmentData);
      const assignment = await storage.assignCommissionConfig(assignmentData);
      console.log('Created assignment:', assignment);
    }
    
    console.log('=== DEBUG: Migration debug completed successfully ===');
    
  } catch (error) {
    console.error('=== DEBUG: Migration debug failed ===');
    console.error('Error details:', error);
    console.error('Error stack:', error.stack);
    throw error;
  }
}

export { debugMigration };
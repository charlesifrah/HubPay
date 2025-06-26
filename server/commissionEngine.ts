import { Contract, Invoice, Commission, InsertCommission, CommissionConfig } from "@shared/schema";
import { getStorage } from "./storage";

export class CommissionEngine {
  private static instance: CommissionEngine;

  private constructor() {}

  public static getInstance(): CommissionEngine {
    if (!CommissionEngine.instance) {
      CommissionEngine.instance = new CommissionEngine();
    }
    return CommissionEngine.instance;
  }

  public async calculateCommission(invoice: Invoice): Promise<InsertCommission> {
    const contract = await getStorage().getContract(invoice.contractId);
    if (!contract) {
      throw new Error('Contract not found');
    }

    // Get the AE's active commission configuration
    const commissionConfig = await getStorage().getActiveCommissionConfigForAE(contract.aeId);
    if (!commissionConfig) {
      throw new Error(`No active commission configuration found for AE ${contract.aeId}`);
    }

    // Skip commission for non-commissionable revenue types
    if (invoice.revenueType === 'non-recurring' || 
        invoice.revenueType === 'service') {
      return this.createZeroCommission(invoice, contract.aeId);
    }
    
    // Calculate base commission using the AE's commission config
    const invoiceAmount = Number(invoice.amount);
    let baseCommission = this.calculateBaseCommission(invoiceAmount, contract, commissionConfig);
    
    // Calculate bonuses using the AE's commission config
    const pilotBonus = this.calculatePilotBonus(contract, invoiceAmount, commissionConfig);
    const multiYearBonus = this.calculateMultiYearBonus(contract, commissionConfig);
    const upfrontBonus = this.calculateUpfrontBonus(contract, commissionConfig);
    
    // Sum up all components
    let totalCommission = baseCommission + pilotBonus + multiYearBonus + upfrontBonus;
    
    // Check for OTE cap using the config's OTE cap
    const oteApplied = await this.applyOTECap(contract.aeId, totalCommission, commissionConfig);
    if (oteApplied) {
      const decelerator = Number(commissionConfig.oteDecelerator || 0.9);
      totalCommission = totalCommission * decelerator;
    }
    
    return {
      invoiceId: invoice.id,
      aeId: contract.aeId,
      baseCommission: baseCommission.toString(),
      pilotBonus: pilotBonus.toString(),
      multiYearBonus: multiYearBonus.toString(),
      upfrontBonus: upfrontBonus.toString(),
      totalCommission: totalCommission.toString(),
      oteApplied,
      status: 'pending'
    };
  }
  
  private calculateBaseCommission(invoiceAmount: number, contract: Contract, config: CommissionConfig): number {
    const baseRate = Number(config.baseCommissionRate);
    const highValueCap = Number(config.highValueCap || 8250000);
    const highValueRate = Number(config.highValueRate || 0.025);
    
    if (Number(contract.contractValue) > highValueCap) {
      if (invoiceAmount <= highValueCap) {
        return invoiceAmount * baseRate;
      } else {
        return (highValueCap * baseRate) + ((invoiceAmount - highValueCap) * highValueRate);
      }
    }
    
    // Standard commission using config rate
    return invoiceAmount * baseRate;
  }
  
  private calculatePilotBonus(contract: Contract, invoiceAmount: number, config: CommissionConfig): number {
    if (!contract.isPilot) return 0;
    
    // Use config values for pilot bonuses
    if (invoiceAmount === 0) return Number(config.pilotBonusUnpaid || 500);
    
    const lowMin = Number(config.pilotBonusLowMin || 25000);
    const highMin = Number(config.pilotBonusHighMin || 50000);
    
    if (invoiceAmount >= lowMin && invoiceAmount < highMin) {
      return Number(config.pilotBonusLow || 2500);
    }
    
    if (invoiceAmount >= highMin) {
      return Number(config.pilotBonusHigh || 5000);
    }
    
    return 0;
  }
  
  private calculateMultiYearBonus(contract: Contract, config: CommissionConfig): number {
    const minAcv = Number(config.multiYearMinAcv || 250000);
    const bonusAmount = Number(config.multiYearBonus || 10000);
    
    if (contract.contractLength > 1 && Number(contract.acv) > minAcv) {
      return bonusAmount;
    }
    return 0;
  }
  
  private calculateUpfrontBonus(contract: Contract, config: CommissionConfig): number {
    const bonusAmount = Number(config.upfrontBonus || 15000);
    
    if (contract.paymentTerms === 'upfront') {
      return bonusAmount;
    }
    return 0;
  }
  
  private async applyOTECap(aeId: number, newCommission: number, config: CommissionConfig): Promise<boolean> {
    const oteCap = Number(config.oteCapAmount || 1000000);
    
    // Get YTD commissions for this AE
    const ytdCommissions = await getStorage().getYTDCommissionsForAE(aeId);
    const currentYtdTotal = ytdCommissions.reduce((sum, commission) => 
      sum + Number(commission.totalCommission), 0);
    
    // Check if adding this commission would exceed the OTE cap
    return (currentYtdTotal + newCommission) > oteCap;
  }
  
  private createZeroCommission(invoice: Invoice, aeId: number): InsertCommission {
    return {
      invoiceId: invoice.id,
      aeId: aeId,
      baseCommission: '0',
      pilotBonus: '0',
      multiYearBonus: '0',
      upfrontBonus: '0',
      totalCommission: '0',
      oteApplied: false,
      status: 'pending'
    };
  }
}

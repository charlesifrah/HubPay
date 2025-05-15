import { Contract, Invoice, Commission, InsertCommission } from "@shared/schema";
import { getStorage } from "./storage";

export class CommissionEngine {
  private static instance: CommissionEngine;
  private OTE_CAP = 1000000; // $1M cap
  private OTE_DECELERATOR = 0.9; // 90% of standard rate after cap

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

    // Skip commission for non-commissionable revenue types
    if (invoice.revenueType === 'non-recurring' || 
        invoice.revenueType === 'service') {
      return this.createZeroCommission(invoice, contract.aeId);
    }
    
    // Calculate base commission (10% of invoice amount)
    const invoiceAmount = Number(invoice.amount);
    let baseCommission = this.calculateBaseCommission(invoiceAmount, contract);
    
    // Calculate bonuses
    const pilotBonus = this.calculatePilotBonus(contract, invoiceAmount);
    const multiYearBonus = this.calculateMultiYearBonus(contract);
    const upfrontBonus = this.calculateUpfrontBonus(contract);
    
    // Sum up all components
    let totalCommission = baseCommission + pilotBonus + multiYearBonus + upfrontBonus;
    
    // Check for OTE cap
    const oteApplied = await this.applyOTECap(contract.aeId, totalCommission);
    if (oteApplied) {
      totalCommission = totalCommission * this.OTE_DECELERATOR;
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
  
  private calculateBaseCommission(invoiceAmount: number, contract: Contract): number {
    // Apply the cap for high-value deals: 10% on first $8.25M, 2.5% after
    const highValueCap = 8250000;
    
    if (Number(contract.contractValue) > highValueCap) {
      if (invoiceAmount <= highValueCap) {
        return invoiceAmount * 0.1;
      } else {
        return (highValueCap * 0.1) + ((invoiceAmount - highValueCap) * 0.025);
      }
    }
    
    // Standard 10% commission
    return invoiceAmount * 0.1;
  }
  
  private calculatePilotBonus(contract: Contract, invoiceAmount: number): number {
    if (!contract.isPilot) return 0;
    
    // $500 for unpaid pilots
    if (invoiceAmount === 0) return 500;
    
    // $2,500 for paid pilots between $25K-$49,999
    if (invoiceAmount >= 25000 && invoiceAmount < 50000) return 2500;
    
    // $5,000 for paid pilots $50K+
    if (invoiceAmount >= 50000) return 5000;
    
    return 0;
  }
  
  private calculateMultiYearBonus(contract: Contract): number {
    // $10,000 bonus for multi-year contracts with ACV > $250K
    if (contract.contractLength > 1 && Number(contract.acv) > 250000) {
      return 10000;
    }
    return 0;
  }
  
  private calculateUpfrontBonus(contract: Contract): number {
    // $15,000 bonus if Year 1 is paid upfront
    if (contract.paymentTerms === 'upfront') {
      return 15000;
    }
    return 0;
  }
  
  private async applyOTECap(aeId: number, newCommission: number): Promise<boolean> {
    // Get YTD commissions for this AE
    const ytdCommissions = await getStorage().getYTDCommissionsForAE(aeId);
    const currentYtdTotal = ytdCommissions.reduce((sum, commission) => 
      sum + Number(commission.totalCommission), 0);
    
    // Check if adding this commission would exceed the OTE cap
    return (currentYtdTotal + newCommission) > this.OTE_CAP;
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

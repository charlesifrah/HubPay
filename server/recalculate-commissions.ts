import { db } from "./db";
import { commissions, invoices, contracts } from "@shared/schema";
import { eq } from "drizzle-orm";
import { CommissionEngine } from "./commissionEngine";
import { initializeStorage } from "./storage";

async function recalculateAllCommissions() {
  console.log("Starting commission recalculation...");

  // Initialize storage
  await initializeStorage();

  try {
    // Get all existing commissions
    const existingCommissions = await db
      .select()
      .from(commissions)
      .where(eq(commissions.status, 'pending'));

    console.log(`Found ${existingCommissions.length} pending commissions to recalculate`);

    const commissionEngine = CommissionEngine.getInstance();

    for (const commission of existingCommissions) {
      try {
        // Get the invoice for this commission
        const [invoice] = await db
          .select()
          .from(invoices)
          .where(eq(invoices.id, commission.invoiceId));

        if (!invoice) {
          console.log(`No invoice found for commission ${commission.id}, skipping`);
          continue;
        }

        console.log(`Recalculating commission for invoice ${invoice.id} (amount: $${invoice.amount})`);

        // Calculate new commission using current configuration
        const newCommissionData = await commissionEngine.calculateCommission(invoice);

        // Update the existing commission with new values
        await db
          .update(commissions)
          .set({
            totalCommission: newCommissionData.totalCommission,
            baseCommission: newCommissionData.baseCommission,
            pilotBonus: newCommissionData.pilotBonus,
            multiYearBonus: newCommissionData.multiYearBonus,
            upfrontBonus: newCommissionData.upfrontBonus,
            oteApplied: newCommissionData.oteApplied
          })
          .where(eq(commissions.id, commission.id));

        console.log(`Updated commission ${commission.id}: $${commission.totalCommission} -> $${newCommissionData.totalCommission}`);

      } catch (error) {
        console.error(`Error recalculating commission ${commission.id}:`, error);
      }
    }

    console.log("Commission recalculation completed");

  } catch (error) {
    console.error("Error during commission recalculation:", error);
  }
}

// Run the recalculation
recalculateAllCommissions().then(() => {
  console.log("Recalculation complete");
  process.exit(0);
}).catch((error) => {
  console.error("Recalculation failed:", error);
  process.exit(1);
});
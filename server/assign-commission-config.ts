import { db } from "./db";
import { commissionConfigs, aeCommissionAssignments } from "@shared/schema";
import { eq } from "drizzle-orm";

async function assignCommissionConfigToAE() {
  console.log("Assigning commission configuration to AE...");

  try {
    // Find the active commission config
    const [config] = await db
      .select()
      .from(commissionConfigs)
      .where(eq(commissionConfigs.status, 'active'))
      .limit(1);

    if (!config) {
      console.log("No active commission configuration found");
      return;
    }

    console.log(`Found active config: ${config.name} (ID: ${config.id})`);

    // Check if AE already has an assignment
    const existingAssignment = await db
      .select()
      .from(aeCommissionAssignments)
      .where(eq(aeCommissionAssignments.aeId, 6));

    if (existingAssignment.length > 0) {
      console.log("AE already has commission configuration assigned");
      return;
    }

    // Assign the config to AE 6
    const [assignment] = await db
      .insert(aeCommissionAssignments)
      .values({
        aeId: 6,
        commissionConfigId: config.id,
        startDate: new Date().toISOString().split('T')[0],
        endDate: null,
        createdBy: 5
      })
      .returning();

    console.log(`Successfully assigned commission config ${config.name} to AE 6`);
    console.log(`Assignment ID: ${assignment.id}`);

  } catch (error) {
    console.error("Error assigning commission config:", error);
  }
}

// Run the assignment
assignCommissionConfigToAE().then(() => {
  console.log("Assignment complete");
  process.exit(0);
}).catch((error) => {
  console.error("Assignment failed:", error);
  process.exit(1);
});
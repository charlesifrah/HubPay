import { db } from "./db";
import { contracts } from "@shared/schema";

async function seedTabsContracts() {
  console.log("Creating contracts for Tabs invoice companies...");

  const contractsToCreate = [
    {
      clientName: "Microsoft Corporation",
      aeId: 6,
      contractValue: "25000000",
      acv: "5000000",
      contractType: "new" as const,
      contractLength: 5,
      paymentTerms: "annual" as const,
      isPilot: false,
      createdBy: 5
    },
    {
      clientName: "Tesla Inc.",
      aeId: 6,
      contractValue: "15000000", 
      acv: "3000000",
      contractType: "new" as const,
      contractLength: 5,
      paymentTerms: "annual" as const,
      isPilot: false,
      createdBy: 5
    },
    {
      clientName: "Netflix Inc.",
      aeId: 6,
      contractValue: "8000000",
      acv: "2000000", 
      contractType: "new" as const,
      contractLength: 4,
      paymentTerms: "quarterly" as const,
      isPilot: false,
      createdBy: 5
    },
    {
      clientName: "Amazon Web Services",
      aeId: 6,
      contractValue: "30000000",
      acv: "6000000",
      contractType: "new" as const,
      contractLength: 5,
      paymentTerms: "annual" as const,
      isPilot: false,
      createdBy: 5
    },
    {
      clientName: "Salesforce Inc.",
      aeId: 6,
      contractValue: "12000000",
      acv: "3000000",
      contractType: "new" as const,
      contractLength: 4,
      paymentTerms: "annual" as const,
      isPilot: false,
      createdBy: 5
    },
    {
      clientName: "Meta Platforms Inc.",
      aeId: 6,
      contractValue: "18000000",
      acv: "4500000",
      contractType: "new" as const,
      contractLength: 4,
      paymentTerms: "quarterly" as const,
      isPilot: false,
      createdBy: 5
    },
    {
      clientName: "Adobe Inc.",
      aeId: 6,
      contractValue: "7000000",
      acv: "1750000",
      contractType: "new" as const,
      contractLength: 4,
      paymentTerms: "quarterly" as const,
      isPilot: false,
      createdBy: 5
    },
    {
      clientName: "Uber Technologies",
      aeId: 6,
      contractValue: "5000000",
      acv: "1250000",
      contractType: "new" as const,
      contractLength: 4,
      paymentTerms: "quarterly" as const,
      isPilot: false,
      createdBy: 5
    }
  ];

  try {
    for (const contract of contractsToCreate) {
      const [created] = await db
        .insert(contracts)
        .values(contract)
        .returning();
      
      console.log(`Created contract for ${contract.clientName}: ID ${created.id}`);
    }
    
    console.log("All Tabs contracts created successfully!");
  } catch (error) {
    console.error("Error creating contracts:", error);
  }
}

// Run if called directly
seedTabsContracts().then(() => {
  console.log("Seeding complete");
  process.exit(0);
}).catch((error) => {
  console.error("Seeding failed:", error);
  process.exit(1);
});

export { seedTabsContracts };
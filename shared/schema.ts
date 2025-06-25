import { pgTable, text, serial, integer, boolean, timestamp, pgEnum, numeric, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enum definitions
export const userRoleEnum = pgEnum('user_role', ['admin', 'ae']);
export const userStatusEnum = pgEnum('user_status', ['pending', 'active', 'suspended']);
export const contractTypeEnum = pgEnum('contract_type', ['new', 'renewal', 'upsell']);
export const paymentTermsEnum = pgEnum('payment_terms', ['annual', 'quarterly', 'monthly', 'upfront', 'full-upfront']);
export const revenueTypeEnum = pgEnum('revenue_type', ['recurring', 'non-recurring', 'service']);
export const commissionStatusEnum = pgEnum('commission_status', ['pending', 'approved', 'rejected', 'paid']);
export const commissionConfigStatusEnum = pgEnum('commission_config_status', ['active', 'inactive', 'draft']);

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: userRoleEnum("role").notNull().default('ae'),
  status: userStatusEnum("status").notNull().default('active'),
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: integer("created_by").references(() => users.id),
  updatedAt: timestamp("updated_at"),
  updatedBy: integer("updated_by").references(() => users.id),
});

// Invitations table
export const invitations = pgTable("invitations", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  token: text("token").notNull().unique(),
  expires: timestamp("expires").notNull(),
  used: boolean("used").notNull().default(false),
  role: userRoleEnum("role").notNull().default('ae'),
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: integer("created_by").notNull().references(() => users.id),
});

// Contracts table
export const contracts = pgTable("contracts", {
  id: serial("id").primaryKey(),
  clientName: text("client_name").notNull(),
  aeId: integer("ae_id").notNull().references(() => users.id),
  contractValue: numeric("contract_value").notNull(),
  acv: numeric("acv").notNull(), // Annual Contract Value
  contractType: contractTypeEnum("contract_type").notNull(),
  contractLength: integer("contract_length").notNull(),
  paymentTerms: paymentTermsEnum("payment_terms").notNull(),
  isPilot: boolean("is_pilot").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: integer("created_by").notNull().references(() => users.id),
});

// Invoices table
export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  contractId: integer("contract_id").notNull().references(() => contracts.id),
  amount: numeric("amount").notNull(),
  invoiceDate: date("invoice_date").notNull(),
  revenueType: revenueTypeEnum("revenue_type").notNull(),
  tabsInvoiceId: text("tabs_invoice_id"), // Track invoices synced from Tabs
  syncDetails: text("sync_details"), // Store Tabs sync metadata
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: integer("created_by").notNull().references(() => users.id),
});

// Commissions table
export const commissions = pgTable("commissions", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id").notNull().references(() => invoices.id),
  aeId: integer("ae_id").notNull().references(() => users.id),
  baseCommission: numeric("base_commission").notNull(),
  pilotBonus: numeric("pilot_bonus").default('0'),
  multiYearBonus: numeric("multi_year_bonus").default('0'),
  upfrontBonus: numeric("upfront_bonus").default('0'),
  totalCommission: numeric("total_commission").notNull(),
  oteApplied: boolean("ote_applied").default(false),
  status: commissionStatusEnum("status").notNull().default('pending'),
  approvedBy: integer("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Commission Configurations table
export const commissionConfigs = pgTable("commission_configs", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  status: commissionConfigStatusEnum("status").notNull().default('draft'),
  baseCommissionRate: numeric("base_commission_rate").notNull().default('0.1'), // 10% default
  highValueCap: numeric("high_value_cap").default('8250000'), // $8.25M default
  highValueRate: numeric("high_value_rate").default('0.025'), // 2.5% after cap
  pilotBonusUnpaid: numeric("pilot_bonus_unpaid").default('500'),
  pilotBonusLow: numeric("pilot_bonus_low").default('2500'), // $25K-$49K
  pilotBonusHigh: numeric("pilot_bonus_high").default('5000'), // $50K+
  pilotBonusLowMin: numeric("pilot_bonus_low_min").default('25000'),
  pilotBonusHighMin: numeric("pilot_bonus_high_min").default('50000'),
  multiYearBonus: numeric("multi_year_bonus").default('10000'),
  multiYearMinAcv: numeric("multi_year_min_acv").default('250000'),
  upfrontBonus: numeric("upfront_bonus").default('15000'),
  oteCapAmount: numeric("ote_cap_amount").default('1000000'), // $1M OTE cap
  oteDecelerator: numeric("ote_decelerator").default('0.9'), // 90% after cap
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: integer("created_by").notNull().references(() => users.id),
  updatedAt: timestamp("updated_at"),
  updatedBy: integer("updated_by").references(() => users.id),
});

// AE Commission Assignments table
export const aeCommissionAssignments = pgTable("ae_commission_assignments", {
  id: serial("id").primaryKey(),
  aeId: integer("ae_id").notNull().references(() => users.id),
  commissionConfigId: integer("commission_config_id").notNull().references(() => commissionConfigs.id),
  effectiveDate: date("effective_date").notNull(),
  endDate: date("end_date"), // null means currently active
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: integer("created_by").notNull().references(() => users.id),
});

// Zod schemas for inserts
export const insertUserSchema = createInsertSchema(users).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true,
  updatedBy: true
});
export const loginUserSchema = insertUserSchema.pick({ email: true, password: true });
export const createAESchema = insertUserSchema.omit({ password: true });

export const insertInvitationSchema = createInsertSchema(invitations).omit({ 
  id: true, 
  createdAt: true, 
  token: true,
  expires: true,
  used: true
});

// Custom contract schema to handle numeric conversions
export const insertContractSchema = createInsertSchema(contracts)
  .omit({ id: true, createdAt: true })
  .extend({
    // Convert numeric values to strings for Postgres numeric type compatibility
    contractValue: z.coerce.string(),
    acv: z.coerce.string()
  });
export const insertInvoiceSchema = createInsertSchema(invoices)
  .omit({ id: true, createdAt: true })
  .extend({
    // Convert numeric values to strings for Postgres numeric type compatibility
    amount: z.coerce.string()
  });
export const insertCommissionSchema = createInsertSchema(commissions).omit({ id: true, createdAt: true, approvedAt: true });

export const insertCommissionConfigSchema = createInsertSchema(commissionConfigs)
  .omit({ id: true, createdAt: true, updatedAt: true })
  .extend({
    baseCommissionRate: z.coerce.string(),
    highValueCap: z.coerce.string(),
    highValueRate: z.coerce.string(),
    pilotBonusUnpaid: z.coerce.string(),
    pilotBonusLow: z.coerce.string(),
    pilotBonusHigh: z.coerce.string(),
    pilotBonusLowMin: z.coerce.string(),
    pilotBonusHighMin: z.coerce.string(),
    multiYearBonus: z.coerce.string(),
    multiYearMinAcv: z.coerce.string(),
    upfrontBonus: z.coerce.string(),
    oteCapAmount: z.coerce.string(),
    oteDecelerator: z.coerce.string(),
  });

export const insertAeCommissionAssignmentSchema = createInsertSchema(aeCommissionAssignments).omit({ id: true, createdAt: true });

// Types for inserts
export type InsertUser = z.infer<typeof insertUserSchema>;
export type LoginUser = z.infer<typeof loginUserSchema>;
export type CreateAE = z.infer<typeof createAESchema>;
export type InsertInvitation = z.infer<typeof insertInvitationSchema>;
export type InsertContract = z.infer<typeof insertContractSchema>;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type InsertCommission = z.infer<typeof insertCommissionSchema>;
export type InsertCommissionConfig = z.infer<typeof insertCommissionConfigSchema>;
export type InsertAeCommissionAssignment = z.infer<typeof insertAeCommissionAssignmentSchema>;

// Types for selects
export type User = typeof users.$inferSelect;
export type Invitation = typeof invitations.$inferSelect;
export type Contract = typeof contracts.$inferSelect;
export type Invoice = typeof invoices.$inferSelect;
export type Commission = typeof commissions.$inferSelect;
export type CommissionConfig = typeof commissionConfigs.$inferSelect;
export type AeCommissionAssignment = typeof aeCommissionAssignments.$inferSelect;

// Extended types for UI
export type ContractWithAE = Contract & { aeName: string };
export type InvoiceWithDetails = Invoice & { 
  contractClientName: string, 
  contractAEName: string,
  contractAEId: number
};
export type CommissionWithDetails = Commission & {
  invoiceAmount: string,
  contractClientName: string,
  contractType: string,
  aeName: string
};

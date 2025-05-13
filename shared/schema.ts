import { pgTable, text, serial, integer, boolean, timestamp, pgEnum, numeric, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enum definitions
export const userRoleEnum = pgEnum('user_role', ['admin', 'ae']);
export const contractTypeEnum = pgEnum('contract_type', ['new', 'renewal', 'upsell']);
export const paymentTermsEnum = pgEnum('payment_terms', ['annual', 'quarterly', 'monthly', 'upfront', 'full-upfront']);
export const revenueTypeEnum = pgEnum('revenue_type', ['recurring', 'non-recurring', 'service']);
export const commissionStatusEnum = pgEnum('commission_status', ['pending', 'approved', 'rejected', 'paid']);

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: userRoleEnum("role").notNull().default('ae'),
  createdAt: timestamp("created_at").defaultNow(),
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
  notes: text("notes"),
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
  notes: text("notes"),
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

// Zod schemas for inserts
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const loginUserSchema = insertUserSchema.pick({ email: true, password: true });

export const insertContractSchema = createInsertSchema(contracts).omit({ id: true, createdAt: true });
export const insertInvoiceSchema = createInsertSchema(invoices).omit({ id: true, createdAt: true });
export const insertCommissionSchema = createInsertSchema(commissions).omit({ id: true, createdAt: true, approvedAt: true });

// Types for inserts
export type InsertUser = z.infer<typeof insertUserSchema>;
export type LoginUser = z.infer<typeof loginUserSchema>;
export type InsertContract = z.infer<typeof insertContractSchema>;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type InsertCommission = z.infer<typeof insertCommissionSchema>;

// Types for selects
export type User = typeof users.$inferSelect;
export type Contract = typeof contracts.$inferSelect;
export type Invoice = typeof invoices.$inferSelect;
export type Commission = typeof commissions.$inferSelect;

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

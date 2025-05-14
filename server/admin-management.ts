import { Request, Response, Express } from "express";
import { db } from "./db";
import { users, invitations, userStatusEnum } from "@shared/schema";
import { eq, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { randomBytes } from "crypto";
import { storage } from "./storage";
import { hashPassword } from "./auth";
import { fromZodError } from "zod-validation-error";

// Type aliases to avoid any type errors
type User = typeof users.$inferSelect;
type Invitation = typeof invitations.$inferSelect;

// Function to generate a random token
function generateToken(length: number = 64): string {
  return randomBytes(length / 2).toString('hex');
}

// Define the schema for Admin management endpoints
const inviteSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
});

const updateAdminSchema = z.object({
  id: z.number(),
  name: z.string().min(1, { message: "Name is required" }).optional(),
  email: z.string().email({ message: "Invalid email address" }).optional(),
  status: z.enum(["active", "suspended", "pending"]).optional(),
});

const resetPasswordSchema = z.object({
  id: z.number(),
});

// Set up Admin management routes
export function setupAdminManagementRoutes(app: Express) {
  // Middleware to ensure only admins can access these routes
  const adminOnly = async (req: Request, res: Response, next: Function) => {
    // @ts-ignore - Express session adds this but TypeScript doesn't know about it
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // @ts-ignore - Express session adds this but TypeScript doesn't know about it
    const user = req.user as any;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: "Forbidden - Admin access required" });
    }

    next();
  };

  // Get all admins and pending invitations
  app.get("/api/admin/administrators", adminOnly, async (req, res) => {
    try {
      // Get all active admin users - using the storage interface
      const administrators = await storage.getAllUsers();
      
      // Get all pending admin invitations - using the storage interface
      const pendingInvitations = await storage.getAllInvitations();
      
      // Filter administrators to include only admin users
      const adminUsers = administrators.filter(admin => admin.role === 'admin');
      
      // Map users to a safer response object (excluding password)
      const adminList = adminUsers.map(admin => ({
        id: admin.id,
        name: admin.name,
        email: admin.email,
        status: admin.status || 'active',
        createdAt: admin.createdAt,
        type: 'user',
        isSelf: (req.user as any).id === admin.id
      }));
      
      // Filter and map pending invitations to include only admin invitations
      const now = new Date();
      const pendingList = pendingInvitations
        .filter(invite => !invite.used && invite.role === 'admin')
        .map(invite => ({
          id: invite.id,
          name: 'Pending Registration',
          email: invite.email,
          status: now > invite.expires ? 'expired' : 'pending',
          createdAt: invite.createdAt,
          expires: invite.expires,
          type: 'invitation'
        }));
      
      // Combine both lists and sort by email
      const combinedList = [...adminList, ...pendingList].sort((a, b) => 
        a.email.localeCompare(b.email)
      );
      
      res.status(200).json(combinedList);
    } catch (error) {
      console.error("Error fetching Admins:", error);
      res.status(500).json({ message: "Error fetching administrators" });
    }
  });

  // Update Admin (name, email, status)
  app.patch("/api/admin/administrators/:id", adminOnly, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = parseInt(id);
      
      // Validate update data
      const validationResult = updateAdminSchema.safeParse({ 
        id: userId,
        ...req.body 
      });
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid request data", 
          errors: fromZodError(validationResult.error)
        });
      }
      
      const updateData = validationResult.data;
      
      // Check if admin exists
      const existingAdmin = await db.select().from(users).where(eq(users.id, userId));
      
      if (existingAdmin.length === 0) {
        return res.status(404).json({ message: "Administrator not found" });
      }
      
      if (existingAdmin[0].role !== 'admin') {
        return res.status(400).json({ message: "User is not an administrator" });
      }
      
      // Prepare update object
      const updates: any = {};
      
      if (updateData.name !== undefined) updates.name = updateData.name;
      if (updateData.email !== undefined) updates.email = updateData.email;
      if (updateData.status !== undefined) updates.status = updateData.status;
      
      // Check for email uniqueness if email is being updated
      if (updateData.email !== undefined) {
        const emailExists = await db.select().from(users)
          .where(sql`${users.email} = ${updateData.email} AND ${users.id} != ${userId}`);
        
        if (emailExists.length > 0) {
          return res.status(400).json({ message: "Email is already in use" });
        }
      }
      
      // Update the admin
      await db.update(users)
        .set({
          ...updates,
          updatedAt: new Date(),
          updatedBy: (req.user as any).id
        })
        .where(eq(users.id, userId));
      
      // Get updated admin data
      const [updatedAdmin] = await db.select().from(users).where(eq(users.id, userId));
      
      // Return the updated admin (excluding password)
      res.status(200).json({
        id: updatedAdmin.id,
        name: updatedAdmin.name,
        email: updatedAdmin.email,
        status: updatedAdmin.status,
        role: updatedAdmin.role
      });
    } catch (error) {
      console.error("Error updating Admin:", error);
      res.status(500).json({ message: "Error updating administrator" });
    }
  });

  // Delete Admin
  app.delete("/api/admin/administrators/:id", adminOnly, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = parseInt(id);
      
      // Verify user exists and is an Admin using storage interface
      const existingUser = await storage.getUser(userId);
      
      if (!existingUser) {
        return res.status(404).json({ message: "Administrator not found" });
      }
      
      if (existingUser.role !== 'admin') {
        return res.status(400).json({ message: "User is not an administrator" });
      }
      
      // Don't allow deleting the current user
      if (userId === (req.user as any).id) {
        return res.status(400).json({ message: "Cannot delete your own admin account" });
      }
      
      // Delete the user using storage interface
      await storage.deleteUser(userId);
      
      res.status(200).json({ message: "Administrator deleted successfully" });
    } catch (error) {
      console.error("Error deleting Admin:", error);
      res.status(500).json({ message: "Error deleting administrator" });
    }
  });

  // Send invitation to a new Admin
  app.post("/api/admin/invite", adminOnly, async (req, res) => {
    try {
      // Validate email
      const validationResult = inviteSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid request data", 
          errors: fromZodError(validationResult.error)
        });
      }
      
      const { email } = validationResult.data;
      
      // Check if email is already registered using storage interface
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "Email is already registered" });
      }
      
      // Check if there's an existing invitation using storage interface
      const existingInvite = await storage.getInvitationByEmail(email);
      
      // Delete existing invitation if it exists using storage interface
      if (existingInvite) {
        await storage.deleteInvitation(existingInvite.id);
      }
      
      // Get admin ID from authenticated user
      const adminId = (req.user as any).id;
      
      // Create new invitation using storage interface
      const inviteToken = generateToken();
      const expirationDate = new Date();
      expirationDate.setHours(expirationDate.getHours() + 72); // 72-hour expiration
      
      const newInvitation = await storage.createInvitation({
        email,
        token: inviteToken,
        role: 'admin', // Set role to admin explicitly
        expiresAt: expirationDate,
        createdBy: adminId
      });
      
      // Generate invitation link
      const inviteLink = `${req.protocol}://${req.get('host')}/register-with-invitation?token=${inviteToken}`;
      
      res.status(201).json({ 
        message: "Invitation sent successfully",
        inviteLink // Include for testing/demo purposes
      });
    } catch (error) {
      console.error("Error sending invitation:", error);
      res.status(500).json({ message: "Error sending invitation" });
    }
  });

  // Reset Admin password
  app.post("/api/admin/reset-password/:id", adminOnly, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = parseInt(id);
      
      // Validate request
      const validationResult = resetPasswordSchema.safeParse({ id: userId });
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid request data", 
          errors: fromZodError(validationResult.error)
        });
      }
      
      // Check if admin exists using storage interface
      const existingAdmin = await storage.getUser(userId);
      
      if (!existingAdmin) {
        return res.status(404).json({ message: "Administrator not found" });
      }
      
      if (existingAdmin.role !== 'admin') {
        return res.status(400).json({ message: "User is not an administrator" });
      }
      
      // Generate a temporary password
      const tempPassword = generateToken(12); // 12-char random password
      
      // Hash the temporary password
      const hashedPassword = await hashPassword(tempPassword);
      
      // Update the user's password using storage interface
      await storage.updateUser(userId, {
        password: hashedPassword,
      });
      
      // In a real application, you'd send this password via email
      // For demonstration, we'll return it in the response
      res.status(200).json({ 
        message: "Password reset successfully",
        temporaryPassword: tempPassword // For demonstration only
      });
    } catch (error) {
      console.error("Error resetting password:", error);
      res.status(500).json({ message: "Error resetting password" });
    }
  });

  // Revoke invitation
  app.delete("/api/admin/invitations/:id", adminOnly, async (req, res) => {
    try {
      const { id } = req.params;
      const invitationId = parseInt(id);
      
      // Check if invitation exists using storage interface
      const existingInvitation = await storage.getInvitation(invitationId);
      
      if (!existingInvitation) {
        return res.status(404).json({ message: "Invitation not found" });
      }
      
      if (existingInvitation.used) {
        return res.status(400).json({ message: "Invitation has already been used" });
      }
      
      // Delete the invitation using storage interface
      await storage.deleteInvitation(invitationId);
      
      res.status(200).json({ message: "Invitation revoked successfully" });
    } catch (error) {
      console.error("Error revoking invitation:", error);
      res.status(500).json({ message: "Error revoking invitation" });
    }
  });
}
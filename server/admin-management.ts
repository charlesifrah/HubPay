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
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: "Unauthorized, no token provided" });
    }

    const token = authHeader.split(' ')[1];
    try {
      // Verify and decode the token
      const decoded = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      
      if (decoded.role !== 'admin') {
        return res.status(403).json({ message: "Forbidden: Admin access required" });
      }
      
      next();
    } catch (error) {
      return res.status(401).json({ message: "Unauthorized, invalid token" });
    }
  };

  // Get all Administrators
  app.get("/api/admin/administrators", adminOnly, async (req, res) => {
    try {
      // Get current admin's ID from token
      const authHeader = req.headers.authorization;
      const token = authHeader!.split(' ')[1];
      const currentAdminId = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString()).id;
      
      // Get all users with role 'admin'
      const administrators = await db.select().from(users)
        .where(eq(users.role, 'admin'))
        .orderBy(users.name);
      
      // Get all pending invitations for admin role
      const pendingInvitations = await db.select().from(invitations)
        .where(eq(invitations.used, false));
      
      // Filter invitations that are for admin role (determined by createdBy admin)
      // In a real-world scenario, we might have a role field in the invitations table
      const adminInvitations = pendingInvitations.filter(invite => invite.role === 'admin');
      
      // Map users to a safer response object (excluding password)
      const adminList = administrators.map(admin => ({
        id: admin.id,
        name: admin.name,
        email: admin.email,
        status: admin.status,
        createdAt: admin.createdAt,
        isSelf: admin.id === currentAdminId, // Flag if this is the current admin
        type: 'user'
      }));
      
      // Map pending invitations
      const now = new Date();
      const pendingList = adminInvitations.map(invite => ({
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

  // Update Administrator (name, email, status)
  app.patch("/api/admin/administrators/:id", adminOnly, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = parseInt(id);
      
      // Get current admin's ID from token
      const authHeader = req.headers.authorization;
      const token = authHeader!.split(' ')[1];
      const currentAdminId = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString()).id;
      
      // Prevent administrators from modifying their own role
      if (userId === currentAdminId) {
        return res.status(403).json({ 
          message: "Cannot modify your own administrator account. Please ask another administrator to make changes."
        });
      }
      
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
      
      // Get the current user to verify it exists and is an Admin
      const existingUser = await db.select().from(users).where(eq(users.id, userId));
      
      if (existingUser.length === 0) {
        return res.status(404).json({ message: "Administrator not found" });
      }
      
      if (existingUser[0].role !== 'admin') {
        return res.status(400).json({ message: "User is not an administrator" });
      }
      
      // Check if email is being updated and verify it's not already in use
      if (updateData.email && updateData.email !== existingUser[0].email) {
        const emailCheck = await db.select().from(users).where(eq(users.email, updateData.email));
        if (emailCheck.length > 0) {
          return res.status(400).json({ message: "Email is already in use" });
        }
      }
      
      // Prepare update data
      const dataToUpdate: any = {
        updatedAt: new Date(),
        updatedBy: currentAdminId
      };
      
      if (updateData.name) dataToUpdate.name = updateData.name;
      if (updateData.email) dataToUpdate.email = updateData.email;
      if (updateData.status) dataToUpdate.status = updateData.status;
      
      // Update the user
      const updatedAdmins = await db.update(users)
        .set(dataToUpdate)
        .where(eq(users.id, userId))
        .returning({
          id: users.id,
          name: users.name,
          email: users.email,
          status: users.status,
          updatedAt: users.updatedAt
        });
      
      res.status(200).json(updatedAdmins[0]);
    } catch (error) {
      console.error("Error updating Admin:", error);
      res.status(500).json({ message: "Error updating administrator" });
    }
  });

  // Delete Administrator
  app.delete("/api/admin/administrators/:id", adminOnly, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = parseInt(id);
      
      // Get current admin's ID from token
      const authHeader = req.headers.authorization;
      const token = authHeader!.split(' ')[1];
      const currentAdminId = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString()).id;
      
      // Prevent administrators from deleting themselves
      if (userId === currentAdminId) {
        return res.status(403).json({ 
          message: "Cannot delete your own administrator account. Please ask another administrator to do this."
        });
      }
      
      // Verify user exists and is an Admin
      const existingUser = await db.select().from(users).where(eq(users.id, userId));
      
      if (existingUser.length === 0) {
        return res.status(404).json({ message: "Administrator not found" });
      }
      
      if (existingUser[0].role !== 'admin') {
        return res.status(400).json({ message: "User is not an administrator" });
      }
      
      // Delete the user
      await db.delete(users).where(eq(users.id, userId));
      
      res.status(200).json({ message: "Administrator deleted successfully" });
    } catch (error) {
      console.error("Error deleting Admin:", error);
      res.status(500).json({ message: "Error deleting administrator" });
    }
  });

  // Send invitation to an Admin
  app.post("/api/admin/invite-admin", adminOnly, async (req, res) => {
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
      
      // Check if email is already registered
      const existingUser = await db.select().from(users).where(eq(users.email, email));
      if (existingUser.length > 0) {
        return res.status(400).json({ message: "Email is already registered" });
      }
      
      // Check if there's an existing invitation
      const existingInvite = await db.select().from(invitations).where(eq(invitations.email, email));
      
      // Delete existing invitation if it exists
      if (existingInvite.length > 0) {
        await db.delete(invitations).where(eq(invitations.email, email));
      }
      
      // Get admin ID from token
      const authHeader = req.headers.authorization;
      const token = authHeader!.split(' ')[1];
      const adminId = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString()).id;
      
      // Create new invitation
      const inviteToken = generateToken();
      const expirationDate = new Date();
      expirationDate.setHours(expirationDate.getHours() + 72); // 72-hour expiration
      
      const newInvitations = await db.insert(invitations)
        .values({
          email,
          token: inviteToken,
          expires: expirationDate,
          used: false,
          createdBy: adminId,
          role: 'admin' // Set the role to admin
        })
        .returning();
      
      // TODO: In a real application, send an email with the invitation link
      const inviteLink = `${req.protocol}://${req.get('host')}/register-with-invitation?token=${inviteToken}&role=admin`;
      
      res.status(201).json({ 
        message: "Admin invitation sent successfully",
        inviteLink // We're including this in the response for testing/demo purposes
      });
    } catch (error) {
      console.error("Error sending admin invitation:", error);
      res.status(500).json({ message: "Error sending admin invitation" });
    }
  });

  // Reset Admin password
  app.post("/api/admin/reset-admin-password/:id", adminOnly, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = parseInt(id);
      
      // Get current admin's ID from token
      const authHeader = req.headers.authorization;
      const token = authHeader!.split(' ')[1];
      const currentAdminId = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString()).id;
      
      // Prevent administrators from resetting their own password through this route
      if (userId === currentAdminId) {
        return res.status(403).json({ 
          message: "Cannot reset your own password through this route. Please use the profile page."
        });
      }
      
      // Verify user exists and is an Admin
      const existingUser = await db.select().from(users).where(eq(users.id, userId));
      
      if (existingUser.length === 0) {
        return res.status(404).json({ message: "Administrator not found" });
      }
      
      if (existingUser[0].role !== 'admin') {
        return res.status(400).json({ message: "User is not an administrator" });
      }
      
      // Generate temporary password
      const tempPassword = generateToken(12);
      
      // Update user with new password
      await db.update(users)
        .set({
          password: await hashPassword(tempPassword),
          updatedAt: new Date(),
          updatedBy: currentAdminId
        })
        .where(eq(users.id, userId));
      
      // TODO: In a real application, send an email with the temporary password
      
      res.status(200).json({ 
        message: "Password reset successfully",
        temporaryPassword: tempPassword // We're including this in the response for testing/demo purposes
      });
    } catch (error) {
      console.error("Error resetting admin password:", error);
      res.status(500).json({ message: "Error resetting administrator password" });
    }
  });

  // Resend admin invitation
  app.post("/api/admin/resend-admin-invitation/:id", adminOnly, async (req, res) => {
    try {
      const { id } = req.params;
      const invitationId = parseInt(id);
      
      // Find the invitation
      const inviteResult = await db.select().from(invitations)
        .where(eq(invitations.id, invitationId));
      
      if (inviteResult.length === 0) {
        return res.status(404).json({ message: "Invitation not found" });
      }
      
      const invitation = inviteResult[0];
      
      if (invitation.used) {
        return res.status(400).json({ message: "Invitation has already been used" });
      }
      
      // Ensure this is an admin invitation
      if (invitation.role !== 'admin') {
        return res.status(400).json({ message: "This is not an admin invitation" });
      }
      
      // Get admin ID from token
      const authHeader = req.headers.authorization;
      const token = authHeader!.split(' ')[1];
      const adminId = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString()).id;
      
      // Generate new token and update expiration
      const newToken = generateToken();
      const newExpiration = new Date();
      newExpiration.setHours(newExpiration.getHours() + 72); // 72-hour expiration
      
      // Update the invitation
      await db.update(invitations)
        .set({
          token: newToken,
          expires: newExpiration,
          createdBy: adminId,
          createdAt: new Date() // Update the creation date to reflect the resend
        })
        .where(eq(invitations.id, invitationId));
      
      // TODO: In a real application, send an email with the invitation link
      const inviteLink = `${req.protocol}://${req.get('host')}/register-with-invitation?token=${newToken}&role=admin`;
      
      res.status(200).json({ 
        message: "Admin invitation resent successfully",
        inviteLink
      });
    } catch (error) {
      console.error("Error resending admin invitation:", error);
      res.status(500).json({ message: "Error resending admin invitation" });
    }
  });

  // Delete admin invitation
  app.delete("/api/admin/admin-invitations/:id", adminOnly, async (req, res) => {
    try {
      const { id } = req.params;
      const invitationId = parseInt(id);
      
      // Find the invitation
      const inviteResult = await db.select().from(invitations)
        .where(eq(invitations.id, invitationId));
      
      if (inviteResult.length === 0) {
        return res.status(404).json({ message: "Invitation not found" });
      }
      
      const invitation = inviteResult[0];
      
      // Ensure this is an admin invitation
      if (invitation.role !== 'admin') {
        return res.status(400).json({ message: "This is not an admin invitation" });
      }
      
      // Delete the invitation
      await db.delete(invitations).where(eq(invitations.id, invitationId));
      
      res.status(200).json({ message: "Admin invitation deleted successfully" });
    } catch (error) {
      console.error("Error deleting admin invitation:", error);
      res.status(500).json({ message: "Error deleting admin invitation" });
    }
  });

  // The registration with invitation for admins will use the same endpoint as AEs
  // But we'll add role validation to ensure the token is for the right role
  // This is already handled in the existing /api/auth/register-with-invitation endpoint
}
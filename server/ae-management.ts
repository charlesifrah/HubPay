import { Request, Response, Express } from "express";
import { db } from "./db";
import { users, invitations, userStatusEnum } from "@shared/schema";
import { eq, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { randomBytes } from "crypto";
import { storage } from "./storage";
import { hashPassword } from "./auth";
import { fromZodError } from "zod-validation-error";

// Function to generate a random token
function generateToken(length: number = 64): string {
  return randomBytes(length / 2).toString('hex');
}

// Define the schema for AE management endpoints
const inviteSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
});

const updateAESchema = z.object({
  id: z.number(),
  name: z.string().min(1, { message: "Name is required" }).optional(),
  email: z.string().email({ message: "Invalid email address" }).optional(),
  status: z.enum(["active", "suspended", "pending"]).optional(),
});

const resetPasswordSchema = z.object({
  id: z.number(),
});

// Set up AE management routes
export function setupAEManagementRoutes(app: Express) {
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

  // Get all Account Executives
  app.get("/api/admin/account-executives", adminOnly, async (req, res) => {
    try {
      // Get all users with role 'ae'
      const accountExecutives = await db.select().from(users)
        .where(eq(users.role, 'ae'))
        .orderBy(users.name);
      
      // Map to a safer response object (excluding password)
      const aeList = accountExecutives.map(ae => ({
        id: ae.id,
        name: ae.name,
        email: ae.email,
        status: ae.status,
        createdAt: ae.createdAt
      }));
      
      res.status(200).json(aeList);
    } catch (error) {
      console.error("Error fetching AEs:", error);
      res.status(500).json({ message: "Error fetching account executives" });
    }
  });

  // Update Account Executive (name, email, status)
  app.patch("/api/admin/account-executives/:id", adminOnly, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = parseInt(id);
      
      // Validate update data
      const validationResult = updateAESchema.safeParse({ 
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
      
      // Get the current user to verify it exists and is an AE
      const existingUser = await db.select().from(users).where(eq(users.id, userId));
      
      if (existingUser.length === 0) {
        return res.status(404).json({ message: "Account executive not found" });
      }
      
      if (existingUser[0].role !== 'ae') {
        return res.status(400).json({ message: "User is not an account executive" });
      }
      
      // Check if email is being updated and verify it's not already in use
      if (updateData.email && updateData.email !== existingUser[0].email) {
        const emailCheck = await db.select().from(users).where(eq(users.email, updateData.email));
        if (emailCheck.length > 0) {
          return res.status(400).json({ message: "Email is already in use" });
        }
      }
      
      // Get current admin ID from token
      const authHeader = req.headers.authorization;
      const token = authHeader!.split(' ')[1];
      const adminId = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString()).id;
      
      // Prepare update data
      const dataToUpdate: any = {
        updatedAt: new Date(),
        updatedBy: adminId
      };
      
      if (updateData.name) dataToUpdate.name = updateData.name;
      if (updateData.email) dataToUpdate.email = updateData.email;
      if (updateData.status) dataToUpdate.status = updateData.status;
      
      // Update the user
      const [updatedAE] = await db.update(users)
        .set(dataToUpdate)
        .where(eq(users.id, userId))
        .returning({
          id: users.id,
          name: users.name,
          email: users.email,
          status: users.status,
          updatedAt: users.updatedAt
        });
      
      res.status(200).json(updatedAE);
    } catch (error) {
      console.error("Error updating AE:", error);
      res.status(500).json({ message: "Error updating account executive" });
    }
  });

  // Delete Account Executive
  app.delete("/api/admin/account-executives/:id", adminOnly, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = parseInt(id);
      
      // Verify user exists and is an AE
      const existingUser = await db.select().from(users).where(eq(users.id, userId));
      
      if (existingUser.length === 0) {
        return res.status(404).json({ message: "Account executive not found" });
      }
      
      if (existingUser[0].role !== 'ae') {
        return res.status(400).json({ message: "User is not an account executive" });
      }
      
      // Check if AE has any associated data
      // This would include checking contracts, commissions, etc.
      // For now, we'll simply delete the user
      
      // Delete the user
      await db.delete(users).where(eq(users.id, userId));
      
      res.status(200).json({ message: "Account executive deleted successfully" });
    } catch (error) {
      console.error("Error deleting AE:", error);
      res.status(500).json({ message: "Error deleting account executive" });
    }
  });

  // Send invitation to an AE
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
      
      const [invitation] = await db.insert(invitations)
        .values({
          email,
          token: inviteToken,
          expires: expirationDate,
          used: false,
          createdBy: adminId
        })
        .returning();
      
      // TODO: In a real application, send an email with the invitation link
      const inviteLink = `${req.protocol}://${req.get('host')}/api/auth/register?token=${inviteToken}`;
      
      res.status(201).json({ 
        message: "Invitation sent successfully",
        inviteLink // We're including this in the response for testing/demo purposes
      });
    } catch (error) {
      console.error("Error sending invitation:", error);
      res.status(500).json({ message: "Error sending invitation" });
    }
  });

  // Reset AE password
  app.post("/api/admin/reset-password/:id", adminOnly, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = parseInt(id);
      
      // Verify user exists and is an AE
      const existingUser = await db.select().from(users).where(eq(users.id, userId));
      
      if (existingUser.length === 0) {
        return res.status(404).json({ message: "Account executive not found" });
      }
      
      if (existingUser[0].role !== 'ae') {
        return res.status(400).json({ message: "User is not an account executive" });
      }
      
      // Generate temporary password
      const tempPassword = generateToken(12);
      
      // Get admin ID from token
      const authHeader = req.headers.authorization;
      const token = authHeader!.split(' ')[1];
      const adminId = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString()).id;
      
      // Update user with new password
      await db.update(users)
        .set({
          password: await hashPassword(tempPassword),
          updatedAt: new Date(),
          updatedBy: adminId
        })
        .where(eq(users.id, userId));
      
      // TODO: In a real application, send an email with the temporary password
      
      res.status(200).json({ 
        message: "Password reset successfully",
        temporaryPassword: tempPassword // We're including this in the response for testing/demo purposes
      });
    } catch (error) {
      console.error("Error resetting password:", error);
      res.status(500).json({ message: "Error resetting password" });
    }
  });

  // Validate invitation token and claim invitation
  app.get("/api/auth/validate-invitation", async (req, res) => {
    try {
      const token = req.query.token as string;
      
      if (!token) {
        return res.status(400).json({ message: "Token is required" });
      }
      
      // Find invitation by token
      const [invitation] = await db.select().from(invitations)
        .where(eq(invitations.token, token));
      
      if (!invitation) {
        return res.status(404).json({ message: "Invitation not found" });
      }
      
      if (invitation.used) {
        return res.status(400).json({ message: "Invitation has already been used" });
      }
      
      if (new Date() > invitation.expires) {
        return res.status(400).json({ message: "Invitation has expired" });
      }
      
      // Return the email associated with the invitation
      res.status(200).json({ 
        email: invitation.email,
        valid: true
      });
    } catch (error) {
      console.error("Error validating invitation:", error);
      res.status(500).json({ message: "Error validating invitation" });
    }
  });

  // Register with invitation token
  app.post("/api/auth/register-with-invitation", async (req, res) => {
    try {
      // Validate registration data
      const registerSchema = z.object({
        token: z.string(),
        name: z.string().min(1, { message: "Name is required" }),
        password: z.string().min(6, { message: "Password must be at least 6 characters" })
      });
      
      const validationResult = registerSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid request data", 
          errors: fromZodError(validationResult.error)
        });
      }
      
      const { token, name, password } = validationResult.data;
      
      // Find invitation by token
      const [invitation] = await db.select().from(invitations)
        .where(eq(invitations.token, token));
      
      if (!invitation) {
        return res.status(404).json({ message: "Invitation not found" });
      }
      
      if (invitation.used) {
        return res.status(400).json({ message: "Invitation has already been used" });
      }
      
      if (new Date() > invitation.expires) {
        return res.status(400).json({ message: "Invitation has expired" });
      }
      
      // Create new user
      const [user] = await db.insert(users)
        .values({
          email: invitation.email,
          name,
          password: await hashPassword(password),
          role: 'ae',
          status: 'active',
          createdBy: invitation.createdBy
        })
        .returning();
      
      // Mark invitation as used
      await db.update(invitations)
        .set({ used: true })
        .where(eq(invitations.id, invitation.id));
      
      // Return user data (excluding password)
      const userData = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status
      };
      
      res.status(201).json(userData);
    } catch (error) {
      console.error("Error registering user:", error);
      res.status(500).json({ message: "Error registering user" });
    }
  });
}
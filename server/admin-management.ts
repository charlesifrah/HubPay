import { Express, Request, Response } from 'express';
import { randomBytes } from 'crypto';
import { users, invitations } from '@shared/schema';
import { storage } from './storage';
import { hashPassword } from './auth';

type User = typeof users.$inferSelect;
type Invitation = typeof invitations.$inferSelect;

// Generate a random token for invitation links
function generateToken(length: number = 64): string {
  return randomBytes(length / 2).toString('hex');
}

export function setupAdminManagementRoutes(app: Express) {
  // Middleware to ensure only admin users can access these routes
  const adminOnly = async (req: Request, res: Response, next: Function) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const user = req.user as User;
    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden - Admin access required' });
    }

    next();
  };

  // Get all admins and pending invitations
  app.get('/api/admin/administrators', adminOnly, async (req, res) => {
    try {
      // Fetch all admin users
      const allUsers = await storage.getAllUsers();
      const adminUsers = allUsers.filter(user => user.role === 'admin');
      
      // Fetch all admin invitations
      const allInvitations = await storage.getAllInvitations();
      const adminInvitations = allInvitations.filter(inv => inv.role === 'admin');
      
      // Mark the current user in the list
      const currentUser = req.user as User;
      
      // Combine and format the results
      const results = [
        ...adminUsers.map(user => ({
          id: user.id,
          name: user.name,
          email: user.email,
          status: user.status,
          createdAt: user.createdAt.toISOString(),
          type: 'user' as const,
          isSelf: user.id === currentUser.id
        })),
        ...adminInvitations.map(invitation => ({
          id: invitation.id,
          name: 'Pending Invitation',
          email: invitation.email,
          status: 'pending' as const,
          createdAt: invitation.createdAt.toISOString(),
          expires: invitation.expiresAt ? invitation.expiresAt.toISOString() : null,
          type: 'invitation' as const,
          isSelf: false
        }))
      ];
      
      res.json(results);
    } catch (error) {
      console.error('Error fetching administrators:', error);
      res.status(500).json({ message: 'Error fetching administrators' });
    }
  });

  // Invite a new admin
  app.post('/api/admin/invite-admin', adminOnly, async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: 'Email is required' });
      }
      
      // Check if the email is already in use
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: 'A user with this email already exists' });
      }
      
      // Check if there's a pending invitation
      const existingInvitation = await storage.getInvitationByEmail(email);
      if (existingInvitation) {
        return res.status(400).json({ message: 'An invitation has already been sent to this email' });
      }
      
      // Create the invitation
      const token = generateToken();
      const expirationDate = new Date();
      expirationDate.setHours(expirationDate.getHours() + 72); // 72 hours expiration
      
      const invitation = await storage.createInvitation({
        email,
        token,
        role: 'admin',
        expiresAt: expirationDate,
        createdBy: (req.user as User).id
      });
      
      // Generate the invitation link
      const host = req.get('host') || 'localhost:5000';
      const protocol = req.protocol || 'http';
      const inviteLink = `${protocol}://${host}/register-with-invitation?token=${token}`;
      
      // TODO: In a production environment, send an email with the invitation link
      
      res.status(201).json({
        message: 'Invitation created successfully',
        inviteLink
      });
    } catch (error) {
      console.error('Error creating admin invitation:', error);
      res.status(500).json({ message: 'Error creating admin invitation' });
    }
  });

  // Resend an invitation
  app.post('/api/admin/resend-admin-invitation/:id', adminOnly, async (req, res) => {
    try {
      const invitationId = parseInt(req.params.id);
      
      if (isNaN(invitationId)) {
        return res.status(400).json({ message: 'Invalid invitation ID' });
      }
      
      // Get the invitation
      const invitation = await storage.getInvitation(invitationId);
      
      if (!invitation) {
        return res.status(404).json({ message: 'Invitation not found' });
      }
      
      if (invitation.role !== 'admin') {
        return res.status(403).json({ message: 'This is not an admin invitation' });
      }
      
      // Update the expiration time and token
      const token = generateToken();
      const expirationDate = new Date();
      expirationDate.setHours(expirationDate.getHours() + 72); // 72 hours expiration
      
      await storage.updateInvitation(invitationId, {
        token,
        expiresAt: expirationDate
      });
      
      // Generate the invitation link
      const host = req.get('host') || 'localhost:5000';
      const protocol = req.protocol || 'http';
      const inviteLink = `${protocol}://${host}/register-with-invitation?token=${token}`;
      
      // TODO: In a production environment, send an email with the invitation link
      
      res.json({
        message: 'Invitation resent successfully',
        inviteLink
      });
    } catch (error) {
      console.error('Error resending invitation:', error);
      res.status(500).json({ message: 'Error resending invitation' });
    }
  });

  // Delete an invitation
  app.delete('/api/admin/admin-invitations/:id', adminOnly, async (req, res) => {
    try {
      const invitationId = parseInt(req.params.id);
      
      if (isNaN(invitationId)) {
        return res.status(400).json({ message: 'Invalid invitation ID' });
      }
      
      // Get the invitation
      const invitation = await storage.getInvitation(invitationId);
      
      if (!invitation) {
        return res.status(404).json({ message: 'Invitation not found' });
      }
      
      if (invitation.role !== 'admin') {
        return res.status(403).json({ message: 'This is not an admin invitation' });
      }
      
      // Delete the invitation
      await storage.deleteInvitation(invitationId);
      
      res.json({ message: 'Invitation deleted successfully' });
    } catch (error) {
      console.error('Error deleting invitation:', error);
      res.status(500).json({ message: 'Error deleting invitation' });
    }
  });

  // Update an administrator
  app.patch('/api/admin/administrators/:id', adminOnly, async (req, res) => {
    try {
      const adminId = parseInt(req.params.id);
      const currentUser = req.user as User;
      
      if (isNaN(adminId)) {
        return res.status(400).json({ message: 'Invalid administrator ID' });
      }
      
      // Check if the admin exists
      const admin = await storage.getUser(adminId);
      
      if (!admin) {
        return res.status(404).json({ message: 'Administrator not found' });
      }
      
      if (admin.role !== 'admin') {
        return res.status(403).json({ message: 'This user is not an administrator' });
      }
      
      // Prevent admins from modifying themselves through this endpoint
      if (admin.id === currentUser.id) {
        return res.status(403).json({ message: 'Cannot modify your own account through this endpoint' });
      }
      
      // Update the admin
      const updates: Partial<User> = {};
      
      if (req.body.name !== undefined) {
        updates.name = req.body.name;
      }
      
      if (req.body.email !== undefined) {
        // Check if the email is already in use by another user
        const existingUser = await storage.getUserByEmail(req.body.email);
        if (existingUser && existingUser.id !== adminId) {
          return res.status(400).json({ message: 'Email is already in use by another user' });
        }
        updates.email = req.body.email;
      }
      
      if (req.body.status !== undefined) {
        if (!['active', 'suspended', 'pending'].includes(req.body.status)) {
          return res.status(400).json({ message: 'Invalid status value' });
        }
        updates.status = req.body.status;
      }
      
      // Apply updates
      const updatedAdmin = await storage.updateUser(adminId, updates);
      
      res.json(updatedAdmin);
    } catch (error) {
      console.error('Error updating administrator:', error);
      res.status(500).json({ message: 'Error updating administrator' });
    }
  });

  // Delete an administrator
  app.delete('/api/admin/administrators/:id', adminOnly, async (req, res) => {
    try {
      const adminId = parseInt(req.params.id);
      const currentUser = req.user as User;
      
      if (isNaN(adminId)) {
        return res.status(400).json({ message: 'Invalid administrator ID' });
      }
      
      // Check if the admin exists
      const admin = await storage.getUser(adminId);
      
      if (!admin) {
        return res.status(404).json({ message: 'Administrator not found' });
      }
      
      if (admin.role !== 'admin') {
        return res.status(403).json({ message: 'This user is not an administrator' });
      }
      
      // Prevent admins from deleting themselves
      if (admin.id === currentUser.id) {
        return res.status(403).json({ message: 'Cannot delete your own account' });
      }
      
      // Delete the admin
      await storage.deleteUser(adminId);
      
      res.json({ message: 'Administrator deleted successfully' });
    } catch (error) {
      console.error('Error deleting administrator:', error);
      res.status(500).json({ message: 'Error deleting administrator' });
    }
  });

  // Reset an administrator's password
  app.post('/api/admin/reset-admin-password/:id', adminOnly, async (req, res) => {
    try {
      const adminId = parseInt(req.params.id);
      const currentUser = req.user as User;
      
      if (isNaN(adminId)) {
        return res.status(400).json({ message: 'Invalid administrator ID' });
      }
      
      // Check if the admin exists
      const admin = await storage.getUser(adminId);
      
      if (!admin) {
        return res.status(404).json({ message: 'Administrator not found' });
      }
      
      if (admin.role !== 'admin') {
        return res.status(403).json({ message: 'This user is not an administrator' });
      }
      
      // Prevent admins from resetting their own password through this endpoint
      if (admin.id === currentUser.id) {
        return res.status(403).json({ message: 'Cannot reset your own password through this endpoint' });
      }
      
      // Generate a temporary password
      const temporaryPassword = randomBytes(8).toString('hex');
      
      // Hash the temporary password
      const hashedPassword = await hashPassword(temporaryPassword);
      
      // Update the admin's password
      await storage.updateUser(adminId, { password: hashedPassword });
      
      // In a production environment, you would send an email with the temporary password
      
      res.json({
        message: 'Password reset successful',
        temporaryPassword
      });
    } catch (error) {
      console.error('Error resetting administrator password:', error);
      res.status(500).json({ message: 'Error resetting administrator password' });
    }
  });
}
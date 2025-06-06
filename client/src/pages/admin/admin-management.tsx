import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Layout } from '@/components/layout/layout';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { formatDate } from '@/lib/utils';
import { AlertTriangle, Copy as CopyIcon, Info, Loader2, Mail, PlusCircle, RefreshCw, Search, Trash2, UserPlus, User } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Define schemas for forms
const inviteFormSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address' }),
});

const updateAdminFormSchema = z.object({
  id: z.number(),
  name: z.string().min(1, { message: 'Name is required' }).optional(),
  email: z.string().email({ message: 'Please enter a valid email address' }).optional(),
  status: z.enum(['active', 'suspended', 'pending', 'expired']).optional(),
});

// Types for the page
type BaseEntry = {
  id: number;
  name: string;
  email: string;
  status: 'active' | 'suspended' | 'pending' | 'expired';
  createdAt: string;
  type: 'user' | 'invitation';
  isSelf?: boolean;
};

type Administrator = BaseEntry & {
  type: 'user';
};

type InvitationEntry = BaseEntry & {
  type: 'invitation';
  expires?: string;
};

export default function AdminManagementPage() {
  const { toast } = useToast();
  const [editAdmin, setEditAdmin] = useState<Administrator | null>(null);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  
  // Get all Admins
  const { 
    data: administrators = [] as (Administrator | InvitationEntry)[], 
    isLoading: isLoadingAdmins,
    isError: isAdminsError,
    refetch: refetchAdmins
  } = useQuery<(Administrator | InvitationEntry)[]>({
    queryKey: ['/api/admin/administrators'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/admin/administrators');
      return await res.json();
    },
  });

  // Form for inviting new Admin
  const inviteForm = useForm<z.infer<typeof inviteFormSchema>>({
    resolver: zodResolver(inviteFormSchema),
    defaultValues: {
      email: '',
    },
  });

  // Mutation for inviting an Admin
  const inviteMutation = useMutation({
    mutationFn: async (data: z.infer<typeof inviteFormSchema>) => {
      const res = await apiRequest('POST', '/api/admin/invite', data);
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Invitation sent successfully',
        description: 'The administrator invitation has been sent.',
      });
      setInviteLink(data.inviteLink);
      inviteForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to send invitation',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Form for editing an Admin
  const editForm = useForm<z.infer<typeof updateAdminFormSchema>>({
    resolver: zodResolver(updateAdminFormSchema),
    defaultValues: {
      id: 0,
      name: '',
      email: '',
      status: 'active',
    },
  });

  // Set form values when an Admin is selected for editing
  React.useEffect(() => {
    if (editAdmin) {
      editForm.setValue('id', editAdmin.id);
      editForm.setValue('name', editAdmin.name);
      editForm.setValue('email', editAdmin.email);
      editForm.setValue('status', editAdmin.status);
    }
  }, [editAdmin, editForm]);

  // Mutation for updating an Admin
  const updateAdminMutation = useMutation({
    mutationFn: async (data: z.infer<typeof updateAdminFormSchema>) => {
      const { id, ...updateData } = data;
      const res = await apiRequest('PATCH', `/api/admin/administrators/${id}`, updateData);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Administrator updated',
        description: 'The administrator has been successfully updated.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/administrators'] });
      setEditAdmin(null);
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to update administrator',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Mutation for deleting an Admin
  const deleteAdminMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest('DELETE', `/api/admin/administrators/${id}`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to delete administrator');
      }
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Administrator deleted',
        description: 'The administrator has been successfully deleted.',
      });
      // Force refetch of the Admins list
      refetchAdmins();
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to delete administrator',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
  
  // Mutation for resending an invitation
  const [resendInviteLink, setResendInviteLink] = useState<string | null>(null);
  const resendInvitationMutation = useMutation({
    mutationFn: async (id: number) => {
      // Resending an invitation would be creating a new one with the same email
      // First we need to get the invitation details to retrieve the email
      const inviteRes = await apiRequest('GET', `/api/admin/administrators`);
      const invites = await inviteRes.json();
      const invitation = invites.find((invite: any) => invite.id === id && invite.type === 'invitation');
      
      if (!invitation) {
        throw new Error('Invitation not found');
      }
      
      // Now we can create a new invitation with the same email
      const res = await apiRequest('POST', `/api/admin/invite`, { email: invitation.email });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to resend invitation');
      }
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Invitation resent',
        description: 'The invitation has been successfully resent.',
      });
      // Store invitation link for display
      setResendInviteLink(data.inviteLink);
      // Force refetch of the Admins list
      refetchAdmins();
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to resend invitation',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
  
  // Mutation for deleting an invitation
  const deleteInvitationMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest('DELETE', `/api/admin/invitations/${id}`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to delete invitation');
      }
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Invitation deleted',
        description: 'The invitation has been successfully deleted.',
      });
      // Force refetch of the Admins list
      refetchAdmins();
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to delete invitation',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const [tempPassword, setTempPassword] = useState<string | null>(null);

  // Mutation for resetting an Admin's password
  const resetPasswordMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest('POST', `/api/admin/reset-password/${id}`);
      return await res.json();
    },
    onSuccess: (data) => {
      setTempPassword(data.temporaryPassword);
      toast({
        title: 'Password reset successful',
        description: 'A temporary password has been generated.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to reset password',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Handler for inviting a new Admin
  const onInviteSubmit = (data: z.infer<typeof inviteFormSchema>) => {
    inviteMutation.mutate(data);
  };

  // Handler for editing an Admin
  const onEditSubmit = (data: z.infer<typeof updateAdminFormSchema>) => {
    updateAdminMutation.mutate(data);
  };

  const [adminToDelete, setAdminToDelete] = useState<number | null>(null);
  const [adminToResetPassword, setAdminToResetPassword] = useState<number | null>(null);

  // Function to handle Admin deletion
  const handleDeleteAdmin = (id: number) => {
    setAdminToDelete(id);
  };

  // Function to handle password reset
  const handleResetPassword = (id: number) => {
    setAdminToResetPassword(id);
  };
  
  // Function to confirm deletion
  const confirmDeleteAdmin = () => {
    if (adminToDelete !== null) {
      deleteAdminMutation.mutate(adminToDelete);
      setAdminToDelete(null);
    }
  };
  
  // Function to confirm password reset
  const confirmResetPassword = () => {
    if (adminToResetPassword !== null) {
      resetPasswordMutation.mutate(adminToResetPassword);
      setAdminToResetPassword(null);
    }
  };

  // Status badge color mapping
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'suspended':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'expired':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Layout title="Admin Management">
      <div>
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="h-6 w-6 text-primary-500 mr-2" />
            <h2 className="text-2xl font-bold">Administrator Management</h2>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => refetchAdmins()} 
              disabled={isLoadingAdmins}
            >
              {isLoadingAdmins ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Refresh
            </Button>
            <Button onClick={() => setShowInviteDialog(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Invite Admin
            </Button>
          </div>
        </div>
        
        <Separator className="mb-6" />
        
        {/* Delete Confirmation Dialog */}
        <Dialog open={adminToDelete !== null} onOpenChange={(open) => !open && setAdminToDelete(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Deletion</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this administrator? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setAdminToDelete(null)}>
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={confirmDeleteAdmin}
                disabled={deleteAdminMutation.isPending}
              >
                {deleteAdminMutation.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Reset Password Confirmation Dialog */}
        <Dialog 
          open={adminToResetPassword !== null} 
          onOpenChange={(open) => !open && setAdminToResetPassword(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Password Reset</DialogTitle>
              <DialogDescription>
                Are you sure you want to reset the password for this administrator?
                A new temporary password will be generated.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setAdminToResetPassword(null)}>
                Cancel
              </Button>
              <Button 
                variant="default" 
                onClick={confirmResetPassword}
                disabled={resetPasswordMutation.isPending}
              >
                {resetPasswordMutation.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Reset Password
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Temporary Password Dialog */}
        <Dialog 
          open={tempPassword !== null} 
          onOpenChange={(open) => !open && setTempPassword(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Temporary Password Generated</DialogTitle>
              <DialogDescription>
                A temporary password has been generated for this administrator.
                Please securely share this password with them.
              </DialogDescription>
            </DialogHeader>
            <div className="my-4 p-4 bg-gray-100 rounded-md font-mono text-center">
              {tempPassword}
            </div>
            <Alert className="bg-yellow-50 border-yellow-200">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              <AlertTitle>Security Notice</AlertTitle>
              <AlertDescription>
                This password should be changed immediately after the first login.
              </AlertDescription>
            </Alert>
            <DialogFooter className="mt-4">
              <Button onClick={() => setTempPassword(null)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Resent Invitation Dialog */}
        <Dialog 
          open={resendInviteLink !== null} 
          onOpenChange={(open) => !open && setResendInviteLink(null)}
        >
          <DialogContent className="max-w-md w-full sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Invitation Resent</DialogTitle>
              <DialogDescription>
                The invitation has been resent. Share this secure link with the Administrator.
              </DialogDescription>
            </DialogHeader>
            
            <div className="mt-2">
              <div className="relative">
                <div className="p-3 bg-gray-50 rounded-md border font-mono text-xs break-all overflow-hidden">
                  {resendInviteLink}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute right-2 top-2 bg-white"
                  onClick={() => {
                    if (resendInviteLink) {
                      navigator.clipboard.writeText(resendInviteLink);
                      toast({
                        title: 'Copied to clipboard',
                        description: 'Invitation link has been copied to your clipboard',
                      });
                    }
                  }}
                >
                  <CopyIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <Alert className="bg-blue-100 border-blue-200 w-full max-w-full mt-4">
              <Info className="h-4 w-4 text-blue-500 shrink-0" />
              <div className="flex-1">
                <AlertTitle>Important</AlertTitle>
                <AlertDescription>
                  This link is valid for 72 hours and can only be used once. When shared, make sure the recipient is the intended administrator.
                </AlertDescription>
              </div>
            </Alert>
            
            <DialogFooter className="mt-4">
              <Button onClick={() => setResendInviteLink(null)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Edit Administrator Dialog */}
        <Dialog open={editAdmin !== null} onOpenChange={(open) => !open && setEditAdmin(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Administrator</DialogTitle>
              <DialogDescription>
                Update the administrator details.
              </DialogDescription>
            </DialogHeader>
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                <FormField
                  control={editForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Administrator Name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="admin@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="suspended">Suspended</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter className="pt-4">
                  <Button 
                    variant="outline" 
                    type="button" 
                    onClick={() => setEditAdmin(null)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit"
                    disabled={updateAdminMutation.isPending}
                  >
                    {updateAdminMutation.isPending && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    Save Changes
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
        
        {/* Invite Admin Dialog */}
        <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Invite New Administrator</DialogTitle>
              <DialogDescription>
                Send an invitation email to a new administrator. They will receive a link to complete registration.
              </DialogDescription>
            </DialogHeader>
            
            {!inviteLink && (
              <Form {...inviteForm}>
                <form onSubmit={inviteForm.handleSubmit(onInviteSubmit)} className="space-y-4">
                  <FormField
                    control={inviteForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <div className="flex items-center gap-2">
                          <FormControl>
                            <Input 
                              placeholder="admin@example.com" 
                              type="email" 
                              {...field} 
                            />
                          </FormControl>
                          <Button 
                            type="submit"
                            disabled={inviteMutation.isPending}
                          >
                            {inviteMutation.isPending ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Mail className="h-4 w-4 mr-2" />
                            )}
                            Send Invitation
                          </Button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </form>
              </Form>
            )}
            
            {inviteLink && (
              <div className="space-y-4">
                <div className="relative">
                  <div className="p-3 bg-gray-50 rounded-md border font-mono text-xs break-all overflow-hidden">
                    {inviteLink}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="absolute right-2 top-2 bg-white"
                    onClick={() => {
                      navigator.clipboard.writeText(inviteLink);
                      toast({
                        title: 'Copied to clipboard',
                        description: 'Invitation link has been copied to your clipboard',
                      });
                    }}
                  >
                    <CopyIcon className="h-4 w-4" />
                  </Button>
                </div>
                
                <Alert className="bg-blue-100 border-blue-200">
                  <Info className="h-4 w-4 text-blue-500" />
                  <AlertTitle>Important</AlertTitle>
                  <AlertDescription>
                    This link is valid for 72 hours and can only be used once. Please share it securely with the intended administrator.
                  </AlertDescription>
                </Alert>
                
                <Button 
                  className="w-full" 
                  variant="default" 
                  onClick={() => {
                    setShowInviteDialog(false);
                    setInviteLink(null);
                  }}
                >
                  Done
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
        
        {/* Admin Table */}
        <Card>
          <CardHeader>
            <CardTitle>Administrators</CardTitle>
            <CardDescription>
              Manage administrators and their access to the system.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingAdmins ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : isAdminsError ? (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                  Failed to load administrators. Please try refreshing the page.
                </AlertDescription>
              </Alert>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {administrators.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No administrators found. Invite someone to get started.
                      </TableCell>
                    </TableRow>
                  ) : (
                    administrators.map((admin: Administrator | InvitationEntry) => (
                      <TableRow key={`${admin.type}-${admin.id}`} className={admin.isSelf ? 'bg-slate-50' : ''}>
                        <TableCell>
                          {admin.name}
                          {admin.isSelf && (
                            <Badge variant="outline" className="ml-2 bg-blue-100 text-blue-800">
                              You
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>{admin.email}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getStatusBadgeVariant(admin.status)}>
                            {admin.status.charAt(0).toUpperCase() + admin.status.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(new Date(admin.createdAt))}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {admin.type === 'user' ? (
                              // Actions for existing administrators
                              <>
                                {!admin.isSelf && (
                                  <>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setEditAdmin(admin as Administrator)}
                                    >
                                      Edit
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleResetPassword(admin.id)}
                                    >
                                      Reset Password
                                    </Button>
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      onClick={() => handleDeleteAdmin(admin.id)}
                                    >
                                      Delete
                                    </Button>
                                  </>
                                )}
                              </>
                            ) : (
                              // Actions for pending invitations
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => resendInvitationMutation.mutate(admin.id)}
                                  disabled={resendInvitationMutation.isPending}
                                >
                                  {resendInvitationMutation.isPending && (
                                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                  )}
                                  Resend
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => deleteInvitationMutation.mutate(admin.id)}
                                  disabled={deleteInvitationMutation.isPending}
                                >
                                  {deleteInvitationMutation.isPending && (
                                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                  )}
                                  Cancel
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
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
import { Loader2, Mail, PlusCircle, RefreshCw, Search, Trash2, UserPlus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Define schemas for forms
const inviteFormSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address' }),
});

const updateAEFormSchema = z.object({
  id: z.number(),
  name: z.string().min(1, { message: 'Name is required' }).optional(),
  email: z.string().email({ message: 'Please enter a valid email address' }).optional(),
  status: z.enum(['active', 'suspended', 'pending']).optional(),
});

// Types for the page
type AccountExecutive = {
  id: number;
  name: string;
  email: string;
  status: 'active' | 'suspended' | 'pending';
  createdAt: string;
};

export default function AEManagementPage() {
  const { toast } = useToast();
  const [editAE, setEditAE] = useState<AccountExecutive | null>(null);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  
  // Get all AEs
  const { 
    data: accountExecutives = [], 
    isLoading: isLoadingAEs,
    isError: isAEsError,
    refetch: refetchAEs
  } = useQuery({
    queryKey: ['/api/admin/account-executives'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/admin/account-executives');
      return await res.json();
    },
  });

  // Form for inviting new AE
  const inviteForm = useForm<z.infer<typeof inviteFormSchema>>({
    resolver: zodResolver(inviteFormSchema),
    defaultValues: {
      email: '',
    },
  });

  // Mutation for inviting an AE
  const inviteMutation = useMutation({
    mutationFn: async (data: z.infer<typeof inviteFormSchema>) => {
      const res = await apiRequest('POST', '/api/admin/invite', data);
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Invitation sent successfully',
        description: 'The account executive invitation has been sent.',
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

  // Form for editing an AE
  const editForm = useForm<z.infer<typeof updateAEFormSchema>>({
    resolver: zodResolver(updateAEFormSchema),
    defaultValues: {
      id: 0,
      name: '',
      email: '',
      status: 'active',
    },
  });

  // Set form values when an AE is selected for editing
  React.useEffect(() => {
    if (editAE) {
      editForm.setValue('id', editAE.id);
      editForm.setValue('name', editAE.name);
      editForm.setValue('email', editAE.email);
      editForm.setValue('status', editAE.status);
    }
  }, [editAE, editForm]);

  // Mutation for updating an AE
  const updateAEMutation = useMutation({
    mutationFn: async (data: z.infer<typeof updateAEFormSchema>) => {
      const { id, ...updateData } = data;
      const res = await apiRequest('PATCH', `/api/admin/account-executives/${id}`, updateData);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Account executive updated',
        description: 'The account executive has been successfully updated.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/account-executives'] });
      setEditAE(null);
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to update account executive',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Mutation for deleting an AE
  const deleteAEMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest('DELETE', `/api/admin/account-executives/${id}`);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Account executive deleted',
        description: 'The account executive has been successfully deleted.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/account-executives'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to delete account executive',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const [tempPassword, setTempPassword] = useState<string | null>(null);

  // Mutation for resetting an AE's password
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

  // Handler for inviting a new AE
  const onInviteSubmit = (data: z.infer<typeof inviteFormSchema>) => {
    inviteMutation.mutate(data);
  };

  // Handler for editing an AE
  const onEditSubmit = (data: z.infer<typeof updateAEFormSchema>) => {
    updateAEMutation.mutate(data);
  };

  const [aeToDelete, setAeToDelete] = useState<number | null>(null);
  const [aeToResetPassword, setAeToResetPassword] = useState<number | null>(null);

  // Function to handle AE deletion
  const handleDeleteAE = (id: number) => {
    setAeToDelete(id);
  };

  // Function to handle password reset
  const handleResetPassword = (id: number) => {
    setAeToResetPassword(id);
  };
  
  // Function to confirm deletion
  const confirmDeleteAE = () => {
    if (aeToDelete !== null) {
      deleteAEMutation.mutate(aeToDelete);
      setAeToDelete(null);
    }
  };
  
  // Function to confirm password reset
  const confirmResetPassword = () => {
    if (aeToResetPassword !== null) {
      resetPasswordMutation.mutate(aeToResetPassword);
      setAeToResetPassword(null);
    }
  };

  // Status badge color mapping
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500 hover:bg-green-600';
      case 'suspended':
        return 'bg-red-500 hover:bg-red-600';
      case 'pending':
        return 'bg-yellow-500 hover:bg-yellow-600';
      default:
        return 'bg-gray-500 hover:bg-gray-600';
    }
  };

  return (
    <Layout title="AE Management">
      <div className="container mx-auto py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Account Executive Management</h1>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => refetchAEs()} 
              disabled={isLoadingAEs}
            >
              {isLoadingAEs ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Refresh
            </Button>
            <Button onClick={() => setShowInviteDialog(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Invite AE
            </Button>
          </div>
        </div>
        
        {/* Delete Confirmation Dialog */}
        <Dialog open={aeToDelete !== null} onOpenChange={(open) => !open && setAeToDelete(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Deletion</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this account executive? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setAeToDelete(null)}>
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={confirmDeleteAE}
                disabled={deleteAEMutation.isPending}
              >
                {deleteAEMutation.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Reset Password Confirmation Dialog */}
        <Dialog 
          open={aeToResetPassword !== null} 
          onOpenChange={(open) => !open && setAeToResetPassword(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Password Reset</DialogTitle>
              <DialogDescription>
                Are you sure you want to reset the password for this account executive?
                A new temporary password will be generated.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setAeToResetPassword(null)}>
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
                A temporary password has been generated for this account executive.
                Please securely share this password with them.
              </DialogDescription>
            </DialogHeader>
            <div className="my-4 p-4 bg-gray-100 rounded-md font-mono text-center">
              {tempPassword}
            </div>
            <Alert variant="warning">
              <AlertTriangle className="h-4 w-4" />
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

        {/* Invite AE Dialog */}
        <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite Account Executive</DialogTitle>
              <DialogDescription>
                Send an invitation email to a new Account Executive.
              </DialogDescription>
            </DialogHeader>

            <Form {...inviteForm}>
              <form onSubmit={inviteForm.handleSubmit(onInviteSubmit)} className="space-y-6">
                <FormField
                  control={inviteForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="email@example.com" {...field} />
                      </FormControl>
                      <FormDescription>
                        The email address to send the invitation to.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {inviteLink && (
                  <Alert>
                    <Mail className="h-4 w-4" />
                    <AlertTitle>Invitation Link Generated</AlertTitle>
                    <AlertDescription>
                      <p className="mb-2">Share this link with the Account Executive:</p>
                      <code className="p-2 bg-gray-100 rounded block overflow-x-auto">
                        {inviteLink}
                      </code>
                    </AlertDescription>
                  </Alert>
                )}

                <DialogFooter>
                  <Button 
                    type="submit" 
                    disabled={inviteMutation.isPending}
                  >
                    {inviteMutation.isPending && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    Send Invitation
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Edit AE Dialog */}
        <Dialog open={!!editAE} onOpenChange={(open) => !open && setEditAE(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Account Executive</DialogTitle>
              <DialogDescription>
                Update the account executive's details.
              </DialogDescription>
            </DialogHeader>

            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-6">
                <FormField
                  control={editForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
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
                        <Input {...field} />
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
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
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

                <DialogFooter>
                  <Button 
                    type="submit" 
                    disabled={updateAEMutation.isPending}
                  >
                    {updateAEMutation.isPending && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    Save Changes
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* AE List Table */}
        <Card>
          <CardHeader>
            <CardTitle>Account Executives</CardTitle>
            <CardDescription>
              Manage your account executives, send invitations, and update their status.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingAEs ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : isAEsError ? (
              <Alert variant="destructive">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                  Failed to load account executives. Please try refreshing the page.
                </AlertDescription>
              </Alert>
            ) : accountExecutives.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No account executives found.</p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => setShowInviteDialog(true)}
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Invite Your First AE
                </Button>
              </div>
            ) : (
              <Table>
                <TableCaption>A list of all account executives.</TableCaption>
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
                  {accountExecutives.map((ae: AccountExecutive) => (
                    <TableRow key={ae.id}>
                      <TableCell className="font-medium">{ae.name}</TableCell>
                      <TableCell>{ae.email}</TableCell>
                      <TableCell>
                        <Badge className={getStatusBadgeVariant(ae.status)}>
                          {ae.status.charAt(0).toUpperCase() + ae.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(new Date(ae.createdAt))}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditAE(ae)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleResetPassword(ae.id)}
                          >
                            Reset Password
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteAE(ae.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
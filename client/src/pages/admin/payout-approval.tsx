import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Layout } from "@/components/layout/layout";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Eye,
  CheckCircle,
  XCircle,
  ListChecks,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";

type Commission = {
  id: number;
  aeId: number;
  aeName: string;
  contractClientName: string; // From server API response
  contractType: string; // From server API response
  invoiceId: number;
  invoiceAmount: string;
  baseCommission: string;
  pilotBonus: string;
  multiYearBonus: string;
  upfrontBonus: string;
  totalCommission: string;
  createdAt: string;
};

export default function PayoutApproval() {
  const { toast } = useToast();
  const [selectedAE, setSelectedAE] = useState<string>('all');
  const [viewDetails, setViewDetails] = useState<Commission | null>(null);
  const [rejectDialog, setRejectDialog] = useState<{open: boolean, commission: Commission | null}>({
    open: false,
    commission: null
  });
  const [rejectionReason, setRejectionReason] = useState("");

  // Load AEs for filter dropdown
  const { data: aes = [] } = useQuery<any[]>({
    queryKey: ["/api/aes"],
  });

  // Load pending approvals
  const { data: pendingApprovals = [], isLoading } = useQuery<Commission[]>({
    queryKey: ["/api/admin/approvals", selectedAE && selectedAE !== 'all' ? { aeId: selectedAE } : {}],
  });

  // Get current user data
  const { data: currentUser } = useQuery<{id: number, name: string, email: string, role: string}>({
    queryKey: ["/api/user"],
  });

  // Function to save approved commissions to localStorage
  const saveApprovedCommission = (commissionId: number) => {
    const approvedCommissions = JSON.parse(localStorage.getItem('approvedCommissions') || '[]');
    if (!approvedCommissions.includes(commissionId)) {
      approvedCommissions.push(commissionId);
      localStorage.setItem('approvedCommissions', JSON.stringify(approvedCommissions));
    }
  };
  
  // Function to load approved commissions from localStorage
  const loadApprovedCommissions = (): number[] => {
    return JSON.parse(localStorage.getItem('approvedCommissions') || '[]');
  };
  
  // State to track locally approved commissions
  const [locallyApproved, setLocallyApproved] = useState<number[]>(loadApprovedCommissions());
  
  // Filter out locally approved commissions from display
  const filteredPendingApprovals = pendingApprovals.filter(
    commission => !locallyApproved.includes(commission.id)
  );
  
  // Approve commission mutation
  const approveMutation = useMutation({
    mutationFn: async (commissionId: number) => {
      const response = await apiRequest("PATCH", `/api/admin/commissions/${commissionId}/approve`, {
        currentUserId: currentUser?.id
      });
      return await response.json();
    },
    onSuccess: (_, commissionId) => {
      toast({
        title: "Commission approved",
        description: "The commission has been successfully approved.",
      });
      
      // Save to localStorage for persistence across server restarts
      saveApprovedCommission(commissionId);
      setLocallyApproved(prev => [...prev, commissionId]);
      
      // Refresh approvals list and dashboard data
      queryClient.invalidateQueries({ queryKey: ["/api/admin/approvals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/payouts"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "There was an error approving the commission.",
        variant: "destructive",
      });
    },
  });

  // Function to save rejected commissions to localStorage
  const saveRejectedCommission = (commissionId: number) => {
    const rejectedCommissions = JSON.parse(localStorage.getItem('rejectedCommissions') || '[]');
    if (!rejectedCommissions.includes(commissionId)) {
      rejectedCommissions.push(commissionId);
      localStorage.setItem('rejectedCommissions', JSON.stringify(rejectedCommissions));
    }
  };
  
  // Function to load rejected commissions from localStorage
  const loadRejectedCommissions = (): number[] => {
    return JSON.parse(localStorage.getItem('rejectedCommissions') || '[]');
  };
  
  // State to track locally rejected commissions
  const [locallyRejected, setLocallyRejected] = useState<number[]>(loadRejectedCommissions());
  
  // Reject commission mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ commissionId, reason }: { commissionId: number, reason: string }) => {
      const response = await apiRequest("PATCH", `/api/admin/commissions/${commissionId}/reject`, { 
        reason,
        currentUserId: currentUser?.id
      });
      return await response.json();
    },
    onSuccess: (_, { commissionId }) => {
      toast({
        title: "Commission rejected",
        description: "The commission has been rejected with the provided reason.",
      });
      
      // Save to localStorage for persistence across server restarts
      saveRejectedCommission(commissionId);
      setLocallyRejected(prev => [...prev, commissionId]);
      
      // Close dialog and clear reason
      setRejectDialog({ open: false, commission: null });
      setRejectionReason("");
      
      // Refresh approvals list and dashboard data
      queryClient.invalidateQueries({ queryKey: ["/api/admin/approvals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "There was an error rejecting the commission.",
        variant: "destructive",
      });
    },
  });

  // Handle approve click
  const handleApprove = (commissionId: number) => {
    approveMutation.mutate(commissionId);
  };

  // Handle reject click
  const handleReject = () => {
    if (!rejectDialog.commission || !rejectionReason.trim()) {
      toast({
        title: "Rejection reason required",
        description: "Please provide a reason for rejection.",
        variant: "destructive",
      });
      return;
    }
    
    rejectMutation.mutate({
      commissionId: rejectDialog.commission.id,
      reason: rejectionReason,
    });
  };

  // Handle approve all click (future implementation)
  const handleApproveAll = () => {
    toast({
      title: "Bulk approval",
      description: "This feature will be implemented in a future update."
    });
  };

  return (
    <Layout title="Payout Approval">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ListChecks className="h-6 w-6 text-primary-500 mr-2" />
          <h2 className="text-2xl font-bold">Payout Approval</h2>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedAE} onValueChange={setSelectedAE}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All AEs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All AEs</SelectItem>
              {aes?.map((ae: any) => (
                <SelectItem key={ae.id} value={ae.id.toString()}>
                  {ae.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleApproveAll}>
            Approve All
          </Button>
        </div>
      </div>
      
      <Separator className="mb-6" />
      
      <Card>
        <CardContent className="pt-6">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>AE</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Commission</TableHead>
                  <TableHead>Date Submitted</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-6">
                      Loading pending approvals...
                    </TableCell>
                  </TableRow>
                ) : pendingApprovals?.length === 0 || 
                    pendingApprovals.filter(c => 
                      !locallyApproved.includes(c.id) && 
                      !locallyRejected.includes(c.id)
                    ).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                      No pending approvals found
                    </TableCell>
                  </TableRow>
                ) : (
                  pendingApprovals
                    .filter((commission: Commission) => 
                      !locallyApproved.includes(commission.id) && 
                      !locallyRejected.includes(commission.id)
                    )
                    .map((commission: Commission) => (
                    <TableRow key={commission.id}>
                      <TableCell>
                        <div className="text-sm font-medium text-gray-900">{commission.aeName}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-900">{commission.contractClientName}</div>
                        <div className="text-xs text-gray-500">
                          <StatusBadge status={commission.contractType as any} />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-900">${Number(commission.invoiceAmount).toLocaleString()}</div>
                        <div className="text-xs text-gray-500">INV-{commission.invoiceId}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium text-gray-900">${Number(commission.totalCommission).toLocaleString()}</div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="px-2 py-1 h-auto text-xs flex items-center mt-1 text-primary-700"
                          onClick={() => setViewDetails(commission)}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View Details
                        </Button>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-900">
                          {new Date(commission.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(commission.createdAt).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true
                          })}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex space-x-2 justify-end">
                          <Button 
                            size="sm"
                            className="h-8 bg-green-600 hover:bg-green-700"
                            onClick={() => handleApprove(commission.id)}
                            disabled={approveMutation.isPending}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button 
                            size="sm"
                            variant="outline"
                            className="h-8 text-red-500 hover:bg-red-50 border-red-500"
                            onClick={() => setRejectDialog({ open: true, commission })}
                            disabled={rejectMutation.isPending}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Commission Details Dialog */}
      <Dialog open={viewDetails !== null} onOpenChange={(open) => !open && setViewDetails(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Commission Details</DialogTitle>
            <DialogDescription>
              Detailed breakdown of the commission calculation
            </DialogDescription>
          </DialogHeader>
          {viewDetails && (
            <div className="space-y-4 py-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Client:</span>
                <span className="text-sm">{viewDetails.contractClientName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">Account Executive:</span>
                <span className="text-sm">{viewDetails.aeName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">Invoice Amount:</span>
                <span className="text-sm">${Number(viewDetails.invoiceAmount).toLocaleString()}</span>
              </div>
              <div className="border-t border-gray-200 pt-4">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Base Commission (10%):</span>
                  <span className="text-sm">${Number(viewDetails.baseCommission).toLocaleString()}</span>
                </div>
                {Number(viewDetails.pilotBonus) > 0 && (
                  <div className="flex justify-between mt-2">
                    <span className="text-sm font-medium">Pilot Bonus:</span>
                    <span className="text-sm">${Number(viewDetails.pilotBonus).toLocaleString()}</span>
                  </div>
                )}
                {Number(viewDetails.multiYearBonus) > 0 && (
                  <div className="flex justify-between mt-2">
                    <span className="text-sm font-medium">Multi-Year Bonus:</span>
                    <span className="text-sm">${Number(viewDetails.multiYearBonus).toLocaleString()}</span>
                  </div>
                )}
                {Number(viewDetails.upfrontBonus) > 0 && (
                  <div className="flex justify-between mt-2">
                    <span className="text-sm font-medium">Upfront Payment Bonus:</span>
                    <span className="text-sm">${Number(viewDetails.upfrontBonus).toLocaleString()}</span>
                  </div>
                )}
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-4 font-medium">
                <span className="text-sm">Total Commission:</span>
                <span className="text-sm">${Number(viewDetails.totalCommission).toLocaleString()}</span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setViewDetails(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Commission Dialog */}
      <Dialog open={rejectDialog.open} onOpenChange={(open) => !open && setRejectDialog({ open: false, commission: null })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Commission</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this commission.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Textarea
              placeholder="Enter rejection reason..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog({ open: false, commission: null })}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleReject}
              disabled={!rejectionReason.trim() || rejectMutation.isPending}
            >
              {rejectMutation.isPending ? "Rejecting..." : "Reject Commission"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}

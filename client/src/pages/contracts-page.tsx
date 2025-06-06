import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { formatDate, formatCurrency } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { ContractWithAE } from "@shared/schema";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  FileSpreadsheet,
  Pencil,
  Trash2,
  Loader2
} from "lucide-react";
import { useLocation } from "wouter";
import { Layout } from "@/components/layout/layout";
import { UploadContractModal } from "@/components/modals/upload-contract-modal";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function ContractsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [contractToDelete, setContractToDelete] = useState<number | null>(null);
  const [contractsWithInvoices, setContractsWithInvoices] = useState<Record<number, boolean>>({});

  const { data: contracts, isLoading, error } = useQuery<ContractWithAE[]>({
    queryKey: ["/api/contracts"],
    enabled: !!user,
  });
  
  // Handling contract invoice data
  useEffect(() => {
    if (contracts) {
      // For now, assume no contracts have invoices to avoid API errors
      const invoiceMap: Record<number, boolean> = {};
      contracts.forEach(contract => {
        invoiceMap[contract.id] = false;
      });
      setContractsWithInvoices(invoiceMap);
    }
  }, [contracts]);
  
  // Delete contract mutation
  const { mutate: deleteContract, isPending: isDeleting } = useMutation({
    mutationFn: async (contractId: number) => {
      const response = await apiRequest("DELETE", `/api/contracts/${contractId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contracts"] });
      toast({
        title: "Contract deleted",
        description: "The contract has been successfully deleted.",
        variant: "default",
      });
      setIsDeleteDialogOpen(false);
      setContractToDelete(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete contract. " + error.message,
        variant: "destructive",
      });
    },
  });
  
  const handleDeleteClick = (contractId: number) => {
    setContractToDelete(contractId);
    setIsDeleteDialogOpen(true);
  };
  
  const confirmDelete = () => {
    if (contractToDelete) {
      deleteContract(contractToDelete);
    }
  };

  const getContractTypeColor = (type: string) => {
    switch (type) {
      case "new":
        return "bg-emerald-100 text-emerald-800";
      case "renewal":
        return "bg-blue-100 text-blue-800";
      case "upsell":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const isAdmin = user?.role === "admin";

  return (
    <Layout title="Contracts">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-6 w-6 text-primary-500 mr-2" />
          <h2 className="text-2xl font-bold">Contracts</h2>
        </div>
        
        {isAdmin && (
          <Button onClick={() => setIsModalOpen(true)}>
            Upload New Contract
          </Button>
        )}
      </div>
      
      {/* Contract Upload Modal */}
      {isAdmin && (
        <UploadContractModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
        />
      )}
      
      <Separator className="mb-6" />

      {isLoading ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin h-8 w-8 border-4 border-primary-500 rounded-full border-t-transparent"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-md p-4">
          Error loading contracts
        </div>
      ) : !contracts || contracts.length === 0 ? (
        <div className="text-center py-10 bg-white shadow rounded-lg">
          <FileSpreadsheet className="h-10 w-10 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-600">No Contracts Found</h3>
          <p className="text-gray-500 mb-4">There are no contracts in the system yet.</p>
          {isAdmin && (
            <Button onClick={() => setIsModalOpen(true)} variant="outline">
              Upload Your First Contract
            </Button>
          )}
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>AE Name</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>ACV</TableHead>
                  <TableHead>Length</TableHead>
                  <TableHead>Terms</TableHead>
                  <TableHead>Created</TableHead>
                  {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {contracts.map((contract) => {
                  const hasInvoices = contractsWithInvoices[contract.id] === true;
                  
                  return (
                    <TableRow key={contract.id}>
                      <TableCell className="font-medium">
                        {contract.clientName}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getContractTypeColor(contract.contractType)}>
                          {contract.contractType.charAt(0).toUpperCase() + contract.contractType.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>{contract.aeName}</TableCell>
                      <TableCell>{formatCurrency(parseFloat(contract.contractValue))}</TableCell>
                      <TableCell>{formatCurrency(parseFloat(contract.acv))}</TableCell>
                      <TableCell>{contract.contractLength} {contract.contractLength === 1 ? 'year' : 'years'}</TableCell>
                      <TableCell>{contract.paymentTerms}</TableCell>
                      <TableCell>{contract.createdAt ? formatDate(new Date(contract.createdAt)) : 'N/A'}</TableCell>
                      {isAdmin && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="h-8 w-8"
                              disabled={hasInvoices}
                              onClick={() => alert('Edit functionality coming soon')}
                              title={hasInvoices ? "Cannot edit contract with invoices" : "Edit contract"}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                              disabled={hasInvoices}
                              onClick={() => handleDeleteClick(contract.id)}
                              title={hasInvoices ? "Cannot delete contract with invoices" : "Delete contract"}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this contract?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the contract.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-red-500 hover:bg-red-600 focus:bg-red-600"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
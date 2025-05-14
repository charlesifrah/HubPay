import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Contract } from "@shared/schema";
import { Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default function ContractsPage() {
  const { data: contracts, isLoading } = useQuery<Contract[]>({
    queryKey: ["/api/contracts"],
    queryFn: async () => {
      const response = await fetch("/api/contracts");
      if (!response.ok) {
        throw new Error("Failed to fetch contracts");
      }
      return response.json();
    }
  });

  const getContractTypeColor = (type: string) => {
    switch (type) {
      case 'new':
        return 'bg-green-100 text-green-800';
      case 'renewal':
        return 'bg-blue-100 text-blue-800';
      case 'upsell':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-6xl">
      <h1 className="text-2xl font-bold mb-6">Contracts</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>All Contracts</CardTitle>
          <CardDescription>
            View all contracts in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : contracts && contracts.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>ACV</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Length</TableHead>
                  <TableHead>Payment Terms</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contracts.map((contract) => (
                  <TableRow key={contract.id}>
                    <TableCell className="font-medium">{contract.clientName}</TableCell>
                    <TableCell>{formatCurrency(Number(contract.contractValue))}</TableCell>
                    <TableCell>{formatCurrency(Number(contract.acv))}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getContractTypeColor(contract.contractType)}>
                        {contract.contractType}
                      </Badge>
                    </TableCell>
                    <TableCell>{contract.contractLength} months</TableCell>
                    <TableCell>{contract.paymentTerms}</TableCell>
                    <TableCell>
                      {contract.createdAt 
                        ? format(new Date(contract.createdAt), 'MMM d, yyyy') 
                        : 'N/A'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center p-6 text-gray-500">
              No contracts found
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
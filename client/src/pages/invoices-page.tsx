import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { InvoiceWithDetails } from "@shared/schema";
import { Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default function InvoicesPage() {
  const { data: invoices, isLoading } = useQuery<InvoiceWithDetails[]>({
    queryKey: ["/api/invoices"],
    queryFn: async () => {
      const response = await fetch("/api/invoices");
      if (!response.ok) {
        throw new Error("Failed to fetch invoices");
      }
      return response.json();
    }
  });

  const getRevenueTypeColor = (type: string) => {
    switch (type) {
      case 'recurring':
        return 'bg-blue-100 text-blue-800';
      case 'non-recurring':
        return 'bg-amber-100 text-amber-800';
      case 'service':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-6xl">
      <h1 className="text-2xl font-bold mb-6">Invoices</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>All Invoices</CardTitle>
          <CardDescription>
            View all invoices in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : invoices && invoices.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Revenue Type</TableHead>
                  <TableHead>Invoice Date</TableHead>
                  <TableHead>Account Executive</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">{invoice.contractClientName}</TableCell>
                    <TableCell>{formatCurrency(Number(invoice.amount))}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getRevenueTypeColor(invoice.revenueType)}>
                        {invoice.revenueType}
                      </Badge>
                    </TableCell>
                    <TableCell>{invoice.invoiceDate}</TableCell>
                    <TableCell>{invoice.contractAEName}</TableCell>
                    <TableCell>
                      {invoice.createdAt 
                        ? format(new Date(invoice.createdAt), 'MMM d, yyyy') 
                        : 'N/A'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center p-6 text-gray-500">
              No invoices found
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
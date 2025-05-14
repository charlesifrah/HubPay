import { useQuery } from "@tanstack/react-query";
import { formatDate, formatCurrency } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { InvoiceWithDetails } from "@shared/schema";
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
  FileBox,
} from "lucide-react";
import { useLocation } from "wouter";
import { Layout } from "@/components/layout/layout";

export default function InvoicesPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const { data: invoices, isLoading, error } = useQuery<InvoiceWithDetails[]>({
    queryKey: ["/api/invoices"],
    enabled: !!user,
  });

  const getRevenueTypeColor = (type: string) => {
    switch (type) {
      case "recurring":
        return "bg-green-100 text-green-800";
      case "non-recurring":
        return "bg-orange-100 text-orange-800";
      case "service":
        return "bg-sky-100 text-sky-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const isAdmin = user?.role === "admin";
  const uploadRoute = isAdmin ? "/admin/upload-invoice" : null;

  return (
    <Layout title="Invoices">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileBox className="h-6 w-6 text-primary-500 mr-2" />
          <h2 className="text-2xl font-bold">Invoices</h2>
        </div>
        
        {isAdmin && uploadRoute && (
          <Button onClick={() => setLocation(uploadRoute)}>
            Upload New Invoice
          </Button>
        )}
      </div>
      
      <Separator className="mb-6" />

      {isLoading ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin h-8 w-8 border-4 border-primary-500 rounded-full border-t-transparent"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-md p-4">
          Error loading invoices
        </div>
      ) : !invoices || invoices.length === 0 ? (
        <div className="text-center py-10 bg-white shadow rounded-lg">
          <FileBox className="h-10 w-10 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-600">No Invoices Found</h3>
          <p className="text-gray-500 mb-4">There are no invoices in the system yet.</p>
          {isAdmin && uploadRoute && (
            <Button onClick={() => setLocation(uploadRoute)} variant="outline">
              Upload Your First Invoice
            </Button>
          )}
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Revenue Type</TableHead>
                  <TableHead>Account Executive</TableHead>
                  <TableHead>Invoice Date</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">
                      {invoice.contractClientName}
                    </TableCell>
                    <TableCell>{formatCurrency(parseFloat(invoice.amount))}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getRevenueTypeColor(invoice.revenueType)}>
                        {invoice.revenueType.split('-').map(word => 
                          word.charAt(0).toUpperCase() + word.slice(1)
                        ).join(' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>{invoice.contractAEName}</TableCell>
                    <TableCell>{invoice.invoiceDate}</TableCell>
                    <TableCell>{invoice.createdAt ? formatDate(new Date(invoice.createdAt)) : 'N/A'}</TableCell>
                    <TableCell>
                      {invoice.notes ? (
                        <span className="text-sm text-gray-600">{invoice.notes}</span>
                      ) : (
                        <span className="text-xs text-gray-400">No notes</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </Layout>
  );
}
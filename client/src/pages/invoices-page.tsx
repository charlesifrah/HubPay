import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  FileBox,
  Download,
  ExternalLink,
  CheckCircle,
} from "lucide-react";
import { useLocation } from "wouter";
import { Layout } from "@/components/layout/layout";
import { UploadInvoiceModal } from "@/components/modals/upload-invoice-modal";
import { apiRequest, queryClient } from "@/lib/queryClient";

// Tabs API interface
interface TabsInvoice {
  id: string;
  customer_name: string;
  invoice_number: string;
  amount: number;
  currency: string;
  status: 'paid' | 'pending' | 'overdue';
  invoice_date: string;
  paid_date?: string;
  description?: string;
}

export default function InvoicesPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { toast } = useToast();

  const { data: invoices, isLoading, error } = useQuery<InvoiceWithDetails[]>({
    queryKey: ["/api/invoices"],
    enabled: !!user,
  });

  // Fetch Tabs invoices
  const { data: tabsData, isLoading: tabsLoading, error: tabsError } = useQuery<{
    data: TabsInvoice[];
    pagination?: { page: number; per_page: number; total: number };
  }>({
    queryKey: ["/api/tabs/invoices/paid"],
    enabled: !!user,
  });

  // Sync Tabs invoice mutation
  const syncTabsInvoiceMutation = useMutation({
    mutationFn: async ({ tabsInvoiceId, contractId }: { tabsInvoiceId: string; contractId?: number }) => {
      const response = await apiRequest("POST", "/api/tabs/invoices/sync", {
        tabsInvoiceId,
        contractId
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Invoice synced",
        description: "The Tabs invoice has been successfully synced to your system.",
      });
      // Refresh the invoices list
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Sync failed",
        description: error.message || "Failed to sync the invoice from Tabs.",
        variant: "destructive",
      });
    },
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

  return (
    <Layout title="Invoices">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileBox className="h-6 w-6 text-primary-500 mr-2" />
          <h2 className="text-2xl font-bold">Invoices</h2>
        </div>
        
        {isAdmin && (
          <Button onClick={() => setIsModalOpen(true)}>
            Upload New Invoice
          </Button>
        )}
      </div>
      
      {/* Invoice Upload Modal */}
      {isAdmin && (
        <UploadInvoiceModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
        />
      )}
      
      <Separator className="mb-6" />

      <Tabs defaultValue="manual" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="manual">Invoices</TabsTrigger>
          <TabsTrigger value="tabs">Tabs Integration</TabsTrigger>
        </TabsList>
        
        <TabsContent value="manual" className="mt-6">
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
              {isAdmin && (
                <Button onClick={() => setIsModalOpen(true)} variant="outline">
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
                      <TableHead>Invoice Number</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Revenue Type</TableHead>
                      <TableHead>Invoice Date</TableHead>
                      <TableHead>Paid Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Source</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">
                          INV-{invoice.id.toString().padStart(4, '0')}
                        </TableCell>
                        <TableCell>{invoice.contractClientName}</TableCell>
                        <TableCell>{formatCurrency(parseFloat(invoice.amount))}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getRevenueTypeColor(invoice.revenueType)}>
                            {invoice.revenueType.split('-').map(word => 
                              word.charAt(0).toUpperCase() + word.slice(1)
                            ).join(' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>{invoice.invoiceDate}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-blue-100 text-blue-800">
                            {formatDate(new Date(invoice.createdAt || invoice.invoiceDate))}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-green-100 text-green-800">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Processed
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {(invoice as any).tabsInvoiceId ? (
                            <Badge variant="outline" className="bg-purple-100 text-purple-800">
                              <ExternalLink className="h-3 w-3 mr-1" />
                              Tabs
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-gray-100 text-gray-700">
                              Manual
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="tabs" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ExternalLink className="h-5 w-5" />
                Tabs Revenue Platform Integration
              </CardTitle>
              <CardDescription>
                View and sync paid customer invoices from your Tabs platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              {tabsLoading ? (
                <div className="flex justify-center py-10">
                  <div className="animate-spin h-8 w-8 border-4 border-primary-500 rounded-full border-t-transparent"></div>
                </div>
              ) : tabsError ? (
                <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-md p-4">
                  <p className="font-medium">Tabs API Integration</p>
                  <p className="text-sm mt-1">Currently showing simulated data. Connect your Tabs API key to view real invoices.</p>
                </div>
              ) : !tabsData?.data || tabsData.data.length === 0 ? (
                <div className="text-center py-10">
                  <Download className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                  <h3 className="text-lg font-medium text-gray-600">No Paid Invoices</h3>
                  <p className="text-gray-500">No paid invoices found in your Tabs platform.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-md p-4 mb-4">
                    <p className="font-medium">Tabs Integration Active</p>
                    <p className="text-sm mt-1">Showing {tabsData.data.length} paid invoices from Tabs platform</p>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Invoice Number</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Invoice Date</TableHead>
                          <TableHead>Paid Date</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {tabsData.data.map((tabsInvoice: TabsInvoice) => (
                          <TableRow key={tabsInvoice.id}>
                            <TableCell className="font-medium">
                              {tabsInvoice.invoice_number}
                            </TableCell>
                            <TableCell>{tabsInvoice.customer_name}</TableCell>
                            <TableCell>{formatCurrency(tabsInvoice.amount)}</TableCell>
                            <TableCell>{formatDate(new Date(tabsInvoice.invoice_date))}</TableCell>
                            <TableCell>
                              {tabsInvoice.paid_date ? formatDate(new Date(tabsInvoice.paid_date)) : 'N/A'}
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant="outline" 
                                className="bg-green-100 text-green-800"
                              >
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Paid
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {isAdmin && (() => {
                                // Check if this Tabs invoice is already synced
                                const isAlreadySynced = invoices.some(inv => 
                                  (inv as any).tabsInvoiceId === tabsInvoice.id
                                );

                                if (isAlreadySynced) {
                                  return (
                                    <Badge variant="outline" className="bg-green-100 text-green-800">
                                      <CheckCircle className="h-3 w-3 mr-1" />
                                      Synced
                                    </Badge>
                                  );
                                }

                                return (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => syncTabsInvoiceMutation.mutate({
                                      tabsInvoiceId: tabsInvoice.id
                                    })}
                                    disabled={syncTabsInvoiceMutation.isPending}
                                  >
                                    {syncTabsInvoiceMutation.isPending ? 'Syncing...' : 'Sync to System'}
                                  </Button>
                                );
                              })()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </Layout>
  );
}
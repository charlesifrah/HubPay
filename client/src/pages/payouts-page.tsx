import { useQuery } from "@tanstack/react-query";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  SelectValue 
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Layout } from "@/components/layout/layout";
import {
  Download,
  FileText,
  Filter,
  CreditCard,
  Eye,
  X,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";

type Payout = {
  id: number;
  invoiceId: number;
  contractClientName: string;
  contractType: string;
  aeName: string;
  baseCommission: string;
  pilotBonus: string;
  multiYearBonus: string;
  upfrontBonus: string;
  totalCommission: string;
  invoiceAmount: string;
  status: string;
  approvedAt: string;
  approvedByName: string;
  createdAt: string;
};

export default function PayoutsPage() {
  const [selectedAE, setSelectedAE] = useState<string>('all');
  const [searchText, setSearchText] = useState<string>('');
  const [viewDetails, setViewDetails] = useState<Payout | null>(null);

  // Load AEs for filter dropdown
  const { data: aes = [] } = useQuery<any[]>({
    queryKey: ["/api/aes"],
  });

  // Load approved payouts
  const { data: payouts = [], isLoading } = useQuery<Payout[]>({
    queryKey: ["/api/admin/payouts"],
  });

  // Handle filters
  const filteredPayouts = payouts.filter(payout => {
    // Filter by AE
    if (selectedAE !== 'all' && payout.aeName !== selectedAE) {
      return false;
    }
    
    // Filter by search text
    if (searchText && !payout.contractClientName.toLowerCase().includes(searchText.toLowerCase())) {
      return false;
    }
    
    return true;
  });

  // Function to export as CSV
  const exportCSV = () => {
    const headers = ["ID", "Client", "AE", "Type", "Invoice Amount", "Commission", "Status", "Approved By", "Approved Date"];
    const rows = filteredPayouts.map(payout => [
      payout.id,
      payout.contractClientName,
      payout.aeName,
      payout.contractType,
      `$${Number(payout.invoiceAmount).toLocaleString()}`,
      `$${Number(payout.totalCommission).toLocaleString()}`,
      payout.status,
      payout.approvedByName,
      new Date(payout.approvedAt).toLocaleDateString()
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `payouts-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Layout>
      <div className="flex items-center mb-4">
        <CreditCard className="h-6 w-6 mr-2" />
        <h1 className="text-2xl font-semibold">View Payouts</h1>
      </div>
      <Separator className="my-4" />
      
      <Card className="mt-4">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Approved Payouts</CardTitle>
              <CardDescription>View and manage all approved commission payouts</CardDescription>
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={exportCSV}>
                <FileText className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <Input
                placeholder="Search by client..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="max-w-sm"
              />
            </div>
            <div className="flex space-x-2 items-center">
              <Filter className="h-4 w-4 text-gray-500" />
              <Select
                value={selectedAE}
                onValueChange={setSelectedAE}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by AE" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All AEs</SelectItem>
                  {aes.map((ae) => (
                    <SelectItem key={ae.id} value={ae.name}>
                      {ae.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Payouts Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>AE</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Invoice Amount</TableHead>
                  <TableHead className="text-right">Commission</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Approved By</TableHead>
                  <TableHead>Approved Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-4">
                      Loading payouts...
                    </TableCell>
                  </TableRow>
                ) : filteredPayouts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-4">
                      No approved payouts found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPayouts.map((payout) => (
                    <TableRow key={payout.id}>
                      <TableCell>{payout.id}</TableCell>
                      <TableCell>{payout.contractClientName}</TableCell>
                      <TableCell>{payout.aeName}</TableCell>
                      <TableCell>{payout.contractType}</TableCell>
                      <TableCell className="text-right">${Number(payout.invoiceAmount).toLocaleString()}</TableCell>
                      <TableCell className="text-right font-medium">${Number(payout.totalCommission).toLocaleString()}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {payout.status}
                        </span>
                      </TableCell>
                      <TableCell>{payout.approvedByName}</TableCell>
                      <TableCell>{new Date(payout.approvedAt).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost"
                          size="sm"
                          onClick={() => setViewDetails(payout)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={!!viewDetails} onOpenChange={(open) => !open && setViewDetails(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex justify-between items-center">
              <span>Payout Details</span>
              <Button variant="ghost" size="sm" onClick={() => setViewDetails(null)}>
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
            <DialogDescription>
              {viewDetails?.contractClientName} - ID: {viewDetails?.id}
            </DialogDescription>
          </DialogHeader>
          
          {viewDetails && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Client</h4>
                  <p className="text-base">{viewDetails.contractClientName}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Type</h4>
                  <p className="text-base">{viewDetails.contractType}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Account Executive</h4>
                  <p className="text-base">{viewDetails.aeName}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Invoice Amount</h4>
                  <p className="text-base">${Number(viewDetails.invoiceAmount).toLocaleString()}</p>
                </div>
              </div>
              
              <Separator />
              
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">Commission Details</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h5 className="text-xs font-medium text-gray-500">Base Commission</h5>
                    <p className="text-base">${Number(viewDetails.baseCommission).toLocaleString()}</p>
                  </div>
                  <div>
                    <h5 className="text-xs font-medium text-gray-500">Pilot Bonus</h5>
                    <p className="text-base">${Number(viewDetails.pilotBonus).toLocaleString()}</p>
                  </div>
                  <div>
                    <h5 className="text-xs font-medium text-gray-500">Multi-Year Bonus</h5>
                    <p className="text-base">${Number(viewDetails.multiYearBonus).toLocaleString()}</p>
                  </div>
                  <div>
                    <h5 className="text-xs font-medium text-gray-500">Upfront Bonus</h5>
                    <p className="text-base">${Number(viewDetails.upfrontBonus).toLocaleString()}</p>
                  </div>
                </div>
                <div className="mt-4 bg-gray-50 p-3 rounded-md">
                  <div className="flex justify-between items-center">
                    <h5 className="font-medium">Total Commission</h5>
                    <p className="text-lg font-semibold">${Number(viewDetails.totalCommission).toLocaleString()}</p>
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Status</h4>
                  <p className="inline-flex items-center mt-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    {viewDetails.status}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Approved By</h4>
                  <p className="text-base">{viewDetails.approvedByName}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Created Date</h4>
                  <p className="text-base">{new Date(viewDetails.createdAt).toLocaleDateString()}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Approved Date</h4>
                  <p className="text-base">{new Date(viewDetails.approvedAt).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
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
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { Layout } from "@/components/layout/layout";
import {
  Download,
  FileText,
  Filter,
  CreditCard,
  Eye,
  X,
  DollarSign,
  CheckCircle,
  Calendar,
  User,
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
    <Layout title="Payouts">
      <div className="flex items-center gap-2 mb-4">
        <CreditCard className="h-6 w-6 text-primary-500 mr-2" />
        <h2 className="text-2xl font-bold">View Payouts</h2>
      </div>
      <Separator className="my-4" />
      
      <Card className="mt-4">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Approved Payouts</CardTitle>
              <CardDescription className="mt-1.5">
                View and manage all approved commission payouts
              </CardDescription>
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
                  <TableHead className="w-16">ID</TableHead>
                  <TableHead>Client & AE</TableHead>
                  <TableHead>Contract Details</TableHead>
                  <TableHead className="text-right">Commission</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Approval Details</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      Loading payouts...
                    </TableCell>
                  </TableRow>
                ) : filteredPayouts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      No approved payouts found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPayouts.map((payout) => (
                    <TableRow key={payout.id} className="hover:bg-gray-50">
                      <TableCell className="font-mono text-sm">#{payout.id}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium text-gray-900">{payout.contractClientName}</div>
                          <div className="flex items-center text-sm text-gray-500 mt-1">
                            <User className="h-3 w-3 mr-1" />
                            {payout.aeName}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <Badge variant="outline" className="text-xs mb-1">
                            {payout.contractType}
                          </Badge>
                          <div className="text-sm text-gray-600">
                            Invoice: ${Number(payout.invoiceAmount).toLocaleString()}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="font-semibold text-green-600">
                          ${Number(payout.totalCommission).toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Base: ${Number(payout.baseCommission).toLocaleString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Approved
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium text-sm">{payout.approvedByName}</div>
                          <div className="flex items-center text-xs text-gray-500 mt-1">
                            <Calendar className="h-3 w-3 mr-1" />
                            {new Date(payout.approvedAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(payout.approvedAt).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true
                            })}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          size="sm"
                          variant="outline"
                          onClick={() => setViewDetails(payout)}
                          className="h-8"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
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
            <DialogTitle>Payout Details</DialogTitle>
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
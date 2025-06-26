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
  oteApplied: boolean;
};

export default function PayoutsPage() {
  const [selectedAE, setSelectedAE] = useState<string>('all');
  const [searchText, setSearchText] = useState<string>('');
  const [viewDetails, setViewDetails] = useState<Payout | null>(null);

  // Contract type badge styling to match View Invoices
  const getContractTypeColor = (type: string) => {
    switch (type) {
      case "new":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "renewal":
        return "bg-green-100 text-green-800 border-green-200";
      case "upsell":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "pilot":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "multi-year":
        return "bg-indigo-100 text-indigo-800 border-indigo-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

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
                placeholder="Search by customer..."
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
                  <TableHead>AE</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Commission</TableHead>
                  <TableHead>Date Approved</TableHead>
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
                      <TableCell>
                        <div className="font-medium text-gray-900">{payout.aeName}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-gray-900">{payout.contractClientName}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          <Badge variant="outline" className={getContractTypeColor(payout.contractType)}>
                            {payout.contractType.split('-').map(word => 
                              word.charAt(0).toUpperCase() + word.slice(1)
                            ).join(' ')}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold text-gray-900">${Number(payout.invoiceAmount).toLocaleString()}</div>
                        <div className="text-xs text-gray-500 mt-1">INV-{payout.invoiceId}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold text-green-600">${Number(payout.totalCommission).toLocaleString()}</div>
                        <div className="text-xs text-gray-500 mt-1 space-y-0.5">
                          <div>Base: ${Number(payout.baseCommission).toLocaleString()}</div>
                          {Number(payout.pilotBonus) > 0 && (
                            <div className="text-green-600">+ ${Number(payout.pilotBonus).toLocaleString()} pilot bonus</div>
                          )}
                          {Number(payout.multiYearBonus) > 0 && (
                            <div className="text-green-600">+ ${Number(payout.multiYearBonus).toLocaleString()} multi-year bonus</div>
                          )}
                          {Number(payout.upfrontBonus) > 0 && (
                            <div className="text-green-600">+ ${Number(payout.upfrontBonus).toLocaleString()} upfront bonus</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-900">
                          {new Date(payout.approvedAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(payout.approvedAt).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true
                          })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-sm">{payout.approvedByName}</div>
                        <Badge variant="outline" className="bg-green-100 text-green-800 mt-1">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Approved
                        </Badge>
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

      {/* Payout Details Dialog */}
      <Dialog open={viewDetails !== null} onOpenChange={(open) => !open && setViewDetails(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Payout Details</DialogTitle>
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
                  <span className="text-sm font-medium">Base Commission:</span>
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
                
                {/* Calculate subtotal before OTE cap */}
                {(() => {
                  const subtotal = Number(viewDetails.baseCommission) + 
                                 Number(viewDetails.pilotBonus || 0) + 
                                 Number(viewDetails.multiYearBonus || 0) + 
                                 Number(viewDetails.upfrontBonus || 0);
                  const finalTotal = Number(viewDetails.totalCommission);
                  const isOTEApplied = viewDetails.oteApplied || Math.abs(subtotal - finalTotal) > 1;
                  
                  return isOTEApplied ? (
                    <>
                      <div className="flex justify-between mt-3 pt-2 border-t border-gray-100">
                        <span className="text-sm font-medium">Subtotal:</span>
                        <span className="text-sm">${subtotal.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between mt-2">
                        <span className="text-sm font-medium text-orange-600">OTE Cap Applied (90%):</span>
                        <span className="text-sm text-orange-600">-${(subtotal - finalTotal).toLocaleString()}</span>
                      </div>
                      <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-md">
                        <div className="text-xs text-orange-800">
                          <div className="font-semibold mb-1">OTE Cap Explanation:</div>
                          <div>This AE has approached their $1M annual On-Target Earnings (OTE) cap. Commission amounts above this threshold are reduced by a 90% decelerator to manage compensation limits.</div>
                        </div>
                      </div>
                    </>
                  ) : null;
                })()}
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-4 font-medium">
                <span className="text-sm">Final Commission:</span>
                <span className="text-sm text-green-600">${Number(viewDetails.totalCommission).toLocaleString()}</span>
              </div>
              
              {/* Additional payout information */}
              <div className="border-t border-gray-200 pt-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Status:</span>
                  <span className="text-sm">
                    <Badge className="bg-green-100 text-green-800 border-green-200">
                      {viewDetails.status}
                    </Badge>
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Approved By:</span>
                  <span className="text-sm">{viewDetails.approvedByName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Approved Date:</span>
                  <span className="text-sm">{new Date(viewDetails.approvedAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          )}
          <div className="flex justify-end pt-4">
            <Button onClick={() => setViewDetails(null)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CheckCircle, Clock, XCircle, Banknote } from "lucide-react";

export type RecentDeal = {
  id: number;
  invoiceId: number;
  client: string;
  dealType: 'new' | 'renewal' | 'upsell' | 'pilot' | 'multi-year';
  invoiceAmount: string;
  totalCommission: string;
  baseCommission: string;
  pilotBonus?: string;
  multiYearBonus?: string;
  upfrontBonus?: string;
  dateApproved: string;
  status: 'pending' | 'approved' | 'paid' | 'rejected';
};

interface RecentDealsTableProps {
  deals: RecentDeal[];
}

// Helper function to get contract type color classes
const getContractTypeColor = (type: string) => {
  switch (type) {
    case 'new':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'renewal':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'upsell':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'pilot':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'multi-year':
      return 'bg-indigo-100 text-indigo-800 border-indigo-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

export function RecentDealsTable({ deals }: RecentDealsTableProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Customer</TableHead>
            <TableHead>Invoice</TableHead>
            <TableHead>Commission</TableHead>
            <TableHead>Date Approved</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {deals.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                No recent deals found
              </TableCell>
            </TableRow>
          ) : (
            deals.map((deal) => (
              <TableRow key={deal.id} className="hover:bg-gray-50">
                <TableCell>
                  <div className="font-medium text-gray-900">{deal.client}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    <Badge variant="outline" className={getContractTypeColor(deal.dealType)}>
                      {deal.dealType.split('-').map(word => 
                        word.charAt(0).toUpperCase() + word.slice(1)
                      ).join(' ')}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="font-semibold text-gray-900">${Number(deal.invoiceAmount).toLocaleString()}</div>
                  <div className="text-xs text-gray-500 mt-1">INV-{deal.invoiceId}</div>
                </TableCell>
                <TableCell>
                  <div className="font-semibold text-green-600">${Number(deal.totalCommission).toLocaleString()}</div>
                  <div className="text-xs text-gray-500 mt-1 space-y-0.5">
                    <div>Base: ${Number(deal.baseCommission).toLocaleString()}</div>
                    {deal.pilotBonus && Number(deal.pilotBonus) > 0 && (
                      <div className="text-green-600">+ ${Number(deal.pilotBonus).toLocaleString()} pilot bonus</div>
                    )}
                    {deal.multiYearBonus && Number(deal.multiYearBonus) > 0 && (
                      <div className="text-green-600">+ ${Number(deal.multiYearBonus).toLocaleString()} multi-year bonus</div>
                    )}
                    {deal.upfrontBonus && Number(deal.upfrontBonus) > 0 && (
                      <div className="text-green-600">+ ${Number(deal.upfrontBonus).toLocaleString()} upfront bonus</div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm text-gray-900">
                    {new Date(deal.dateApproved).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </div>
                </TableCell>
                <TableCell>
                  {deal.status === 'pending' && (
                    <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                      <Clock className="h-3 w-3 mr-1" />
                      Pending
                    </Badge>
                  )}
                  {deal.status === 'approved' && (
                    <Badge variant="outline" className="bg-green-100 text-green-800">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Approved
                    </Badge>
                  )}
                  {deal.status === 'paid' && (
                    <Badge variant="outline" className="bg-green-100 text-green-800">
                      <Banknote className="h-3 w-3 mr-1" />
                      Paid
                    </Badge>
                  )}
                  {deal.status === 'rejected' && (
                    <Badge variant="outline" className="bg-red-100 text-red-800">
                      <XCircle className="h-3 w-3 mr-1" />
                      Rejected
                    </Badge>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

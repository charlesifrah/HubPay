import { StatusBadge } from "@/components/ui/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type RecentDeal = {
  id: number;
  client: string;
  dealType: 'new' | 'renewal' | 'upsell' | 'pilot' | 'multi-year';
  invoiceAmount: string;
  commission: string;
  bonuses?: {
    amount: string;
    type: string;
  }[];
  date: string;
  status: 'pending' | 'approved' | 'paid' | 'rejected';
};

interface RecentDealsTableProps {
  deals: RecentDeal[];
}

export function RecentDealsTable({ deals }: RecentDealsTableProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Customer</TableHead>
            <TableHead>Invoice Amount</TableHead>
            <TableHead>Commission</TableHead>
            <TableHead>Date</TableHead>
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
              <TableRow key={deal.id}>
                <TableCell>
                  <div className="text-sm font-medium text-gray-900">{deal.client}</div>
                  <div className="text-xs text-gray-500">
                    <StatusBadge status={deal.dealType} />
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm text-gray-900">${deal.invoiceAmount}</div>
                </TableCell>
                <TableCell>
                  <div className="text-sm text-gray-900">${deal.commission}</div>
                  {deal.bonuses && deal.bonuses.map((bonus, idx) => (
                    <div key={idx} className="text-xs text-green-600">+ ${bonus.amount} {bonus.type}</div>
                  ))}
                </TableCell>
                <TableCell>
                  <div className="text-sm text-gray-900">{deal.date}</div>
                </TableCell>
                <TableCell>
                  <StatusBadge status={deal.status} />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

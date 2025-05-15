import { ProgressBar } from "@/components/dashboard/progress-bar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type TopAE = {
  id: number;
  name: string;
  title: string;
  avatar?: string;
  totalCommission: string;
  totalDeals: number;
  avgDealValue: string;
  oteProgress: number;
};

interface TopAEsTableProps {
  aes: TopAE[];
}

export function TopAEsTable({ aes }: TopAEsTableProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>AE Name</TableHead>
            <TableHead>Total Commission</TableHead>
            <TableHead>Total Deals</TableHead>
            <TableHead>Avg. Deal Value</TableHead>
            <TableHead>OTE Progress</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {aes.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                No AE data available
              </TableCell>
            </TableRow>
          ) : (
            aes.map((ae) => (
              <TableRow key={ae.id}>
                <TableCell>
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                      {ae.avatar ? (
                        <img src={ae.avatar} alt={ae.name} className="h-10 w-10 rounded-full" />
                      ) : (
                        <span className="text-gray-600 font-medium text-sm">
                          {ae.name.split(' ').map(n => n[0]).join('')}
                        </span>
                      )}
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">{ae.name}</div>
                      <div className="text-sm text-gray-500">{ae.title}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm font-medium text-gray-900">${ae.totalCommission}</div>
                </TableCell>
                <TableCell>
                  <div className="text-sm text-gray-900">{ae.totalDeals}</div>
                </TableCell>
                <TableCell>
                  <div className="text-sm text-gray-900">${ae.avgDealValue}</div>
                </TableCell>
                <TableCell>
                  {/* Custom table-based progress bar for maximum compatibility */}
                  <table className="w-full h-2.5 border-collapse">
                    <tbody>
                      <tr>
                        <td 
                          className="bg-primary-600 rounded-l-full h-2.5 p-0 m-0"
                          style={{ width: `${ae.oteProgress}%` }}
                        ></td>
                        <td 
                          className="bg-gray-200 rounded-r-full h-2.5 p-0 m-0"
                          style={{ width: `${100 - ae.oteProgress}%` }}
                        ></td>
                      </tr>
                    </tbody>
                  </table>
                  <div className="text-xs text-gray-500 mt-1">{ae.oteProgress.toFixed(2)}% to $1M</div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

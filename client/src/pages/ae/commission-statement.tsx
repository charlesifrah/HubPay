import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout/layout";
import { useAuth } from "@/hooks/use-auth";
import { StatusBadge } from "@/components/ui/status-badge";
import type { CommissionWithDetails } from "@shared/schema";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
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
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Printer, FileDown } from "lucide-react";

type FilterParams = {
  startDate?: string;
  endDate?: string;
  contractId?: string;
  status?: string;
};

export default function CommissionStatement() {
  const { user } = useAuth();
  const [period, setPeriod] = useState("current");
  const [filters, setFilters] = useState<FilterParams>({});
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Convert period to date filters
  const getDateFilters = (): { startDate?: string; endDate?: string } => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    switch (period) {
      case "current":
        return {
          startDate: `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-01`,
        };
      case "last":
        return {
          startDate: `${currentYear}-${(currentMonth).toString().padStart(2, '0')}-01`,
          endDate: `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-01`,
        };
      case "quarter":
        const quarterStartMonth = Math.floor(currentMonth / 3) * 3;
        return {
          startDate: `${currentYear}-${(quarterStartMonth + 1).toString().padStart(2, '0')}-01`,
        };
      case "ytd":
        return {
          startDate: `${currentYear}-01-01`,
        };
      case "last12":
        const lastYear = new Date(now);
        lastYear.setFullYear(currentYear - 1);
        return {
          startDate: `${lastYear.getFullYear()}-${(lastYear.getMonth() + 1).toString().padStart(2, '0')}-${lastYear.getDate().toString().padStart(2, '0')}`,
        };
      default:
        return {};
    }
  };

  // Combine period filters with other filters
  const combinedFilters = { ...getDateFilters(), ...filters };

  // Load commissions with filters
  const { data, isLoading } = useQuery<CommissionWithDetails[]>({
    queryKey: [`/api/ae/commissions/${user?.id}`, combinedFilters],
    enabled: !!user?.id,
  });

  // Calculate pagination
  const commissions: CommissionWithDetails[] = data || [];
  const totalCommissions = commissions.length;
  const totalPages = Math.ceil(totalCommissions / itemsPerPage);
  const paginatedCommissions = commissions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Calculate totals
  const totalAmount = commissions.reduce((sum: number, commission: CommissionWithDetails) => sum + Number(commission.totalCommission), 0);

  // Export functions (placeholder for now)
  const printStatement = () => {
    window.print();
  };

  const exportPDF = () => {
    alert("Export to PDF functionality will be implemented in the next phase.");
  };

  return (
    <Layout title="Commission Statement">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Commission Statement</CardTitle>
            <CardDescription>Detailed breakdown of all commission earnings</CardDescription>
          </div>
          <div className="flex space-x-3">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="current">Current Month</SelectItem>
                <SelectItem value="last">Last Month</SelectItem>
                <SelectItem value="quarter">Current Quarter</SelectItem>
                <SelectItem value="ytd">Year to Date</SelectItem>
                <SelectItem value="last12">Last 12 Months</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={printStatement}>
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>

            <Button variant="outline" onClick={exportPDF}>
              <FileDown className="mr-2 h-4 w-4" />
              Export PDF
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {/* Summary Section */}
          <div className="bg-gray-50 px-4 py-5 mb-6 rounded-md">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <dt className="text-sm font-medium text-gray-500">Total Commission</dt>
                <dd className="mt-1 text-xl font-semibold text-gray-900">
                  ${totalAmount.toLocaleString()}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Total Deals</dt>
                <dd className="mt-1 text-xl font-semibold text-gray-900">
                  {totalCommissions}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Period</dt>
                <dd className="mt-1 text-xl font-semibold text-gray-900">
                  {period === "current" ? "Current Month" : 
                   period === "last" ? "Last Month" : 
                   period === "quarter" ? "Current Quarter" : 
                   period === "ytd" ? "Year to Date" : 
                   period === "last12" ? "Last 12 Months" : "Custom Range"}
                </dd>
              </div>
            </div>
          </div>

          {/* Commissions Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Deal Type</TableHead>
                  <TableHead>Invoice Amount</TableHead>
                  <TableHead>Base Commission</TableHead>
                  <TableHead>Bonuses</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-6">
                      Loading commission data...
                    </TableCell>
                  </TableRow>
                ) : paginatedCommissions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                      No commission data found for the selected period
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedCommissions.map((commission) => (
                    <TableRow key={commission.id}>
                      <TableCell>
                        <div className="text-sm font-medium text-gray-900">{commission.contractClientName}</div>
                        <div className="text-xs text-gray-500">{new Date(commission.createdAt).toLocaleDateString()}</div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={commission.contractType as any} />
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-900">${Number(commission.invoiceAmount).toLocaleString()}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-900">${Number(commission.baseCommission).toLocaleString()}</div>
                        <div className="text-xs text-gray-500">10%</div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {Number(commission.pilotBonus) > 0 && (
                            <div className="text-sm text-gray-900">${Number(commission.pilotBonus).toLocaleString()}</div>
                          )}
                          {Number(commission.multiYearBonus) > 0 && (
                            <div className="text-sm text-gray-900">${Number(commission.multiYearBonus).toLocaleString()}</div>
                          )}
                          {Number(commission.upfrontBonus) > 0 && (
                            <div className="text-sm text-gray-900">${Number(commission.upfrontBonus).toLocaleString()}</div>
                          )}
                          {Number(commission.pilotBonus) === 0 && 
                           Number(commission.multiYearBonus) === 0 && 
                           Number(commission.upfrontBonus) === 0 && (
                            <div className="text-sm text-gray-500">$0.00</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium text-gray-900">${Number(commission.totalCommission).toLocaleString()}</div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={commission.status as any} />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      href="#" 
                      onClick={(e) => {
                        e.preventDefault();
                        setCurrentPage(p => Math.max(1, p - 1));
                      }}
                    />
                  </PaginationItem>
                  
                  {[...Array(Math.min(5, totalPages))].map((_, i) => {
                    let pageNumber;

                    if (totalPages <= 5) {
                      pageNumber = i + 1;
                    } else if (currentPage <= 3) {
                      pageNumber = i + 1;
                      if (i === 4) pageNumber = totalPages;
                    } else if (currentPage >= totalPages - 2) {
                      pageNumber = totalPages - 4 + i;
                      if (i === 0) pageNumber = 1;
                    } else {
                      pageNumber = currentPage - 2 + i;
                      if (i === 0) pageNumber = 1;
                      if (i === 4) pageNumber = totalPages;
                    }

                    return (
                      <PaginationItem key={i}>
                        {((i === 1 && pageNumber > 2) || (i === 3 && pageNumber < totalPages - 1)) ? (
                          <PaginationEllipsis />
                        ) : (
                          <PaginationLink
                            href="#"
                            isActive={pageNumber === currentPage}
                            onClick={(e) => {
                              e.preventDefault();
                              setCurrentPage(pageNumber);
                            }}
                          >
                            {pageNumber}
                          </PaginationLink>
                        )}
                      </PaginationItem>
                    );
                  })}
                  
                  <PaginationItem>
                    <PaginationNext 
                      href="#" 
                      onClick={(e) => {
                        e.preventDefault();
                        setCurrentPage(p => Math.min(totalPages, p + 1));
                      }}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>
    </Layout>
  );
}

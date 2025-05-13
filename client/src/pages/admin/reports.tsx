import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout/layout";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { Calendar as CalendarIcon, FileText, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ProgressBar } from "@/components/dashboard/progress-bar";

type DateRange = {
  from: Date | undefined;
  to: Date | undefined;
};

type FilterOptions = {
  startDate?: string;
  endDate?: string;
  aeId?: string;
  minValue?: string;
  maxValue?: string;
  contractType?: string;
};

type AEReportData = {
  aeId: number;
  aeName: string;
  totalCommission: string;
  deals: number;
  avgDealSize: string;
  ytdPercentage: number;
};

type ReportSummary = {
  totalCommission: string;
  totalDeals: number;
  avgCommission: string;
};

export default function Reports() {
  const [dateRange, setDateRange] = useState<DateRange>({
    from: undefined,
    to: undefined,
  });
  const [filters, setFilters] = useState<FilterOptions>({});
  const [appliedFilters, setAppliedFilters] = useState<FilterOptions>({});

  // Load AEs for filter dropdown
  const { data: aes } = useQuery({
    queryKey: ["/api/aes"],
  });

  // Load report data with applied filters
  const { data: reportData, isLoading } = useQuery({
    queryKey: ["/api/admin/reports", appliedFilters],
    enabled: Object.keys(appliedFilters).length > 0,
  });

  // Format summary data
  const summary: ReportSummary = reportData?.summary || {
    totalCommission: "0",
    totalDeals: 0,
    avgCommission: "0",
  };

  // Format AE data
  const aeData: AEReportData[] = reportData?.byAE || [];

  // Handle date range selection
  const handleDateRangeSelect = (range: DateRange) => {
    setDateRange(range);
    
    if (range.from) {
      setFilters({
        ...filters,
        startDate: format(range.from, 'yyyy-MM-dd'),
        ...(range.to && { endDate: format(range.to, 'yyyy-MM-dd') }),
      });
    } else {
      const { startDate, endDate, ...rest } = filters;
      setFilters(rest);
    }
  };

  // Handle filter select change
  const handleFilterChange = (name: string, value: string) => {
    if (value === "") {
      const newFilters = { ...filters };
      delete newFilters[name as keyof FilterOptions];
      setFilters(newFilters);
    } else {
      setFilters({ ...filters, [name]: value });
    }
  };

  // Handle apply filters
  const handleApplyFilters = () => {
    setAppliedFilters({ ...filters });
  };

  // Handle reset filters
  const handleResetFilters = () => {
    setFilters({});
    setAppliedFilters({});
    setDateRange({ from: undefined, to: undefined });
  };

  // Export functions (placeholder for now)
  const exportCSV = () => {
    alert("Export to CSV functionality will be implemented in the next phase.");
  };

  const exportPDF = () => {
    alert("Export to PDF functionality will be implemented in the next phase.");
  };

  // Prepare date range display
  const dateRangeText = dateRange.from
    ? `${format(dateRange.from, 'MMM d, yyyy')}${
        dateRange.to ? ` - ${format(dateRange.to, 'MMM d, yyyy')}` : ''
      }`
    : "Select date range";

  return (
    <Layout title="Commission Reports">
      <Card>
        <CardHeader>
          <CardTitle>Commission Reports</CardTitle>
          <CardDescription>Generate and export commission data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Filters Panel */}
            <div className="md:col-span-1 space-y-4">
              <div>
                <h4 className="text-base font-medium text-gray-900">Filters</h4>
                <p className="mt-1 text-sm text-gray-500">Narrow down your report data</p>
              </div>

              {/* Date Range */}
              <div className="space-y-2">
                <Label>Date Range</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRangeText}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="range"
                      selected={dateRange}
                      onSelect={handleDateRangeSelect}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* AE Select */}
              <div className="space-y-2">
                <Label>Account Executive</Label>
                <Select 
                  value={filters.aeId || ""} 
                  onValueChange={(value) => handleFilterChange('aeId', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All AEs" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All AEs</SelectItem>
                    {aes?.map((ae: any) => (
                      <SelectItem key={ae.id} value={ae.id.toString()}>
                        {ae.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Deal Type */}
              <div className="space-y-2">
                <Label>Deal Type</Label>
                <Select 
                  value={filters.contractType || ""} 
                  onValueChange={(value) => handleFilterChange('contractType', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Types</SelectItem>
                    <SelectItem value="new">New Business</SelectItem>
                    <SelectItem value="renewal">Renewal</SelectItem>
                    <SelectItem value="upsell">Upsell</SelectItem>
                    <SelectItem value="pilot">Pilot</SelectItem>
                    <SelectItem value="multi-year">Multi-Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Deal Value Range */}
              <div className="space-y-2">
                <Label>Deal Value Range</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">$</span>
                    </div>
                    <Input
                      type="number"
                      placeholder="Min"
                      className="pl-7"
                      value={filters.minValue || ""}
                      onChange={(e) => handleFilterChange('minValue', e.target.value)}
                    />
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">$</span>
                    </div>
                    <Input
                      type="number"
                      placeholder="Max"
                      className="pl-7"
                      value={filters.maxValue || ""}
                      onChange={(e) => handleFilterChange('maxValue', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 space-y-2">
                <Button
                  className="w-full"
                  onClick={handleApplyFilters}
                >
                  Apply Filters
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleResetFilters}
                >
                  Reset
                </Button>
              </div>
            </div>

            {/* Report Results */}
            <div className="md:col-span-3">
              <div className="mb-6 flex justify-between items-center">
                <h4 className="text-base font-medium text-gray-900">Report Results</h4>
                <div className="flex space-x-2">
                  <Button variant="outline" onClick={exportCSV}>
                    <FileText className="mr-2 h-4 w-4" />
                    CSV
                  </Button>
                  <Button variant="outline" onClick={exportPDF}>
                    <Download className="mr-2 h-4 w-4" />
                    PDF
                  </Button>
                </div>
              </div>

              {/* Summary Cards */}
              <div className="bg-gray-50 p-4 rounded-lg mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white p-4 rounded-md shadow-sm">
                    <h5 className="text-sm font-medium text-gray-500">Total Commission</h5>
                    <p className="mt-2 text-2xl font-semibold text-gray-900">
                      ${Number(summary.totalCommission).toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-white p-4 rounded-md shadow-sm">
                    <h5 className="text-sm font-medium text-gray-500">Total Deals</h5>
                    <p className="mt-2 text-2xl font-semibold text-gray-900">
                      {summary.totalDeals}
                    </p>
                  </div>
                  <div className="bg-white p-4 rounded-md shadow-sm">
                    <h5 className="text-sm font-medium text-gray-500">Avg. Commission</h5>
                    <p className="mt-2 text-2xl font-semibold text-gray-900">
                      ${Number(summary.avgCommission).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* AE Table */}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>AE</TableHead>
                      <TableHead>Total Commission</TableHead>
                      <TableHead>Deals</TableHead>
                      <TableHead>Avg. Deal Size</TableHead>
                      <TableHead>YTD %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-6">
                          Loading report data...
                        </TableCell>
                      </TableRow>
                    ) : !reportData || aeData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                          No data available for the selected filters
                        </TableCell>
                      </TableRow>
                    ) : (
                      aeData.map((ae) => (
                        <TableRow key={ae.aeId}>
                          <TableCell>
                            <div className="text-sm font-medium text-gray-900">{ae.aeName}</div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-gray-900">${Number(ae.totalCommission).toLocaleString()}</div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-gray-500">{ae.deals}</div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-gray-500">${Number(ae.avgDealSize).toLocaleString()}</div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <div className="mr-2 text-sm font-medium text-gray-900">{ae.ytdPercentage.toFixed(1)}%</div>
                              <div className="relative w-24 h-2 bg-gray-200 rounded">
                                <div 
                                  className="absolute top-0 left-0 h-2 bg-primary-600 rounded" 
                                  style={{ width: `${ae.ytdPercentage}%` }}
                                ></div>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Layout>
  );
}

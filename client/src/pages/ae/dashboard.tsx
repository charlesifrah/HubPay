import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout/layout";
import { StatCard } from "@/components/dashboard/stat-card";
import { ProgressBar } from "@/components/dashboard/progress-bar";
import { RecentDealsTable, RecentDeal } from "@/components/dashboard/recent-deals-table";
import { useAuth } from "@/hooks/use-auth";
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
  DollarSign,
  Wallet,
  Clock,
  CheckSquare,
  BarChart,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function AEDashboard() {
  const { user } = useAuth();

  // Load dashboard data
  const { data, isLoading, error } = useQuery({
    queryKey: [`/api/ae/dashboard/${user?.id}`],
    enabled: !!user?.id,
  });

  // Format data for recent deals table
  const recentDeals: RecentDeal[] = !isLoading && !error && data?.recentDeals
    ? data.recentDeals.map((deal: any) => ({
        id: deal.id,
        client: deal.contractClientName,
        dealType: deal.contractType as any,
        invoiceAmount: Number(deal.invoiceAmount).toLocaleString(),
        commission: Number(deal.baseCommission).toLocaleString(),
        bonuses: [
          ...(Number(deal.pilotBonus) > 0 ? [{ amount: Number(deal.pilotBonus).toLocaleString(), type: 'pilot bonus' }] : []),
          ...(Number(deal.multiYearBonus) > 0 ? [{ amount: Number(deal.multiYearBonus).toLocaleString(), type: 'multi-year bonus' }] : []),
          ...(Number(deal.upfrontBonus) > 0 ? [{ amount: Number(deal.upfrontBonus).toLocaleString(), type: 'upfront bonus' }] : []),
        ],
        date: new Date(deal.createdAt).toLocaleDateString(),
        status: deal.status
      }))
    : [];

  // Sample monthly performance data
  // In a real app, this would come from the API
  const monthlyPerformanceData = [
    { name: 'Jan', commission: 28500 },
    { name: 'Feb', commission: 32000 },
    { name: 'Mar', commission: 26000 },
    { name: 'Apr', commission: 39000 },
    { name: 'May', commission: 48000 },
    { name: 'Jun', commission: 42000 },
  ];

  // Format OTE progress data
  const oteProgress = data?.oteProgress || { current: "0", percentage: 0 };

  return (
    <Layout title="My Dashboard">
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Monthly Commission"
            value={isLoading 
              ? "Loading..." 
              : `$${Number(data?.monthlyCommission?.total || 0).toLocaleString()}`
            }
            icon={<DollarSign className="h-5 w-5" />}
            trend={{ value: "12%", isPositive: true }}
          />
          
          <StatCard
            title="Year-to-Date"
            value={isLoading 
              ? "Loading..." 
              : `$${Number(oteProgress.current).toLocaleString()}`
            }
            icon={<Wallet className="h-5 w-5" />}
            iconBgColor="bg-green-100"
            iconColor="text-green-600"
          />
          
          <StatCard
            title="Pending Approvals"
            value={isLoading 
              ? "Loading..." 
              : data?.pendingApprovals?.count || 0
            }
            icon={<Clock className="h-5 w-5" />}
            iconBgColor="bg-yellow-100"
            iconColor="text-yellow-600"
            trend={{ 
              value: isLoading ? "$0" : `$${Number(data?.pendingApprovals?.total || 0).toLocaleString()}`, 
              isPositive: true 
            }}
          />
          
          <StatCard
            title="Total Deals (YTD)"
            value={isLoading 
              ? "Loading..." 
              : data?.totalDeals || 0
            }
            icon={<CheckSquare className="h-5 w-5" />}
            iconBgColor="bg-purple-100"
            iconColor="text-purple-600"
          />
        </div>

        {/* OTE Progress */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>OTE Progress</CardTitle>
            <CardDescription>Progress toward $1M commission cap</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between mb-1">
              <span className="text-base font-medium text-gray-700">
                ${Number(oteProgress.current).toLocaleString()} of $1,000,000
              </span>
              <span className="text-sm font-medium text-primary-600">
                {oteProgress.percentage.toFixed(2)}%
              </span>
            </div>
            {/* Custom table-based progress bar for maximum compatibility */}
            <table className="w-full h-4 border-collapse">
              <tbody>
                <tr>
                  <td 
                    className="bg-primary-600 rounded-l-full h-4 p-0 m-0"
                    style={{ width: `${oteProgress.percentage}%` }}
                  ></td>
                  <td 
                    className="bg-gray-200 rounded-r-full h-4 p-0 m-0"
                    style={{ width: `${100 - oteProgress.percentage}%` }}
                  ></td>
                </tr>
              </tbody>
            </table>
            <div className="mt-4 text-sm text-gray-500">
              <p>
                {oteProgress.percentage < 50 
                  ? "You are on track to reach the $1M cap by October based on your current performance."
                  : oteProgress.percentage >= 100 
                    ? "You have reached the $1M cap. The 90% decelerator is now applied to new commissions."
                    : "You are making excellent progress toward the $1M cap."
                }
              </p>
              <p className="mt-2">
                <span className="font-medium text-gray-700">Note:</span> After reaching $1M, the decelerator will apply (90% of standard commission rate).
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Performance Chart */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle>Monthly Performance</CardTitle>
              <CardDescription>Your commission earnings over time</CardDescription>
            </div>
            <Select defaultValue="6">
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select a period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="6">Last 6 Months</SelectItem>
                <SelectItem value="12">Last 12 Months</SelectItem>
                <SelectItem value="ytd">Year to Date</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={monthlyPerformanceData}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fill: '#6B7280', fontSize: 12 }}
                    axisLine={{ stroke: '#E5E7EB' }}
                    tickLine={false}
                  />
                  <YAxis 
                    tick={{ fill: '#6B7280', fontSize: 12 }}
                    axisLine={{ stroke: '#E5E7EB' }}
                    tickLine={false}
                    tickFormatter={(value) => `$${value.toLocaleString()}`}
                  />
                  <Tooltip 
                    formatter={(value: number) => [`$${value.toLocaleString()}`, 'Commission']}
                    contentStyle={{ 
                      backgroundColor: 'white',
                      border: '1px solid #E5E7EB',
                      borderRadius: '6px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="commission" 
                    stroke="#3B82F6" 
                    fill="url(#colorCommission)" 
                    strokeWidth={2}
                  />
                  <defs>
                    <linearGradient id="colorCommission" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Recent Deals */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Deals</CardTitle>
              <CardDescription>Your most recent commission activity</CardDescription>
            </div>
            <a 
              href="/ae/commission-statement" 
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-primary-700 bg-primary-100 hover:bg-primary-200"
            >
              View Full Statement
            </a>
          </CardHeader>
          <CardContent>
            <RecentDealsTable deals={recentDeals} />
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

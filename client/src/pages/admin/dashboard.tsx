import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout/layout";
import { StatCard } from "@/components/dashboard/stat-card";
import { TopAEsTable, TopAE } from "@/components/dashboard/top-aes-table";
import { RecentUploadsTable, RecentUpload } from "@/components/dashboard/recent-uploads-table";
import { 
  DollarSign, 
  Users, 
  Clock, 
  FileText
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function AdminDashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["/api/admin/dashboard"],
  });

  // Format data for top AEs table
  const topAEs: TopAE[] = !isLoading && !error && data?.aeCommissions
    ? data.aeCommissions.map((ae: any) => ({
        id: ae.aeId,
        name: ae.aeName,
        title: "Account Executive",
        totalCommission: new Intl.NumberFormat('en-US').format(Number(ae.total)),
        totalDeals: ae.count,
        avgDealValue: new Intl.NumberFormat('en-US').format(Number(ae.total) / ae.count),
        oteProgress: parseFloat(ae.oteProgress.toFixed(2)) // Format to 2 decimal places
      }))
    : [];

  // Format data for recent uploads table
  const recentUploads: RecentUpload[] = !isLoading && !error && data?.recentUploads
    ? data.recentUploads.map((upload: any) => {
        // For debugging
        console.log("Processing upload:", upload);
        
        // Determine if this is a contract or invoice based on fields present
        const isContract = upload.clientName !== undefined && upload.contractValue !== undefined;
        const isInvoice = upload.contractId !== undefined && upload.amount !== undefined;
        const type = isContract ? 'contract' : (isInvoice ? 'invoice' : upload.type || 'unknown');
        
        return {
          id: upload.id,
          type: type as 'contract' | 'invoice',
          clientName: type === 'contract' ? upload.clientName : upload.contractClientName,
          aeName: type === 'contract' ? upload.aeName : upload.contractAEName,
          value: type === 'contract' 
            ? new Intl.NumberFormat('en-US').format(Number(upload.contractValue || 0))
            : new Intl.NumberFormat('en-US').format(Number(upload.amount || 0)),
          date: upload.createdAt ? new Date(upload.createdAt).toLocaleDateString('en-US', {
            year: 'numeric', 
            month: 'short', 
            day: 'numeric'
          }) : 'Unknown',
          status: type === 'invoice' && upload.status === 'pending' ? 'pending' : 'processed'
        };
      })
    : [];

  return (
    <Layout title="Admin Dashboard">
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Commissions (YTD)"
            value={isLoading 
              ? "Loading..." 
              : `$${new Intl.NumberFormat('en-US').format(Number(data?.totalCommissions?.total || 0))}`
            }
            icon={<DollarSign className="h-5 w-5" />}
            linkText="View details"
            linkHref="/admin/reports"
          />
          
          <StatCard
            title="Active AEs"
            value={isLoading 
              ? "Loading..." 
              : data?.activeAECount || 0
            }
            icon={<Users className="h-5 w-5" />}
            iconBgColor="bg-green-100"
            iconColor="text-green-600"
          />
          
          <StatCard
            title="Pending Approvals"
            value={isLoading 
              ? "Loading..." 
              : data?.pendingPayoutsCount || 0
            }
            icon={<Clock className="h-5 w-5" />}
            iconBgColor="bg-yellow-100"
            iconColor="text-yellow-600"
            linkText="Review approvals"
            linkHref="/admin/payout-approval"
          />
          
          <StatCard
            title="New Contracts (This Month)"
            value={isLoading 
              ? "Loading..." 
              : recentUploads.filter(u => u.type === 'contract').length
            }
            icon={<FileText className="h-5 w-5" />}
            iconBgColor="bg-purple-100"
            iconColor="text-purple-600"
            linkText="View Contracts"
            linkHref="/admin/contracts"
          />
        </div>

        {/* Top AEs by Commission */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
            <div>
              <h3 className="text-lg leading-6 font-medium text-gray-900">Top AEs by Commission</h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">Current month performance overview</p>
            </div>
            <div>
              <select className="mt-1 block pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md">
                <option>Current Month</option>
                <option>Previous Month</option>
                <option>Quarter to Date</option>
                <option>Year to Date</option>
              </select>
            </div>
          </div>
          <div className="border-t border-gray-200">
            <TopAEsTable aes={topAEs} />
          </div>
        </div>

        {/* Recent Uploads */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Recent Uploads</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">Last 10 contracts and invoices uploaded to the system</p>
          </div>
          <div className="border-t border-gray-200">
            <RecentUploadsTable uploads={recentUploads} />
          </div>
        </div>
      </div>
    </Layout>
  );
}

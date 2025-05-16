import React, { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import HPAYLogo from "../../assets/HPAY-logo.png";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import {
  DollarSign,
  ListChecks,
  BarChart3,
  LogOut,
  PieChart,
  User,
  Menu,
  Users,
  FileSpreadsheet,
  FileBox,
  CreditCard,
  Trash2,
  Loader2,
} from "lucide-react";

interface SidebarProps {
  mobile?: boolean;
  onClose?: () => void;
}

export function Sidebar({ mobile = false, onClose }: SidebarProps) {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  const [clearDatabaseDialogOpen, setClearDatabaseDialogOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const { toast } = useToast();
  
  // Define dashboard data type
  interface DashboardData {
    totalCommissions: { total: string, count: number };
    aeCommissions: Array<{ aeId: number, aeName: string, total: string, count: number, oteProgress: number }>;
    recentUploads: Array<any>;
    pendingPayoutsCount: number;
    activeAECount: number;
  }
  
  // Query to get dashboard data including pending approvals
  const { data: dashboardData } = useQuery<DashboardData>({
    queryKey: ['/api/admin/dashboard'],
    enabled: !!user && user.role === 'admin',
  });
  
  // Get pending payouts count from dashboard data
  const pendingApprovals = dashboardData?.pendingPayoutsCount || 0;

  const isActive = (path: string) => {
    return location === path;
  };

  const isAdmin = user?.role === "admin";

  // Dashboard links for Admins
  const adminDashboardLinks = [
    {
      title: "Dashboard",
      href: "/admin/dashboard",
      icon: <PieChart className="mr-3 h-5 w-5" />,
    },
  ];
  
  // User Management links for Admins
  const adminManagementLinks = [
    {
      title: "AE Management",
      href: "/admin/ae-management",
      icon: <Users className="mr-3 h-5 w-5" />,
    },
    {
      title: "Admin Management",
      href: "/admin/admin-management",
      icon: <User className="mr-3 h-5 w-5" />,
    },
  ];
  
  // Contract related links for Admins
  const adminContractLinks = [
    {
      title: "View Contracts",
      href: "/contracts",
      icon: <FileSpreadsheet className="mr-3 h-5 w-5" />,
    },
  ];
  
  // Invoice related links for Admins
  const adminInvoiceLinks = [
    {
      title: "View Invoices",
      href: "/invoices",
      icon: <FileBox className="mr-3 h-5 w-5" />,
    },
  ];
  
  // Commission related links for Admins
  const adminCommissionLinks = [
    {
      title: "Approve Payouts",
      href: "/admin/payout-approval",
      icon: <ListChecks className="mr-3 h-5 w-5" />,
      badge: pendingApprovals && pendingApprovals > 0 ? pendingApprovals : null,
    },
    {
      title: "View Payouts",
      href: "/payouts",
      icon: <CreditCard className="mr-3 h-5 w-5" />,
    },
    {
      title: "Reports",
      href: "/admin/reports",
      icon: <BarChart3 className="mr-3 h-5 w-5" />,
    },
  ];
  
  // Dashboard links for AEs
  const aeDashboardLinks = [
    {
      title: "My Dashboard",
      href: "/ae/dashboard",
      icon: <PieChart className="mr-3 h-5 w-5" />,
    },
    {
      title: "Commission Statement",
      href: "/ae/commission-statement",
      icon: <DollarSign className="mr-3 h-5 w-5" />,
    },
  ];
  
  // Common links for AEs
  const aeCommonLinks = [
    {
      title: "View Contracts",
      href: "/contracts",
      icon: <FileSpreadsheet className="mr-3 h-5 w-5" />,
    },
    {
      title: "View Invoices",
      href: "/invoices",
      icon: <FileBox className="mr-3 h-5 w-5" />,
    },
  ];

  // Define type for sidebar links
  interface SidebarLink {
    title: string;
    href: string;
    icon: React.ReactElement;
    badge?: number | null;
  }
  
  // Create organized link arrays for display
  const links: SidebarLink[] = isAdmin ? [
    ...adminDashboardLinks,
    ...adminManagementLinks,
    ...adminContractLinks,
    ...adminInvoiceLinks,
    ...adminCommissionLinks
  ] : [
    ...aeDashboardLinks,
    ...aeCommonLinks
  ];

  const handleLogout = () => {
    logoutMutation.mutate();
  };
  
  const handleClearDatabase = async () => {
    if (!isAdmin) return;
    
    try {
      setIsClearing(true);
      
      const response = await apiRequest('POST', '/api/admin/clear-database');
      const result = await response.json();
      
      // Invalidate all queries to refresh the cache with new data from server
      queryClient.invalidateQueries({ queryKey: ['/api/contracts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/approvals'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/payouts'] });
      
      // Show success toast with deleted counts
      toast({
        title: "Database cleared successfully",
        description: `Deleted ${result.deletedCounts.contracts} contracts, ${result.deletedCounts.invoices} invoices, and ${result.deletedCounts.commissions} commissions.`,
        variant: "default",
      });
      
    } catch (error) {
      toast({
        title: "Failed to clear database",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsClearing(false);
      setClearDatabaseDialogOpen(false);
    }
  };

  return (
    <div className={cn(
      "flex flex-col w-64 bg-white border-r border-gray-200 h-full",
      mobile && "w-full"
    )}>
      <div className="flex items-center justify-center h-16 px-4 border-b border-gray-200 bg-primary-500">
        <button 
          onClick={() => {
            const route = isAdmin ? "/admin/dashboard" : "/ae/dashboard";
            window.history.pushState({}, "", route);
            window.dispatchEvent(new PopStateEvent("popstate"));
          }}
          className="bg-transparent border-0 p-0 flex items-center"
        >
          <img 
            src={HPAYLogo} 
            alt="HPAY Logo" 
            className="h-8 mr-2"
          />
          <span className="text-xl font-semibold text-white cursor-pointer">Commission App</span>
        </button>
      </div>

      <div className="flex flex-col flex-grow p-4 overflow-y-auto">
        {user && (
          <div className="px-4 mb-8">
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-full bg-primary-200 flex items-center justify-center text-primary-700">
                <User className="h-4 w-4" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">{user.name}</p>
                <p className="text-xs text-gray-500">{user.role === "admin" ? "Administrator" : "Account Executive"}</p>
              </div>
            </div>
          </div>
        )}

        <nav className="flex-1 space-y-1">
          {links.map((link: SidebarLink) => (
            <button
              key={link.href}
              onClick={() => {
                if (mobile && onClose) onClose();
                // Use Wouter's navigation instead of direct window.location changes
                window.history.pushState({}, "", link.href);
                window.dispatchEvent(new PopStateEvent("popstate"));
              }}
              className={cn(
                "flex items-center px-4 py-2 text-sm font-medium rounded-md group w-full text-left",
                isActive(link.href)
                  ? "text-primary-700 bg-primary-50"
                  : "text-gray-700 hover:bg-gray-50"
              )}
            >
              {React.cloneElement(link.icon, {
                className: cn(
                  link.icon.props.className,
                  isActive(link.href) ? "text-primary-500" : "text-gray-500"
                ),
              })}
              <span className="flex-1">{link.title}</span>
              {link.badge !== null && link.badge !== undefined && link.badge > 0 && (
                <Badge className="ml-2 bg-red-500 text-white hover:bg-red-600" variant="secondary">
                  {link.badge}
                </Badge>
              )}
            </button>
          ))}
        </nav>
      </div>

      <div className="p-4 border-t border-gray-200 space-y-2">
        {isAdmin && (
          <>
            <Button
              variant="destructive"
              onClick={() => setClearDatabaseDialogOpen(true)}
              className="w-full justify-start"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Clear Database
            </Button>
            
            <AlertDialog open={clearDatabaseDialogOpen} onOpenChange={setClearDatabaseDialogOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action will permanently delete all contracts, invoices, and commissions from the database.
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isClearing}>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleClearDatabase} 
                    disabled={isClearing}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {isClearing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Clearing...
                      </>
                    ) : (
                      'Yes, Clear Database'
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
        
        <button 
          onClick={() => {
            if (mobile && onClose) onClose();
            // Use Wouter's navigation instead of direct window.location changes
            window.history.pushState({}, "", "/profile");
            window.dispatchEvent(new PopStateEvent("popstate"));
          }}
          className={cn(
            "flex items-center px-4 py-2 text-sm font-medium rounded-md group w-full",
            isActive("/profile")
              ? "text-primary-700 bg-primary-50"
              : "text-gray-700 hover:bg-gray-50 border border-gray-200"
          )}>
          <User className={cn(
            "mr-2 h-4 w-4",
            isActive("/profile") ? "text-primary-500" : "text-gray-500"
          )} />
          My Profile
        </button>
        
        <Button
          variant="outline"
          onClick={handleLogout}
          disabled={logoutMutation.isPending}
          className="w-full justify-start"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>
    </div>
  );
}

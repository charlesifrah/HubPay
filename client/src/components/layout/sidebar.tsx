import React, { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DollarSign,
  ListChecks,
  BarChart3,
  Upload,
  FileText,
  LogOut,
  PieChart,
  User,
  Menu,
  Users,
  FileSpreadsheet,
  FileBox,
} from "lucide-react";

interface SidebarProps {
  mobile?: boolean;
  onClose?: () => void;
}

export function Sidebar({ mobile = false, onClose }: SidebarProps) {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();

  const isActive = (path: string) => {
    return location === path;
  };

  const isAdmin = user?.role === "admin";

  const adminLinks = [
    {
      title: "Dashboard",
      href: "/admin/dashboard",
      icon: <PieChart className="mr-3 h-5 w-5" />,
    },
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
    {
      title: "Upload Contract",
      href: "/admin/upload-contract",
      icon: <Upload className="mr-3 h-5 w-5" />,
    },
    {
      title: "Upload Invoice",
      href: "/admin/upload-invoice",
      icon: <FileText className="mr-3 h-5 w-5" />,
    },
    {
      title: "Approve Payouts",
      href: "/admin/payout-approval",
      icon: <ListChecks className="mr-3 h-5 w-5" />,
    },
    {
      title: "Reports",
      href: "/admin/reports",
      icon: <BarChart3 className="mr-3 h-5 w-5" />,
    },
  ];

  const aeLinks = [
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

  const commonLinks = [
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

  const links = isAdmin ? [...adminLinks, ...commonLinks] : [...aeLinks, ...commonLinks];

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <div className={cn(
      "flex flex-col w-64 bg-white border-r border-gray-200 h-full",
      mobile && "w-full"
    )}>
      <div className="flex items-center justify-center h-16 px-4 border-b border-gray-200 bg-primary-500">
        <button 
          onClick={() => window.location.href = isAdmin ? "/admin/dashboard" : "/ae/dashboard"}
          className="bg-transparent border-0 p-0"
        >
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
          {links.map((link) => (
            <button
              key={link.href}
              onClick={() => {
                if (mobile && onClose) onClose();
                window.location.href = link.href;
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
              {link.title}
            </button>
          ))}
        </nav>
      </div>

      <div className="p-4 border-t border-gray-200 space-y-2">
        <button 
          onClick={() => {
            if (mobile && onClose) onClose();
            window.location.href = "/profile";
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

import { useState, ReactNode } from "react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { useAuth } from "@/hooks/use-auth";
import { useLocation, Redirect } from "wouter";

interface LayoutProps {
  children: ReactNode;
  title: string;
}

export function Layout({ children, title }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [location] = useLocation();
  const { user } = useAuth();

  // Redirect if user role doesn't match route
  if (user) {
    const isAdminRoute = location.startsWith('/admin');
    const isAERoute = location.startsWith('/ae');
    
    if (user.role === 'admin' && isAERoute) {
      return <Redirect to="/admin/dashboard" />;
    }
    
    if (user.role === 'ae' && isAdminRoute) {
      return <Redirect to="/ae/dashboard" />;
    }
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 flex z-40 md:hidden">
          <div
            className="fixed inset-0 bg-gray-600 bg-opacity-75 transition-opacity"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
            <Sidebar mobile onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden md:flex md:flex-shrink-0">
        <Sidebar />
      </div>

      {/* Main content */}
      <div className="flex flex-col flex-1 w-0 overflow-hidden">
        <Header 
          title={title} 
          onSidebarToggle={() => setSidebarOpen(true)} 
        />

        <main className="flex-1 relative overflow-y-auto focus:outline-none bg-gray-100 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

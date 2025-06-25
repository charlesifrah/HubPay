import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import RegisterWithInvitation from "@/pages/register-with-invitation";
import ProfilePage from "@/pages/profile-page";
import ContractsPage from "@/pages/contracts-page";
import InvoicesPage from "@/pages/invoices-page";
import PayoutsPage from "@/pages/payouts-page";

// Admin pages
import AdminDashboard from "@/pages/admin/dashboard";
import PayoutApproval from "@/pages/admin/payout-approval";
import Reports from "@/pages/admin/reports";
import AEManagement from "@/pages/admin/ae-management";
import AdminManagement from "@/pages/admin/admin-management";
import CommissionConfigs from "@/pages/admin/commission-configs";
import AEAssignments from "@/pages/admin/ae-assignments";

// AE pages
import AEDashboard from "@/pages/ae/dashboard";
import CommissionStatement from "@/pages/ae/commission-statement";

function Router() {
  return (
    <Switch>
      {/* Auth Pages */}
      <Route path="/auth" component={AuthPage} />
      <Route path="/register-with-invitation" component={RegisterWithInvitation} />
      
      {/* Admin Routes */}
      <ProtectedRoute path="/" component={AdminDashboard} adminOnly={true} />
      <ProtectedRoute path="/admin/dashboard" component={AdminDashboard} adminOnly={true} />
      <ProtectedRoute path="/admin/ae-management" component={AEManagement} adminOnly={true} />
      <ProtectedRoute path="/admin/admin-management" component={AdminManagement} adminOnly={true} />
      {/* Upload routes removed - now using modals */}
      <ProtectedRoute path="/admin/payout-approval" component={PayoutApproval} adminOnly={true} />
      <ProtectedRoute path="/admin/reports" component={Reports} adminOnly={true} />
      <ProtectedRoute path="/admin/contracts" component={ContractsPage} adminOnly={true} />
      <ProtectedRoute path="/admin/commission-configs" component={CommissionConfigs} adminOnly={true} />
      <ProtectedRoute path="/admin/ae-assignments" component={AEAssignments} adminOnly={true} />
      
      {/* AE Routes */}
      <ProtectedRoute path="/ae/dashboard" component={AEDashboard} />
      <ProtectedRoute path="/ae/commission-statement" component={CommissionStatement} />
      
      {/* Common Protected Routes */}
      <ProtectedRoute path="/profile" component={ProfilePage} />
      <ProtectedRoute path="/contracts" component={ContractsPage} />
      <ProtectedRoute path="/invoices" component={InvoicesPage} />
      <ProtectedRoute path="/payouts" component={PayoutsPage} adminOnly={true} />
      
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;

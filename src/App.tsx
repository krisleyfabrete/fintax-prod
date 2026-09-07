import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { UpgradeModalProvider } from "@/components/subscription/UpgradeModal";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminProtectedRoute } from "@/components/admin/AdminProtectedRoute";
import { PWAInstallPrompt } from "@/components/pwa/PWAInstallPrompt";
import { OfflineIndicator } from "@/components/pwa/OfflineIndicator";
import { OfflineProvider } from "@/components/pwa/OfflineProvider";
import { GlobalErrorBoundary } from "@/components/GlobalErrorBoundary";
import Auth from "./pages/Auth";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Accounts from "./pages/Accounts";
import Transactions from "./pages/Transactions";
import Reports from "./pages/Reports";
import Budgets from "./pages/Budgets";
import Goals from "./pages/Goals";
import Family from "./pages/Family";
import Import from "./pages/Import";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminUserDetail from "./pages/admin/AdminUserDetail";
import AdminSubscriptions from "./pages/admin/AdminSubscriptions";
import AdminFinancial from "./pages/admin/AdminFinancial";
import AdminFamilies from "./pages/admin/AdminFamilies";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import AdminLogs from "./pages/admin/AdminLogs";
import AdminTickets from "./pages/admin/AdminTickets";
import AdminPixPayments from "./pages/admin/AdminPixPayments";
import AdminPixConfig from "./pages/admin/AdminPixConfig";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminDowngradeRequests from "./pages/admin/AdminDowngradeRequests";
import AdminAIChat from "./pages/admin/AdminAIChat";
import AdminLLMConfig from "./pages/admin/AdminLLMConfig";
import AdminLogin from "./pages/admin/AdminLogin";
import Support from "./pages/Support";
import AIChat from "./pages/AIChat";
import SidebarPreview from "./pages/SidebarPreview";
import DockPreview from "./pages/DockPreview";
import Investments from "./pages/Investments";
import Debts from "./pages/Debts";
import DebtDetail from "./pages/DebtDetail";
import SavingsBoxes from "./pages/SavingsBoxes";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <OfflineProvider>
        <UpgradeModalProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <PWAInstallPrompt />
            <OfflineIndicator />
            <BrowserRouter>
              <GlobalErrorBoundary>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/terms" element={<Terms />} />
                  <Route path="/privacy" element={<Privacy />} />
                  <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                  <Route path="/accounts" element={<ProtectedRoute><Accounts /></ProtectedRoute>} />
                  <Route path="/transactions" element={<ProtectedRoute><Transactions /></ProtectedRoute>} />
                  <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
                   <Route path="/budgets" element={<ProtectedRoute><Budgets /></ProtectedRoute>} />
                   <Route path="/goals" element={<ProtectedRoute><Goals /></ProtectedRoute>} />
                   <Route path="/debts" element={<ProtectedRoute><Debts /></ProtectedRoute>} />
                   <Route path="/debts/:id" element={<ProtectedRoute><DebtDetail /></ProtectedRoute>} />
                   <Route path="/savings-boxes" element={<ProtectedRoute><SavingsBoxes /></ProtectedRoute>} />
                   <Route path="/family" element={<ProtectedRoute><Family /></ProtectedRoute>} />
                  <Route path="/import" element={<ProtectedRoute><Import /></ProtectedRoute>} />
                  <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                  <Route path="/support" element={<ProtectedRoute><Support /></ProtectedRoute>} />
                   <Route path="/ai" element={<ProtectedRoute><AIChat /></ProtectedRoute>} />
                   <Route path="/investments" element={<ProtectedRoute><Investments /></ProtectedRoute>} />
                  <Route path="/sidebar-preview" element={<SidebarPreview />} />
                  <Route path="/dock-preview" element={<DockPreview />} />
                   
                  {/* Admin Routes */}
                  <Route path="/admin/login" element={<AdminLogin />} />
                  <Route path="/admin" element={<AdminProtectedRoute><AdminDashboard /></AdminProtectedRoute>} />
                  <Route path="/admin/users" element={<AdminProtectedRoute><AdminUsers /></AdminProtectedRoute>} />
                  <Route path="/admin/users/:id" element={<AdminProtectedRoute><AdminUserDetail /></AdminProtectedRoute>} />
                  <Route path="/admin/subscriptions" element={<AdminProtectedRoute><AdminSubscriptions /></AdminProtectedRoute>} />
                  <Route path="/admin/financial" element={<AdminProtectedRoute><AdminFinancial /></AdminProtectedRoute>} />
                  <Route path="/admin/families" element={<AdminProtectedRoute><AdminFamilies /></AdminProtectedRoute>} />
                  <Route path="/admin/analytics" element={<AdminProtectedRoute><AdminAnalytics /></AdminProtectedRoute>} />
                  <Route path="/admin/logs" element={<AdminProtectedRoute><AdminLogs /></AdminProtectedRoute>} />
                  <Route path="/admin/tickets" element={<AdminProtectedRoute><AdminTickets /></AdminProtectedRoute>} />
                  <Route path="/admin/pix-payments" element={<AdminProtectedRoute><AdminPixPayments /></AdminProtectedRoute>} />
                  <Route path="/admin/pix-config" element={<AdminProtectedRoute><AdminPixConfig /></AdminProtectedRoute>} />
                  <Route path="/admin/settings" element={<AdminProtectedRoute><AdminSettings /></AdminProtectedRoute>} />
                   <Route path="/admin/ai" element={<AdminProtectedRoute><AdminAIChat /></AdminProtectedRoute>} />
                   <Route path="/admin/llm-config" element={<AdminProtectedRoute><AdminLLMConfig /></AdminProtectedRoute>} />
                   <Route path="/admin/downgrade-requests" element={<AdminProtectedRoute><AdminDowngradeRequests /></AdminProtectedRoute>} />
                  
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </GlobalErrorBoundary>
            </BrowserRouter>
          </TooltipProvider>
        </UpgradeModalProvider>
      </OfflineProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;

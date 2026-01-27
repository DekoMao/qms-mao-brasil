import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import DefectList from "./pages/DefectList";
import DefectDetail from "./pages/DefectDetail";
import Kanban from "./pages/Kanban";
import Import from "./pages/Import";
import Reports from "./pages/Reports";
import Suppliers from "./pages/Suppliers";
import SlaSettings from "./pages/SlaSettings";
import SupplierPortal from "./pages/SupplierPortal";

// Main app router with dashboard layout
function MainRouter() {
  return (
    <DashboardLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/defects" component={DefectList} />
        <Route path="/defects/:id" component={DefectDetail} />
        <Route path="/kanban" component={Kanban} />
        <Route path="/import" component={Import} />
        <Route path="/reports" component={Reports} />
        <Route path="/suppliers" component={Suppliers} />
        <Route path="/sla-settings" component={SlaSettings} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </DashboardLayout>
  );
}

// App with route switching between main app and supplier portal
function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Switch>
            {/* Supplier Portal - standalone without dashboard layout */}
            <Route path="/supplier-portal" component={SupplierPortal} />
            {/* Main application with dashboard layout */}
            <Route component={MainRouter} />
          </Switch>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, Redirect } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Chat from "./pages/Chat";
import LeaveManagement from "./pages/LeaveManagement";
import Payslips from "./pages/Payslips";
import Announcements from "./pages/Announcements";
import Account from "./pages/Account";
import Attendance from "./pages/Attendance";
import Forms from "./pages/Forms";
import Projects from "./pages/Projects";
import Notifications from "./pages/Notifications";
import Reports from "./pages/Reports";
import AdminDashboard from "./pages/AdminDashboard";
import EmployeeManagement from "./pages/admin/EmployeeManagement";
import LeaveApproval from "./pages/admin/LeaveApproval";
import FormResponses from "./pages/admin/FormResponses";
import PayslipManagement from "./pages/admin/PayslipManagement";
import ProjectAssignment from "./pages/admin/ProjectAssignment";
import AdvancedReports from "./pages/admin/AdvancedReports";
import AnnouncementsManagement from "./pages/admin/AnnouncementsManagement";
import Calendar from "./pages/Calendar";
import ScheduleMeeting from "./pages/ScheduleMeeting";
import { useAuth } from "./_core/hooks/useAuth";
import { Loader2 } from "lucide-react";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/" />;
  }

  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Login} />
      <Route path="/dashboard">
        {() => <ProtectedRoute component={Dashboard} />}
      </Route>
      <Route path="/chat">
        {() => <ProtectedRoute component={Chat} />}
      </Route>
      <Route path="/leave">
        {() => <ProtectedRoute component={LeaveManagement} />}
      </Route>
      <Route path="/payslips">
        {() => <ProtectedRoute component={Payslips} />}
      </Route>
      <Route path="/announcements">
        {() => <ProtectedRoute component={Announcements} />}
      </Route>
      <Route path="/account">
        {() => <ProtectedRoute component={Account} />}
      </Route>
      <Route path="/attendance">
        {() => <ProtectedRoute component={Attendance} />}
      </Route>
      <Route path="/forms">
        {() => <ProtectedRoute component={Forms} />}
      </Route>
      <Route path="/projects">
        {() => <ProtectedRoute component={Projects} />}
      </Route>
      <Route path="/reports">
        {() => <ProtectedRoute component={Reports} />}
      </Route>
      <Route path="/notifications" component={() => <ProtectedRoute component={Notifications} />} />
          <Route path="/calendar" component={() => <ProtectedRoute component={Calendar} />} />
          <Route path="/schedule-meeting" component={() => <ProtectedRoute component={ScheduleMeeting} />} />
      <Route path="/admin">
        {() => <ProtectedRoute component={AdminDashboard} />}
      </Route>
      <Route path="/admin/employees">
        {() => <ProtectedRoute component={EmployeeManagement} />}
      </Route>
      <Route path="/admin/leaves">
        {() => <ProtectedRoute component={LeaveApproval} />}
      </Route>
      <Route path="/admin/forms">
        {() => <ProtectedRoute component={FormResponses} />}
      </Route>
      <Route path="/admin/payslips">
        {() => <ProtectedRoute component={PayslipManagement} />}
      </Route>
      <Route path="/admin/projects">
        {() => <ProtectedRoute component={ProjectAssignment} />}
      </Route>
      <Route path="/admin/reports">
        {() => <ProtectedRoute component={AdvancedReports} />}
      </Route>
      <Route path="/admin/announcements">
        {() => <ProtectedRoute component={AnnouncementsManagement} />}
      </Route>
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark" switchable>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

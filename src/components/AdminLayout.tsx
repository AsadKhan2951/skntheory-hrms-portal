import { useState, ReactNode } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { 
  Users, 
  FileCheck, 
  MessageSquareText, 
  DollarSign, 
  FolderKanban,
  BarChart3,
  Clock,
  Menu,
  X,
  LogOut,
  Shield,
  Home,
  Search,
  Bell,
  Activity,
  Settings,
  FileText
} from "lucide-react";
import { Link, useLocation, Redirect } from "wouter";
import { trpc } from "@/lib/trpc";
import { useRealtime } from "@/_core/hooks/useRealtime";
import { toast } from "sonner";
import { NotesWidget } from "./NotesWidget";

interface AdminLayoutProps {
  children: ReactNode;
  title?: string;
}

export default function AdminLayout({ children, title }: AdminLayoutProps) {
  const { user, logout } = useAuth();
  const { toggleTheme } = useTheme();
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);
  useRealtime();

  const { data: notifications = [] } = trpc.notifications.getAll.useQuery();

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Logged out successfully");
    } catch (error: any) {
      toast.error(error?.message || "Please clock out before logging out");
    }
  };

  // Check if user is admin
  if (user && user.role !== "admin") {
    return <Redirect to="/dashboard" />;
  }

  const menuItems = [
    { icon: Home, label: "Overview", path: "/admin" },
    { icon: Users, label: "Employees", path: "/admin/employees" },
    { icon: FileCheck, label: "Leaves", path: "/admin/leaves" },
    { icon: MessageSquareText, label: "Forms", path: "/admin/forms" },
    { icon: DollarSign, label: "Payslips", path: "/admin/payslips" },
    { icon: FolderKanban, label: "Projects", path: "/admin/projects" },
    { icon: Bell, label: "Announcements", path: "/admin/announcements" },
    { icon: BarChart3, label: "Reports", path: "/admin/reports" },
    { icon: BarChart3, label: "Employee Reports", path: "/reports" },
    { icon: Clock, label: "Clock-Out Reports", path: "/admin/reports" },
    { icon: FileText, label: "Notes", path: "/forms" },
  ];

  const isActive = (path: string) => location === path;

  const recentNotifications = [
    ...notifications.slice(0, 5).map((n: any) => ({
      id: n.id,
      type: n.type,
      message: n.title ? `${n.title} — ${n.message}` : n.message,
      time: n.createdAt ? new Date(n.createdAt).toLocaleString() : "",
    })),
  ];

  return (
    <div className="min-h-screen bg-background flex">
      {/* Persistent Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-screen bg-card border-r transition-all duration-300 z-40 ${
          sidebarOpen ? "w-64" : "w-16"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-4 border-b flex items-center justify-between">
            {sidebarOpen && (
              <div className="flex items-center gap-2">
                <Shield className="h-6 w-6 text-primary" />
                <span className="font-bold text-lg">Admin</span>
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="shrink-0"
            >
              {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {menuItems.map((item) => (
              <Link key={item.path} href={item.path}>
                <Button
                  variant={isActive(item.path) ? "default" : "ghost"}
                  size="sm"
                  className={`w-full justify-start ${!sidebarOpen && "justify-center px-2"} ${isActive(item.path) ? "bg-primary text-primary-foreground" : ""}`}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {sidebarOpen && <span className="ml-2 text-sm">{item.label}</span>}
                </Button>
              </Link>
            ))}
          </nav>

          {/* User Section */}
          <div className="p-3 border-t space-y-1">
            <Link href="/dashboard">
              <Button
                variant="outline"
                size="sm"
                className={`w-full justify-start ${!sidebarOpen && "justify-center px-2"}`}
              >
                <Home className="h-4 w-4 shrink-0" />
                {sidebarOpen && <span className="ml-2 text-sm">Employee View</span>}
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className={`w-full justify-start ${!sidebarOpen && "justify-center px-2"}`}
            >
              <LogOut className="h-4 w-4 shrink-0" />
              {sidebarOpen && <span className="ml-2 text-sm">Logout</span>}
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`flex-1 transition-all duration-300 ${sidebarOpen ? "ml-64" : "ml-16"}`}>
        {/* Compact Header */}
        <div className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b">
          <div className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-sm text-muted-foreground">Welcome back, {user?.name}</p>
            </div>

            <div className="flex items-center gap-2">
              {/* Universal Search */}
              <div className="relative hidden md:block">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search employees, reports..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 w-72 h-9 rounded-full bg-muted/40"
                />
              </div>

              {/* Notification Center */}
              <div className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => setShowNotifications(!showNotifications)}
                >
                  <Bell className="h-4 w-4" />
                  {recentNotifications.length > 0 && (
                    <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
                  )}
                </Button>

                {showNotifications && (
                  <Card className="absolute right-0 top-12 w-80 p-4 shadow-lg">
                    <h3 className="font-semibold mb-3 text-sm">Recent Activity</h3>
                    <div className="space-y-3">
                      {recentNotifications.map((notif) => (
                        <div key={notif.id} className="flex gap-2 text-xs">
                          <Activity className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm">{notif.message}</p>
                            <p className="text-muted-foreground">{notif.time}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <Button variant="link" className="w-full mt-3 h-8 text-xs">
                      View All Notifications
                    </Button>
                  </Card>
                )}
              </div>

              <Button variant="ghost" size="icon" className="h-9 w-9" onClick={toggleTheme}>
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Page Content */}
        <div className="p-4">
          {children}
        </div>
      </main>

      <NotesWidget />
    </div>
  );
}

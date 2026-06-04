import { useMemo, useState, ReactNode } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { useRealtime } from "@/_core/hooks/useRealtime";
import {
  Clock,
  FileText,
  BarChart3,
  MessageSquare,
  LogOut,
  Sun,
  Moon,
  Home,
  ClipboardList,
  Settings,
  Bell,
  DollarSign,
  Search,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Menu,
  X,
  FolderKanban,
  Users,
  Shield,
} from "lucide-react";
import { useLocation, Link } from "wouter";
import { GlobalChatWidget } from "@/components/GlobalChatWidget";
import { useIsMobile } from "@/hooks/useMobile";
import { toast } from "sonner";

interface LayoutWrapperProps {
  children: ReactNode;
}

export default function LayoutWrapper({ children }: LayoutWrapperProps) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [location] = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const isMobile = useIsMobile();
  const currentUserId = user?.id ? String(user.id) : null;
  useRealtime();

  const { data: chatMessages } = trpc.chat.getMessages.useQuery(
    { limit: 100 },
    { refetchInterval: 10000 }
  );

  const unreadChatCount = useMemo(() => {
    if (!currentUserId || !chatMessages) return 0;
    return chatMessages.filter((msg: any) => {
      if (msg.isRead) return false;
      if (String(msg.senderId) === currentUserId) return false;
      const recipientId = msg.recipientId ? String(msg.recipientId) : null;
      return !recipientId || recipientId === currentUserId;
    }).length;
  }, [chatMessages, currentUserId]);

  const handleLogout = async () => {
    try {
      await logout();
      window.location.href = "/";
    } catch (error: any) {
      toast.error(error?.message || "Please clock out before logging out");
    }
  };

  const menuItems = [
    { icon: Home, label: "Flow Central", path: "/dashboard" },
    { icon: Clock, label: "Attendance", path: "/attendance" },
    { icon: ClipboardList, label: "Leave Management", path: "/leave" },
    { icon: FolderKanban, label: "Projects", path: "/projects" },
    { icon: BarChart3, label: "Reports", path: "/reports" },
    { icon: FileText, label: "Forms", path: "/forms" },
    { icon: MessageSquare, label: "Chat", path: "/chat" },
    { icon: Calendar, label: "Calendar", path: "/calendar" },
    { icon: Users, label: "Schedule Meeting", path: "/schedule-meeting" },
    { icon: DollarSign, label: "Payslips", path: "/payslips" },
    { icon: Bell, label: "Announcements", path: "/announcements" },
    { icon: Settings, label: "Account", path: "/account" },
    ...(user?.role === "admin" ? [{ icon: Shield, label: "Admin Panel", path: "/admin" }] : []),
  ];

  const filteredMenuItems = menuItems.filter(item =>
    item.label.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const logoSrc = theme === "dark" ? "/radflow-logo-white.png" : "/radflow-logo.png";

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`${
          sidebarCollapsed ? "w-20" : "w-64"
        } bg-card border-r transition-all duration-300 flex flex-col fixed lg:relative inset-y-0 left-0 z-50 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
        onMouseEnter={() => {
          if (!isMobile) setSidebarCollapsed(false);
        }}
        onMouseLeave={() => {
          if (!isMobile) setSidebarCollapsed(true);
        }}
      >
        {/* Logo & Toggle */}
        <div className="p-4 border-b flex items-center justify-between">
          {!sidebarCollapsed && (
            <img
              src={logoSrc}
              alt="Rad.flow"
              className="h-8"
              style={{ width: "115px", height: "61px" }}
            />
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden lg:flex"
          >
            {sidebarCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </Button>
        </div>

        {/* Search */}
        {!sidebarCollapsed && (
          <div className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 p-2 overflow-y-auto">
          <div className="space-y-1">
            {filteredMenuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.path;
              
              return (
                <Link key={item.path} href={item.path}>
                  <Button
                    variant={isActive ? "secondary" : "ghost"}
                    className={`relative w-full ${sidebarCollapsed ? "justify-center px-0" : "justify-start"}`}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <Icon className="h-5 w-5" />
                    {!sidebarCollapsed && (
                      <>
                        <span className="ml-3 flex-1 text-left">{item.label}</span>
                        {item.path === "/chat" && unreadChatCount > 0 && (
                          <span className="min-w-[20px] px-2 py-0.5 text-xs rounded-full bg-red-500 text-white text-center">
                            {unreadChatCount}
                          </span>
                        )}
                      </>
                    )}
                    {sidebarCollapsed && item.path === "/chat" && unreadChatCount > 0 && (
                      <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500" />
                    )}
                  </Button>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Theme Toggle & Logout */}
        <div className="p-2 border-t space-y-1">
          <Button
            variant="ghost"
            onClick={toggleTheme}
            className={`w-full ${sidebarCollapsed ? "justify-center px-0" : "justify-start"}`}
          >
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
          
          <Button
            variant="ghost"
            onClick={handleLogout}
            className={`w-full ${sidebarCollapsed ? "justify-center px-0" : "justify-start"} text-red-500 hover:text-red-600 hover:bg-red-500/10`}
          >
            <LogOut className="h-5 w-5" />
            {!sidebarCollapsed && <span className="ml-3">Logout</span>}
          </Button>
        </div>
      </aside>

      {/* Global Chat Widget */}
      <GlobalChatWidget />

      {/* Main Content */}
      <main className="flex-1 overflow-auto w-full">
        {/* Mobile Header */}
        <div className="lg:hidden sticky top-0 z-30 bg-card border-b p-4 flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <img
            src={logoSrc}
            alt="Rad.flow"
            className="h-8"
            style={{ width: "115px", height: "61px" }}
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
          >
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
        </div>

        <div className="p-4 md:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}

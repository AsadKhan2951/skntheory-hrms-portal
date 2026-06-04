import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { TimeInOutDialog } from "@/components/TimeInOutDialog";
import { 
  Clock, 
  Calendar, 
  TrendingUp, 
  FileText, 
  MessageSquare, 
  LogOut,
  Menu,
  X,
  Coffee,
  Sun,
  Moon,
  Home,
  ClipboardList,
  Users,
  Settings,
  Bell,
  DollarSign,
  Search,
  ChevronLeft,
  ChevronRight,
  FolderKanban,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { format, startOfMonth, endOfMonth, subDays } from "date-fns";
import { toast } from "sonner";
import { Link, useLocation } from "wouter";

export default function Dashboard() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [timeDialogOpen, setTimeDialogOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState("");
  const [breakOverlayOpen, setBreakOverlayOpen] = useState(false);

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      logout();
      window.location.href = "/";
    },
  });

  // Auto-show time in/out dialog on component mount
  useEffect(() => {
    const hasShownDialog = sessionStorage.getItem("timeDialogShown");
    if (!hasShownDialog) {
      setTimeDialogOpen(true);
      sessionStorage.setItem("timeDialogShown", "true");
    }
  }, []);

  // Update current time
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const { data: activeEntry } = trpc.timeTracking.getActive.useQuery();
  const { data: breakLogs } = trpc.timeTracking.getBreakLogs.useQuery();

  // Get current month attendance
  const monthStart = startOfMonth(new Date());
  const monthEnd = endOfMonth(new Date());
  const { data: monthAttendance } = trpc.timeTracking.getAttendance.useQuery({
    startDate: monthStart,
    endDate: monthEnd,
  });

  // Get last 7 days for trends
  const weekStart = subDays(new Date(), 7);
  const { data: weekAttendance } = trpc.timeTracking.getAttendance.useQuery({
    startDate: weekStart,
    endDate: new Date(),
  });

  // Get project stats
  const { data: projectStats } = trpc.projects.getStats.useQuery();
  const { data: myProjects } = trpc.projects.getMyProjects.useQuery();

  const utils = trpc.useUtils();

  const startBreakMutation = trpc.timeTracking.startBreak.useMutation({
    onSuccess: () => {
      toast.success("Break started");
      setBreakOverlayOpen(true);
      utils.timeTracking.getBreakLogs.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to start break");
    },
  });

  const endBreakMutation = trpc.timeTracking.endBreak.useMutation({
    onSuccess: (data) => {
      toast.success(`Break ended. Duration: ${data.duration} minutes`);
      setBreakOverlayOpen(false);
      utils.timeTracking.getBreakLogs.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to end break");
    },
  });

  const activeBreak = breakLogs?.find(log => !log.breakEnd);

  const calculateStats = () => {
    if (!monthAttendance) return { avgHours: 0, totalDays: 0, presentDays: 0 };
    
    const completedEntries = monthAttendance.filter(e => e.status !== "active");
    const totalHours = completedEntries.reduce((sum, entry) => {
      return sum + (parseFloat(entry.totalHours as any) || 0);
    }, 0);

    return {
      avgHours: completedEntries.length > 0 ? totalHours / completedEntries.length : 0,
      totalDays: monthAttendance.length,
      presentDays: completedEntries.length,
    };
  };

  const stats = calculateStats();

  const getWeeklyInsights = () => {
    if (!weekAttendance || weekAttendance.length === 0) {
      return {
        avgHours: 0,
        lastDayOff: "No data",
        earlyTimeouts: 0,
        lateShifts: 0,
      };
    }

    const completedEntries = weekAttendance.filter(e => e.status !== "active");
    const totalHours = completedEntries.reduce((sum, entry) => {
      return sum + (parseFloat(entry.totalHours as any) || 0);
    }, 0);

    const earlyTimeouts = completedEntries.filter(e => e.status === "early_out").length;
    const lastEntry = weekAttendance[weekAttendance.length - 1];
    const lastDayOff = lastEntry ? format(new Date(lastEntry.timeIn), "MMM dd, yyyy") : "No data";

    return {
      avgHours: completedEntries.length > 0 ? totalHours / completedEntries.length : 0,
      lastDayOff,
      earlyTimeouts,
      lateShifts: 0,
    };
  };

  const insights = getWeeklyInsights();

  const menuItems = [
    { icon: Home, label: "Dashboard", path: "/dashboard" },
    { icon: Clock, label: "Attendance", path: "/attendance" },
    { icon: ClipboardList, label: "Leave Management", path: "/leave" },
    { icon: FolderKanban, label: "Projects", path: "/projects" },
    { icon: FileText, label: "Forms", path: "/forms" },
    { icon: MessageSquare, label: "Chat", path: "/chat" },
    { icon: DollarSign, label: "Payslips", path: "/payslips" },
    { icon: Bell, label: "Announcements", path: "/announcements" },
    { icon: Settings, label: "Account", path: "/account" },
  ];

  const filteredMenuItems = menuItems.filter(item =>
    item.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
      >
        {/* Logo & Toggle */}
        <div className="p-4 border-b flex items-center justify-between">
          {!sidebarCollapsed && (
            <img src="/radflow-logo.png" alt="Rad.flow" className="h-8" style={{width: '50px'}} />
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
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
                    className={`w-full ${sidebarCollapsed ? "justify-center" : "justify-start"}`}
                  >
                    <Icon className="h-5 w-5" />
                    {!sidebarCollapsed && <span className="ml-3">{item.label}</span>}
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
            className={`w-full ${sidebarCollapsed ? "justify-center" : "justify-start"}`}
          >
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
          
          <Button
            variant="ghost"
            onClick={() => logoutMutation.mutate()}
            className={`w-full ${sidebarCollapsed ? "justify-center" : "justify-start"} text-red-500 hover:text-red-600 hover:bg-red-500/10`}
          >
            <LogOut className="h-5 w-5" />
            {!sidebarCollapsed && <span className="ml-3">Logout</span>}
          </Button>
        </div>
      </aside>

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
          <img src="/radflow-logo.png" alt="Rad.flow" className="h-8" />
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
          >
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
        </div>

        <div className="p-4 md:p-6 lg:p-8">
          {/* Greeting Section */}
          <div className="mb-6 md:mb-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
                  <Sun className="h-8 w-8 text-yellow-500" />
                  Good {new Date().getHours() < 12 ? "Morning" : new Date().getHours() < 18 ? "Afternoon" : "Evening"}, {user?.name}!
                </h2>
                <p className="text-muted-foreground mt-1">
                  {format(currentTime, "EEEE, MMMM dd, yyyy")} • {format(currentTime, "HH:mm:ss")}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {activeEntry ? (
                  <>
                    <Button onClick={() => setTimeDialogOpen(true)}>
                      <Clock className="h-4 w-4 mr-2" />
                      Clock Out
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => activeBreak ? endBreakMutation.mutate() : startBreakMutation.mutate()}
                    >
                      <Coffee className="h-4 w-4 mr-2" />
                      {activeBreak ? "End Break" : "Start Break"}
                    </Button>
                  </>
                ) : (
                  <Button onClick={() => setTimeDialogOpen(true)}>
                    <Clock className="h-4 w-4 mr-2" />
                    Clock In
                  </Button>
                )}
              </div>
            </div>

            {/* Weekly Insights */}
            <Card className="p-6 bg-primary/5">
              <h3 className="font-semibold mb-3">Your Week at a Glance:</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Average hours this week:</span>
                  <p className="font-semibold">{insights.avgHours.toFixed(2)} hrs</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Last day off:</span>
                  <p className="font-semibold">{insights.lastDayOff}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Early timeouts this month:</span>
                  <p className="font-semibold">{insights.earlyTimeouts}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Total working days:</span>
                  <p className="font-semibold">{stats.presentDays}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Projects assigned:</span>
                  <p className="font-semibold">{projectStats?.totalAssigned || 0}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Active projects:</span>
                  <p className="font-semibold">{projectStats?.activeProjects || 0}</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-500/10 rounded-lg">
                  <Calendar className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Current Month Attendance</p>
                  <p className="text-2xl font-bold">{stats.presentDays}</p>
                  <p className="text-xs text-muted-foreground">days present</p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-500/10 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Average Working Hours</p>
                  <p className="text-2xl font-bold">{stats.avgHours.toFixed(1)}</p>
                  <p className="text-xs text-muted-foreground">hours per day</p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-500/10 rounded-lg">
                  <Clock className="h-6 w-6 text-purple-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Weekly Average</p>
                  <p className="text-2xl font-bold">{insights.avgHours.toFixed(1)}</p>
                  <p className="text-xs text-muted-foreground">hours this week</p>
                </div>
              </div>
            </Card>

            <Card className={`p-6 ${activeEntry ? "bg-green-500/10" : "bg-red-500/10"}`}>
              <div className="flex items-center gap-4">
                <div className={`p-3 ${activeEntry ? "bg-green-500/20" : "bg-red-500/20"} rounded-lg`}>
                  <Clock className={`h-6 w-6 ${activeEntry ? "text-green-600" : "text-red-600"}`} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p className={`text-2xl font-bold ${activeEntry ? "text-green-600" : "text-red-600"}`}>
                    {activeEntry ? "Clocked In" : "Clocked Out"}
                  </p>
                  {activeEntry && (
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(activeEntry.timeIn), "HH:mm")}
                    </p>
                  )}
                </div>
              </div>
            </Card>
          </div>

          {/* Time In Trends & Payslip */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Time In Trends</h3>
              <p className="text-sm text-muted-foreground mb-4">Your attendance pattern this month</p>
              {monthAttendance && monthAttendance.length > 0 ? (
                <div className="space-y-2">
                  {monthAttendance.slice(0, 5).map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium">{format(new Date(entry.timeIn), "MMM dd, yyyy")}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(entry.timeIn), "HH:mm")} - {entry.status === "active" ? "Active" : entry.timeOut ? format(new Date(entry.timeOut), "HH:mm") : "N/A"}
                        </p>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                        entry.status === "completed" ? "bg-green-500/20 text-green-600" :
                        entry.status === "active" ? "bg-blue-500/20 text-blue-600" :
                        "bg-red-500/20 text-red-600"
                      }`}>
                        {entry.status === "active" ? "Active" : entry.status}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">No attendance data available</p>
              )}
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Latest Payslip</h3>
              <div className="text-center py-12 text-muted-foreground">
                <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No payslip data available</p>
                <Button variant="link" asChild className="mt-2">
                  <Link href="/payslips">View all payslips</Link>
                </Button>
              </div>
            </Card>
          </div>

          {/* Current Projects */}
          <Card className="p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Current Projects</h3>
              <Button variant="link" asChild>
                <Link href="/projects">View all</Link>
              </Button>
            </div>
            {myProjects && myProjects.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {myProjects.slice(0, 3).map((project: any) => (
                  <Card key={project.id} className="p-4 border-l-4 border-l-primary">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between">
                        <h4 className="font-semibold text-sm line-clamp-1">{project.name}</h4>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          project.priority === "high" ? "bg-red-500/10 text-red-500" :
                          project.priority === "medium" ? "bg-yellow-500/10 text-yellow-500" :
                          "bg-blue-500/10 text-blue-500"
                        }`}>
                          {project.priority}
                        </span>
                      </div>
                      {project.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {project.description}
                        </p>
                      )}
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground capitalize">
                          {project.status.replace("_", " ")}
                        </span>
                        {project.role && (
                          <span className="text-muted-foreground">• {project.role}</span>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <FolderKanban className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No projects assigned yet</p>
              </div>
            )}
          </Card>

          {/* Quick Actions */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button variant="outline" className="h-20" asChild>
                <Link href="/leave">
                  <div className="flex flex-col items-center gap-2">
                    <ClipboardList className="h-6 w-6" />
                    <span>Apply Leave</span>
                  </div>
                </Link>
              </Button>

              <Button variant="outline" className="h-20" asChild>
                <Link href="/chat">
                  <div className="flex flex-col items-center gap-2">
                    <MessageSquare className="h-6 w-6" />
                    <span>Team Chat</span>
                  </div>
                </Link>
              </Button>

              <Button variant="outline" className="h-20" asChild>
                <Link href="/forms">
                  <div className="flex flex-col items-center gap-2">
                    <FileText className="h-6 w-6" />
                    <span>Submit Form</span>
                  </div>
                </Link>
              </Button>

              <Button variant="outline" className="h-20" asChild>
                <Link href="/announcements">
                  <div className="flex flex-col items-center gap-2">
                    <Bell className="h-6 w-6" />
                    <span>Announcements</span>
                  </div>
                </Link>
              </Button>
            </div>
          </Card>
        </div>
      </main>

      {/* Time In/Out Dialog */}
      <TimeInOutDialog open={timeDialogOpen} onOpenChange={setTimeDialogOpen} />

      {/* Break Overlay */}
      {breakOverlayOpen && activeBreak && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <Card className="w-full max-w-md p-8 text-center space-y-6">
            <div className="flex flex-col items-center gap-4">
              <div className="p-4 bg-primary/10 rounded-full">
                <Coffee className="h-12 w-12 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-2">Break in Progress</h2>
                <p className="text-muted-foreground">
                  You're currently on a break. The dashboard is locked until you end your break.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">
                Break started at: {format(new Date(activeBreak.breakStart), "HH:mm")}
              </div>
              <div className="text-lg font-semibold">
                Duration: {Math.floor((Date.now() - new Date(activeBreak.breakStart).getTime()) / 60000)} minutes
              </div>
            </div>

            <Button
              onClick={() => endBreakMutation.mutate()}
              disabled={endBreakMutation.isPending}
              size="lg"
              className="w-full"
            >
              {endBreakMutation.isPending ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Ending Break...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-5 w-5 mr-2" />
                  End Break
                </>
              )}
            </Button>
          </Card>
        </div>
      )}
    </div>
  );
}

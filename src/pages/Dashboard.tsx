import { useState, useEffect, useMemo, useRef } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useTheme } from "@/contexts/ThemeContext";
import { useIsMobile } from "@/hooks/useMobile";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import { TimeInOutDialog } from "@/components/TimeInOutDialog";
import { getAvatarById } from "@shared/avatars";
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
  Shield,
  CheckCircle2,
  Loader2,
  BarChart3,
  List,
  Plus,
  Timer,
  StickyNote,
  LifeBuoy,
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { addHours, format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfDay, subDays } from "date-fns";
import { toast } from "sonner";
import { Link, useLocation } from "wouter";
import { GlobalChatWidget } from "@/components/GlobalChatWidget";
import { NotesWidget } from "@/components/NotesWidget";
import { NotificationSidebar } from "@/components/NotificationSidebar";
import { CalendarSidebar } from "@/components/CalendarSidebar";
import { QuickMeetingSidebar } from "@/components/QuickMeetingSidebar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Today's Calendar Widget Component
function TodayCalendarWidgetContent() {
  const { data: meetings, isLoading } = trpc.meetings.getMyMeetings.useQuery();
  
  const todayMeetings = meetings?.filter((m: any) => {
    const meetingDate = new Date(m.startTime);
    return meetingDate.toDateString() === new Date().toDateString();
  }) || [];

  const { data: events } = trpc.calendar.getMyEvents.useQuery();
  
  const todayEvents = events?.filter(event => {
    const eventDate = new Date(event.startTime);
    return eventDate.toDateString() === new Date().toDateString();
  }) || [];

  if (isLoading) {
    return <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  const allItems = [
    ...todayMeetings.map((m: any) => ({ type: 'meeting' as const, title: m.title, time: new Date(m.startTime) })),
    ...todayEvents.map((e: any) => ({ type: 'event' as const, title: e.title, time: new Date(e.startTime) }))
  ].sort((a, b) => a.time.getTime() - b.time.getTime());

  if (allItems.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p>No events scheduled for today</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {allItems.slice(0, 3).map((item, idx) => (
        <div key={idx} className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
          <div className="flex-shrink-0 w-12 text-center">
            <div className="text-sm font-semibold">{format(item.time, 'HH:mm')}</div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {item.type === 'meeting' ? <Users className="h-4 w-4 text-blue-500" /> : <Calendar className="h-4 w-4 text-green-500" />}
              <span className="font-medium truncate">{item.title}</span>
            </div>
          </div>
        </div>
      ))}
      {allItems.length > 3 && (
        <div className="text-center text-sm text-muted-foreground">
          +{allItems.length - 3} more events
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const isMobile = useIsMobile();
  const [timeDialogOpen, setTimeDialogOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState("");
  const [breakOverlayOpen, setBreakOverlayOpen] = useState(false);
  const [breakDialogOpen, setBreakDialogOpen] = useState(false);
  const [breakReason, setBreakReason] = useState("");
  const [notificationSidebarOpen, setNotificationSidebarOpen] = useState(false);
  const [calendarSidebarOpen, setCalendarSidebarOpen] = useState(false);
  const [meetingSidebarOpen, setMeetingSidebarOpen] = useState(false);
  const [attendanceView, setAttendanceView] = useState<'graph' | 'list'>('graph');
  const [fabOpen, setFabOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackSubject, setFeedbackSubject] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackPriority, setFeedbackPriority] = useState<"low" | "medium" | "high">("medium");
  const initialWorkSession = useMemo(() => {
    const now = new Date();
    return {
      date: format(now, "yyyy-MM-dd"),
      start: format(now, "HH:mm"),
      end: format(addHours(now, 2), "HH:mm"),
    };
  }, []);
  const [workSessionOpen, setWorkSessionOpen] = useState(false);
  const [workSessionDate, setWorkSessionDate] = useState(initialWorkSession.date);
  const [workSessionStart, setWorkSessionStart] = useState(initialWorkSession.start);
  const [workSessionEnd, setWorkSessionEnd] = useState(initialWorkSession.end);
  const [workSessionType, setWorkSessionType] = useState<"remote" | "onsite">("remote");
  const [workSessionDescription, setWorkSessionDescription] = useState("");
  const [overtimeOpen, setOvertimeOpen] = useState(false);
  const [overtimeDate, setOvertimeDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [overtimeHours, setOvertimeHours] = useState("1");
  const [overtimeProjectId, setOvertimeProjectId] = useState("");
  const [overtimeTaskId, setOvertimeTaskId] = useState("");
  const [overtimeDescription, setOvertimeDescription] = useState("");
  const currentUserId = user?.id ? String(user.id) : null;

  const handleLogout = async () => {
    try {
      await logout();
      window.location.href = "/";
    } catch (error: any) {
      toast.error(error?.message || "Please clock out before logging out");
    }
  };

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
  const updateLocationMutation = trpc.timeTracking.updateLocation.useMutation();
  const locationRequestedForEntry = useRef<string | null>(null);
  const { data: breakLogs } = trpc.timeTracking.getBreakLogs.useQuery();
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

  // Get current month attendance
  const monthStart = startOfMonth(new Date());
  const monthEnd = endOfMonth(new Date());
  const { data: monthAttendance } = trpc.timeTracking.getAttendance.useQuery({
    startDate: monthStart,
    endDate: monthEnd,
  });

  // Get last 7 days for trends
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
  const { data: weekAttendance } = trpc.timeTracking.getAttendance.useQuery({
    startDate: weekStart,
    endDate: weekEnd,
  });

  // Get project stats
  const { data: projectStats } = trpc.projects.getStats.useQuery();
  const { data: myProjects } = trpc.projects.getMyProjects.useQuery();
  const { data: myTaskStats } = trpc.projects.getMyTaskStats.useQuery();
  const { data: weeklyOvertime = [] } = trpc.timeTracking.getOvertimeByRange.useQuery({
    startDate: weekStart,
    endDate: weekEnd,
  });
  const { data: overtimeTasks = [] } = trpc.projects.getTasks.useQuery(
    { projectId: overtimeProjectId },
    { enabled: Boolean(overtimeProjectId) }
  );

  const utils = trpc.useUtils();

  useEffect(() => {
    if (overtimeProjectId && overtimeTasks.length > 0 && !overtimeTaskId) {
      setOvertimeTaskId(String(overtimeTasks[0].id));
    }
  }, [overtimeProjectId, overtimeTasks, overtimeTaskId]);

  useEffect(() => {
    if (!activeEntry || (activeEntry as any).location) return;
    if (!navigator.geolocation) return;
    const entryId = String((activeEntry as any).id || "");
    if (!entryId || locationRequestedForEntry.current === entryId) return;

    locationRequestedForEntry.current = entryId;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        updateLocationMutation.mutate({
          location: {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            source: "gps",
          },
        });
      },
      () => {
        // Ignore errors silently; location will stay unavailable.
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  }, [activeEntry, updateLocationMutation]);

  const resetWorkSessionForm = () => {
    const now = new Date();
    setWorkSessionDate(format(now, "yyyy-MM-dd"));
    setWorkSessionStart(format(now, "HH:mm"));
    setWorkSessionEnd(format(addHours(now, 2), "HH:mm"));
    setWorkSessionType("remote");
    setWorkSessionDescription("");
  };

  const buildDateTime = (dateValue: string, timeValue: string) => {
    if (!dateValue || !timeValue) return null;
    const [year, month, day] = dateValue.split("-").map(Number);
    const [hour, minute] = timeValue.split(":").map(Number);
    if (!year || !month || !day || Number.isNaN(hour) || Number.isNaN(minute)) return null;
    return new Date(year, month - 1, day, hour, minute);
  };

  const resetOvertimeForm = () => {
    setOvertimeDate(format(new Date(), "yyyy-MM-dd"));
    setOvertimeHours("1");
    setOvertimeProjectId("");
    setOvertimeTaskId("");
    setOvertimeDescription("");
  };

  const handleSubmitFeedback = () => {
    if (!feedbackSubject.trim()) {
      toast.error("Please add a subject");
      return;
    }
    if (!feedbackMessage.trim()) {
      toast.error("Please add details for the ticket");
      return;
    }
    submitFeedbackMutation.mutate({
      formType: "feedback",
      subject: feedbackSubject.trim(),
      content: feedbackMessage.trim(),
      priority: feedbackPriority,
    });
  };

  const addOvertimeMutation = trpc.timeTracking.addOvertime.useMutation({
    onSuccess: () => {
      toast.success("Overtime added");
      setOvertimeOpen(false);
      resetOvertimeForm();
      utils.timeTracking.getOvertimeByRange.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to add overtime");
    },
  });

  const addWorkSessionMutation = trpc.timeTracking.addWorkSession.useMutation({
    onSuccess: () => {
      toast.success("Work session added");
      setWorkSessionOpen(false);
      resetWorkSessionForm();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to add work session");
    },
  });

  const submitFeedbackMutation = trpc.forms.submit.useMutation({
    onSuccess: () => {
      toast.success("Support ticket submitted");
      setFeedbackOpen(false);
      setFeedbackSubject("");
      setFeedbackMessage("");
      setFeedbackPriority("medium");
      utils.forms.getMyForms.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to submit feedback");
    },
  });

  const startBreakMutation = trpc.timeTracking.startBreak.useMutation({
    onSuccess: () => {
      toast.success("Break started");
      setBreakOverlayOpen(true);
      setBreakDialogOpen(false);
      setBreakReason("");
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
  const breakReasonOptions = ["Smoke", "Meeting", "Lunch", "Outgoing", "Sleeping"];

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

  const weeklyTargetHours = 40;
  const weeklyOvertimeHours = useMemo(() => {
    return weeklyOvertime.reduce((sum: number, entry: any) => sum + (Number(entry.hours) || 0), 0);
  }, [weeklyOvertime]);

  const weeklyHoursSummary = useMemo(() => {
    if (!weekAttendance || weekAttendance.length === 0) {
      return {
        total: 0,
        progress: 0,
        missingCount: 0,
        missingPenalty: 0,
      };
    }

    const now = currentTime;
    const todayStart = startOfDay(now).getTime();
    let completedHours = 0;
    let activeTodayHours = 0;
    let missingCount = 0;

    weekAttendance.forEach((entry: any) => {
      const timeIn = new Date(entry.timeIn);
      const isActive = entry.status === "active" || !entry.timeOut;
      if (isActive) {
        const timeInDay = startOfDay(timeIn).getTime();
        if (timeInDay < todayStart) {
          missingCount += 1;
        } else {
          activeTodayHours += (now.getTime() - timeIn.getTime()) / (1000 * 60 * 60);
        }
        return;
      }

      const hours = entry.totalHours
        ? Number(entry.totalHours)
        : entry.timeOut
          ? (new Date(entry.timeOut).getTime() - timeIn.getTime()) / (1000 * 60 * 60)
          : 0;
      completedHours += hours;
    });

    const missingPenalty = missingCount * 8;
    const total = completedHours + activeTodayHours - missingPenalty;
    const progress = weeklyTargetHours
      ? Math.min(100, Math.max(0, (total / weeklyTargetHours) * 100))
      : 0;

    return {
      total: Number(total.toFixed(2)),
      progress,
      missingCount,
      missingPenalty,
    };
  }, [weekAttendance, currentTime]);

  const taskCompletionRate = useMemo(() => {
    const total = myTaskStats?.total || 0;
    const completed = myTaskStats?.completed || 0;
    return total ? (completed / total) * 100 : 0;
  }, [myTaskStats]);

  const minOvertimeDate = format(subDays(new Date(), 1), "yyyy-MM-dd");
  const maxOvertimeDate = format(new Date(), "yyyy-MM-dd");

  const menuItems = [
    { icon: Home, label: "Flow Central", path: "/dashboard" },
    { icon: Clock, label: "Attendance", path: "/attendance" },
    { icon: ClipboardList, label: "Leave Management", path: "/leave" },
    { icon: FolderKanban, label: "Projects", path: "/projects" },
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
            <img src={logoSrc} alt="Rad.flow" className="h-8" style={{width: '115px', height: '61px'}} />
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
                    className={`relative w-full ${sidebarCollapsed ? "justify-center" : "justify-start"}`}
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

        {/* Logout */}
        <div className="p-2 border-t">
          <Button
            variant="ghost"
            onClick={handleLogout}
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
          <img src={logoSrc} alt="Rad.flow" className="h-8" />
          <div className="flex items-center gap-1">
            <Link href="/notifications">
              <Button
                variant="ghost"
                size="icon"
                className="relative"
              >
                <Bell className="h-5 w-5" />
                <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
            >
              {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        <div className="p-4 md:p-6 lg:p-8">
          {/* Greeting Section */}
          <div className="mb-6 md:mb-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                {user?.avatar && user.avatar.startsWith("http") ? (
                  <img
                    src={user.avatar}
                    alt="Avatar"
                    className="h-12 w-12 rounded-full object-cover ring-2 ring-border shrink-0"
                  />
                ) : (
                  <div 
                    className="h-12 w-12 rounded-full flex items-center justify-center text-2xl shrink-0"
                    style={{ backgroundColor: getAvatarById(user?.avatar).color + "20" }}
                  >
                    {getAvatarById(user?.avatar).emoji}
                  </div>
                )}
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
                    <Sun className="h-8 w-8 text-yellow-500" />
                    Good {new Date().getHours() < 12 ? "Morning" : new Date().getHours() < 18 ? "Afternoon" : "Evening"}, {user?.name}!
                  </h2>
                  <p className="text-muted-foreground mt-1">
                    {format(currentTime, "EEEE, MMMM dd, yyyy")} • {format(currentTime, "HH:mm:ss")}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCalendarSidebarOpen(true)}
                  title="Today's Schedule"
                  className="transition-all hover:scale-110 hover:shadow-lg"
                >
                  <Calendar className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setMeetingSidebarOpen(true)}
                  title="Quick Meeting"
                  className="transition-all hover:scale-110 hover:shadow-lg"
                >
                  <Users className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    resetWorkSessionForm();
                    setWorkSessionOpen(true);
                  }}
                  title={activeEntry ? "Clock out to add a work session" : "Add Work Session"}
                  className="transition-all hover:scale-110 hover:shadow-lg"
                  disabled={Boolean(activeEntry)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    if (myProjects && myProjects.length > 0) {
                      setOvertimeProjectId(String(myProjects[0].id));
                    }
                    setOvertimeTaskId("");
                    setOvertimeDate(format(new Date(), "yyyy-MM-dd"));
                    setOvertimeHours("1");
                    setOvertimeDescription("");
                    setOvertimeOpen(true);
                  }}
                  title="Add Overtime"
                  className="transition-all hover:scale-110 hover:shadow-lg"
                >
                  <Timer className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setFeedbackOpen(true)}
                  title="Support Ticket"
                  className="transition-all hover:scale-110 hover:shadow-lg"
                >
                  <LifeBuoy className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  asChild
                  title="Apply Leave"
                  className="transition-all hover:scale-110 hover:shadow-lg"
                >
                  <Link href="/leave">
                    <ClipboardList className="h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setNotificationSidebarOpen(true)}
                  className="relative transition-all hover:scale-110 hover:shadow-lg"
                  title="Notifications"
                >
                  <Bell className="h-4 w-4" />
                  <span className="absolute top-0 right-0 h-2 w-2 bg-red-500 rounded-full"></span>
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={toggleTheme}
                  title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
                  className="transition-all hover:scale-110 hover:shadow-lg hover:rotate-180"
                >
                  {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </Button>
                {activeEntry ? (
                  <>
                    <Button onClick={() => setTimeDialogOpen(true)}>
                      <Clock className="h-4 w-4 mr-2" />
                      Clock Out
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => activeBreak ? endBreakMutation.mutate() : setBreakDialogOpen(true)}
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
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4 text-sm">
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
                <div>
                  <span className="text-muted-foreground">OT hours this week:</span>
                  <p className="font-semibold">{weeklyOvertimeHours.toFixed(2)} hrs</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Stats Grid - Compact */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
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

            <Card className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-500/10 rounded-lg">
                  <Timer className="h-6 w-6 text-purple-500" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Weekly Hours</p>
                  <p className={`text-2xl font-bold ${weeklyHoursSummary.total < 0 ? "text-red-500" : ""}`}>
                    {weeklyHoursSummary.total.toFixed(1)} / {weeklyTargetHours}
                  </p>
                  <Progress value={weeklyHoursSummary.progress} className="h-2 mt-2" />
                  {weeklyHoursSummary.missingCount > 0 && (
                    <p className="text-xs text-red-500 mt-1">
                      Missing clock-outs: {weeklyHoursSummary.missingCount} (-{weeklyHoursSummary.missingPenalty}h)
                    </p>
                  )}
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-500/10 rounded-lg">
                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Task Completion</p>
                  <p className="text-2xl font-bold">{taskCompletionRate.toFixed(0)}%</p>
                  <Progress value={taskCompletionRate} className="h-2 mt-2" />
                  <p className="text-xs text-muted-foreground mt-1">
                    {myTaskStats?.completed || 0}/{myTaskStats?.total || 0} tasks
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Attendance Trends & Payslip */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-semibold">Attendance Trends</h3>
                <div className="flex gap-1">
                  <Button
                    variant={attendanceView === 'graph' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setAttendanceView('graph')}
                    className="h-7 px-2"
                  >
                    <BarChart3 className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant={attendanceView === 'list' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setAttendanceView('list')}
                    className="h-7 px-2"
                  >
                    <List className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              {monthAttendance && monthAttendance.length > 0 ? (
                attendanceView === 'graph' ? (
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={monthAttendance.slice(0, 10).reverse().map((entry) => ({
                        date: format(new Date(entry.timeIn), 'MMM dd'),
                        hours: entry.timeOut 
                          ? ((new Date(entry.timeOut).getTime() - new Date(entry.timeIn).getTime()) / (1000 * 60 * 60)).toFixed(1)
                          : 0
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="date" className="text-xs" />
                        <YAxis className="text-xs" />
                        <Tooltip 
                          contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                          labelStyle={{ color: 'hsl(var(--foreground))' }}
                        />
                        <Line type="monotone" dataKey="hours" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6' }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {monthAttendance.slice(0, 5).map((entry) => (
                      <div key={entry.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg text-sm">
                        <div>
                          <p className="font-medium text-xs">{format(new Date(entry.timeIn), "MMM dd")}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(entry.timeIn), "HH:mm")} - {entry.timeOut ? format(new Date(entry.timeOut), "HH:mm") : "Active"}
                          </p>
                        </div>
                        <div className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          entry.status === "completed" ? "bg-green-500/20 text-green-600" :
                          entry.status === "active" ? "bg-blue-500/20 text-blue-600" :
                          "bg-red-500/20 text-red-600"
                        }`}>
                          {entry.timeOut ? `${((new Date(entry.timeOut).getTime() - new Date(entry.timeIn).getTime()) / (1000 * 60 * 60)).toFixed(1)}h` : 'Active'}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                <p className="text-center text-muted-foreground py-8 text-sm">No attendance data available</p>
              )}
            </Card>

            <Card className="p-4">
              <h3 className="text-base font-semibold mb-3">Latest Payslip</h3>
              <div className="text-center py-8 text-muted-foreground">
                <DollarSign className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No payslip data available</p>
                <Button variant="link" asChild className="mt-2 text-xs">
                  <Link href="/payslips">View all payslips</Link>
                </Button>
              </div>
            </Card>
          </div>

          {/* Current Projects & Today's Schedule - Side by Side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-semibold">Current Projects</h3>
                <Button variant="link" asChild className="text-xs">
                  <Link href="/projects">View all</Link>
                </Button>
              </div>
              {myProjects && myProjects.length > 0 ? (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {myProjects.slice(0, 3).map((project: any) => (
                    <div key={project.id} className="p-3 border-l-4 border-l-primary bg-muted/30 rounded">
                      <div className="space-y-1">
                        <div className="flex items-start justify-between">
                          <h4 className="font-semibold text-sm line-clamp-1">{project.name}</h4>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            project.priority === "high" ? "bg-red-500/10 text-red-500" :
                            project.priority === "medium" ? "bg-yellow-500/10 text-yellow-500" :
                            "bg-blue-500/10 text-blue-500"
                          }`}>
                            {project.priority}
                          </span>
                        </div>
                        {project.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {project.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="capitalize">{project.status.replace("_", " ")}</span>
                          {project.role && <span>• {project.role}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FolderKanban className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No projects assigned yet</p>
                </div>
              )}
            </Card>

            {/* Today's Schedule */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-semibold">Today's Schedule</h3>
                <Button variant="ghost" size="sm" asChild className="text-xs">
                  <Link href="/calendar">
                    <Calendar className="h-3.5 w-3.5 mr-1" />
                    View All
                  </Link>
                </Button>
              </div>
              <div className="max-h-64 overflow-y-auto">
                <TodayCalendarWidgetContent />
              </div>
            </Card>
          </div>


        </div>
      </main>

      {/* Time In/Out Dialog */}
      <TimeInOutDialog open={timeDialogOpen} onOpenChange={setTimeDialogOpen} />

      {/* Add Work Session Dialog */}
      <Dialog open={workSessionOpen} onOpenChange={setWorkSessionOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Work Session</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Date *</Label>
              <Input
                type="date"
                value={workSessionDate}
                onChange={(e) => setWorkSessionDate(e.target.value)}
                max={format(new Date(), "yyyy-MM-dd")}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Start Time *</Label>
                <Input
                  type="time"
                  value={workSessionStart}
                  onChange={(e) => setWorkSessionStart(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>End Time *</Label>
                <Input
                  type="time"
                  value={workSessionEnd}
                  onChange={(e) => setWorkSessionEnd(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Session Type *</Label>
              <Select value={workSessionType} onValueChange={(value) => setWorkSessionType(value as "remote" | "onsite")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select session type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="remote">Remote</SelectItem>
                  <SelectItem value="onsite">Onsite</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description (Optional)</Label>
              <Textarea
                value={workSessionDescription}
                onChange={(e) => setWorkSessionDescription(e.target.value)}
                placeholder="What did you work on?"
                className="min-h-[90px]"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setWorkSessionOpen(false)}
                disabled={addWorkSessionMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  const start = buildDateTime(workSessionDate, workSessionStart);
                  const end = buildDateTime(workSessionDate, workSessionEnd);

                  if (!start || !end) {
                    toast.error("Please select date and time");
                    return;
                  }
                  if (end <= start) {
                    toast.error("End time must be after start time");
                    return;
                  }

                  addWorkSessionMutation.mutate({
                    startTime: start,
                    endTime: end,
                    sessionType: workSessionType,
                    description: workSessionDescription.trim() || undefined,
                  });
                }}
                disabled={
                  addWorkSessionMutation.isPending ||
                  !workSessionDate ||
                  !workSessionStart ||
                  !workSessionEnd
                }
              >
                {addWorkSessionMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  "Add Session"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Overtime Dialog */}
      <Dialog open={overtimeOpen} onOpenChange={setOvertimeOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Overtime</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Date *</Label>
              <Input
                type="date"
                value={overtimeDate}
                onChange={(e) => setOvertimeDate(e.target.value)}
                min={minOvertimeDate}
                max={maxOvertimeDate}
              />
              <p className="text-xs text-muted-foreground">You can add OT for today or yesterday.</p>
            </div>

            <div className="space-y-2">
              <Label>Project *</Label>
              <Select
                value={overtimeProjectId}
                onValueChange={(value) => {
                  setOvertimeProjectId(value);
                  setOvertimeTaskId("");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {myProjects && myProjects.length > 0 ? (
                    myProjects.map((project: any) => (
                      <SelectItem key={project.id} value={String(project.id)}>
                        {project.name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>
                      No projects available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Task *</Label>
              <Select
                value={overtimeTaskId}
                onValueChange={(value) => setOvertimeTaskId(value)}
                disabled={!overtimeProjectId}
              >
                <SelectTrigger>
                  <SelectValue placeholder={overtimeProjectId ? "Select task" : "Select project first"} />
                </SelectTrigger>
                <SelectContent>
                  {overtimeTasks && overtimeTasks.length > 0 ? (
                    overtimeTasks.map((task: any) => (
                      <SelectItem key={task.id} value={String(task.id)}>
                        {task.title}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>
                      No tasks found
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Hours *</Label>
              <Input
                type="number"
                min="0.25"
                step="0.25"
                value={overtimeHours}
                onChange={(e) => setOvertimeHours(e.target.value)}
                placeholder="e.g., 2"
              />
            </div>

            <div className="space-y-2">
              <Label>Description (Optional)</Label>
              <Textarea
                value={overtimeDescription}
                onChange={(e) => setOvertimeDescription(e.target.value)}
                placeholder="What OT work did you complete?"
                className="min-h-[90px]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setOvertimeOpen(false)}
                disabled={addOvertimeMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  const hours = Number(overtimeHours);
                  if (!overtimeDate || !overtimeProjectId || !overtimeTaskId) {
                    toast.error("Please select date, project, and task");
                    return;
                  }
                  if (!hours || Number.isNaN(hours) || hours <= 0) {
                    toast.error("Please enter valid OT hours");
                    return;
                  }

                  addOvertimeMutation.mutate({
                    workDate: new Date(`${overtimeDate}T00:00:00`),
                    hours,
                    projectId: overtimeProjectId,
                    taskId: overtimeTaskId,
                    description: overtimeDescription.trim() || undefined,
                  });
                }}
                disabled={
                  addOvertimeMutation.isPending ||
                  !overtimeDate ||
                  !overtimeProjectId ||
                  !overtimeTaskId
                }
              >
                {addOvertimeMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  "Add OT"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Break Reason Dialog */}
      <Dialog open={breakDialogOpen} onOpenChange={setBreakDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Select Break Reason</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Reason *</Label>
              <Select value={breakReason} onValueChange={setBreakReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose reason" />
                </SelectTrigger>
                <SelectContent>
                  {breakReasonOptions.map((reason) => (
                    <SelectItem key={reason} value={reason}>
                      {reason}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              className="w-full"
              onClick={() => {
                if (!breakReason) {
                  toast.error("Please select a break reason");
                  return;
                }
                startBreakMutation.mutate({ reason: breakReason as any });
              }}
              disabled={startBreakMutation.isPending}
            >
              {startBreakMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Starting...
                </>
              ) : (
                "Start Break"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={feedbackOpen} onOpenChange={setFeedbackOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Support Ticket / Feedback</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Subject *</Label>
              <Input
                placeholder="Short summary of the issue"
                value={feedbackSubject}
                onChange={(e) => setFeedbackSubject(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={feedbackPriority} onValueChange={(value) => setFeedbackPriority(value as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Details *</Label>
              <Textarea
                rows={5}
                placeholder="Describe the problem or feedback in detail..."
                value={feedbackMessage}
                onChange={(e) => setFeedbackMessage(e.target.value)}
              />
            </div>
            <Button
              className="w-full"
              onClick={handleSubmitFeedback}
              disabled={submitFeedbackMutation.isPending}
            >
              {submitFeedbackMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Ticket"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Global Chat Widget */}
      <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3">
        <Button
          onClick={() => {
            setNotesOpen(true);
            setFabOpen(false);
          }}
          className={`h-12 w-12 rounded-full shadow-premium-lg bg-[#ff8a00] hover:bg-[#ff7a00] text-white transition-all ${
            fabOpen ? "opacity-100 translate-x-0" : "opacity-0 translate-x-6 pointer-events-none"
          }`}
          size="icon"
          title="Notes"
        >
          <StickyNote className="h-5 w-5" />
        </Button>
        <Button
          onClick={() => {
            setChatOpen(true);
            setFabOpen(false);
          }}
          className={`h-12 w-12 rounded-full shadow-premium-lg bg-[#ff2801] hover:bg-[#e62401] text-white transition-all ${
            fabOpen ? "opacity-100 translate-x-0" : "opacity-0 translate-x-6 pointer-events-none"
          }`}
          size="icon"
          title="Chat"
        >
          <MessageSquare className="h-5 w-5" />
        </Button>
        <Button
          onClick={() => setFabOpen(!fabOpen)}
          className="h-14 w-14 rounded-full shadow-premium-lg bg-primary hover:bg-primary/90 text-white"
          size="icon"
          title="Quick Actions"
        >
          {fabOpen ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
        </Button>
      </div>

      <NotesWidget open={notesOpen} onOpenChange={setNotesOpen} hideTrigger />
      <GlobalChatWidget open={chatOpen} onOpenChange={setChatOpen} hideTrigger />

      {/* Notification Sidebar */}
      <NotificationSidebar 
        isOpen={notificationSidebarOpen} 
        onClose={() => setNotificationSidebarOpen(false)} 
      />

      {/* Calendar Sidebar */}
      <CalendarSidebar 
        isOpen={calendarSidebarOpen} 
        onClose={() => setCalendarSidebarOpen(false)} 
      />

      {/* Quick Meeting Sidebar */}
      <QuickMeetingSidebar 
        isOpen={meetingSidebarOpen} 
        onClose={() => setMeetingSidebarOpen(false)} 
      />

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
              {activeBreak.reason && (
                <div className="text-sm text-muted-foreground">
                  Reason: {activeBreak.reason}
                </div>
              )}
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

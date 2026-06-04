import { useEffect, useMemo, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Clock,
  TrendingUp,
  TrendingDown,
  Award,
  Activity,
  Target,
  Briefcase,
  ListTodo,
  Users,
  FileCheck,
  MessageSquareText,
  AlertCircle,
  CheckCircle2,
  RefreshCcw,
  MapPin,
  Wifi,
  Bell,
} from "lucide-react";
import { Link } from "wouter";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart, Bar } from "recharts";
import { trpc } from "@/lib/trpc";
import { format, formatDistanceToNow } from "date-fns";
import { useAuth } from "@/_core/hooks/useAuth";

export default function AdminDashboard() {
  const { user } = useAuth();
  const { data: employeeStatuses = [] } = trpc.admin.getEmployeeStatusSnapshot.useQuery();
  const { data: leaveRequests = [] } = trpc.admin.getLeaveRequests.useQuery();
  const { data: formSubmissions = [] } = trpc.admin.getFormSubmissions.useQuery();
  const { data: projects = [] } = trpc.admin.getProjectsOverview.useQuery();
  const { data: ongoingTasks = [] } = trpc.admin.getOngoingTasks.useQuery();
  const { data: avgHoursData = [] } = trpc.admin.getAverageHours.useQuery({ days: 5 });
  const { data: resourcePerformance = [] } = trpc.admin.getResourcePerformance.useQuery();
  const { data: notifications = [] } = trpc.notifications.getAll.useQuery();
  const utils = trpc.useUtils();
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<any | null>(null);
  const [addressCache, setAddressCache] = useState<Record<string, string>>({});
  const [addressLoading, setAddressLoading] = useState(false);

  const refreshAll = () => {
    utils.admin.getEmployeeStatusSnapshot.invalidate();
    utils.admin.getLeaveRequests.invalidate();
    utils.admin.getFormSubmissions.invalidate();
    utils.admin.getProjectsOverview.invalidate();
    utils.admin.getOngoingTasks.invalidate();
    utils.admin.getAverageHours.invalidate();
    utils.admin.getResourcePerformance.invalidate();
    utils.notifications.getAll.invalidate();
  };

  const pendingLeaves = useMemo(
    () => leaveRequests.filter((req: any) => req.status === "pending"),
    [leaveRequests]
  );
  const pendingForms = useMemo(
    () => formSubmissions.filter((form: any) => form.status === "submitted" || form.status === "under_review"),
    [formSubmissions]
  );

  const activeProjects = useMemo(
    () => projects.filter((project: any) => project.status === "active"),
    [projects]
  );
  const onlineEmployees = useMemo(
    () => employeeStatuses.filter((emp: any) => emp.status === "timed_in" || emp.status === "on_break"),
    [employeeStatuses]
  );
  const mapTarget = onlineEmployees.find((emp: any) => emp.location?.lat && emp.location?.lng);
  const mapUrl = mapTarget
    ? `https://www.google.com/maps?q=${mapTarget.location.lat},${mapTarget.location.lng}`
    : undefined;
  const getLocationKey = (lat: number, lng: number) => `${lat.toFixed(5)},${lng.toFixed(5)}`;

  const resolveAddress = async (lat: number, lng: number) => {
    const key = getLocationKey(lat, lng);
    if (addressCache[key]) return addressCache[key];
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`
      );
      if (!response.ok) return null;
      const data = await response.json();
      const address = data?.display_name;
      if (address) {
        setAddressCache((prev) => ({ ...prev, [key]: address }));
        return address;
      }
    } catch {
      // ignore
    }
    return null;
  };

  useEffect(() => {
    const targets = onlineEmployees
      .filter((emp: any) => emp?.location?.lat && emp?.location?.lng)
      .filter((emp: any) => {
        const key = getLocationKey(emp.location.lat, emp.location.lng);
        return !emp.location.address && !addressCache[key];
      });

    if (targets.length === 0) return;

    targets.slice(0, 6).forEach((emp: any) => {
      resolveAddress(emp.location.lat, emp.location.lng);
    });
  }, [onlineEmployees, addressCache]);

  const getLocationLabel = (location: any) => {
    if (!location?.lat || !location?.lng) return "Location not available";
    const key = getLocationKey(location.lat, location.lng);
    return location.address || addressCache[key] || `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`;
  };

  const handleLocationOpen = async (emp: any) => {
    if (!emp?.location?.lat || !emp?.location?.lng) return;
    setSelectedLocation(emp);
    setLocationDialogOpen(true);
    const key = getLocationKey(emp.location.lat, emp.location.lng);
    if (!emp.location.address && !addressCache[key]) {
      setAddressLoading(true);
      await resolveAddress(emp.location.lat, emp.location.lng);
      setAddressLoading(false);
    }
  };

  const performanceData = useMemo(() => {
    return resourcePerformance.map((item: any) => ({
      name: item.name,
      tasksCompleted: item.tasksCompleted || 0,
      tasksPending: item.tasksPending || 0,
      activeProjects: item.activeProjects || 0,
      completionRate: item.completionRate || 0,
    }));
  }, [resourcePerformance]);

  const totalEmployeesCount = employeeStatuses.length;
  const workingNowCount = employeeStatuses.filter((emp: any) => emp.status === "timed_in" || emp.status === "on_break").length;
  const onLeaveCount = employeeStatuses.filter((emp: any) => emp.status === "on_leave").length;
  const mostPunctual = useMemo(() => {
    const active = employeeStatuses.filter((emp: any) => emp.timeIn);
    if (!active.length) return "N/A";
    const earliest = active.sort((a: any, b: any) => new Date(a.timeIn).getTime() - new Date(b.timeIn).getTime())[0];
    return earliest?.name || "N/A";
  }, [employeeStatuses]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "timed_in":
        return "bg-green-500";
      case "on_break":
        return "bg-yellow-500";
      case "on_leave":
        return "bg-blue-500";
      default:
        return "bg-gray-400";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "timed_in":
        return "Timed In";
      case "on_break":
        return "On Break";
      case "on_leave":
        return "On Leave";
      default:
        return "Offline";
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return "NA";
    const parts = name.trim().split(/\s+/);
    const first = parts[0]?.[0] ?? "";
    const last = parts.length > 1 ? parts[parts.length - 1]?.[0] : "";
    return `${first}${last}`.toUpperCase();
  };
  const selectedCoords = selectedLocation?.location;
  const selectedAddress = selectedCoords ? getLocationLabel(selectedCoords) : "Location not available";
  const selectedMapSrc =
    selectedCoords?.lat && selectedCoords?.lng
      ? `https://www.google.com/maps?q=${selectedCoords.lat},${selectedCoords.lng}&output=embed`
      : "";
  const capturedLabel = selectedCoords?.capturedAt
    ? formatDistanceToNow(new Date(selectedCoords.capturedAt), { addSuffix: true })
    : null;

  return (
    <AdminLayout title="Admin Dashboard">
      <div className="space-y-6">
        {/* Greeting */}
        <Card className="p-6 border border-[#3a1c12] bg-gradient-to-r from-[#2b120e] via-[#1b1514] to-[#141414] shadow-[0_0_0_1px_rgba(255,90,50,0.18)]">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold">
                Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening"}, {user?.name || "Admin"}! ??
              </h2>
              <p className="text-sm text-muted-foreground">
                Here's what's happening with your team today
              </p>
              <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <span><strong className="text-foreground">{workingNowCount}</strong> employees currently working</span>
                </div>
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-orange-400" />
                  <span><strong className="text-foreground">{pendingLeaves.length}</strong> pending leave requests</span>
                </div>
                <div className="flex items-center gap-2">
                  <MessageSquareText className="h-4 w-4 text-sky-400" />
                  <span><strong className="text-foreground">{pendingForms.length}</strong> pending form responses</span>
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              className="self-start md:self-auto border-white/10"
              onClick={refreshAll}
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </Card>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4 rounded-2xl bg-[#141414] border border-white/5">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
              <Users className="h-4 w-4 text-green-500" />
              Online Now
            </div>
            <div className="text-2xl font-bold">{workingNowCount}/{totalEmployeesCount}</div>
          </Card>
          <Card className="p-4 rounded-2xl bg-[#141414] border border-white/5">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
              <Award className="h-4 w-4 text-yellow-500" />
              Most Punctual
            </div>
            <div className="text-base font-semibold truncate">{mostPunctual}</div>
          </Card>
          <Card className="p-4 rounded-2xl bg-[#141414] border border-white/5">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
              <Briefcase className="h-4 w-4 text-blue-500" />
              Active Projects
            </div>
            <div className="text-2xl font-bold">{activeProjects.length}</div>
          </Card>
          <Card className="p-4 rounded-2xl bg-[#141414] border border-white/5">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
              <ListTodo className="h-4 w-4 text-purple-500" />
              Ongoing Tasks
            </div>
            <div className="text-2xl font-bold">{ongoingTasks.length}</div>
          </Card>
        </div>

        {/* Key Metrics */}
        <Card className="p-6 rounded-2xl bg-[#141414] border border-white/5">
          <h3 className="font-semibold mb-4">Key Metrics</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <TrendingDown className="h-3.5 w-3.5 text-green-500" />
                Absence Rate
              </div>
              <div className="text-2xl font-bold">
                {totalEmployeesCount ? ((onLeaveCount / totalEmployeesCount) * 100).toFixed(1) : "0.0"}%
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <Clock className="h-3.5 w-3.5 text-orange-500" />
                Tardiness
              </div>
              <div className="text-2xl font-bold">5.2%</div>
            </div>
            <div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <TrendingUp className="h-3.5 w-3.5 text-blue-500" />
                OT %
              </div>
              <div className="text-2xl font-bold">12%</div>
            </div>
            <div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <Target className="h-3.5 w-3.5 text-purple-500" />
                Capacity
              </div>
              <div className="text-2xl font-bold">
                {totalEmployeesCount ? ((workingNowCount / totalEmployeesCount) * 100).toFixed(0) : "0"}%
              </div>
            </div>
          </div>
        </Card>

        {/* Currently Online + Notifications */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="p-6 lg:col-span-2 rounded-2xl bg-[#141414] border border-white/5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">Currently Online</h3>
                <Badge className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">LIVE</Badge>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>Updated just now</span>
                {mapUrl ? (
                  <a className="text-primary hover:underline" href={mapUrl} target="_blank" rel="noreferrer">
                    View Map
                  </a>
                ) : null}
              </div>
            </div>
            <div className="space-y-4">
              {onlineEmployees.length === 0 ? (
                <div className="text-sm text-muted-foreground">No employees are online right now.</div>
              ) : (
                onlineEmployees.map((emp: any) => {
                  const distanceLabel =
                    typeof emp.locationDistanceKm === "number"
                      ? `${emp.locationDistanceKm.toFixed(1)} km from office`
                      : null;
                  const locationLabel = getLocationLabel(emp.location);
                  const hasLocation = Boolean(emp.location?.lat && emp.location?.lng);
                  const officeTag =
                    emp.locationTag === "office" ? "Office" : emp.locationTag === "remote" ? "Remote" : null;

                  return (
                    <div
                      key={emp.id}
                      className="rounded-2xl border border-emerald-500/20 bg-[#17201c] p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div className="h-10 w-10 rounded-full bg-[#3a1b12] flex items-center justify-center text-sm font-semibold text-orange-200">
                            {getInitials(emp.name)}
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm font-semibold">{emp.name}</p>
                            <p className="text-xs text-muted-foreground">{emp.designation}</p>
                            <button
                              type="button"
                              className={`flex items-center gap-2 text-xs text-muted-foreground ${hasLocation ? "hover:text-foreground transition-colors" : "cursor-default"}`}
                              onClick={() => hasLocation && handleLocationOpen(emp)}
                            >
                              <MapPin className="h-3.5 w-3.5 text-emerald-300" />
                              <span className="truncate max-w-[320px]">{locationLabel}</span>
                              {distanceLabel ? (
                                <span className="text-orange-300">({distanceLabel})</span>
                              ) : null}
                            </button>
                            <p className="text-xs text-muted-foreground">
                              Clocked in at {emp.timeIn ? format(new Date(emp.timeIn), "hh:mm a") : "--"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {officeTag ? (
                            <Badge className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                              <Wifi className="h-3.5 w-3.5 mr-1" />
                              {officeTag}
                            </Badge>
                          ) : null}
                          <Badge variant="secondary" className="text-xs">
                            {emp.hours || "--"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>

          <Card className="p-6 rounded-2xl bg-[#141414] border border-white/5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-orange-400" />
                <h3 className="font-semibold">Notifications</h3>
              </div>
              <Link href="/notifications">
                <Button variant="link" className="p-0 h-auto text-primary">
                  View All
                </Button>
              </Link>
            </div>
            {notifications.length === 0 ? (
              <div className="text-sm text-muted-foreground py-10 text-center">
                No notifications yet
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.slice(0, 4).map((notif: any) => (
                  <div key={notif.id} className="rounded-xl border border-white/5 bg-[#191919] p-3">
                    <p className="text-sm font-medium">{notif.title || "Notification"}</p>
                    <p className="text-xs text-muted-foreground">{notif.message}</p>
                    <p className="text-xs text-muted-foreground">
                      {notif.createdAt
                        ? formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })
                        : "--"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Pending Leaves + Average Hours */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="p-6 rounded-2xl bg-[#141414] border border-white/5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Pending Leaves</h3>
              <Badge variant="secondary" className="text-xs">{pendingLeaves.length}</Badge>
            </div>
            <div className="space-y-3">
              {pendingLeaves.map((leave: any) => (
                <div key={leave.id} className="p-3 rounded-xl border bg-muted/30 space-y-2">
                  <div>
                    <p className="text-sm font-medium">{leave.user?.name || "Employee"}</p>
                    <p className="text-xs text-muted-foreground">
                      {leave.leaveType} • {leave.startDate ? format(new Date(leave.startDate), "MMM dd") : "--"} - {leave.endDate ? format(new Date(leave.endDate), "MMM dd") : "--"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90">
                      Approve
                    </Button>
                    <Button variant="outline" className="flex-1">
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6 lg:col-span-2 rounded-2xl bg-[#141414] border border-white/5">
            <h3 className="font-semibold mb-4">Employee Average Hours (This Week)</h3>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={avgHoursData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="hours" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Ongoing Projects + Ongoing Tasks */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="p-6 rounded-2xl bg-[#141414] border border-white/5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Pending Forms</h3>
              <Badge variant="secondary" className="text-xs">{pendingForms.length}</Badge>
            </div>
            <div className="space-y-3">
              {pendingForms.map((form: any) => (
                <div key={form.id} className="p-3 rounded-xl border border-white/5 bg-[#191919]">
                  <p className="text-sm font-medium">{form.user?.name || "Employee"}</p>
                  <p className="text-xs text-muted-foreground">{form.subject || form.formType}</p>
                  <p className="text-xs text-muted-foreground">
                    {form.createdAt
                      ? formatDistanceToNow(new Date(form.createdAt), { addSuffix: true })
                      : "--"}
                  </p>
                  <Button className="w-full mt-3 bg-primary text-primary-foreground hover:bg-primary/90">
                    Review
                  </Button>
                </div>
              ))}
            </div>
            <Link href="/admin/forms">
              <Button variant="link" className="w-full mt-4 h-8 text-primary">
                View All Forms
              </Button>
            </Link>
          </Card>

          <Card className="p-6 rounded-2xl bg-[#141414] border border-white/5">
            <h3 className="font-semibold mb-4">Ongoing Projects</h3>
            <div className="space-y-4">
              {activeProjects.map((project: any) => (
                <div key={project.id} className="p-3 rounded-xl border border-white/5 bg-[#191919]">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium">{project.name}</p>
                    <span className="text-xs font-semibold">{project.progress || 0}%</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2 mb-2">
                    <div
                      className="bg-primary h-2 rounded-full"
                      style={{ width: `${project.progress || 0}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{project.assignees?.join(", ") || "Unassigned"}</span>
                    <span>{project.tasks || 0} tasks</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6 rounded-2xl bg-[#141414] border border-white/5">
            <h3 className="font-semibold mb-4">Ongoing Tasks</h3>
            <div className="space-y-3">
              {ongoingTasks.map((task: any) => (
                <div key={task.id} className="p-3 rounded-xl border border-white/5 bg-[#191919]">
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-sm font-medium">{task.title}</p>
                    <Badge
                      variant={task.priority === "high" ? "destructive" : "secondary"}
                      className="text-xs"
                    >
                      {task.priority}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-1">
                    {(task.assignees || [])
                      .map((assignee: any) => assignee?.name || assignee?.employeeId || "Employee")
                      .filter(Boolean)
                      .join(", ") || "Employee"}
                  </p>
                  <p className="text-xs text-muted-foreground">{task.project?.name || "Project"}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Resource Performance */}
        <Card className="p-6 rounded-2xl bg-[#141414] border border-white/5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Resource Performance</h3>
            <span className="text-xs text-muted-foreground">
              Tasks completed vs pending with active projects
            </span>
          </div>
          {performanceData.length === 0 ? (
            <div className="text-center text-muted-foreground py-10">
              No performance data available
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar yAxisId="left" dataKey="tasksCompleted" stackId="tasks" fill="#22c55e" />
                <Bar yAxisId="left" dataKey="tasksPending" stackId="tasks" fill="#f97316" />
                <Line yAxisId="right" type="monotone" dataKey="activeProjects" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          )}
          <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#22c55e]" />
              Tasks completed
            </span>
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#f97316]" />
              Tasks pending
            </span>
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#3b82f6]" />
              Active projects
            </span>
          </div>
        </Card>

        {/* Advanced Reports */}
        <Card className="p-4 rounded-2xl bg-[#141414] border border-white/5">
          <h3 className="font-semibold mb-4">Advanced Reports</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Link href="/admin/reports">
              <Button variant="outline" size="sm" className="w-full justify-start h-auto py-2">
                <Activity className="h-3.5 w-3.5 mr-2" />
                <span className="text-xs">Attendance Summary</span>
              </Button>
            </Link>
            <Link href="/admin/reports">
              <Button variant="outline" size="sm" className="w-full justify-start h-auto py-2">
                <Clock className="h-3.5 w-3.5 mr-2" />
                <span className="text-xs">OT Analysis</span>
              </Button>
            </Link>
            <Link href="/admin/reports">
              <Button variant="outline" size="sm" className="w-full justify-start h-auto py-2">
                <FileCheck className="h-3.5 w-3.5 mr-2" />
                <span className="text-xs">Audit Trail</span>
              </Button>
            </Link>
            <Link href="/admin/reports">
              <Button variant="outline" size="sm" className="w-full justify-start h-auto py-2">
                <AlertCircle className="h-3.5 w-3.5 mr-2" />
                <span className="text-xs">Exceptions</span>
              </Button>
            </Link>
          </div>
        </Card>
      
        <Dialog open={locationDialogOpen} onOpenChange={setLocationDialogOpen}>
          <DialogContent className="sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>Location Details</DialogTitle>
            </DialogHeader>
            {selectedCoords ? (
              <div className="space-y-4">
                <div className="overflow-hidden rounded-xl border border-white/10">
                  <iframe
                    src={selectedMapSrc}
                    className="w-full h-56"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-emerald-300 mt-0.5" />
                    <span>{addressLoading ? "Fetching address..." : selectedAddress}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {selectedCoords.lat.toFixed(5)}, {selectedCoords.lng.toFixed(5)}
                  </div>
                  {typeof selectedCoords.accuracy === "number" ? (
                    <div className="text-xs text-muted-foreground">
                      Accuracy: {Math.round(selectedCoords.accuracy)} m
                    </div>
                  ) : null}
                  {capturedLabel ? (
                    <div className="text-xs text-muted-foreground">
                      Captured {capturedLabel}
                    </div>
                  ) : null}
                  {selectedLocation?.locationTag ? (
                    <Badge className="w-fit bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                      {selectedLocation.locationTag === "office" ? "Office" : "Remote"}
                    </Badge>
                  ) : null}
                </div>
                <a
                  href={`https://www.google.com/maps?q=${selectedCoords.lat},${selectedCoords.lng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-primary hover:underline"
                >
                  Open in Maps
                </a>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">No location selected</div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}





















import { useState } from "react";
import LayoutWrapper from "@/components/LayoutWrapper";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Calendar, 
  Clock, 
  Loader2, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle2, 
  XCircle, 
  Timer,
  Coffee,
  CalendarDays,
  FileText
} from "lucide-react";
import { format, startOfMonth, endOfMonth, isAfter, isBefore, parseISO } from "date-fns";

export default function Attendance() {
  const [activeTab, setActiveTab] = useState("daily");
  const monthStart = startOfMonth(new Date());
  const monthEnd = endOfMonth(new Date());
  
  const { data: attendance, isLoading } = trpc.timeTracking.getAttendance.useQuery({
    startDate: monthStart,
    endDate: monthEnd,
  });

  const { data: leaves } = trpc.leaves.getMyLeaves.useQuery();

  const calculateStats = () => {
    if (!attendance) return { totalDays: 0, avgHours: 0, completedDays: 0, lateArrivals: 0, earlyDepartures: 0 };
    
    const completed = attendance.filter(e => e.status !== "active");
    const totalHours = completed.reduce((sum, entry) => {
      return sum + (parseFloat(entry.totalHours as any) || 0);
    }, 0);

    // Count late arrivals (after 9:00 AM)
    const lateArrivals = attendance.filter(entry => {
      const timeIn = new Date(entry.timeIn);
      const hour = timeIn.getHours();
      const minute = timeIn.getMinutes();
      return hour > 9 || (hour === 9 && minute > 0);
    }).length;

    // Count early departures (status = early_out)
    const earlyDepartures = attendance.filter(e => e.status === "early_out").length;

    return {
      totalDays: attendance.length,
      completedDays: completed.length,
      avgHours: completed.length > 0 ? totalHours / completed.length : 0,
      lateArrivals,
      earlyDepartures,
    };
  };

  const stats = calculateStats();

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive", color: string }> = {
      completed: { variant: "default", color: "bg-green-500/10 text-green-500" },
      active: { variant: "secondary", color: "bg-blue-500/10 text-blue-500" },
      early_out: { variant: "destructive", color: "bg-red-500/10 text-red-500" },
    };

    const config = variants[status] || { variant: "secondary", color: "" };

    return (
      <Badge variant={config.variant} className={`capitalize ${config.color}`}>
        {status.replace("_", " ")}
      </Badge>
    );
  };

  const getTimeColor = (hours: number) => {
    if (hours >= 8) return "text-green-500";
    if (hours >= 6.5) return "text-yellow-500";
    return "text-red-500";
  };

  const getPunctualityBadge = (timeIn: Date) => {
    const hour = timeIn.getHours();
    const minute = timeIn.getMinutes();
    const isLate = hour > 9 || (hour === 9 && minute > 0);

    return isLate ? (
      <Badge variant="destructive" className="bg-red-500/10 text-red-500">
        <AlertCircle className="h-3 w-3 mr-1" />
        Late
      </Badge>
    ) : (
      <Badge variant="default" className="bg-green-500/10 text-green-500">
        <CheckCircle2 className="h-3 w-3 mr-1" />
        On Time
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <LayoutWrapper>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold">Attendance Reports</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Comprehensive attendance tracking and analytics for {format(new Date(), "MMMM yyyy")}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Calendar className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Days</p>
                <p className="text-xl font-bold">{stats.totalDays}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Avg Hours</p>
                <p className="text-xl font-bold">{stats.avgHours.toFixed(1)}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <Clock className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Completed</p>
                <p className="text-xl font-bold">{stats.completedDays}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/10 rounded-lg">
                <AlertCircle className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Late Arrivals</p>
                <p className="text-xl font-bold">{stats.lateArrivals}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/10 rounded-lg">
                <XCircle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Early Outs</p>
                <p className="text-xl font-bold">{stats.earlyDepartures}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Report Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
            <TabsTrigger value="daily">Daily</TabsTrigger>
            <TabsTrigger value="punctuality">Punctuality</TabsTrigger>
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
            <TabsTrigger value="time-on-task">Time-on-Task</TabsTrigger>
            <TabsTrigger value="exceptions">Exceptions</TabsTrigger>
            <TabsTrigger value="leave-balance">Leave Balance</TabsTrigger>
          </TabsList>

          {/* 1. Daily Attendance / Time Card Report */}
          <TabsContent value="daily" className="space-y-4">
            <Card>
              <div className="p-4 border-b">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <CalendarDays className="h-5 w-5" />
                  Daily Attendance / Time Card Report
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Detailed daily attendance records with clock in/out times
                </p>
              </div>

              <div className="p-4">
                {attendance && attendance.length > 0 ? (
                  <div className="space-y-2">
                    {attendance.map((entry) => {
                      const hours = parseFloat(entry.totalHours as any) || 0;
                      const timeIn = new Date(entry.timeIn);
                      
                      return (
                        <Card key={entry.id} className="p-4">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                            <div className="flex items-start gap-3 flex-1">
                              <div className="p-2 bg-muted rounded-lg">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <div className="flex-1">
                                <p className="font-medium text-sm">
                                  {format(timeIn, "EEEE, MMM dd, yyyy")}
                                </p>
                                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                  <span>In: {format(timeIn, "HH:mm:ss")}</span>
                                  <span>•</span>
                                  <span>
                                    Out: {entry.timeOut ? format(new Date(entry.timeOut), "HH:mm:ss") : "Active"}
                                  </span>
                                </div>
                                {entry.notes && (
                                  <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                                    Notes: {entry.notes}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <p className={`text-lg font-bold ${getTimeColor(hours)}`}>
                                  {hours > 0 ? `${hours.toFixed(2)} hrs` : "In Progress"}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {hours >= 8 ? "Target Met" : hours >= 6.5 ? "Minimum Met" : hours > 0 ? "Below Min" : "Active"}
                                </p>
                              </div>
                              {getStatusBadge(entry.status)}
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="h-10 w-10 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">No attendance records for this month</p>
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>

          {/* 2. Punctuality / Late Arrival Report */}
          <TabsContent value="punctuality" className="space-y-4">
            <Card>
              <div className="p-4 border-b">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Timer className="h-5 w-5" />
                  Punctuality / Late Arrival Report
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Track on-time arrivals and late check-ins (Standard: 9:00 AM)
                </p>
              </div>

              <div className="p-4">
                {attendance && attendance.length > 0 ? (
                  <div className="space-y-2">
                    {attendance.map((entry) => {
                      const timeIn = new Date(entry.timeIn);
                      const hour = timeIn.getHours();
                      const minute = timeIn.getMinutes();
                      const isLate = hour > 9 || (hour === 9 && minute > 0);
                      const minutesLate = isLate ? (hour - 9) * 60 + minute : 0;
                      
                      return (
                        <Card key={entry.id} className={`p-4 ${isLate ? 'border-red-500/20' : 'border-green-500/20'}`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-1">
                              <div className={`p-2 rounded-lg ${isLate ? 'bg-red-500/10' : 'bg-green-500/10'}`}>
                                {isLate ? (
                                  <AlertCircle className="h-4 w-4 text-red-500" />
                                ) : (
                                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                                )}
                              </div>
                              <div>
                                <p className="font-medium text-sm">
                                  {format(timeIn, "EEEE, MMM dd, yyyy")}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Clock In: {format(timeIn, "HH:mm:ss")}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              {isLate && (
                                <div className="text-right">
                                  <p className="text-sm font-semibold text-red-500">
                                    +{minutesLate} min late
                                  </p>
                                </div>
                              )}
                              {getPunctualityBadge(timeIn)}
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Timer className="h-10 w-10 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">No punctuality data available</p>
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>

          {/* 3. Monthly Attendance Summary Report */}
          <TabsContent value="monthly" className="space-y-4">
            <Card>
              <div className="p-4 border-b">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Monthly Attendance Summary Report
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Comprehensive monthly overview with key metrics
                </p>
              </div>

              <div className="p-4 space-y-4">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className="p-4 bg-blue-500/5">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-2">Total Working Days</p>
                      <p className="text-3xl font-bold text-blue-500">{stats.totalDays}</p>
                    </div>
                  </Card>

                  <Card className="p-4 bg-green-500/5">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-2">Days Completed</p>
                      <p className="text-3xl font-bold text-green-500">{stats.completedDays}</p>
                    </div>
                  </Card>

                  <Card className="p-4 bg-orange-500/5">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-2">Late Arrivals</p>
                      <p className="text-3xl font-bold text-orange-500">{stats.lateArrivals}</p>
                    </div>
                  </Card>

                  <Card className="p-4 bg-red-500/5">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-2">Early Departures</p>
                      <p className="text-3xl font-bold text-red-500">{stats.earlyDepartures}</p>
                    </div>
                  </Card>
                </div>

                {/* Detailed Breakdown */}
                <Card className="p-4">
                  <h3 className="font-semibold mb-3">Performance Breakdown</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Average Hours per Day</span>
                      <span className="font-semibold">{stats.avgHours.toFixed(2)} hrs</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Punctuality Rate</span>
                      <span className="font-semibold">
                        {stats.totalDays > 0 
                          ? ((stats.totalDays - stats.lateArrivals) / stats.totalDays * 100).toFixed(1) 
                          : 0}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Completion Rate</span>
                      <span className="font-semibold">
                        {stats.totalDays > 0 
                          ? ((stats.completedDays) / stats.totalDays * 100).toFixed(1) 
                          : 0}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Early Departure Rate</span>
                      <span className="font-semibold">
                        {stats.totalDays > 0 
                          ? ((stats.earlyDepartures) / stats.totalDays * 100).toFixed(1) 
                          : 0}%
                      </span>
                    </div>
                  </div>
                </Card>
              </div>
            </Card>
          </TabsContent>

          {/* 4. Time-on-Task Report */}
          <TabsContent value="time-on-task" className="space-y-4">
            <Card>
              <div className="p-4 border-b">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Coffee className="h-5 w-5" />
                  Time-on-Task Report
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Track actual work time vs break time for productivity analysis
                </p>
              </div>

              <div className="p-4">
                {attendance && attendance.length > 0 ? (
                  <div className="space-y-2">
                    {attendance.map((entry) => {
                      const hours = parseFloat(entry.totalHours as any) || 0;
                      // Estimate break time (assuming 5% of total time as breaks)
                      const estimatedBreakHours = hours * 0.05;
                      const netWorkHours = hours - estimatedBreakHours;
                      
                      return (
                        <Card key={entry.id} className="p-4">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                            <div className="flex items-start gap-3 flex-1">
                              <div className="p-2 bg-muted rounded-lg">
                                <Timer className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <div>
                                <p className="font-medium text-sm">
                                  {format(new Date(entry.timeIn), "EEEE, MMM dd, yyyy")}
                                </p>
                                <div className="flex items-center gap-4 mt-2 text-xs">
                                  <div>
                                    <span className="text-muted-foreground">Total: </span>
                                    <span className="font-semibold">{hours.toFixed(2)}h</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Breaks: </span>
                                    <span className="font-semibold">{estimatedBreakHours.toFixed(2)}h</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Net Work: </span>
                                    <span className="font-semibold text-primary">{netWorkHours.toFixed(2)}h</span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="text-right">
                              <p className="text-sm font-semibold">
                                {((netWorkHours / hours) * 100).toFixed(0)}% productive
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Efficiency rate
                              </p>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Coffee className="h-10 w-10 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">No time-on-task data available</p>
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>

          {/* 5. Attendance Exception Log */}
          <TabsContent value="exceptions" className="space-y-4">
            <Card>
              <div className="p-4 border-b">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Attendance Exception Log
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Track missed punches, early departures, and late arrivals
                </p>
              </div>

              <div className="p-4">
                {attendance && attendance.length > 0 ? (
                  <div className="space-y-2">
                    {attendance
                      .filter(entry => {
                        const timeIn = new Date(entry.timeIn);
                        const hour = timeIn.getHours();
                        const minute = timeIn.getMinutes();
                        const isLate = hour > 9 || (hour === 9 && minute > 0);
                        const isEarlyOut = entry.status === "early_out";
                        return isLate || isEarlyOut;
                      })
                      .map((entry) => {
                        const timeIn = new Date(entry.timeIn);
                        const hour = timeIn.getHours();
                        const minute = timeIn.getMinutes();
                        const isLate = hour > 9 || (hour === 9 && minute > 0);
                        const isEarlyOut = entry.status === "early_out";
                        const hours = parseFloat(entry.totalHours as any) || 0;
                        
                        return (
                          <Card key={entry.id} className="p-4 border-red-500/20">
                            <div className="flex items-start gap-3">
                              <div className="p-2 bg-red-500/10 rounded-lg">
                                <XCircle className="h-4 w-4 text-red-500" />
                              </div>
                              <div className="flex-1">
                                <p className="font-medium text-sm">
                                  {format(timeIn, "EEEE, MMM dd, yyyy")}
                                </p>
                                <div className="mt-2 space-y-1">
                                  {isLate && (
                                    <div className="flex items-center gap-2">
                                      <Badge variant="destructive" className="bg-orange-500/10 text-orange-500">
                                        Late Arrival
                                      </Badge>
                                      <span className="text-xs text-muted-foreground">
                                        Clocked in at {format(timeIn, "HH:mm:ss")} (Standard: 09:00:00)
                                      </span>
                                    </div>
                                  )}
                                  {isEarlyOut && (
                                    <div className="flex items-center gap-2">
                                      <Badge variant="destructive" className="bg-red-500/10 text-red-500">
                                        Early Departure
                                      </Badge>
                                      <span className="text-xs text-muted-foreground">
                                        Only worked {hours.toFixed(2)} hours (Minimum: 6.5 hours)
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </Card>
                        );
                      })}
                    {attendance.filter(entry => {
                      const timeIn = new Date(entry.timeIn);
                      const hour = timeIn.getHours();
                      const minute = timeIn.getMinutes();
                      const isLate = hour > 9 || (hour === 9 && minute > 0);
                      const isEarlyOut = entry.status === "early_out";
                      return isLate || isEarlyOut;
                    }).length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <CheckCircle2 className="h-10 w-10 mx-auto mb-3 opacity-50 text-green-500" />
                        <p className="text-sm">No attendance exceptions found</p>
                        <p className="text-xs mt-1">Great job maintaining perfect attendance!</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertCircle className="h-10 w-10 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">No exception data available</p>
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>

          {/* 6. Time-Off / Leave Balance Report */}
          <TabsContent value="leave-balance" className="space-y-4">
            <Card>
              <div className="p-4 border-b">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <CalendarDays className="h-5 w-5" />
                  Time-Off / Leave Balance Report
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Track leave applications, approvals, and remaining balance
                </p>
              </div>

              <div className="p-4 space-y-4">
                {/* Leave Balance Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="p-4 bg-blue-500/5">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-2">Total Leave Quota</p>
                      <p className="text-3xl font-bold text-blue-500">20</p>
                      <p className="text-xs text-muted-foreground mt-1">days per year</p>
                    </div>
                  </Card>

                  <Card className="p-4 bg-orange-500/5">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-2">Leaves Taken</p>
                      <p className="text-3xl font-bold text-orange-500">
                        {leaves?.filter(l => l.status === "approved").length || 0}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">approved leaves</p>
                    </div>
                  </Card>

                  <Card className="p-4 bg-green-500/5">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-2">Remaining Balance</p>
                      <p className="text-3xl font-bold text-green-500">
                        {20 - (leaves?.filter(l => l.status === "approved").length || 0)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">days available</p>
                    </div>
                  </Card>
                </div>

                {/* Leave History */}
                <Card className="p-4">
                  <h3 className="font-semibold mb-3">Leave History</h3>
                  {leaves && leaves.length > 0 ? (
                    <div className="space-y-2">
                      {leaves.map((leave) => {
                        const statusColors: Record<string, string> = {
                          pending: "bg-yellow-500/10 text-yellow-500",
                          approved: "bg-green-500/10 text-green-500",
                          rejected: "bg-red-500/10 text-red-500",
                        };

                        return (
                          <div key={leave.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                            <div className="flex-1">
                              <p className="font-medium text-sm">{leave.leaveType}</p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(leave.startDate), "MMM dd")} - {format(new Date(leave.endDate), "MMM dd, yyyy")}
                              </p>
                              {leave.reason && (
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                                  {leave.reason}
                                </p>
                              )}
                            </div>
                            <Badge className={`capitalize ${statusColors[leave.status]}`}>
                              {leave.status}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <CalendarDays className="h-10 w-10 mx-auto mb-3 opacity-50" />
                      <p className="text-sm">No leave applications found</p>
                    </div>
                  )}
                </Card>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </LayoutWrapper>
  );
}

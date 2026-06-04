import { useEffect, useMemo, useState } from "react";
import LayoutWrapper from "@/components/LayoutWrapper";
import AdminLayout from "@/components/AdminLayout";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar,
  ClipboardList,
  FolderKanban,
  Timer,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { format, subDays } from "date-fns";
import { toast } from "sonner";

export default function Reports() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const defaultEnd = format(new Date(), "yyyy-MM-dd");
  const defaultStart = format(subDays(new Date(), 6), "yyyy-MM-dd");

  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");

  const { data: employeeData = [] } = trpc.employees.list.useQuery(undefined, {
    enabled: isAdmin,
  });
  const employees = employeeData.filter((emp: any) => emp?.role === "user");

  useEffect(() => {
    if (!user) return;
    if (!isAdmin) {
      setSelectedEmployeeId(String(user.id));
      return;
    }
    if (selectedEmployeeId) return;
    if (employees.length > 0) {
      setSelectedEmployeeId(String(employees[0].id));
    }
  }, [employees, isAdmin, selectedEmployeeId, user]);

  const rangeValid = useMemo(() => {
    if (!startDate || !endDate) return false;
    return new Date(endDate).getTime() >= new Date(startDate).getTime();
  }, [startDate, endDate]);

  useEffect(() => {
    if (!rangeValid && startDate && endDate) {
      toast.error("End date must be after start date");
    }
  }, [rangeValid, startDate, endDate]);

  const targetEmployeeId = isAdmin ? selectedEmployeeId : user?.id ? String(user.id) : "";

  const attendanceQuery = isAdmin
    ? trpc.admin.getEmployeeAttendance.useQuery(
        {
          employeeId: targetEmployeeId,
          startDate: new Date(`${startDate}T00:00:00`),
          endDate: new Date(`${endDate}T23:59:59`),
        },
        { enabled: Boolean(targetEmployeeId) && rangeValid }
      )
    : trpc.timeTracking.getAttendance.useQuery(
        {
          startDate: new Date(`${startDate}T00:00:00`),
          endDate: new Date(`${endDate}T23:59:59`),
        },
        { enabled: rangeValid }
      );

  const projectsQuery = isAdmin
    ? trpc.admin.getEmployeeProjects.useQuery(
        { employeeId: targetEmployeeId },
        { enabled: Boolean(targetEmployeeId) }
      )
    : trpc.projects.getMyProjects.useQuery();

  const tasksQuery = isAdmin
    ? trpc.admin.getEmployeeTasks.useQuery(
        { employeeId: targetEmployeeId },
        { enabled: Boolean(targetEmployeeId) }
      )
    : trpc.projects.getMyTasks.useQuery();

  const attendanceEntries = attendanceQuery.data || [];
  const projects = projectsQuery.data || [];
  const tasks = tasksQuery.data || [];

  const attendanceMetrics = useMemo(() => {
    const uniqueDays = new Set<string>();
    let totalHours = 0;
    let missingClockouts = 0;

    attendanceEntries.forEach((entry: any) => {
      const timeIn = entry.timeIn ? new Date(entry.timeIn) : null;
      const timeOut = entry.timeOut ? new Date(entry.timeOut) : null;
      if (timeIn) {
        uniqueDays.add(timeIn.toDateString());
      }
      if (!timeOut || entry.status === "active") {
        missingClockouts += 1;
        return;
      }
      const hours = entry.totalHours
        ? Number(entry.totalHours)
        : (timeOut.getTime() - timeIn!.getTime()) / (1000 * 60 * 60);
      totalHours += hours;
    });

    return {
      daysPresent: uniqueDays.size,
      totalHours: Number(totalHours.toFixed(1)),
      missingClockouts,
    };
  }, [attendanceEntries]);

  const projectMetrics = useMemo(() => {
    const active = projects.filter((p: any) => p.status === "active").length;
    const archived = projects.filter((p: any) => p.status === "completed" || p.status === "cancelled").length;
    return {
      total: projects.length,
      active,
      archived,
    };
  }, [projects]);

  const taskMetrics = useMemo(() => {
    const completed = tasks.filter((t: any) => t.status === "completed").length;
    return {
      total: tasks.length,
      completed,
      pending: Math.max(0, tasks.length - completed),
    };
  }, [tasks]);

  const content = (
    <div className="space-y-6">
      <Card className="p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Employee Reports</h2>
            <p className="text-sm text-muted-foreground">
              Attendance and project activity for the selected time range
            </p>
          </div>

          <div className="flex flex-col md:flex-row gap-3">
            {isAdmin && (
              <div className="min-w-[220px]">
                <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.length === 0 ? (
                      <SelectItem value="none" disabled>
                        No employees available
                      </SelectItem>
                    ) : (
                      employees.map((emp: any) => (
                        <SelectItem key={emp.id} value={String(emp.id)}>
                          {emp.name} ({emp.employeeId || "ID"})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              <span className="text-xs text-muted-foreground">to</span>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
            <Timer className="h-4 w-4 text-blue-500" />
            Attendance Summary
          </div>
          <div className="text-2xl font-bold">{attendanceMetrics.totalHours} hrs</div>
          <div className="text-xs text-muted-foreground mt-2">
            Days present: {attendanceMetrics.daysPresent}
          </div>
          <div className="text-xs text-muted-foreground">
            Missing clock outs: {attendanceMetrics.missingClockouts}
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
            <FolderKanban className="h-4 w-4 text-purple-500" />
            Projects
          </div>
          <div className="text-2xl font-bold">{projectMetrics.total}</div>
          <div className="text-xs text-muted-foreground mt-2">
            Active: {projectMetrics.active}
          </div>
          <div className="text-xs text-muted-foreground">
            Archived: {projectMetrics.archived}
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
            <ClipboardList className="h-4 w-4 text-green-500" />
            Tasks
          </div>
          <div className="text-2xl font-bold">{taskMetrics.total}</div>
          <div className="text-xs text-muted-foreground mt-2">
            Completed: {taskMetrics.completed}
          </div>
          <div className="text-xs text-muted-foreground">Pending: {taskMetrics.pending}</div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm">Attendance Entries</h3>
            <Badge variant="secondary" className="text-xs">{attendanceEntries.length}</Badge>
          </div>
          {attendanceEntries.length === 0 ? (
            <div className="text-sm text-muted-foreground">No attendance entries</div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {attendanceEntries.map((entry: any) => (
                <div key={entry.id} className="p-3 rounded-lg border bg-muted/20">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">
                      {entry.timeIn ? format(new Date(entry.timeIn), "MMM dd, yyyy") : "--"}
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {entry.status || "unknown"}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {entry.timeIn ? format(new Date(entry.timeIn), "HH:mm") : "--"} -
                    {entry.timeOut ? ` ${format(new Date(entry.timeOut), "HH:mm")}` : " --"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm">Projects</h3>
            <Badge variant="secondary" className="text-xs">{projects.length}</Badge>
          </div>
          {projects.length === 0 ? (
            <div className="text-sm text-muted-foreground">No projects assigned</div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {projects.map((project: any) => (
                <div key={project.id} className="p-3 rounded-lg border bg-muted/20">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">{project.name}</div>
                    <Badge variant="outline" className="text-xs">
                      {project.status || "active"}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {project.startDate || project.endDate ? (
                      <span>
                        {project.startDate
                          ? format(new Date(project.startDate), "MMM dd, yyyy")
                          : "--"} -
                        {project.endDate
                          ? ` ${format(new Date(project.endDate), "MMM dd, yyyy")}`
                          : " --"}
                      </span>
                    ) : (
                      <span>No timeline set</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm">Tasks</h3>
          <Badge variant="secondary" className="text-xs">{tasks.length}</Badge>
        </div>
        {tasks.length === 0 ? (
          <div className="text-sm text-muted-foreground">No tasks assigned</div>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {tasks.map((task: any) => (
              <div key={task.id} className="p-3 rounded-lg border bg-muted/20">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">{task.title}</div>
                  <Badge variant="outline" className="text-xs">{task.status || "todo"}</Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Project: {task.project?.name || "Unknown"}
                </div>
                <div className="text-xs text-muted-foreground">
                  Timeline: {task.completionDate ? format(new Date(task.completionDate), "MMM dd, yyyy") : "Ongoing"}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );

  if (isAdmin) {
    return <AdminLayout title="Employee Reports">{content}</AdminLayout>;
  }

  return <LayoutWrapper>{content}</LayoutWrapper>;
}
